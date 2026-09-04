import { Request, Response } from 'express';
import prisma from '../prisma.js';

export class MandiController {
  // Get all crops with threshold configs
  static async getCrops(req: Request, res: Response) {
    try {
      const crops = await prisma.crop.findMany({
        include: { threshold: true },
        orderBy: { name: 'asc' },
      });
      return res.json({ crops });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch crops' });
    }
  }

  // Get APMC Mandi benchmark prices
  static async getMandiPrices(req: Request, res: Response) {
    try {
      const { cropId, region } = req.query;
      const where: any = {};
      if (cropId) where.cropId = cropId as string;
      if (region) where.region = { contains: region as string };

      const mandiPrices = await prisma.mandiReferencePrice.findMany({
        where,
        include: { crop: true },
        orderBy: { reportedDate: 'desc' },
      });

      return res.json({ mandiPrices });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch mandi prices' });
    }
  }

  // AI Fair Price Recommendation Engine
  static async getFairPriceRecommendation(req: Request, res: Response) {
    try {
      const { cropId, grade = 'A' } = req.query;

      if (!cropId) {
        return res.status(400).json({ error: 'cropId is required' });
      }

      const crop = await prisma.crop.findUnique({
        where: { id: cropId as string },
        include: {
          threshold: true,
          mandiPrices: {
            orderBy: { reportedDate: 'desc' },
            take: 5,
          },
        },
      });

      if (!crop) return res.status(404).json({ error: 'Crop not found' });

      // 1. Calculate APMC benchmark modal price
      let apmcBenchmark = crop.basePricePerKg;
      if (crop.mandiPrices && crop.mandiPrices.length > 0) {
        const sum = crop.mandiPrices.reduce((acc, m) => acc + m.modalPrice, 0);
        apmcBenchmark = parseFloat((sum / crop.mandiPrices.length).toFixed(2));
      }

      // 2. Calculate platform historical transaction average
      const recentOrders = await prisma.order.findMany({
        where: {
          listing: { cropId: crop.id },
          status: { in: ['COMPLETED', 'DISPATCHED', 'HUB_VERIFIED'] },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      let platformAvg = apmcBenchmark;
      if (recentOrders.length > 0) {
        const orderSum = recentOrders.reduce((acc, o) => acc + o.unitPrice, 0);
        platformAvg = parseFloat((orderSum / recentOrders.length).toFixed(2));
      }

      // 3. Weighted Fair Price
      const fairBenchmark = parseFloat((apmcBenchmark * 0.6 + platformAvg * 0.4).toFixed(2));

      // Grade Adjustment
      let gradeMultiplier = 1.0;
      if ((grade as string).toUpperCase() === 'B') gradeMultiplier = 0.88;
      if ((grade as string).toUpperCase() === 'C') gradeMultiplier = 0.72;

      const adjustedFair = parseFloat((fairBenchmark * gradeMultiplier).toFixed(2));
      const minRecommended = parseFloat((adjustedFair * 0.94).toFixed(2));
      const maxRecommended = parseFloat((adjustedFair * 1.08).toFixed(2));

      return res.json({
        cropName: crop.name,
        unit: crop.unit,
        selectedGrade: grade,
        apmcBenchmark,
        platformAvg,
        fairBenchmark: adjustedFair,
        recommendedRange: {
          min: minRecommended,
          max: maxRecommended,
        },
        recentMandiFeeds: crop.mandiPrices,
        advice: `Based on current ${crop.mandiPrices[0]?.region || 'APMC'} market arrivals and platform buyer demand, listing between ₹${minRecommended} and ₹${maxRecommended} per ${crop.unit} maximizes both rapid order clearance and farmer margin.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to calculate price recommendation' });
    }
  }
}

export default MandiController;
