import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class FarmerController {
  // Farmer dashboard overview stats
  static async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const farmerId = req.user.userId;

      const [activeListings, allFarmerOrders, settledPayouts, ratings] = await Promise.all([
        prisma.listing.count({
          where: { farmerId, status: 'ACTIVE' },
        }),
        prisma.order.findMany({
          where: { listing: { farmerId } },
          include: { listing: { include: { crop: true } }, buyer: true, escrowTransaction: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.escrowTransaction.findMany({
          where: {
            order: { listing: { farmerId } },
            status: 'RELEASED',
          },
          include: { order: true },
        }),
        prisma.rating.findMany({
          where: { farmerProfile: { userId: farmerId } },
        }),
      ]);

      const pendingOrders = allFarmerOrders.filter(
        (o) => o.status !== 'COMPLETED' && o.status !== 'DISPUTED'
      ).length;

      const totalPayoutSum = settledPayouts.reduce((sum, tx) => sum + (tx.amount - tx.order.commissionAmount), 0);
      const totalVolumeKg = allFarmerOrders.reduce((sum, o) => sum + o.quantity, 0);

      const avgRating = ratings.length
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 4.9;

      return res.json({
        stats: {
          activeListings,
          pendingOrders,
          monthlyPayout: parseFloat(totalPayoutSum.toFixed(2)),
          totalVolumeKg: parseFloat(totalVolumeKg.toFixed(1)),
          averageRating: parseFloat(avgRating.toFixed(1)),
          reviewsCount: ratings.length,
        },
        recentActivity: allFarmerOrders.slice(0, 5),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch dashboard stats' });
    }
  }

  // Payout ledger & settlements
  static async getPayouts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const farmerId = req.user.userId;

      const transactions = await prisma.escrowTransaction.findMany({
        where: {
          order: { listing: { farmerId } },
        },
        orderBy: { heldAt: 'desc' },
        include: {
          order: {
            include: {
              listing: { include: { crop: { include: { threshold: true } } } },
              buyer: { select: { name: true } },
            },
          },
        },
      });

      const formatted = transactions.map((tx) => {
        const gross = tx.order.totalAmount;
        const commissionPercent = tx.order.listing.crop.threshold?.commissionPercentage || 5.0;
        const commission = tx.order.commissionAmount || (gross * commissionPercent) / 100;
        const net = gross - commission;

        return {
          id: tx.id,
          orderId: tx.orderId,
          cropName: tx.order.listing.crop.name,
          quantity: `${tx.order.quantity} ${tx.order.unit}`,
          date: tx.releasedAt || tx.heldAt,
          grossAmount: gross,
          commissionPercentage: commissionPercent,
          commissionDeducted: parseFloat(commission.toFixed(2)),
          netPayout: parseFloat(net.toFixed(2)),
          status: tx.status,
          payoutTxRef: tx.payoutTxRef || tx.gatewayRef,
          buyerName: tx.order.buyer.name,
        };
      });

      const totalSettled = formatted
        .filter((t) => t.status === 'RELEASED')
        .reduce((sum, t) => sum + t.netPayout, 0);

      const totalPendingEscrow = formatted
        .filter((t) => t.status === 'HELD')
        .reduce((sum, t) => sum + t.netPayout, 0);

      return res.json({
        totalSettled: parseFloat(totalSettled.toFixed(2)),
        totalPendingEscrow: parseFloat(totalPendingEscrow.toFixed(2)),
        payouts: formatted,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch payouts' });
    }
  }

  // Update farmer bank & profile
  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const {
        name,
        phone,
        village,
        pincode,
        district,
        state,
        bankAccountNumber,
        ifscCode,
        upiId,
        preferredLanguage,
      } = req.body;

      if (name || phone) {
        await prisma.user.update({
          where: { id: req.user.userId },
          data: {
            ...(name && { name }),
            ...(phone && { phone }),
          },
        });
      }

      const updatedProfile = await prisma.farmerProfile.update({
        where: { userId: req.user.userId },
        data: {
          ...(village && { village }),
          ...(pincode && { pincode }),
          ...(district && { district }),
          ...(state && { state }),
          ...(bankAccountNumber && { bankAccountNumber }),
          ...(ifscCode && { ifscCode }),
          ...(upiId && { upiId }),
          ...(preferredLanguage && { preferredLanguage }),
        },
      });

      return res.json({
        message: 'Farmer profile updated successfully',
        profile: updatedProfile,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
  }
}

export default FarmerController;
