import { Router } from 'express';
import OrdersController from '../controllers/orders.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/logistics-check', OrdersController.checkLogisticsThreshold);
router.post('/', authenticate, OrdersController.createOrder);
router.get('/', authenticate, OrdersController.getOrders);
router.get('/:id', authenticate, OrdersController.getOrderById);
router.post('/:id/confirm-receipt', authenticate, OrdersController.confirmReceipt);
router.post('/rate', authenticate, OrdersController.submitRating);
router.post('/dispute', authenticate, OrdersController.raiseDispute);

export default router;
