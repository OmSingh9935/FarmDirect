import { Router } from 'express';
import HubController from '../controllers/hub.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Hub Admin Executive Analytics & Master Ledgers
router.get('/analytics', authenticate, requireRole(['hub_admin']), HubController.getPlatformAnalytics);
router.get('/users', authenticate, requireRole(['hub_admin']), HubController.getRegisteredUsers);
router.get('/purchases', authenticate, requireRole(['hub_admin']), HubController.getPurchasesLedger);

// Hub Staff and Admin operations
router.get('/intake', authenticate, requireRole(['hub_admin']), HubController.getIntakeQueue);
router.post('/grade', authenticate, requireRole(['hub_admin']), HubController.gradeProduce);
router.get('/dispatch', authenticate, requireRole(['hub_admin']), HubController.getDispatchBoard);
router.put('/dispatch', authenticate, requireRole(['hub_admin']), HubController.updateDispatch);
router.get('/thresholds', HubController.getThresholdConfig);
router.put('/thresholds', authenticate, requireRole(['hub_admin']), HubController.updateThresholdConfig);
router.get('/disputes', authenticate, requireRole(['hub_admin']), HubController.getDisputes);
router.post('/disputes/resolve', authenticate, requireRole(['hub_admin']), HubController.resolveDispute);

// AI Engines: Demand Forecasting & Route Optimization
router.get('/ai/forecast', authenticate, requireRole(['hub_admin']), HubController.getDemandForecast);
router.get('/ai/optimize-routes', authenticate, requireRole(['hub_admin']), HubController.getOptimizedRoutes);
router.post('/ai/optimize-routes', authenticate, requireRole(['hub_admin']), HubController.getOptimizedRoutes);

export default router;
