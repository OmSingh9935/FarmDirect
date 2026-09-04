import { Request, Response } from 'express';
import EscrowService from '../services/escrow.service.js';
import prisma from '../prisma.js';

export class PaymentsController {
  // Create Razorpay sandbox payment session
  static async createPaymentOrder(req: Request, res: Response) {
    try {
      const { orderIds, amount } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || !amount) {
        return res.status(400).json({ error: 'orderIds array and amount required' });
      }

      // Generate sandbox order ID
      const rzpOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_farmdirect12345';

      return res.json({
        id: rzpOrderId,
        amount: Math.round(amount * 100), // Amount in paise for Razorpay
        currency: 'INR',
        keyId,
        orderIds,
        notes: {
          platform: 'FarmDirect Escrow Engine',
          ordersCount: orderIds.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Payment initiation failed' });
    }
  }

  // Verify and process Escrow Hold
  static async verifyPayment(req: Request, res: Response) {
    try {
      const { orderIds, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || !razorpayPaymentId) {
        return res.status(400).json({ error: 'Payment details required' });
      }

      // Verify signature if provided and not in simulated test mode
      if (razorpaySignature && !razorpaySignature.startsWith('simulated_')) {
        const isValid = EscrowService.verifyRazorpaySignature(
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        );
        if (!isValid) {
          return res.status(400).json({ error: 'Invalid payment signature' });
        }
      }

      const results = [];
      for (const orderId of orderIds) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order) {
          const holdResult = await EscrowService.hold(orderId, order.totalAmount, razorpayPaymentId);
          results.push(holdResult);
        }
      }

      return res.json({
        success: true,
        message: 'Payment verified and successfully locked into Platform Escrow',
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Payment verification failed' });
    }
  }

  // Sandbox One-Click Simulator
  static async simulateSandboxPayment(req: Request, res: Response) {
    try {
      const { orderIds } = req.body;
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({ error: 'orderIds array required' });
      }

      const simulatedPayId = `rzp_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const results = [];

      for (const orderId of orderIds) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order) {
          const holdResult = await EscrowService.hold(orderId, order.totalAmount, simulatedPayId);
          results.push(holdResult);
        }
      }

      return res.json({
        success: true,
        message: 'Sandbox payment processed! Funds are now securely held in Escrow.',
        simulatedPaymentId: simulatedPayId,
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Simulation failed' });
    }
  }
}

export default PaymentsController;
