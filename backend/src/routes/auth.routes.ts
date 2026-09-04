import { Router } from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/onboard/farmer', AuthController.completeFarmerOnboarding);
router.post('/onboard/buyer', AuthController.completeBuyerOnboarding);
router.post('/demo-login', AuthController.demoLogin);
router.get('/dev-otp', AuthController.getDevOtp);
router.get('/me', authenticate, AuthController.me);
router.post('/logout', AuthController.logout);

export default router;
