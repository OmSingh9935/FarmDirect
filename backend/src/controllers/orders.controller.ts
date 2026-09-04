import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import LogisticsService from '../services/logistics.service.js';
import EscrowService from '../services/escrow.service.js';

export class OrdersController {
  // Create orders from Cart or direct Buy
  static async createOrder(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'buyer') {
        return res.status(403).json({ error: 'Only registered buyers can place orders' });
      }

      const { items, deliveryAddress, deliveryPincode } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
      }

      const createdOrders = [];

      for (const item of items) {
        const { listingId, quantity } = item;
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
          include: { crop: { include: { threshold: true } }, farmer: true },
        });

        if (!listing) {
          return res.status(404).json({ error: `Listing ${listingId} not found` });
        }

        if (listing.quantity < quantity) {
          return res.status(400).json({
            error: `Insufficient stock for ${listing.crop.name}. Available: ${listing.quantity} ${listing.unit}`,
          });
        }

        // Dynamic Logistics threshold evaluation from DB
        const logisticsCheck = await LogisticsService.evaluateDeliveryType(listing.cropId, quantity, listing.unit);

        const subtotal = listing.pricePerUnit * quantity;
        const commissionPercent = listing.crop.threshold?.commissionPercentage ?? 5.0;
        const commissionAmount = parseFloat(((subtotal * commissionPercent) / 100).toFixed(2));
        const totalAmount = parseFloat((subtotal + logisticsCheck.logisticsFee).toFixed(2));

        const order = await prisma.order.create({
          data: {
            buyerId: req.user.userId,
            listingId,
            quantity,
            unit: listing.unit,
            unitPrice: listing.pricePerUnit,
            totalAmount,
            commissionAmount,
            deliveryType: logisticsCheck.deliveryType,
            status: 'PLACED',
            deliveryAddress: deliveryAddress || 'Registered Address',
            deliveryPincode: deliveryPincode || '400001',
          },
          include: {
            listing: { include: { crop: true, farmer: true } },
          },
        });

        // Decrement available quantity on listing
        await prisma.listing.update({
          where: { id: listingId },
          data: {
            quantity: listing.quantity - quantity,
            status: listing.quantity - quantity <= 0 ? 'SOLD_OUT' : 'ACTIVE',
          },
        });

        // Initialize Hub Intake & Dispatch records
        await prisma.hubIntake.create({
          data: {
            orderId: order.id,
            lane: logisticsCheck.intakeLane,
            staffName: 'Pending Intake',
          },
        });

        await prisma.dispatch.create({
          data: {
            orderId: order.id,
            status: 'READY',
            route: `${listing.farmLocation || 'Farm Gate'} -> Central Hub -> ${deliveryAddress || 'City'}`,
          },
        });

        createdOrders.push(order);
      }

      return res.status(201).json({
        message: 'Order(s) created successfully',
        orders: createdOrders,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create order' });
    }
  }

  // Get orders according to role
  static async getOrders(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const { status } = req.query;
      const where: any = {};

      if (status) {
        where.status = status as string;
      }

      if (req.user.role === 'buyer') {
        where.buyerId = req.user.userId;
      } else if (req.user.role === 'farmer') {
        where.listing = { farmerId: req.user.userId };
      }
      // hub_admin sees all orders

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: {
              crop: { include: { threshold: true } },
              farmer: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              buyerProfile: true,
            },
          },
          escrowTransaction: true,
          hubIntake: true,
          dispatch: true,
          rating: true,
          dispute: true,
        },
      });

      return res.json({ orders });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch orders' });
    }
  }

  // Get single order
  static async getOrderById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
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
          escrowTransaction: true,
          hubIntake: true,
          dispatch: true,
          rating: true,
          dispute: true,
        },
      });

      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Calculate route details
      const routeInfo = LogisticsService.generateRouteDetails(
        order.id,
        order.deliveryType,
        order.buyer?.buyerProfile?.city || undefined
      );

      return res.json({ order, routeInfo });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch order' });
    }
  }

  // Buyer Confirms Receipt -> triggers escrow release to farmer!
  static async confirmReceipt(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'buyer') {
        return res.status(403).json({ error: 'Only the ordering buyer can confirm receipt' });
      }

      const { id } = req.params;
      const order = await prisma.order.findUnique({ where: { id } });

      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyerId !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized to confirm receipt for this order' });
      }

      const releaseResult = await EscrowService.release(id);

      return res.json({
        success: true,
        message: 'Receipt confirmed! Escrow payment has been released to the farmer.',
        escrow: releaseResult,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to confirm receipt' });
    }
  }

  // Buyer submits rating and review
  static async submitRating(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'buyer') {
        return res.status(403).json({ error: 'Only buyers can submit reviews' });
      }

      const { orderId, rating, qualityRating, deliveryRating, comment } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { listing: { include: { farmer: { include: { farmerProfile: true } } } } },
      });

      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyerId !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized for this order' });
      }

      const farmerProfileId = order.listing.farmer.farmerProfile?.id;
      if (!farmerProfileId) {
        return res.status(400).json({ error: 'Farmer profile not found for rating' });
      }

      const newRating = await prisma.rating.create({
        data: {
          orderId,
          authorId: req.user.userId,
          farmerId: farmerProfileId,
          rating: parseInt(rating, 10) || 5,
          qualityRating: parseInt(qualityRating, 10) || 5,
          deliveryRating: parseInt(deliveryRating, 10) || 5,
          comment: comment || '',
        },
      });

      return res.status(201).json({
        message: 'Thank you for rating this produce and farmer!',
        rating: newRating,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to submit rating' });
    }
  }

  // Raise dispute
  static async raiseDispute(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, reason } = req.body;
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) return res.status(404).json({ error: 'Order not found' });

      const dispute = await prisma.dispute.create({
        data: {
          orderId,
          reason,
          status: 'OPEN',
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'DISPUTED' },
      });

      return res.status(201).json({
        message: 'Dispute recorded. Our Hub Operations team will review and resolve.',
        dispute,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to raise dispute' });
    }
  }

  // Dynamic logistics threshold check API for interactive UI slider
  static async checkLogisticsThreshold(req: Request, res: Response) {
    try {
      const { cropId, quantity, unit = 'kg' } = req.query;
      if (!cropId || !quantity) {
        return res.status(400).json({ error: 'cropId and quantity required' });
      }

      const result = await LogisticsService.evaluateDeliveryType(
        cropId as string,
        parseFloat(quantity as string),
        unit as string
      );

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default OrdersController;
