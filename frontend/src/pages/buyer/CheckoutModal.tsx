import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Lock, CheckCircle2, ArrowRight, RefreshCw, Truck, MapPin, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { useToast } from '../../context/ToastContext.js';
import api from '../../services/api.js';
import { CartItem } from '../../types/index.js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  singleBuyItem?: { listing: any; quantity: number } | null;
  onUpdateSingleBuyQuantity?: (quantity: number) => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  singleBuyItem,
  onUpdateSingleBuyQuantity,
  onOrderSuccess,
}) => {
  const { user, openAuthModal } = useAuth();
  const { items: cartItems, clearCart, subtotal: cartSubtotal, updateQuantity, removeFromCart } = useCart();
  const { success, error: toastError } = useToast();

  const checkoutItems: CartItem[] = singleBuyItem
    ? [{ listing: singleBuyItem.listing, quantity: singleBuyItem.quantity }]
    : cartItems;

  const subtotal = singleBuyItem
    ? singleBuyItem.listing.pricePerUnit * singleBuyItem.quantity
    : cartSubtotal;

  const totalWeightKg = checkoutItems.reduce((sum, item) => {
    const isQuintal = item.listing.unit?.toLowerCase().includes('quintal');
    return sum + (isQuintal ? item.quantity * 100 : item.quantity);
  }, 0);
  const isDirectFarmGate = totalWeightKg >= 50; // 0.5 quintal threshold

  const estimatedLogistics = subtotal > 2000 ? 150 : 80;
  const grandTotal = parseFloat((subtotal + estimatedLogistics).toFixed(2));

  // Address
  const defaultAddr = user?.buyerProfile?.addressLine || 'Flat 402, Green Enclave, Bandra West';
  const defaultPin = user?.buyerProfile?.pincode || '400050';
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddr);
  const [deliveryPincode, setDeliveryPincode] = useState(defaultPin);

  // Payment Step State
  const [step, setStep] = useState<'review' | 'payment_gateway'>('review');
  const [loading, setLoading] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [createdOrderIds, setCreatedOrderIds] = useState<string[]>([]);
  const [paymentSession, setPaymentSession] = useState<any>(null);

  if (!isOpen) return null;

  // 1. Initiate Orders
  const handleProceedToPayment = async () => {
    if (!user) {
      openAuthModal('buyer');
      return;
    }

    if (!deliveryAddress || !deliveryPincode) {
      toastError('Missing Address', 'Please provide delivery address and pincode');
      return;
    }

    setLoading(true);
    try {
      // 1. Create orders on backend
      const res = await api.createOrder({
        items: checkoutItems.map((item) => ({
          listingId: item.listing.id,
          quantity: item.quantity,
        })),
        deliveryAddress,
        deliveryPincode,
      });

      const orderIds = res.orders.map((o: any) => o.id);
      setCreatedOrderIds(orderIds);

      // 2. Create Razorpay sandbox payment order
      const payRes = await api.createPaymentOrder(orderIds, grandTotal);
      setPaymentSession(payRes);

      setStep('payment_gateway');
    } catch (err: any) {
      toastError('Order Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Payment & Lock Escrow
  const handleCompletePayment = async () => {
    setLoading(true);
    try {
      // Simulate Razorpay Sandbox Signature / Payment verification
      const verifyRes = await api.verifyPayment({
        orderIds: createdOrderIds,
        razorpayOrderId: paymentSession?.id || `sim_rzp_${Date.now()}`,
        razorpayPaymentId: `pay_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        razorpaySignature: `simulated_sig_${Date.now()}`,
      });

      if (!singleBuyItem) {
        clearCart();
      }

      success('Payment Secured in Escrow!', 'Funds held in escrow. Farmer is notified to dispatch produce.');
      onClose();
      if (createdOrderIds.length > 0) {
        onOrderSuccess(createdOrderIds[0]);
      }
    } catch (err: any) {
      toastError('Payment Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <h3 className="font-extrabold text-base">Escrow-Protected Checkout</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-emerald-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {step === 'review' && (
            <div className="space-y-4">
              
              {/* Delivery Address Box */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  Delivery Destination
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Delivery street address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Pincode (e.g. 400050)"
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value)}
                    className="w-36 px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Items Preview with Customizable Quantities */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Produce Items ({checkoutItems.length})
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">Customize quantities anytime</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-stone-200 rounded-2xl p-2.5 bg-stone-50">
                  {checkoutItems.length === 0 ? (
                    <div className="text-center py-4 text-xs text-stone-400">No items selected</div>
                  ) : (
                    checkoutItems.map((item) => {
                      const maxStock = item.listing.quantity;
                      return (
                        <div
                          key={item.listing.id}
                          className="p-2.5 rounded-xl bg-white border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={item.listing.photos?.[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'}
                              alt={item.listing.crop?.name || 'Produce'}
                              className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs text-stone-900 truncate">
                                {item.listing.crop.name}
                              </div>
                              <div className="text-[10px] text-stone-500 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-emerald-800">Grade {item.listing.aiGrade}</span>
                                <span>•</span>
                                <span>₹{item.listing.pricePerUnit}/{item.listing.unit}</span>
                                <span>•</span>
                                <span className="text-stone-400">Stock: {maxStock} {item.listing.unit}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            {/* Quantity Stepper & Input */}
                            <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-stone-50">
                              <button
                                type="button"
                                onClick={() => {
                                  const step = item.quantity > 25 ? 5 : 1;
                                  const newQty = Math.max(1, item.quantity - step);
                                  if (singleBuyItem && onUpdateSingleBuyQuantity) {
                                    onUpdateSingleBuyQuantity(newQty);
                                  } else {
                                    updateQuantity(item.listing.id, newQty);
                                  }
                                }}
                                disabled={item.quantity <= 1}
                                className="px-2 py-1 text-stone-600 hover:bg-stone-200 disabled:opacity-30 transition"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={maxStock}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) {
                                    const clamped = Math.max(1, Math.min(maxStock, val));
                                    if (singleBuyItem && onUpdateSingleBuyQuantity) {
                                      onUpdateSingleBuyQuantity(clamped);
                                    } else {
                                      updateQuantity(item.listing.id, clamped);
                                    }
                                  }
                                }}
                                className="w-12 text-center font-bold text-xs bg-white text-stone-900 py-1 focus:outline-none focus:bg-emerald-50"
                              />
                              <span className="text-[10px] font-medium text-stone-400 px-1 bg-stone-50">
                                {item.listing.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const step = item.quantity >= 25 ? 5 : 1;
                                  const newQty = Math.min(maxStock, item.quantity + step);
                                  if (singleBuyItem && onUpdateSingleBuyQuantity) {
                                    onUpdateSingleBuyQuantity(newQty);
                                  } else {
                                    updateQuantity(item.listing.id, newQty);
                                  }
                                }}
                                disabled={item.quantity >= maxStock}
                                className="px-2 py-1 text-stone-600 hover:bg-stone-200 disabled:opacity-30 transition"
                                title="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-right min-w-[65px]">
                              <div className="font-extrabold text-xs text-stone-900">
                                ₹{(item.listing.pricePerUnit * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dynamic 0.5 Quintal Logistics Routing Badge */}
                <div className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isDirectFarmGate
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="flex items-center gap-2">
                    <Truck className={`w-4 h-4 shrink-0 ${isDirectFarmGate ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <div>
                      <span className="font-extrabold">
                        {isDirectFarmGate ? 'Direct Farm Gate Truck Pickup' : 'Consolidated Hub Transit'}
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        Total weight: {totalWeightKg} kg {isDirectFarmGate ? '(≥ 50kg / 0.5 Qtl: direct vehicle)' : '(< 50kg: village hub intake)'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDirectFarmGate ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {isDirectFarmGate ? '≥ 0.5 Qtl' : '< 0.5 Qtl'}
                  </span>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Produce Subtotal:</span>
                  <span className="font-bold text-stone-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Hub Logistics & Transit:</span>
                  <span className="font-bold text-stone-900">₹{estimatedLogistics.toFixed(2)}</span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-extrabold text-stone-900">
                  <span>Total Escrow Deposit:</span>
                  <span className="text-base text-emerald-950">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold">Escrow Guarantee:</span> Your payment is securely held by the platform. The farmer only gets paid after you inspect and accept the produce upon delivery.
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                  <>
                    <span>Proceed to Sandbox Payment (₹{grandTotal.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Razorpay Sandbox Gateway Simulator */}
          {step === 'payment_gateway' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-stone-200">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  Razorpay Sandbox Gateway
                </div>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">₹{grandTotal.toFixed(2)}</div>
                <div className="text-[11px] text-stone-400 font-mono">Ref: {paymentSession?.id}</div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Choose Sandbox Payment Option
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('upi')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      selectedPayMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span className="text-base">📱</span>
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('card')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      selectedPayMethod === 'card'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span className="text-base">💳</span>
                    <span>Test Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('netbanking')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      selectedPayMethod === 'netbanking'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span className="text-base">🏦</span>
                    <span>Netbanking</span>
                  </button>
                </div>
              </div>

              {/* Method Mock Input */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                {selectedPayMethod === 'upi' && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Simulated VPA:</span>
                    <span className="font-mono font-bold text-stone-900">success@razorpay</span>
                  </div>
                )}
                {selectedPayMethod === 'card' && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Sandbox Test Card:</span>
                    <span className="font-mono font-bold text-stone-900">4111 •••• •••• 1111</span>
                  </div>
                )}
                {selectedPayMethod === 'netbanking' && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Bank Gateway:</span>
                    <span className="font-bold text-stone-900">HDFC Sandbox Bank</span>
                  </div>
                )}
              </div>

              {/* Simulate Escrow Hold Button */}
              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-xl transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize & Hold ₹{grandTotal.toFixed(2)} in Escrow</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('review')}
                className="w-full text-center text-xs text-stone-500 hover:text-stone-800 font-medium"
              >
                Back to Review
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
