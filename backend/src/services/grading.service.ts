import prisma from '../prisma.js';

export interface PreGradeResult {
  aiGrade: 'A' | 'B' | 'C';
  aiConfidence: number;
  aiTips: string;
  attributes: {
    colorUniformity: number; // 0 - 100
    surfaceTexture: number;
    blemishScore: number;
    freshnessIndex: number;
  };
}

export interface DiscrepancyResult {
  hasDiscrepancy: boolean;
  originalGrade: string;
  confirmedGrade: string;
  originalWeight: number;
  actualWeight: number;
  originalUnitPrice: number;
  adjustedUnitPrice: number;
  originalTotal: number;
  adjustedTotal: number;
  priceDelta: number; // positive means buyer refund
  notes: string;
}

export class GradingService {
  // Simulated CV Pre-grade heuristic algorithm
  static evaluatePreGrade(cropName: string, notes?: string, photoCount: number = 1): PreGradeResult {
    // Generate deterministic yet varied heuristic scoring based on crop and metadata
    const seed = (cropName.length * 17 + (notes ? notes.length * 3 : 21) + photoCount * 13) % 100;

    let aiGrade: 'A' | 'B' | 'C' = 'A';
    let confidence = 0.94;
    let tips = 'Optimal color saturation and uniform shape. High commercial value Grade A.';

    if (seed < 55) {
      aiGrade = 'A';
      confidence = 0.90 + (seed % 9) / 100;
      tips = 'Excellent produce quality. Color uniformity and skin tautness match Grade A export benchmark.';
    } else if (seed < 85) {
      aiGrade = 'B';
      confidence = 0.82 + (seed % 10) / 100;
      tips = 'Moderate size variance detected. Improve lighting and angle to capture clean skin surfaces.';
    } else {
      aiGrade = 'C';
      confidence = 0.78 + (seed % 12) / 100;
      tips = 'Surface discoloration and slight bruising noticed. Ensure sorting before packaging to lift grade rating.';
    }

    return {
      aiGrade,
      aiConfidence: parseFloat(confidence.toFixed(2)),
      aiTips: tips,
      attributes: {
        colorUniformity: 70 + (seed % 28),
        surfaceTexture: 72 + ((seed * 3) % 25),
        blemishScore: (100 - seed) % 30,
        freshnessIndex: 80 + (seed % 19),
      },
    };
  }

  // Grade multiplier matrix
  static getGradeMultiplier(grade: string): number {
    switch (grade.toUpperCase()) {
      case 'A':
        return 1.0;
      case 'B':
        return 0.88; // 12% discount for Grade B
      case 'C':
        return 0.72; // 28% discount for Grade C
      default:
        return 1.0;
    }
  }

  // Real Automated Discrepancy Rule Engine
  static async executeDiscrepancyRuleEngine(
    orderId: string,
    actualWeight: number,
    confirmedGrade: 'A' | 'B' | 'C',
    staffNotes?: string,
    staffName?: string
  ): Promise<DiscrepancyResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: { include: { crop: true, farmer: true } },
        buyer: true,
        escrowTransaction: true,
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    const originalGrade = order.listing.aiGrade;
    const originalWeight = order.quantity;
    const originalUnitPrice = order.unitPrice;
    const originalTotal = order.totalAmount;

    // Check if there is grade or weight difference
    const gradeChanged = originalGrade.toUpperCase() !== confirmedGrade.toUpperCase();
    const weightChanged = Math.abs(originalWeight - actualWeight) > 0.05;
    const hasDiscrepancy = gradeChanged || weightChanged;

    let adjustedUnitPrice = originalUnitPrice;
    if (gradeChanged) {
      const origMultiplier = this.getGradeMultiplier(originalGrade);
      const newMultiplier = this.getGradeMultiplier(confirmedGrade);
      const basePrice = originalUnitPrice / origMultiplier;
      adjustedUnitPrice = parseFloat((basePrice * newMultiplier).toFixed(2));
    }

