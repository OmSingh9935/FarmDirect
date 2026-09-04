import { Router } from 'express';
import PaymentsController from '../controllers/payments.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/create-order', authenticate, PaymentsController.createPaymentOrder);
router.post('/verify', authenticate, PaymentsController.verifyPayment);
router.post('/simulate', authenticate, PaymentsController.simulateSandboxPayment);

export default router;
