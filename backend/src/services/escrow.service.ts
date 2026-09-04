import crypto from 'crypto';
import prisma from '../prisma.js';

export interface EscrowResult {
  success: boolean;
  orderId: string;
  status: 'HELD' | 'RELEASED' | 'REFUNDED';
  amount: number;
  farmerPayout?: number;
  commissionDeducted?: number;
  gatewayRef?: string;
  message: string;
}

export class EscrowService {
  // 1. Hold Funds in Escrow upon successful checkout
  static async hold(orderId: string, amount: number, gatewayRef?: string): Promise<EscrowResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: { include: { crop: { include: { threshold: true } }, farmer: true } },
        buyer: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const txRef = gatewayRef || `rzp_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create or update escrow transaction
    await prisma.escrowTransaction.upsert({
      where: { orderId },
      create: {
        orderId,
        amount,
        status: 'HELD',
        gatewayRef: txRef,
        heldAt: new Date(),
        notes: 'Payment received via Razorpay Sandbox and locked in platform escrow',
      },
      update: {
        amount,
        status: 'HELD',
        gatewayRef: txRef,
        heldAt: new Date(),
        notes: 'Payment re-locked in escrow',
      },
    });

    // Update Order Status to ESCROW_HELD
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'ESCROW_HELD' },
    });

    // Notify Farmer & Buyer
    await prisma.notification.createMany({
      data: [
        {
          userId: order.listing.farmerId,
          title: '🌾 New Order & Payment Held in Escrow',
          message: `Order #${orderId.slice(0, 8)} for ${order.quantity} ${order.unit} ${order.listing.crop.name} has been placed. ₹${amount.toFixed(2)} is securely held in platform escrow.`,
          type: 'INFO',
          link: `/farmer/orders`,
        },
        {
          userId: order.buyerId,
          title: '🛡️ Payment Secured in Escrow',
          message: `Your payment of ₹${amount.toFixed(2)} for ${order.listing.crop.name} is safely held in escrow. Funds will only be released to the farmer after you confirm delivery.`,
          type: 'SUCCESS',
          link: `/buyer/orders/${orderId}`,
        },
      ],
    });

    return {
      success: true,
      orderId,
      status: 'HELD',
      amount,
      gatewayRef: txRef,
      message: `₹${amount.toFixed(2)} locked in platform escrow.`,
    };
  }

  // 2. Release Funds to Farmer upon delivery confirmation
  static async release(orderId: string): Promise<EscrowResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: { include: { crop: { include: { threshold: true } }, farmer: true } },
        buyer: true,
        escrowTransaction: true,
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.status === 'COMPLETED' || order.escrowTransaction?.status === 'RELEASED') {
      throw new Error('Escrow funds have already been released for this order');
    }

    // Determine platform commission percentage dynamically from DB
    const commissionPercent = order.listing.crop.threshold?.commissionPercentage ?? 5.0;
    const finalAmount = order.totalAmount;
    const commissionDeducted = parseFloat(((finalAmount * commissionPercent) / 100).toFixed(2));
    const farmerPayout = parseFloat((finalAmount - commissionDeducted).toFixed(2));

    const payoutTxRef = `payout_bank_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Update Escrow Transaction
    await prisma.escrowTransaction.update({
      where: { orderId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        payoutTxRef,
        notes: `Released to farmer: ₹${farmerPayout} (Platform commission ${commissionPercent}%: ₹${commissionDeducted})`,
      },
    });

    // Mark order COMPLETED
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        commissionAmount: commissionDeducted,
      },
    });

    // Notify Farmer & Buyer
    await prisma.notification.createMany({
      data: [
        {
          userId: order.listing.farmerId,
          title: '💰 Payout Released to Bank / UPI',
          message: `Buyer verified receipt! ₹${farmerPayout} has been transferred to your payout account (Ref: ${payoutTxRef}). Commission: ₹${commissionDeducted}.`,
          type: 'SUCCESS',
          link: `/farmer/payouts`,
        },
        {
          userId: order.buyerId,
          title: '✅ Order Completed',
          message: `Thank you for confirming receipt of your ${order.listing.crop.name} order. Escrow has settled and farmer received payment.`,
          type: 'INFO',
          link: `/buyer/orders/${orderId}`,
        },
      ],
    });

    return {
      success: true,
      orderId,
      status: 'RELEASED',
      amount: finalAmount,
      farmerPayout,
      commissionDeducted,
      gatewayRef: payoutTxRef,
      message: `₹${farmerPayout} successfully disbursed to farmer account after ₹${commissionDeducted} (${commissionPercent}%) commission deduction.`,
    };
  }

  // 3. Refund to Buyer (Full or Partial)
  static async refund(orderId: string, refundAmount?: number, reason?: string): Promise<EscrowResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: { include: { crop: true } },
        buyer: true,
        escrowTransaction: true,
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    const amountToRefund = refundAmount !== undefined ? refundAmount : order.totalAmount;
    const refundRef = `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await prisma.escrowTransaction.update({
      where: { orderId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        notes: `Refunded ₹${amountToRefund}. Reason: ${reason || 'Customer dispute resolution'}`,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DISPUTED' },
    });

    // Notify Buyer
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        title: '💳 Escrow Refund Processed',
        message: `₹${amountToRefund.toFixed(2)} has been refunded to your original payment method. Reason: ${reason || 'Hub resolution'}.`,
        type: 'WARNING',
        link: `/buyer/orders/${orderId}`,
      },
    });

    return {
      success: true,
      orderId,
      status: 'REFUNDED',
      amount: amountToRefund,
      gatewayRef: refundRef,
      message: `₹${amountToRefund.toFixed(2)} refunded to buyer.`,
    };
  }

  // Razorpay Signature Verification
  static verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_test_farmdirect67890';
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');
    return expectedSignature === signature;
  }
}

export default EscrowService;
