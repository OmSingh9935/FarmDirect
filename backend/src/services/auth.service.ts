import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import emailService from './email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'farmdirect_jwt_super_secret_key_prod_2026_dev';
const ACCESS_TOKEN_EXPIRY = '1d';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export class AuthService {
  // Generate 6-digit OTP and store hashed in DB
  static async requestOtp(email: string, rolePreference?: string): Promise<{ success: boolean; message: string; cooldown: number; isNewUser: boolean }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting: check requests in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentRequestsCount = await prisma.otpCode.count({
      where: {
        email: normalizedEmail,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentRequestsCount >= 5) {
      throw new Error('Too many OTP requests. Please wait 10 minutes before requesting again.');
    }

    // Check recent request within 60s cooldown
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const lastRequest = await prisma.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: { gte: oneMinuteAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastRequest) {
      const remainingSeconds = Math.ceil((lastRequest.createdAt.getTime() + 60000 - Date.now()) / 1000);
      return {
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        cooldown: remainingSeconds,
        isNewUser: false,
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    const purpose = existingUser ? 'login' : 'signup';

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.otpCode.create({
      data: {
        email: normalizedEmail,
        codeHash,
        purpose,
        expiresAt,
      },
    });

    // Send email
    await emailService.sendOtpEmail(normalizedEmail, otp, purpose);

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
      cooldown: 60,
      isNewUser: !existingUser,
    };
  }

  // Verify OTP code
  static async verifyOtp(email: string, code: string): Promise<{
    verified: boolean;
    user?: any;
    token?: string;
    refreshToken?: string;
    isNewUser: boolean;
    onboardingToken?: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Find latest active OTP for this email
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new Error('Verification code has expired or was not requested. Please request a new code.');
    }

    // Check match
    const isMatch = await bcrypt.compare(code.trim(), otpRecord.codeHash);
    if (!isMatch) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new Error('Invalid verification code. Please check and try again.');
    }

    // Mark consumed
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        farmerProfile: true,
        buyerProfile: true,
      },
    });

    if (!user) {
      // Create temporary onboarding token (valid for 30 minutes)
      const onboardingToken = jwt.sign(
        { email: normalizedEmail, purpose: 'onboarding' },
        JWT_SECRET,
        { expiresIn: '30m' }
      );

      return {
        verified: true,
        isNewUser: true,
        onboardingToken,
      };
    }

    // Existing user: generate session tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      verified: true,
      user,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isNewUser: false,
    };
  }

  // Onboarding for new Farmer
  static async completeFarmerOnboarding(data: {
    onboardingToken: string;
    name: string;
    phone: string;
    village: string;
    pincode: string;
    district?: string;
    state?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    preferredLanguage?: string;
    aadhaarOptional?: string;
  }) {
    let email: string;
    try {
      const decoded = jwt.verify(data.onboardingToken, JWT_SECRET) as { email: string; purpose: string };
      if (decoded.purpose !== 'onboarding') throw new Error();
      email = decoded.email;
    } catch {
      throw new Error('Invalid or expired onboarding session. Please re-authenticate.');
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        role: 'farmer',
        phone: data.phone,
        farmerProfile: {
          create: {
            village: data.village,
            pincode: data.pincode,
            district: data.district || '',
            state: data.state || 'Maharashtra',
            bankAccountNumber: data.bankAccountNumber || '',
            ifscCode: data.ifscCode || '',
            upiId: data.upiId || '',
            preferredLanguage: data.preferredLanguage || 'en',
            aadhaarOptional: data.aadhaarOptional || null,
          },
        },
      },
      include: { farmerProfile: true },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, ...tokens };
  }

  // Onboarding for new Buyer
  static async completeBuyerOnboarding(data: {
    onboardingToken: string;
    name: string;
    phone: string;
    buyerType: 'INDIVIDUAL' | 'BULK_FPO';
    orgName?: string;
    gstin?: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  }) {
    let email: string;
    try {
      const decoded = jwt.verify(data.onboardingToken, JWT_SECRET) as { email: string; purpose: string };
      if (decoded.purpose !== 'onboarding') throw new Error();
      email = decoded.email;
    } catch {
      throw new Error('Invalid or expired onboarding session. Please re-authenticate.');
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        role: 'buyer',
        phone: data.phone,
        buyerProfile: {
          create: {
            buyerType: data.buyerType,
            orgName: data.orgName || null,
            gstin: data.gstin || null,
            addressLine: data.addressLine,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
          },
        },
      },
      include: { buyerProfile: true },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, ...tokens };
  }

  // Generate Access + Refresh Token Pair
  static generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return { accessToken, refreshToken };
  }

  // Instant Demo Switcher login
  static async loginAsDemo(role: 'farmer' | 'buyer' | 'hub_admin' | 'bulk_buyer') {
    let email = '';
    if (role === 'farmer') email = 'ramesh.farmer@farmdirect.test';
    else if (role === 'buyer') email = 'priya.buyer@farmdirect.test';
    else if (role === 'bulk_buyer') email = 'greenfresh.fpo@farmdirect.test';
    else if (role === 'hub_admin') email = 'rajesh.admin@farmdirect.test';

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        farmerProfile: true,
        buyerProfile: true,
      },
    });

    if (!user) {
      throw new Error(`Demo account for ${role} not found. Please run seed script first.`);
    }

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, ...tokens };
  }
}

export default AuthService;
