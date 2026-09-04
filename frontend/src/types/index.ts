export type UserRole = 'farmer' | 'buyer' | 'hub_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  farmerProfile?: FarmerProfile;
  buyerProfile?: BuyerProfile;
  notifications?: Notification[];
}

export interface FarmerProfile {
  id: string;
  userId: string;
  village: string;
  pincode: string;
  district?: string;
  state?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  preferredLanguage: string;
  verified: boolean;
}

export interface BuyerProfile {
  id: string;
  userId: string;
  buyerType: 'INDIVIDUAL' | 'BULK_FPO';
  orgName?: string;
  gstin?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface Crop {
  id: string;
  name: string;
  category: string;
  unit: string;
  basePricePerKg: number;
  description?: string;
  threshold?: CropThreshold;
}

export interface CropThreshold {
  id: string;
  cropId: string;
  quintalEquivalentThreshold: number; // e.g. 0.5 quintal = 50kg
  commissionPercentage: number;
}

export interface Listing {
  id: string;
  farmerId: string;
  cropId: string;
  crop: Crop;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  harvestDate: string;
  aiGrade: 'A' | 'B' | 'C';
  aiConfidence: number;
  aiTips?: string;
  status: 'ACTIVE' | 'PAUSED' | 'SOLD_OUT';
  photos: string[];
  notes?: string;
  farmLocation?: string;
  farmer: {
    id: string;
    name: string;
    phone?: string;
    village?: string;
    district?: string;
    state?: string;
    averageRating?: number;
    ratingsCount?: number;
  };
}

export interface Order {
  id: string;
  buyerId: string;
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    buyerProfile?: BuyerProfile;
  };
  listingId: string;
  listing: Listing;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  commissionAmount: number;
  deliveryType: 'FARM_DIRECT' | 'HUB_CONSOLIDATED';
  status: 'PLACED' | 'ESCROW_HELD' | 'HUB_VERIFIED' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED';
  deliveryAddress?: string;
  deliveryPincode?: string;
  discrepancyAdjusted: boolean;
  discrepancyDetails?: string;
  createdAt: string;
  escrowTransaction?: EscrowTransaction;
  hubIntake?: HubIntake;
  dispatch?: Dispatch;
  rating?: Rating;
  dispute?: Dispute;
}

export interface EscrowTransaction {
  id: string;
  orderId: string;
  status: 'HELD' | 'RELEASED' | 'REFUNDED';
  gatewayRef?: string;
  payoutTxRef?: string;
  amount: number;
  heldAt: string;
  releasedAt?: string;
  refundedAt?: string;
  notes?: string;
}

export interface HubIntake {
  id: string;
  orderId: string;
  lane: 'FARMER_DROPOFF' | 'LOGISTICS_PICKUP';
  receivedWeight?: number;
  confirmedGrade?: 'A' | 'B' | 'C';
  discrepancyNotes?: string;
  inspectedAt?: string;
  staffName?: string;
}

export interface Dispatch {
  id: string;
  orderId: string;
  status: 'READY' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  route?: string;
  vehicleId?: string;
  driverName?: string;
  driverPhone?: string;
  eta?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

export interface Rating {
  id: string;
  rating: number;
  qualityRating: number;
  deliveryRating: number;
  comment?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED_REFUND' | 'RESOLVED_PARTIAL' | 'RESOLVED_REGRADE';
  refundAmount?: number;
  resolutionNotes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface CartItem {
  listing: Listing;
  quantity: number;
}
