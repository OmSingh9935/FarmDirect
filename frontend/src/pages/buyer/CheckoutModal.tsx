import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Lock, CheckCircle2, ArrowRight, RefreshCw, Truck, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { useToast } from '../../context/ToastContext.js';
import api from '../../services/api.js';
import { CartItem } from '../../types/index.js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  singleBuyItem?: { listing: any; quantity: number } | null;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  singleBuyItem,
  onOrderSuccess,
}) => {
  const { user, openAuthModal } = useAuth();
  const { items: cartItems, clearCart, subtotal: cartSubtotal } = useCart();
  const { success, error: toastError } = useToast();

  const checkoutItems: CartItem[] = singleBuyItem
    ? [{ listing: singleBuyItem.listing, quantity: singleBuyItem.quantity }]
    : cartItems;

  const subtotal = singleBuyItem
    ? singleBuyItem.listing.pricePerUnit * singleBuyItem.quantity
    : cartSubtotal;

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

              {/* Order Items Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Produce Items ({checkoutItems.length})
                </label>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 border border-stone-200 rounded-xl p-2.5 bg-stone-50">
                  {checkoutItems.map((item) => (
                    <div key={item.listing.id} className="flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-stone-900">{item.listing.crop.name}</div>
                        <div className="text-[11px] text-stone-500">
                          {item.quantity} {item.listing.unit} • Grade {item.listing.aiGrade}
                        </div>
                      </div>
                      <div className="font-extrabold text-stone-900">
                        ₹{(item.listing.pricePerUnit * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
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
