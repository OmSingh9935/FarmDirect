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
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        farmerProfile: true,
        buyerProfile: true,
      },
    });

    // Auto-create admin if omsingh203090@gmail.com logs in via OTP
    if (!user && normalizedEmail === 'omsingh203090@gmail.com') {
      const hashedPassword = await bcrypt.hash('Omsingh@123', 10);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: 'Om Singh (Platform Admin & Hub Lead)',
          role: 'hub_admin',
          phone: '+91 98200 11223',
          password: hashedPassword,
        },
        include: {
          farmerProfile: true,
          buyerProfile: true,
        },
      });
    }

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

  // Direct Password Registration for Farmer
  static async registerFarmer(data: {
    name: string;
    email: string;
    password: string;
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
    const normalizedEmail = data.email.trim().toLowerCase();

    if (!data.name || !normalizedEmail || !data.password || !data.phone || !data.village || !data.pincode) {
      throw new Error('Please fill in all required fields: Name, Email, Password, Phone, Village, and Pincode.');
    }

    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in with your password.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name.trim(),
        role: 'farmer',
        phone: data.phone.trim(),
        password: hashedPassword,
        farmerProfile: {
          create: {
            village: data.village.trim(),
            pincode: data.pincode.trim(),
            district: data.district?.trim() || '',
            state: data.state?.trim() || 'Maharashtra',
            bankAccountNumber: data.bankAccountNumber?.trim() || '',
            ifscCode: data.ifscCode?.trim() || '',
            upiId: data.upiId?.trim() || '',
            preferredLanguage: data.preferredLanguage || 'en',
            aadhaarOptional: data.aadhaarOptional?.trim() || null,
            verified: true,
          },
        },
      },
      include: {
        farmerProfile: true,
        buyerProfile: true,
      },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, ...tokens };
  }

  // Direct Password Registration for Buyer
  static async registerBuyer(data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    buyerType?: 'INDIVIDUAL' | 'BULK_FPO';
    orgName?: string;
    gstin?: string;
    addressLine: string;
    city: string;
    state?: string;
    pincode: string;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    if (!data.name || !normalizedEmail || !data.password || !data.phone || !data.addressLine || !data.city || !data.pincode) {
      throw new Error('Please fill in all required fields: Name, Email, Password, Phone, Address, City, and Pincode.');
    }

    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in with your password.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name.trim(),
        role: 'buyer',
        phone: data.phone.trim(),
        password: hashedPassword,
        buyerProfile: {
          create: {
            buyerType: data.buyerType || 'INDIVIDUAL',
            orgName: data.orgName?.trim() || null,
            gstin: data.gstin?.trim() || null,
            addressLine: data.addressLine.trim(),
            city: data.city.trim(),
            state: data.state?.trim() || 'Maharashtra',
            pincode: data.pincode.trim(),
          },
        },
      },
      include: {
        farmerProfile: true,
        buyerProfile: true,
      },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, ...tokens };
  }

  // Password Login for Admin, Farmers, and Buyers
  static async loginWithPassword(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Please provide both email and password.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        farmerProfile: true,
        buyerProfile: true,
      },
    });

    // Auto-provision requested admin account if not already present
    if (normalizedEmail === 'omsingh203090@gmail.com') {
      if (!user) {
        const hashedPassword = await bcrypt.hash('Omsingh@123', 10);
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: 'Om Singh (Platform Admin & Hub Lead)',
            role: 'hub_admin',
            phone: '+91 98200 11223',
            password: hashedPassword,
          },
          include: {
            farmerProfile: true,
            buyerProfile: true,
          },
        });
      } else if (!user.password || user.role !== 'hub_admin') {
        const hashedPassword = await bcrypt.hash('Omsingh@123', 10);
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            role: 'hub_admin',
          },
          include: {
            farmerProfile: true,
            buyerProfile: true,
          },
        });
      }
    }

    if (!user) {
      throw new Error('No account found with this email. Please create an account to get started.');
    }

    // If an existing account has no password yet, set it now on first password login
    if (!user.password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
        include: {
          farmerProfile: true,
          buyerProfile: true,
        },
      });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Incorrect password. Please verify and try again.');
      }
    }

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
}

export default AuthService;