    const adjustedTotal = parseFloat((adjustedUnitPrice * actualWeight).toFixed(2));
    const priceDelta = parseFloat((originalTotal - adjustedTotal).toFixed(2));

    const discrepancyDetails: DiscrepancyResult = {
      hasDiscrepancy,
      originalGrade,
      confirmedGrade,
      originalWeight,
      actualWeight,
      originalUnitPrice,
      adjustedUnitPrice,
      originalTotal,
      adjustedTotal,
      priceDelta,
      notes: staffNotes || (hasDiscrepancy ? 'Automated price recalculation applied by Hub rule engine' : 'Produce matched listing grade & weight specifications'),
    };

    // Update HubIntake record
    await prisma.hubIntake.upsert({
      where: { orderId },
      create: {
        orderId,
        lane: order.deliveryType === 'FARM_DIRECT' ? 'FARMER_DROPOFF' : 'LOGISTICS_PICKUP',
        receivedWeight: actualWeight,
        confirmedGrade,
        discrepancyNotes: JSON.stringify(discrepancyDetails),
        inspectedAt: new Date(),
        staffName: staffName || 'Hub Inspector',
      },
      update: {
        receivedWeight: actualWeight,
        confirmedGrade,
        discrepancyNotes: JSON.stringify(discrepancyDetails),
        inspectedAt: new Date(),
        staffName: staffName || 'Hub Inspector',
      },
    });

    // Update Order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'HUB_VERIFIED',
        quantity: actualWeight,
        unitPrice: adjustedUnitPrice,
        totalAmount: adjustedTotal,
        discrepancyAdjusted: hasDiscrepancy,
        discrepancyDetails: JSON.stringify(discrepancyDetails),
      },
    });

    // If buyer is owed a refund due to discrepancy, update escrow transaction held amount or queue refund
    if (hasDiscrepancy && priceDelta > 0) {
      await prisma.escrowTransaction.update({
        where: { orderId },
        data: {
          amount: adjustedTotal,
          notes: `Escrow adjusted from ₹${originalTotal} to ₹${adjustedTotal}. Refund of ₹${priceDelta} credited to buyer.`,
        },
      });
    }

    // Auto-notify Farmer and Buyer
    if (hasDiscrepancy) {
      await prisma.notification.createMany({
        data: [
          {
            userId: order.buyerId,
            title: '⚖️ Hub Inspection: Order Adjusted',
            message: `Your order for ${order.listing.crop.name} was inspected at the Hub. Confirmed Grade: ${confirmedGrade} (${actualWeight} ${order.unit}). Total adjusted from ₹${originalTotal} to ₹${adjustedTotal} (₹${Math.abs(priceDelta)} ${priceDelta >= 0 ? 'refund queued' : 'surcharge'}).`,
            type: 'WARNING',
            link: `/buyer/orders/${orderId}`,
          },
          {
            userId: order.listing.farmerId,
            title: '🔍 Hub Produce Inspection Summary',
            message: `Order #${orderId.slice(0, 8)} inspected. Confirmed Grade: ${confirmedGrade}, Actual Weight: ${actualWeight} ${order.unit}. Settlement adjusted to ₹${adjustedTotal}.`,
            type: 'INFO',
            link: `/farmer/orders`,
          },
        ],
      });
    } else {
      await prisma.notification.createMany({
        data: [
          {
            userId: order.buyerId,
            title: '✅ Quality Verified at Hub',
            message: `Your ${order.listing.crop.name} has passed Hub Quality Grading with Grade ${confirmedGrade}. Ready for dispatch!`,
            type: 'SUCCESS',
            link: `/buyer/orders/${orderId}`,
          },
          {
            userId: order.listing.farmerId,
            title: '✅ Produce Verified at Hub',
            message: `Order #${orderId.slice(0, 8)} passed grading with Grade ${confirmedGrade} (${actualWeight} ${order.unit}).`,
            type: 'SUCCESS',
            link: `/farmer/orders`,
          },
        ],
      });
    }

    return discrepancyDetails;
  }
}

export default GradingService;
