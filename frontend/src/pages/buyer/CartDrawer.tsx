import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext.js';

interface CartDrawerProps {
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout }) => {
  const { items, isCartOpen, closeCart, updateQuantity, removeFromCart, subtotal, clearCart } = useCart();

  if (!isCartOpen) return null;

  // Group items by farmer
  const estimatedLogistics = items.length > 0 ? (subtotal > 2000 ? 150 : 80) : 0;
  const grandTotal = subtotal + estimatedLogistics;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity" onClick={closeCart} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-extrabold text-stone-900">Your Fresh Produce Cart</h2>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="font-bold text-stone-700">Your cart is empty</h3>
                <p className="text-xs text-stone-400 mt-1">Explore farm harvests and add fresh items</p>
              </div>
            ) : (
              items.map(({ listing, quantity }) => (
                <div
                  key={listing.id}
                  className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 flex gap-3 items-center"
                >
                  <img
                    src={listing.photos[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'}
                    alt={listing.crop.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-extrabold text-stone-900 truncate">
                        {listing.crop.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(listing.id)}
                        className="text-stone-400 hover:text-rose-600 transition p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Farmer: {listing.farmer.name} ({listing.farmer.village})
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs font-extrabold text-emerald-900">
                        ₹{(listing.pricePerUnit * quantity).toFixed(2)}
                        <span className="text-[10px] text-stone-400 font-normal"> (₹{listing.pricePerUnit}/{listing.unit})</span>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => updateQuantity(listing.id, quantity - 5)}
                          className="px-1.5 py-0.5 hover:bg-stone-100 text-stone-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-stone-800">
                          {quantity}{listing.unit}
                        </span>
                        <button
                          onClick={() => updateQuantity(listing.id, quantity + 5)}
                          className="px-1.5 py-0.5 hover:bg-stone-100 text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Produce Subtotal:</span>
                  <span className="font-semibold text-stone-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Estimated Logistics & Hub Intake:</span>
                  <span className="font-semibold text-stone-900">₹{estimatedLogistics.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Platform Escrow Protection:</span>
                  <span className="font-semibold text-emerald-700">Included (Free)</span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-extrabold text-stone-900">
                  <span>Grand Total:</span>
                  <span className="text-base text-emerald-950">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Escrow badge */}
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-100/70 text-emerald-900 text-[11px] font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Payment is held in escrow until you inspect delivery.</span>
              </div>

              <button
                onClick={() => {
                  closeCart();
                  onCheckout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-md transition"
              >
                <span>Proceed to Escrow Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
