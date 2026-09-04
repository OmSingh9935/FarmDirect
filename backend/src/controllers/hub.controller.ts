import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import GradingService from '../services/grading.service.js';
import EscrowService from '../services/escrow.service.js';

export class HubController {
  // 1. Platform Executive Analytics for Admin
  static async getPlatformAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const [
        totalUsers,
        allUsers,
        allOrders,
        allEscrow,
        allListings,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.findMany({
          include: { farmerProfile: true, buyerProfile: true },
        }),
        prisma.order.findMany({
          include: { listing: { include: { crop: true } } },
        }),
        prisma.escrowTransaction.findMany(),
        prisma.listing.findMany({
          where: { status: 'ACTIVE' },
        }),
      ]);

      // Registration Breakdowns
      const farmersCount = allUsers.filter((u) => u.role === 'farmer').length;
      const individualBuyersCount = allUsers.filter((u) => u.role === 'buyer' && u.buyerProfile?.buyerType === 'INDIVIDUAL').length;
      const bulkFpoBuyersCount = allUsers.filter((u) => u.role === 'buyer' && u.buyerProfile?.buyerType === 'BULK_FPO').length;
      const adminCount = allUsers.filter((u) => u.role === 'hub_admin').length;

      // Financial & Escrow Metrics
      const totalGMV = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalCommissionEarned = allOrders
        .filter((o) => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + o.commissionAmount, 0);

      const escrowHeld = allEscrow
        .filter((e) => e.status === 'HELD')
        .reduce((sum, e) => sum + e.amount, 0);

      const escrowReleased = allEscrow
        .filter((e) => e.status === 'RELEASED')
        .reduce((sum, e) => sum + e.amount, 0);

      const escrowRefunded = allEscrow
        .filter((e) => e.status === 'REFUNDED')
        .reduce((sum, e) => sum + e.amount, 0);

      // Volume & Quality Metrics
      const totalWeightKg = allOrders.reduce((sum, o) => sum + (o.unit === 'quintal' ? o.quantity * 100 : o.quantity), 0);
      const discrepancyOrdersCount = allOrders.filter((o) => o.discrepancyAdjusted).length;
      const discrepancyRate = allOrders.length > 0 ? (discrepancyOrdersCount / allOrders.length) * 100 : 0;

      // Status breakdown
      const ordersByStatus = {
        PLACED: allOrders.filter((o) => o.status === 'PLACED').length,
        ESCROW_HELD: allOrders.filter((o) => o.status === 'ESCROW_HELD').length,
        HUB_VERIFIED: allOrders.filter((o) => o.status === 'HUB_VERIFIED').length,
        DISPATCHED: allOrders.filter((o) => o.status === 'DISPATCHED').length,
        DELIVERED: allOrders.filter((o) => o.status === 'DELIVERED').length,
        COMPLETED: allOrders.filter((o) => o.status === 'COMPLETED').length,
        DISPUTED: allOrders.filter((o) => o.status === 'DISPUTED').length,
      };

      // Top Crops by GMV
      const cropStatsMap: Record<string, { name: string; category: string; gmv: number; volumeKg: number; ordersCount: number }> = {};
      allOrders.forEach((o) => {
        const cropName = o.listing?.crop?.name || 'Produce';
        if (!cropStatsMap[cropName]) {
          cropStatsMap[cropName] = {
            name: cropName,
            category: o.listing?.crop?.category || 'Vegetables',
            gmv: 0,
            volumeKg: 0,
            ordersCount: 0,
          };
        }
        cropStatsMap[cropName].gmv += o.totalAmount;
        cropStatsMap[cropName].volumeKg += o.unit === 'quintal' ? o.quantity * 100 : o.quantity;
        cropStatsMap[cropName].ordersCount += 1;
      });

      const topCrops = Object.values(cropStatsMap)
        .sort((a, b) => b.gmv - a.gmv)
        .slice(0, 5);

      return res.json({
        users: {
          total: totalUsers,
          farmers: farmersCount,
          individualBuyers: individualBuyersCount,
          bulkFpoBuyers: bulkFpoBuyersCount,
          admins: adminCount,
        },
        financials: {
          totalGMV: parseFloat(totalGMV.toFixed(2)),
          totalCommissionEarned: parseFloat(totalCommissionEarned.toFixed(2)),
          escrowHeld: parseFloat(escrowHeld.toFixed(2)),
          escrowReleased: parseFloat(escrowReleased.toFixed(2)),
          escrowRefunded: parseFloat(escrowRefunded.toFixed(2)),
        },
        operations: {
          totalOrders: allOrders.length,
          ordersByStatus,
          totalWeightKg: parseFloat(totalWeightKg.toFixed(1)),
          totalWeightQuintals: parseFloat((totalWeightKg / 100).toFixed(2)),
          activeListingsCount: allListings.length,
          discrepancyOrdersCount,
          discrepancyRate: parseFloat(discrepancyRate.toFixed(1)),
        },
        topCrops,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch platform analytics' });
    }
  }

  // 2. Comprehensive Registered Users Directory for Admin
  static async getRegisteredUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { role, search } = req.query;
      const where: any = {};

      if (role) {
        where.role = role as string;
      }

      if (search) {
        const s = (search as string).trim();
        where.OR = [
          { name: { contains: s } },
          { email: { contains: s } },
          { phone: { contains: s } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          farmerProfile: true,
          buyerProfile: true,
          listings: {
            select: { id: true, status: true, pricePerUnit: true, quantity: true },
          },
          orders: {
            select: { id: true, totalAmount: true, status: true },
          },
        },
      });

      const formatted = users.map((u) => {
        const totalSpent = u.orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const activeListings = u.listings.filter((l) => l.status === 'ACTIVE').length;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || 'N/A',
          role: u.role,
          createdAt: u.createdAt,
          farmerDetails: u.farmerProfile ? {
            village: u.farmerProfile.village,
            district: u.farmerProfile.district || 'N/A',
            state: u.farmerProfile.state || 'Maharashtra',
            pincode: u.farmerProfile.pincode,
            upiId: u.farmerProfile.upiId || 'N/A',
            bankAccount: u.farmerProfile.bankAccountNumber ? `•••• ${u.farmerProfile.bankAccountNumber.slice(-4)}` : 'N/A',
            preferredLanguage: u.farmerProfile.preferredLanguage,
            activeListingsCount: activeListings,
          } : null,
          buyerDetails: u.buyerProfile ? {
            buyerType: u.buyerProfile.buyerType,
            orgName: u.buyerProfile.orgName || null,
            gstin: u.buyerProfile.gstin || null,
            address: u.buyerProfile.addressLine,
            city: u.buyerProfile.city,
            state: u.buyerProfile.state,
            pincode: u.buyerProfile.pincode,
            totalOrdersPlaced: u.orders.length,
            totalSpent: parseFloat(totalSpent.toFixed(2)),
          } : null,
        };
      });

      return res.json({ total: formatted.length, users: formatted });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch registered users' });
    }
  }

  // 3. Master Purchases Ledger ("Who What How Much Purchased")
  static async getPurchasesLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const { cropId, status, search, buyerType } = req.query;
      const where: any = {};

      if (status) {
        where.status = status as string;
      }

      if (cropId) {
        where.listing = { cropId: cropId as string };
      }

      if (buyerType) {
        where.buyer = { buyerProfile: { buyerType: buyerType as string } };
      }

      if (search) {
        const s = (search as string).trim();
        where.OR = [
          { buyer: { name: { contains: s } } },
          { buyer: { email: { contains: s } } },
          { listing: { crop: { name: { contains: s } } } },
          { listing: { farmer: { name: { contains: s } } } },
        ];
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            include: { buyerProfile: true },
          },
          listing: {
            include: {
              crop: { include: { threshold: true } },
              farmer: {
                include: { farmerProfile: true },
              },
            },
          },
          escrowTransaction: true,
          hubIntake: true,
          dispatch: true,
          rating: true,
          dispute: true,
        },
      });

      const purchases = orders.map((o) => {
        const cropName = o.listing?.crop?.name || 'Produce';
        const commissionPercent = o.listing?.crop?.threshold?.commissionPercentage || 5.0;
        const farmerNetPayout = parseFloat((o.totalAmount - o.commissionAmount).toFixed(2));

        let parsedDiscrepancy = null;
        if (o.discrepancyDetails) {
          try {
            parsedDiscrepancy = JSON.parse(o.discrepancyDetails);
          } catch {
            parsedDiscrepancy = o.discrepancyDetails;
          }
        }

        return {
          orderId: o.id,
          orderShortId: o.id.slice(0, 8),
          createdAt: o.createdAt,
          // WHO PURCHASED
          buyer: {
            id: o.buyerId,
            name: o.buyer.name,
            email: o.buyer.email,
            phone: o.buyer.phone || 'N/A',
            buyerType: o.buyer.buyerProfile?.buyerType || 'INDIVIDUAL',
            orgName: o.buyer.buyerProfile?.orgName || null,
            deliveryAddress: o.deliveryAddress || o.buyer.buyerProfile?.addressLine || 'Registered Address',
            city: o.buyer.buyerProfile?.city || 'Mumbai',
            state: o.buyer.buyerProfile?.state || 'Maharashtra',
            pincode: o.deliveryPincode || o.buyer.buyerProfile?.pincode || '400001',
          },
          // WHAT WAS PURCHASED
          produce: {
            cropId: o.listing.cropId,
            cropName,
            category: o.listing.crop.category,
            quantity: o.quantity,
            unit: o.unit,
            listedGrade: o.listing.aiGrade,
            confirmedGrade: o.hubIntake?.confirmedGrade || o.listing.aiGrade,
          },
          // FROM WHOM
          farmer: {
            id: o.listing.farmerId,
            name: o.listing.farmer.name,
            phone: o.listing.farmer.phone || 'N/A',
            village: o.listing.farmer.farmerProfile?.village || 'N/A',
            district: o.listing.farmer.farmerProfile?.district || 'N/A',
            state: o.listing.farmer.farmerProfile?.state || 'Maharashtra',
            upiId: o.listing.farmer.farmerProfile?.upiId || 'N/A',
          },
          // HOW MUCH
          financials: {
            unitPrice: o.unitPrice,
            subtotal: parseFloat((o.unitPrice * o.quantity).toFixed(2)),
            commissionPercentage: commissionPercent,
            commissionAmount: o.commissionAmount,
            totalAmountPaid: o.totalAmount,
            farmerNetPayout,
          },
          // ESCROW & PIPELINE STATUS
          escrow: {
            status: o.escrowTransaction?.status || 'HELD',
            amount: o.escrowTransaction?.amount || o.totalAmount,
            gatewayRef: o.escrowTransaction?.gatewayRef || 'rzp_sandbox',
            payoutTxRef: o.escrowTransaction?.payoutTxRef || null,
            heldAt: o.escrowTransaction?.heldAt || o.createdAt,
            releasedAt: o.escrowTransaction?.releasedAt || null,
          },
          pipelineStatus: o.status,
          deliveryType: o.deliveryType,
          discrepancyAdjusted: o.discrepancyAdjusted,
          discrepancyDetails: parsedDiscrepancy,
          carrier: o.dispatch ? {
            status: o.dispatch.status,
            driverName: o.dispatch.driverName || 'Unassigned',
            vehicleId: o.dispatch.vehicleId || 'N/A',
            eta: o.dispatch.eta || 'N/A',
          } : null,
          rating: o.rating ? {
            stars: o.rating.rating,
            qualityStars: o.rating.qualityRating,
            comment: o.rating.comment,
          } : null,
        };
      });

      return res.json({
        total: purchases.length,
        purchases,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch purchases ledger' });
    }
  }

  // 4. Intake Queue (Farmer Drop-off vs Logistics Pickup lanes)
  static async getIntakeQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const { lane } = req.query;
      const where: any = {
        status: { in: ['PLACED', 'ESCROW_HELD', 'HUB_VERIFIED'] },
      };

      if (lane) {
        where.hubIntake = { lane: lane as string };
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: {
              crop: { include: { threshold: true } },
              farmer: {
                include: {
                  farmerProfile: true,
                },
              },
            },
          },
          buyer: {
            include: {
              buyerProfile: true,
            },
          },
          hubIntake: true,
          escrowTransaction: true,
        },
      });

      const dropoffLane = orders.filter((o) => o.hubIntake?.lane === 'FARMER_DROPOFF' || o.deliveryType === 'HUB_CONSOLIDATED');
      const pickupLane = orders.filter((o) => o.hubIntake?.lane === 'LOGISTICS_PICKUP' || o.deliveryType === 'FARM_DIRECT');

      return res.json({
        total: orders.length,
        dropoffLane,
        pickupLane,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch intake queue' });
    }
  }

  // 5. Hub Staff Grading Interface & Automated Discrepancy Rule Engine Execution
  static async gradeProduce(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, actualWeight, confirmedGrade, staffNotes } = req.body;

      if (!orderId || !actualWeight || !confirmedGrade) {
        return res.status(400).json({ error: 'orderId, actualWeight, and confirmedGrade are required' });
      }

      const staffName = req.user?.name || 'Central Hub Inspector';

      const discrepancyResult = await GradingService.executeDiscrepancyRuleEngine(
        orderId,
        parseFloat(actualWeight),
        confirmedGrade as 'A' | 'B' | 'C',
        staffNotes,
        staffName
      );

      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          hubIntake: true,
          listing: { include: { crop: true, farmer: true } },
          buyer: true,
          escrowTransaction: true,
        },
      });

      return res.json({
        message: discrepancyResult.hasDiscrepancy
          ? 'Produce inspected. Discrepancy rule engine applied price adjustments and dispatched alerts.'
          : 'Produce inspection confirmed matching listed grade and weight.',
        discrepancyResult,
        order: updatedOrder,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Grading failed' });
    }
  }

  // 6. Dispatch Board (Kanban Columns: READY, ASSIGNED, IN_TRANSIT, DELIVERED)
  static async getDispatchBoard(req: AuthenticatedRequest, res: Response) {
    try {
      const dispatches = await prisma.dispatch.findMany({
        orderBy: { order: { createdAt: 'desc' } },
        include: {
          order: {
            include: {
              listing: {
                include: {
                  crop: true,
                  farmer: { include: { farmerProfile: true } },
                },
              },
              buyer: {
                include: { buyerProfile: true },
              },
              hubIntake: true,
            },
          },
        },
      });

      const kanban = {
        READY: dispatches.filter((d) => d.status === 'READY'),
        ASSIGNED: dispatches.filter((d) => d.status === 'ASSIGNED'),
        IN_TRANSIT: dispatches.filter((d) => d.status === 'IN_TRANSIT'),
        DELIVERED: dispatches.filter((d) => d.status === 'DELIVERED'),
      };

      return res.json({ kanban, total: dispatches.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch dispatch board' });
    }
  }

  // 7. Update Dispatch Assignment or Status
  static async updateDispatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { dispatchId, status, driverName, driverPhone, vehicleId, eta, route } = req.body;

      if (!dispatchId) return res.status(400).json({ error: 'dispatchId is required' });

      const updated = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          ...(status && { status }),
          ...(driverName && { driverName }),
          ...(driverPhone && { driverPhone }),
          ...(vehicleId && { vehicleId }),
          ...(eta && { eta }),
          ...(route && { route }),
          ...(status === 'IN_TRANSIT' && { dispatchedAt: new Date() }),
          ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        },
        include: { order: { include: { listing: { include: { crop: true } } } } },
      });

      if (status === 'IN_TRANSIT') {
        await prisma.order.update({
          where: { id: updated.orderId },
          data: { status: 'DISPATCHED' },
        });

        await prisma.notification.create({
          data: {
            userId: updated.order.buyerId,
            title: '🚚 Order Dispatched from Hub',
            message: `Your ${updated.order.listing.crop.name} is on the way with driver ${driverName || 'assigned'} (${vehicleId || 'Express'}). ETA: ${eta || 'Today'}.`,
            type: 'INFO',
            link: `/buyer/orders/${updated.orderId}`,
          },
        });
      } else if (status === 'DELIVERED') {
        await prisma.order.update({
          where: { id: updated.orderId },
          data: { status: 'DELIVERED' },
        });

        await prisma.notification.create({
          data: {
            userId: updated.order.buyerId,
            title: '📦 Order Delivered - Please Confirm Receipt',
            message: `Your order #${updated.orderId.slice(0, 8)} has arrived! Please inspect your produce and click 'Confirm Receipt' to release payment.`,
            type: 'SUCCESS',
            link: `/buyer/orders/${updated.orderId}`,
          },
        });
      }

      return res.json({
        message: `Dispatch updated to ${status || updated.status}`,
        dispatch: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update dispatch' });
    }
  }

  // 8. Commission & Threshold Configuration
  static async getThresholdConfig(req: Request, res: Response) {
    try {
      const thresholds = await prisma.cropThreshold.findMany({
        include: { crop: true },
        orderBy: { crop: { name: 'asc' } },
      });
      return res.json({ thresholds });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch thresholds' });
    }
  }

  static async updateThresholdConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { cropId, quintalThreshold, commissionPercentage } = req.body;

      if (!cropId) return res.status(400).json({ error: 'cropId is required' });

      const updated = await prisma.cropThreshold.upsert({
        where: { cropId },
        create: {
          cropId,
          quintalEquivalentThreshold: parseFloat(quintalThreshold) || 0.5,
          commissionPercentage: parseFloat(commissionPercentage) || 5.0,
        },
        update: {
          ...(quintalThreshold !== undefined && { quintalEquivalentThreshold: parseFloat(quintalThreshold) }),
          ...(commissionPercentage !== undefined && { commissionPercentage: parseFloat(commissionPercentage) }),
        },
        include: { crop: true },
      });

      return res.json({
        message: 'Threshold configuration updated successfully in database',
        threshold: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update threshold' });
    }
  }

  // 9. Dispute Console & Resolution Actions
  static async getDisputes(req: AuthenticatedRequest, res: Response) {
    try {
      const disputes = await prisma.dispute.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              listing: { include: { crop: true, farmer: true } },
              buyer: { include: { buyerProfile: true } },
              escrowTransaction: true,
            },
          },
        },
      });

      return res.json({ disputes });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch disputes' });
    }
  }

  static async resolveDispute(req: AuthenticatedRequest, res: Response) {
    try {
      const { disputeId, action, refundAmount, resolutionNotes } = req.body;

      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: { order: true },
      });

      if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

      let newStatus = 'RESOLVED_REGRADE';
      let refundResult = null;

      if (action === 'FULL_REFUND') {
        newStatus = 'RESOLVED_REFUND';
        refundResult = await EscrowService.refund(
          dispute.orderId,
          dispute.order.totalAmount,
          resolutionNotes || 'Hub approved full refund'
        );
      } else if (action === 'PARTIAL_REFUND') {
        newStatus = 'RESOLVED_PARTIAL';
        const amount = parseFloat(refundAmount) || dispute.order.totalAmount * 0.5;
        refundResult = await EscrowService.refund(
          dispute.orderId,
          amount,
          resolutionNotes || `Hub approved partial refund of ₹${amount}`
        );
      }

      const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: newStatus,
          refundAmount: refundResult?.amount || null,
          resolutionNotes: resolutionNotes || `Action: ${action}`,
          resolvedAt: new Date(),
        },
      });

      return res.json({
        message: `Dispute resolved via ${action}`,
        dispute: updatedDispute,
        refund: refundResult,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to resolve dispute' });
    }
  }
}

export default HubController;
