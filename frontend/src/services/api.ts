// API client with credentials support

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  requestOtp: (email: string, role?: string) =>
    request<{ success: boolean; message: string; cooldown: number; isNewUser: boolean }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  verifyOtp: (email: string, code: string) =>
    request<{ verified: boolean; user?: any; token?: string; isNewUser: boolean; onboardingToken?: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  completeFarmerOnboarding: (data: any) =>
    request<{ user: any; token: string }>('/auth/onboard/farmer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeBuyerOnboarding: (data: any) =>
    request<{ user: any; token: string }>('/auth/onboard/buyer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  demoLogin: (role: string) =>
    request<{ user: any; token?: string; accessToken?: string }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  getDevOtp: (email: string) =>
    request<{ email: string; otp: string | null }>('/auth/dev-otp?email=' + encodeURIComponent(email)),

  me: () => request<{ user: any }>('/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Listings
  getListings: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return request<{ total: number; page: number; totalPages: number; listings: any[] }>(`/listings?${query.toString()}`);
  },

  getListingById: (id: string) => request<any>(`/listings/${id}`),

  createListing: (data: any) =>
    request<{ message: string; listing: any }>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateListing: (id: string, data: any) =>
    request<{ listing: any }>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteListing: (id: string) =>
    request<{ message: string }>(`/listings/${id}`, { method: 'DELETE' }),

  previewPreGrade: (data: { cropName: string; notes?: string; photoCount?: number }) =>
    request<any>('/listings/preview-grade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Orders
  createOrder: (data: { items: { listingId: string; quantity: number }[]; deliveryAddress?: string; deliveryPincode?: string }) =>
    request<{ message: string; orders: any[] }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: (status?: string) =>
    request<{ orders: any[] }>(`/orders${status ? `?status=${status}` : ''}`),

  getOrderById: (id: string) => request<{ order: any; routeInfo: any }>(`/orders/${id}`),

  confirmReceipt: (id: string) =>
    request<{ success: boolean; message: string; escrow: any }>(`/orders/${id}/confirm-receipt`, {
      method: 'POST',
    }),

  submitRating: (data: { orderId: string; rating: number; qualityRating: number; deliveryRating: number; comment: string }) =>
    request<{ message: string; rating: any }>('/orders/rate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  raiseDispute: (data: { orderId: string; reason: string }) =>
    request<{ message: string; dispute: any }>('/orders/dispute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkLogistics: (cropId: string, quantity: number, unit = 'kg') =>
    request<any>(`/orders/logistics-check?cropId=${cropId}&quantity=${quantity}&unit=${unit}`),

  // Payments & Escrow
  createPaymentOrder: (orderIds: string[], amount: number) =>
    request<any>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ orderIds, amount }),
    }),

  verifyPayment: (data: any) =>
    request<any>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  simulateSandboxPayment: (orderIds: string[]) =>
    request<any>('/payments/simulate', {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    }),

  // Hub Operations & Admin Intelligence
  getAdminAnalytics: () =>
    request<{
      users: { total: number; farmers: number; individualBuyers: number; bulkFpoBuyers: number; admins: number };
      financials: { totalGMV: number; totalCommissionEarned: number; escrowHeld: number; escrowReleased: number; escrowRefunded: number };
      operations: { totalOrders: number; ordersByStatus: Record<string, number>; totalWeightKg: number; totalWeightQuintals: number; activeListingsCount: number; discrepancyOrdersCount: number; discrepancyRate: number };
      topCrops: any[];
    }>('/hub/analytics'),

  getAdminUsers: (params: { role?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    return request<{ total: number; users: any[] }>(`/hub/users?${query.toString()}`);
  },

  getPurchasesLedger: (params: { cropId?: string; status?: string; search?: string; buyerType?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.cropId) query.append('cropId', params.cropId);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.buyerType) query.append('buyerType', params.buyerType);
    return request<{ total: number; purchases: any[] }>(`/hub/purchases?${query.toString()}`);
  },

  getIntakeQueue: (lane?: string) =>
    request<{ total: number; dropoffLane: any[]; pickupLane: any[] }>(`/hub/intake${lane ? `?lane=${lane}` : ''}`),

  gradeProduce: (data: { orderId: string; actualWeight: number; confirmedGrade: string; staffNotes?: string }) =>
    request<any>('/hub/grade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDispatchBoard: () =>
    request<{ kanban: Record<string, any[]>; total: number }>('/hub/dispatch'),

  updateDispatch: (data: any) =>
    request<any>('/hub/dispatch', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getThresholdConfig: () =>
    request<{ thresholds: any[] }>('/hub/thresholds'),

  updateThresholdConfig: (data: { cropId: string; quintalThreshold: number; commissionPercentage: number }) =>
    request<any>('/hub/thresholds', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getDisputes: () =>
    request<{ disputes: any[] }>('/hub/disputes'),

  resolveDispute: (data: { disputeId: string; action: string; refundAmount?: number; resolutionNotes?: string }) =>
    request<any>('/hub/disputes/resolve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Farmer
  getFarmerDashboard: () =>
    request<{ stats: any; recentActivity: any[] }>('/farmer/dashboard'),

  getFarmerPayouts: () =>
    request<{ totalSettled: number; totalPendingEscrow: number; payouts: any[] }>('/farmer/payouts'),

  updateFarmerProfile: (data: any) =>
    request<any>('/farmer/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Mandi
  getCrops: () => request<{ crops: any[] }>('/mandi/crops'),

  getMandiPrices: (cropId?: string) =>
    request<{ mandiPrices: any[] }>(`/mandi/prices${cropId ? `?cropId=${cropId}` : ''}`),

  getFairPriceRecommendation: (cropId: string, grade = 'A') =>
    request<any>(`/mandi/recommendation?cropId=${cropId}&grade=${grade}`),

  // AI Engines: Demand Forecasting & Route Optimization
  getDemandForecast: (params: { horizonDays?: number; region?: string; eventShock?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.horizonDays) query.append('horizonDays', String(params.horizonDays));
    if (params.region) query.append('region', params.region);
    if (params.eventShock !== undefined) query.append('eventShock', String(params.eventShock));
    return request<any>(`/hub/ai/forecast?${query.toString()}`);
  },

  getOptimizedRoutes: () =>
    request<any>('/hub/ai/optimize-routes'),

  getFarmerDemandAdvisory: () =>
    request<any>('/farmer/demand-advisory'),
};

export default api;
