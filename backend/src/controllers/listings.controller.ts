import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import GradingService from '../services/grading.service.js';

export class ListingsController {
  // Public marketplace query with full filtering, sorting & search
  static async getListings(req: Request, res: Response) {
    try {
      const {
        search,
        category,
        cropId,
        grade,
        minPrice,
        maxPrice,
        deliveryType,
        farmerId,
        status = 'ACTIVE',
        sortBy = 'freshness',
        page = '1',
        limit = '20',
      } = req.query;

      const where: any = {};

      if (status) {
        where.status = status as string;
      }

      if (farmerId) {
        where.farmerId = farmerId as string;
      }

      if (cropId) {
        where.cropId = cropId as string;
      }

      if (grade) {
        where.aiGrade = (grade as string).toUpperCase();
      }

      if (minPrice || maxPrice) {
        where.pricePerUnit = {};
        if (minPrice) where.pricePerUnit.gte = parseFloat(minPrice as string);
        if (maxPrice) where.pricePerUnit.lte = parseFloat(maxPrice as string);
      }

      if (category) {
        where.crop = { category: category as string };
      }

      if (search) {
        const searchTerm = (search as string).trim();
        where.OR = [
          { crop: { name: { contains: searchTerm } } },
          { notes: { contains: searchTerm } },
          { farmLocation: { contains: searchTerm } },
          { farmer: { name: { contains: searchTerm } } },
        ];
      }

      // Sorting
      let orderBy: any = { harvestDate: 'desc' };
      if (sortBy === 'price_asc') orderBy = { pricePerUnit: 'asc' };
      else if (sortBy === 'price_desc') orderBy = { pricePerUnit: 'desc' };
      else if (sortBy === 'freshness') orderBy = { harvestDate: 'desc' };
      else if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };

      const pageNum = parseInt(page as string, 10) || 1;
      const take = parseInt(limit as string, 10) || 20;
      const skip = (pageNum - 1) * take;

      const [total, listings] = await Promise.all([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            crop: { include: { threshold: true } },
            farmer: {
              include: {
                farmerProfile: {
                  include: {
                    ratingsReceived: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      // Enhance listings with parsed photos and farmer ratings
      const formattedListings = listings.map((item) => {
        let photosArray: string[] = [];
        try {
          photosArray = JSON.parse(item.photos);
        } catch {
          photosArray = item.photos ? item.photos.split(',') : [];
        }

        const ratings = item.farmer.farmerProfile?.ratingsReceived || [];
        const avgRating = ratings.length
          ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
          : 4.8;

        return {
          ...item,
          photos: photosArray,
          farmer: {
            id: item.farmer.id,
            name: item.farmer.name,
            phone: item.farmer.phone,
            village: item.farmer.farmerProfile?.village || 'Nashik',
            district: item.farmer.farmerProfile?.district || 'Nashik',
            state: item.farmer.farmerProfile?.state || 'Maharashtra',
            averageRating: parseFloat(avgRating.toFixed(1)),
            ratingsCount: ratings.length,
          },
        };
      });

      return res.json({
        total,
        page: pageNum,
        totalPages: Math.ceil(total / take),
        listings: formattedListings,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch listings' });
    }
  }

  // Get single listing with details
  static async getListingById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const listing = await prisma.listing.findUnique({
        where: { id },
        include: {
          crop: {
            include: {
              threshold: true,
              mandiPrices: {
                orderBy: { reportedDate: 'desc' },
                take: 5,
              },
            },
          },
          farmer: {
            include: {
              farmerProfile: {
                include: {
                  ratingsReceived: {
                    include: { author: { select: { name: true } } },
                    take: 5,
                  },
                },
              },
            },
          },
        },
      });

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      let photosArray: string[] = [];
      try {
        photosArray = JSON.parse(listing.photos);
      } catch {
        photosArray = listing.photos ? listing.photos.split(',') : [];
      }

      return res.json({
        ...listing,
        photos: photosArray,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch listing' });
    }
  }

  // Create listing with AI pre-grading & custom crop variety support
  static async createListing(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'farmer') {
        return res.status(403).json({ error: 'Only registered farmers can post listings' });
      }

      let {
        cropId,
        customCropName,
        customCropCategory,
        quantity,
        unit = 'kg',
        pricePerUnit,
        harvestDate,
        photos,
        notes,
        farmLocation,
        aiGrade: clientGrade,
        aiConfidence: clientConfidence,
        aiTips: clientTips,
      } = req.body;

      if ((!cropId || cropId === '__custom__') && !customCropName) {
        return res.status(400).json({ error: 'Please select a crop variety or enter your custom crop name' });
      }
      if (!quantity || !pricePerUnit || !harvestDate) {
        return res.status(400).json({ error: 'Missing required listing parameters (quantity, price, harvest date)' });
      }

      let resolvedCrop: any = null;

      if (cropId && cropId !== '__custom__') {
        resolvedCrop = await prisma.crop.findUnique({ where: { id: cropId } });
      }

      // If custom crop variety was provided by farmer
      if (!resolvedCrop && customCropName) {
        const trimmedName = customCropName.trim();
        resolvedCrop = await prisma.crop.findFirst({ where: { name: { equals: trimmedName } } });

        if (!resolvedCrop) {
          resolvedCrop = await prisma.crop.create({
            data: {
              name: trimmedName,
              category: customCropCategory || 'Vegetables',
              unit,
              basePricePerKg: parseFloat(pricePerUnit) || 30.0,
              description: `Farmer registered custom variety: ${trimmedName}`,
              threshold: {
                create: {
                  quintalEquivalentThreshold: 0.5,
                  commissionPercentage: 5.0,
                },
              },
            },
          });
        }
      }

      if (!resolvedCrop) {
        return res.status(400).json({ error: 'Invalid crop selected. Please choose an existing crop or specify a custom name.' });
      }

      const photoList = Array.isArray(photos) ? photos : [photos || '/sample_crop.jpg'];

      // If Gemini AI pre-grade was already generated on image upload, use it
      let aiGrade = clientGrade || 'A';
      let aiConfidence = clientConfidence ? parseFloat(clientConfidence) : 0.94;
      let aiTips = clientTips || null;

      if (!clientGrade) {
        const preGrade = GradingService.evaluatePreGrade(resolvedCrop.name, notes, photoList.length);
        aiGrade = preGrade.aiGrade;
        aiConfidence = preGrade.aiConfidence;
        aiTips = preGrade.aiTips;
      }

      const listing = await prisma.listing.create({
        data: {
          farmerId: req.user.userId,
          cropId: resolvedCrop.id,
          quantity: parseFloat(quantity),
          unit,
          pricePerUnit: parseFloat(pricePerUnit),
          harvestDate: new Date(harvestDate),
          aiGrade,
          aiConfidence,
          aiTips,
          status: 'ACTIVE',
          photos: JSON.stringify(photoList),
          notes: notes || `Direct farm harvest from ${farmLocation || 'farm gate'}.`,
          farmLocation: farmLocation || 'Farm Gate',
        },
        include: {
          crop: true,
        },
      });

      return res.status(201).json({
        message: 'Produce lot listed successfully on marketplace',
        listing: {
          ...listing,
          photos: photoList,
          preGrade: { aiGrade, aiConfidence, aiTips },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create listing' });
    }
  }

  // Edit listing
  static async updateListing(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const listing = await prisma.listing.findUnique({ where: { id } });

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.farmerId !== req.user?.userId && req.user?.role !== 'hub_admin') {
        return res.status(403).json({ error: 'Unauthorized to modify this listing' });
      }

      const { quantity, pricePerUnit, status, notes } = req.body;

      const updated = await prisma.listing.update({
        where: { id },
        data: {
          ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
          ...(pricePerUnit !== undefined && { pricePerUnit: parseFloat(pricePerUnit) }),
          ...(status !== undefined && { status }),
          ...(notes !== undefined && { notes }),
        },
        include: { crop: true },
      });

      return res.json({ listing: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update listing' });
    }
  }

  // Delete listing
  static async deleteListing(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const listing = await prisma.listing.findUnique({ where: { id } });

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.farmerId !== req.user?.userId && req.user?.role !== 'hub_admin') {
        return res.status(403).json({ error: 'Unauthorized to delete this listing' });
      }

      await prisma.listing.delete({ where: { id } });
      return res.json({ message: 'Listing deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete listing' });
    }
  }

  // Instant AI Pre-Grade Simulation before submitting form
  static async previewPreGrade(req: Request, res: Response) {
    try {
      const { cropName, notes, photoCount } = req.body;
      const result = GradingService.evaluatePreGrade(cropName || 'Produce', notes, photoCount || 1);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Multimodal Gemini AI Produce Quality & Grading Inspector
  static async aiGradeImage(req: Request, res: Response) {
    try {
      const { imageBase64, mimeType, cropName, notes } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Produce image is required for AI grade inspection' });
      }

      const result = await GradingService.analyzeImageWithGemini(imageBase64, mimeType, cropName, notes);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'AI Grading failed' });
    }
  }
}

export default ListingsController;
