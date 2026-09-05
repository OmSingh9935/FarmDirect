import { Request, Response } from 'express';
import AuthService from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../prisma.js';

export class AuthController {
  static async requestOtp(req: Request, res: Response) {
    try {
      const { email, role } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      const result = await AuthService.requestOtp(email, role);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to send OTP' });
    }
  }

  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: 'Email and 6-digit code are required' });
      }

      const result = await AuthService.verifyOtp(email, code);

      if (result.token) {
        // Set secure session cookie
        res.cookie('token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'OTP verification failed' });
    }
  }

  static async loginWithPassword(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await AuthService.loginWithPassword(email, password);

      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Authentication failed' });
    }
  }

  static async registerFarmer(req: Request, res: Response) {
    try {
      const result = await AuthService.registerFarmer(req.body);

      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        user: result.user,
        token: result.accessToken,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Farmer registration failed' });
    }
  }

  static async registerBuyer(req: Request, res: Response) {
    try {
      const result = await AuthService.registerBuyer(req.body);

      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        user: result.user,
        token: result.accessToken,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Buyer registration failed' });
    }
  }

  static async completeFarmerOnboarding(req: Request, res: Response) {
    try {
      const result = await AuthService.completeFarmerOnboarding(req.body);

      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        user: result.user,
        token: result.accessToken,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Farmer onboarding failed' });
    }
  }

  static async completeBuyerOnboarding(req: Request, res: Response) {
    try {
      const result = await AuthService.completeBuyerOnboarding(req.body);

      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        user: result.user,
        token: result.accessToken,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Buyer onboarding failed' });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        farmerProfile: true,
        buyerProfile: true,
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out successfully' });
  }
}

export default AuthController;
