import React, { useState, useEffect } from 'react';
import {
  Package,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Star,
  MapPin,
  Clock,
  AlertTriangle,
  FileText,
  MessageSquare,
  Wheat,
  X,
  RefreshCw,
} from 'lucide-react';
import { Order } from '../../types/index.js';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface OrderTrackingProps {
  initialOrderId?: string | null;
  onBrowseMore: () => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ initialOrderId, onBrowseMore }) => {
  const { user, openAuthModal } = useAuth();
  const { success, error: toastError } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rating Modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [qualityScore, setQualityScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  // Dispute Modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getOrders();
      setOrders(res.orders || []);

      if (res.orders && res.orders.length > 0) {
        const target = initialOrderId
          ? res.orders.find((o: Order) => o.id === initialOrderId) || res.orders[0]
          : res.orders[0];
        selectOrder(target.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectOrder = async (orderId: string) => {
    try {
      const res = await api.getOrderById(orderId);
      setSelectedOrder(res.order);
      setRouteInfo(res.routeInfo);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Handle Confirm Receipt -> Releases Escrow to Farmer!
  const handleConfirmReceipt = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await api.confirmReceipt(selectedOrder.id);
      success('Receipt Confirmed!', res.message);
      // Reload order
      await selectOrder(selectedOrder.id);
      // Automatically prompt for rating
      setShowRatingModal(true);
    } catch (err: any) {
      toastError('Confirmation Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Rating
  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await api.submitRating({
        orderId: selectedOrder.id,
        rating: ratingScore,
        qualityRating: qualityScore,
        deliveryRating: 5,
        comment: ratingComment,
      });
      success('Rating Submitted', 'Thank you for supporting our farming community!');
      setShowRatingModal(false);
      await selectOrder(selectedOrder.id);
    } catch (err: any) {
      toastError('Rating Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Raise Dispute
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !disputeReason) return;
    setActionLoading(true);
    try {
      await api.raiseDispute({
        orderId: selectedOrder.id,
        reason: disputeReason,
      });
      success('Dispute Filed', 'Our Hub Operations team has received your request.');
      setShowDisputeModal(false);
      await selectOrder(selectedOrder.id);
    } catch (err: any) {
      toastError('Failed to raise dispute', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-stone-800">Sign In to Track Your Orders</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          Sign in via Email OTP or test with a demo buyer profile to monitor your produce pipeline.
        </p>
        <button
          onClick={() => openAuthModal('buyer')}
          className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow hover:bg-emerald-800 transition"
        >
          Sign In as Buyer
        </button>
      </div>
    );
  }

  // Stepper Stages Calculation
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PLACED': return 0;
      case 'ESCROW_HELD': return 1;
      case 'HUB_VERIFIED': return 2;
      case 'DISPATCHED': return 3;
      case 'DELIVERED': return 4;
      case 'COMPLETED': return 5;
      case 'DISPUTED': return 3;
      default: return 1;
    }
  };

  const steps = [
    { title: 'Order Placed', desc: 'Listing reserved' },
    { title: 'Payment in Escrow', desc: 'Funds secured' },
    { title: 'Hub Verification', desc: 'Grading & weighing' },
    { title: 'Dispatched', desc: 'In express transit' },
    { title: 'Delivered', desc: 'Pending inspection' },
    { title: 'Payment Released', desc: 'Farmer settled' },
  ];

  const currentStage = selectedOrder ? getStageIndex(selectedOrder.status) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Order Tracking & Escrow Ledger</h1>
          <p className="text-xs text-stone-500">Monitor produce inspection, live transit, and release payouts</p>
        </div>
        <button
          onClick={onBrowseMore}
          className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
        >
          Browse More Produce
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Orders List Sidebar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-1">
            Your Orders ({orders.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-stone-500">No orders placed yet</p>
              <button
                onClick={onBrowseMore}
                className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
              >
                Go to Marketplace
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => selectOrder(o.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    selectedOrder?.id === o.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-stone-900">{o.listing?.crop?.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {o.quantity} {o.unit} • ₹{o.totalAmount}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.status === 'DELIVERED'
                        ? 'bg-amber-100 text-amber-900'
                        : o.status === 'DISPATCHED'
                        ? 'bg-sky-100 text-sky-800'
                        : o.status === 'DISPUTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-stone-400">
                    Placed: {new Date(o.createdAt).toLocaleDateString()} • #{o.id.slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Selected Order Detail & Visual Stepper */}
        {selectedOrder ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual Status Stepper (Requirement Section 6) */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
                <div>
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Live Escrow Pipeline
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-900">
                    Order #{selectedOrder.id.slice(0, 8)} — {selectedOrder.listing?.crop?.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-stone-500">Escrow Protected</div>
                  <div className="text-lg font-extrabold text-emerald-950">₹{selectedOrder.totalAmount}</div>
                </div>
              </div>

              {/* Stepper Graphic */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 relative">
                {steps.map((step, idx) => {
                  const isDone = idx <= currentStage;
                  const isCurrent = idx === currentStage;

                  return (
                    <div key={idx} className="flex flex-col items-center text-center relative">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs transition duration-300 shadow-sm ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-stone-400 border border-stone-200'
                        } ${isCurrent ? 'ring-4 ring-emerald-200 scale-105' : ''}`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>

                      <div className="mt-2 text-xs font-bold text-stone-900 leading-tight">
                        {step.title}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">
                        {step.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ACTION: Confirm Receipt Button (Triggers Escrow Release) */}
              {selectedOrder.status === 'DELIVERED' && (
                <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-stone-900 text-sm">Produce Delivered to Your Address</div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        Inspect quality and quantity. Click below to release the ₹{selectedOrder.totalAmount} escrow payment to the farmer.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowDisputeModal(true)}
                      className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded-xl transition"
                    >
                      Report Issue
                    </button>
                    <button
                      onClick={handleConfirmReceipt}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Confirm Receipt & Release Escrow</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Completed Status Banner */}
              {selectedOrder.status === 'COMPLETED' && (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Order Fulfilled & Escrow Settled</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">
                        Farmer payout released. Platform commission deducted.
                      </div>
                    </div>
                  </div>

                  {!selectedOrder.rating && (
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs"
                    >
                      Rate Farmer & Quality
                    </button>
                  )}
                </div>
              )}

              {/* Open Dispute Banner */}
              {selectedOrder.status === 'DISPUTED' && (
                <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs text-rose-950">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-bold">Dispute Under Review</div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      Hub Operations is reviewing this order. Escrow funds are locked until resolved.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hub Inspection & Discrepancy details */}
            {selectedOrder.discrepancyAdjusted && (
              <div className="bg-amber-50 rounded-2xl border border-amber-300 p-5 shadow-sm">
                <div className="flex items-center gap-2 font-extrabold text-amber-950 text-sm mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Hub Inspection & Automated Rule Engine Adjustment</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  During digital scale weighing and quality grading at the Hub, an adjustment was applied:
                </p>
                <div className="mt-3 p-3 bg-white rounded-xl border border-amber-200 text-xs font-mono text-stone-800">
                  {selectedOrder.discrepancyDetails ? (
                    (() => {
                      try {
                        const d = JSON.parse(selectedOrder.discrepancyDetails!);
                        return (
                          <div className="space-y-1">
                            <div>Confirmed Grade: <span className="font-bold">{d.confirmedGrade}</span> (Listed: {d.originalGrade})</div>
                            <div>Actual Scale Weight: <span className="font-bold">{d.actualWeight} {selectedOrder.unit}</span> (Listed: {d.originalWeight})</div>
                            <div>Adjusted Price: ₹{d.adjustedTotal} (Original: ₹{d.originalTotal})</div>
                            <div className="text-emerald-700 font-bold mt-1">Rule action: {d.notes}</div>
                          </div>
                        );
                      } catch {
                        return selectedOrder.discrepancyDetails;
                      }
                    })()
                  ) : null}
                </div>
              </div>
            )}

            {/* Live Route & Driver Information */}
            {routeInfo && selectedOrder.dispatch && (
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    Dispatch Route & Carrier
                  </h4>
                  {selectedOrder.dispatch.driverName && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Driver: {selectedOrder.dispatch.driverName} ({selectedOrder.dispatch.driverPhone || 'On Call'})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-400">Assigned Vehicle</div>
                    <div className="font-bold text-stone-900 mt-0.5">
                      {selectedOrder.dispatch.vehicleId || 'Agri-Transit Express'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-400">Route Distance</div>
                    <div className="font-bold text-stone-900 mt-0.5">
                      {routeInfo.distanceKm} km (Est. {routeInfo.etaHours})
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-400">Logistics Mode</div>
                    <div className="font-bold text-stone-900 mt-0.5">
                      {selectedOrder.deliveryType === 'FARM_DIRECT' ? 'Farm-Direct Truck' : 'Hub Consolidated'}
                    </div>
                  </div>
                </div>

                {/* Waypoints */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">Transit Waypoints</div>
                  <div className="space-y-2">
                    {routeInfo.waypoints.map((wp: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50">
                        <span className="font-medium text-stone-700 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {wp.name}
                        </span>
                        <span className="text-stone-400 font-mono text-[11px]">{wp.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Escrow Financial Audit Breakdown */}
            {selectedOrder.escrowTransaction && (
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm text-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Escrow Transaction Record
                  </h4>
                  <span className="font-mono text-[11px] text-stone-400">
                    Gateway Ref: {selectedOrder.escrowTransaction.gatewayRef}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div>
                    <div className="text-stone-500">Locked Deposit:</div>
                    <div className="font-bold text-stone-900">₹{selectedOrder.escrowTransaction.amount}</div>
                  </div>
                  <div>
                    <div className="text-stone-500">Escrow State:</div>
                    <div className="font-bold text-emerald-700">{selectedOrder.escrowTransaction.status}</div>
                  </div>
                  <div>
                    <div className="text-stone-500">Deposit Time:</div>
                    <div className="font-bold text-stone-900">
                      {new Date(selectedOrder.escrowTransaction.heldAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-500">Farmer Payout Ref:</div>
                    <div className="font-bold text-stone-900 truncate">
                      {selectedOrder.escrowTransaction.payoutTxRef || 'Pending Release'}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-12 text-center">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-bold text-stone-700">Select an order to track</h3>
          </div>
        )}

      </div>

      {/* Rating & Review Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6">
            <button
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-stone-900 mb-1">Rate Produce & Farmer</h3>
            <p className="text-xs text-stone-500 mb-4">Your feedback helps reward diligent regional farmers.</p>

            <form onSubmit={handleSubmitRating} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Overall Satisfaction (1 - 5 Stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= ratingScore ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Produce Quality Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setQualityScore(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= qualityScore ? 'fill-emerald-500 text-emerald-500' : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Review Comments</label>
                <textarea
                  rows={3}
                  placeholder="Produce was fresh, taut, and properly graded..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow transition"
              >
                {actionLoading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6">
            <button
              onClick={() => setShowDisputeModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-stone-900 mb-1">Report Produce Issue</h3>
            <p className="text-xs text-stone-500 mb-4">
              Escrow funds will remain locked while the Hub Operations team inspects this ticket.
            </p>

            <form onSubmit={handleRaiseDispute} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Reason for Dispute</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Crates arrived damaged, or weight does not match listed invoice..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition"
              >
                {actionLoading ? 'Recording...' : 'Submit Dispute to Hub Staff'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderTracking;
