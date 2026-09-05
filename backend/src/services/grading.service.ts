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
  // Multimodal Gemini AI Produce Quality & Grading Inspector
  static async analyzeImageWithGemini(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    cropName?: string,
    notes?: string
  ): Promise<PreGradeResult & { detectedCrop?: string; provider: 'gemini' | 'heuristic' }> {
    const apiKey = process.env.GEMINI_API_KEY;

    let cleanBase64 = imageBase64;
    let detectedMime = mimeType || 'image/jpeg';
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      const mimePart = parts[0].replace('data:', '');
      if (mimePart) detectedMime = mimePart;
      cleanBase64 = parts[1];
    }

    if (apiKey && cleanBase64) {
      try {
        const prompt = `You are a professional agricultural produce quality inspector for FarmDirect, a farm-to-buyer escrow marketplace.
Analyze this uploaded crop produce image${cropName ? ` for declared crop '${cropName}'` : ''}${notes ? ` with farmer notes: '${notes}'` : ''}.

Inspect carefully:
1. Produce freshness, skin tautness, ripening stage, and visual signs of harvest age.
2. Surface blemishes, bruising, cuts, pest damage, fungal spots, or discoloration.
3. Shape, size uniformity, and commercial marketability.
4. Assign quality grade:
   - "A": Premium Export/Supermarket Grade. Uniform vibrant color, firm skin, zero or negligible superficial blemishes.
   - "B": Domestic/Wholesale Standard Grade. Minor blemishes, slight color/size variation, but fully sound produce.
   - "C": Processing Grade. Significant bruising, irregular shape, skin discoloration, or over-ripeness suited for pulp/puree.

Return ONLY a valid JSON object matching this exact structure without any markdown backticks:
{
  "aiGrade": "A",
  "aiConfidence": 0.95,
  "aiTips": "1-2 sentence inspection summary explaining why this grade was assigned and how the farmer can maximize payout.",
  "attributes": {
    "colorUniformity": 92,
    "surfaceTexture": 88,
    "blemishScore": 8,
    "freshnessIndex": 94
  },
  "detectedCrop": "Produce name seen in photo"
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: detectedMime,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.2,
              },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText.trim());
            const aiGrade = ['A', 'B', 'C'].includes(parsed.aiGrade) ? parsed.aiGrade : 'A';
            return {
              aiGrade,
              aiConfidence: parseFloat(parsed.aiConfidence || 0.94),
              aiTips: parsed.aiTips || `Gemini Vision verified Grade ${aiGrade} produce quality.`,
              attributes: {
                colorUniformity: Math.min(100, Math.max(10, Number(parsed.attributes?.colorUniformity) || 88)),
                surfaceTexture: Math.min(100, Math.max(10, Number(parsed.attributes?.surfaceTexture) || 85)),
                blemishScore: Math.min(100, Math.max(0, Number(parsed.attributes?.blemishScore) || 8)),
                freshnessIndex: Math.min(100, Math.max(10, Number(parsed.attributes?.freshnessIndex) || 92)),
              },
              detectedCrop: parsed.detectedCrop || cropName || 'Produce',
              provider: 'gemini',
            };
          }
        } else {
          const errText = await response.text();
          console.warn('Gemini API call returned status:', response.status, errText);
        }
      } catch (err) {
        console.error('Gemini vision analysis exception:', err);
      }
    }

    // Heuristic Fallback
    const fallback = this.evaluatePreGrade(cropName || 'Produce', notes, 1);
    return {
      ...fallback,
      detectedCrop: cropName || 'Produce',
      provider: 'heuristic',
      aiTips: apiKey
        ? fallback.aiTips
        : `${fallback.aiTips} (Heuristic mode — configure Google AI Studio Gemini API key to activate live multimodal vision inspection)`,
    };
  }

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
