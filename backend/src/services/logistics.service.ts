import prisma from '../prisma.js';

export interface DeliveryThresholdCheck {
  cropId: string;
  cropName: string;
  requestedQuantityKg: number;
  thresholdQuintals: number;
  thresholdKg: number;
  deliveryType: 'FARM_DIRECT' | 'HUB_CONSOLIDATED';
  intakeLane: 'FARMER_DROPOFF' | 'LOGISTICS_PICKUP';
  title: string;
  description: string;
  badgeColor: string;
  estimatedDeliveryDays: number;
  logisticsFee: number;
}

export class LogisticsService {
  // Check delivery mode dynamically from DB crop_thresholds table
  static async evaluateDeliveryType(cropId: string, quantity: number, unit: string = 'kg'): Promise<DeliveryThresholdCheck> {
    const crop = await prisma.crop.findUnique({
      where: { id: cropId },
      include: { threshold: true },
    });

    if (!crop) throw new Error(`Crop ${cropId} not found`);

    // 1 Quintal = 100 kg
    const quantityKg = unit.toLowerCase() === 'quintal' ? quantity * 100 : quantity;
    const thresholdQuintals = crop.threshold?.quintalEquivalentThreshold ?? 0.5;
    const thresholdKg = thresholdQuintals * 100; // e.g. 0.5 quintal = 50 kg

    const isLargeOrder = quantityKg >= thresholdKg;

    if (isLargeOrder) {
      return {
        cropId,
        cropName: crop.name,
        requestedQuantityKg: quantityKg,
        thresholdQuintals,
        thresholdKg,
        deliveryType: 'FARM_DIRECT',
        intakeLane: 'LOGISTICS_PICKUP',
        title: 'Farm-Direct Express Pickup',
        description: `Order quantity (${quantityKg} kg) reaches the ${thresholdQuintals} quintal (${thresholdKg} kg) threshold. Dedicated Farm-Direct truck dispatched directly from farm to delivery hub.`,
        badgeColor: 'amber',
        estimatedDeliveryDays: 1,
        logisticsFee: 150,
      };
    } else {
      return {
        cropId,
        cropName: crop.name,
        requestedQuantityKg: quantityKg,
        thresholdQuintals,
        thresholdKg,
        deliveryType: 'HUB_CONSOLIDATED',
        intakeLane: 'FARMER_DROPOFF',
        title: 'Hub-Consolidated Routing',
        description: `Order quantity (${quantityKg} kg) is below ${thresholdQuintals} quintal (${thresholdKg} kg). Produce is dropped at local collection hub, graded, and consolidated with other regional orders for optimal transport.`,
        badgeColor: 'emerald',
        estimatedDeliveryDays: 2,
        logisticsFee: 40,
      };
    }
  }

  // Simulate routing coordinates and ETA for order tracking
  static generateRouteDetails(orderId: string, deliveryType: string, destinationCity?: string) {
    const hubLocation = { name: 'Nashik Central Agri-Hub', lat: 19.9975, lng: 73.7898 };
    const destination = { name: destinationCity || 'Mumbai APMC Terminal', lat: 19.076, lng: 72.8777 };

    const distanceKm = deliveryType === 'FARM_DIRECT' ? 142 : 165;
    const etaHours = deliveryType === 'FARM_DIRECT' ? '3h 45m' : '6h 15m';

    const waypoints = [
      { name: 'Farmer Gate', status: 'COMPLETED', time: '08:30 AM' },
      { name: 'District Weighing & Cold Intake', status: 'COMPLETED', time: '11:00 AM' },
      { name: 'Central Grading Hub', status: 'IN_PROGRESS', time: '01:15 PM' },
      { name: 'Out for Express Dispatch', status: 'PENDING', time: '03:30 PM' },
      { name: 'Buyer Delivery Point', status: 'PENDING', time: `ETA ${etaHours}` },
    ];

    return {
      distanceKm,
      etaHours,
      origin: hubLocation,
      destination,
      waypoints,
    };
  }
}

export default LogisticsService;
