import { Router } from 'express';
import FarmerController from '../controllers/farmer.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/dashboard', authenticate, requireRole(['farmer']), FarmerController.getDashboardStats);
router.get('/demand-advisory', authenticate, requireRole(['farmer']), FarmerController.getCropDemandAdvisory);
router.get('/payouts', authenticate, requireRole(['farmer']), FarmerController.getPayouts);
router.put('/profile', authenticate, requireRole(['farmer']), FarmerController.updateProfile);

export default router;
