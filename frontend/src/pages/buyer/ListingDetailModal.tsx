import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Truck,
  Info,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Listing } from '../../types/index.js';
import { useCart } from '../../context/CartContext.js';
import { useToast } from '../../context/ToastContext.js';
import api from '../../services/api.js';

interface ListingDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  onProceedToCheckout: (listing: Listing, quantity: number) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  onClose,
  onProceedToCheckout,
}) => {
  const { addToCart } = useCart();
  const { success } = useToast();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [quantity, setQuantity] = useState(25);
  const [logisticsInfo, setLogisticsInfo] = useState<any>(null);
  const [mandiFeed, setMandiFeed] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (listing) {
      setActivePhotoIdx(0);
      setQuantity(Math.min(listing.quantity, 25));

      // Fetch dynamic logistics threshold for this crop and quantity
      api.checkLogistics(listing.cropId, 25, listing.unit).then((info) => setLogisticsInfo(info)).catch(console.error);

      // Fetch mandi price benchmark
      api.getFairPriceRecommendation(listing.cropId, listing.aiGrade).then((feed) => setMandiFeed(feed)).catch(console.error);
    }
  }, [listing]);

  // When buyer modifies quantity, re-evaluate dynamic logistics threshold
  const handleQuantityChange = (newQty: number) => {
    if (!listing) return;
    const clamped = Math.max(1, Math.min(listing.quantity, newQty));
    setQuantity(clamped);

    api.checkLogistics(listing.cropId, clamped, listing.unit)
      .then((info) => setLogisticsInfo(info))
      .catch(console.error);
  };

  if (!listing) return null;

  const photos = listing.photos && listing.photos.length > 0
    ? listing.photos
    : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'];

  const totalPrice = parseFloat((listing.pricePerUnit * quantity).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-stone-700 shadow-md transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Left: Photo Gallery */}
          <div className="p-6 bg-stone-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200">
            <div>
              {/* Main Photo */}
              <div className="w-full h-72 rounded-2xl overflow-hidden shadow-sm relative bg-stone-200">
                <img
                  src={photos[activePhotoIdx]}
                  alt={listing.crop.name}
                  className="w-full h-full object-cover"
                />

                {/* AI Grade Badge Overlay */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-md text-xs font-extrabold flex items-center gap-1.5 border border-stone-100">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      listing.aiGrade === 'A'
                        ? 'bg-emerald-500'
                        : listing.aiGrade === 'B'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  <span>AI Grade {listing.aiGrade}</span>
                  <span className="text-[10px] text-stone-500 font-normal">
                    ({Math.round(listing.aiConfidence * 100)}% Match)
                  </span>
                </div>
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhotoIdx(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                        activePhotoIdx === i ? 'border-emerald-600 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Grading Quality Tips Card */}
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>AI Pre-Grade Assessment</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                {listing.aiTips || 'Pre-graded using high-resolution harvest imagery. Certified within export freshness threshold.'}
              </p>
            </div>
          </div>

          {/* Right: Details, Threshold Callout & Buy */}
          <div className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Title & Farmer */}
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-emerald-700">
                  {listing.crop.category} • Fresh Batch
                </div>
                <h2 className="text-2xl font-extrabold text-stone-900 mt-0.5">
                  {listing.crop.name}
                </h2>

                <div className="mt-2 flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                  <div>
                    <div className="font-bold text-stone-900 flex items-center gap-1">
                      <span>{listing.farmer.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      <span>{listing.farmer.village}, {listing.farmer.district}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-600 font-extrabold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{listing.farmer.averageRating || 4.9}</span>
                    </div>
                    <div className="text-[10px] text-stone-400 font-medium">Verified Grower</div>
                  </div>
                </div>
              </div>

              {/* APMC Mandi Benchmark Feed */}
              {mandiFeed && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-700" />
                    <div>
                      <div className="font-bold">APMC Mandi Modal Benchmark</div>
                      <div className="text-[11px] text-stone-600">
                        Avg: ₹{mandiFeed.apmcBenchmark}/{listing.unit} • Fair Platform: ₹{mandiFeed.fairBenchmark}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Competitive
                  </span>
                </div>
              )}

              {/* Price & Notes */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-950">
                    ₹{listing.pricePerUnit}
                  </span>
                  <span className="text-sm font-semibold text-stone-500">per {listing.unit}</span>
                </div>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  {listing.notes || 'Hand-sorted directly at harvest gate. Dispatched with temperature monitored crates.'}
                </p>
              </div>

              {/* Quantity Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Select Quantity ({listing.unit})
                  </label>
                  <span className="text-xs text-stone-500 font-medium">
                    Available: {listing.quantity} {listing.unit}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-stone-50">
                    <button
                      onClick={() => handleQuantityChange(quantity - 5)}
                      className="p-2.5 hover:bg-stone-200 transition"
                    >
                      <Minus className="w-4 h-4 text-stone-600" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={listing.quantity}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                      className="w-16 text-center font-bold text-sm bg-transparent focus:outline-none"
                    />
                    <button
                      onClick={() => handleQuantityChange(quantity + 5)}
                      className="p-2.5 hover:bg-stone-200 transition"
                    >
                      <Plus className="w-4 h-4 text-stone-600" />
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex gap-1.5">
                    {[10, 25, 50, 100].filter(q => q <= listing.quantity).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleQuantityChange(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                          quantity === preset
                            ? 'bg-emerald-700 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {preset}kg
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DYNAMIC LOGISTICS THRESHOLD INDICATOR (Section 6 requirement) */}
              {logisticsInfo && (
                <div className={`p-3 rounded-xl border relative transition-all duration-300 ${
                  logisticsInfo.deliveryType === 'FARM_DIRECT'
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className={`w-4 h-4 shrink-0 ${
                        logisticsInfo.deliveryType === 'FARM_DIRECT' ? 'text-amber-600' : 'text-emerald-600'
                      }`} />
                      <div className="text-xs">
                        <div className="font-extrabold flex items-center gap-1.5">
                          <span>{logisticsInfo.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white shadow-xs">
                            {logisticsInfo.deliveryType === 'FARM_DIRECT' ? '≥ 0.5 Qtl' : '< 0.5 Qtl'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          {logisticsInfo.description}
                        </div>
                      </div>
                    </div>

                    {/* Explanatory Tooltip trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTooltip(!showTooltip)}
                        className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      {showTooltip && (
                        <div className="absolute right-0 bottom-6 w-64 p-3 bg-stone-900 text-white text-[11px] rounded-xl shadow-xl z-30 leading-relaxed border border-stone-700">
                          <div className="font-bold text-emerald-300 mb-1">0.5 Quintal Threshold Policy</div>
                          Under FarmDirect logistics rules, orders over {logisticsInfo.thresholdKg} kg ({logisticsInfo.thresholdQuintals} quintal) trigger a direct truck pickup from the farmer's gate. Smaller quantities route through the village collection hub for consolidation.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions & Total */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Subtotal (Escrow Locked)
                </div>
                <div className="text-2xl font-extrabold text-stone-900">
                  ₹{totalPrice}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    addToCart(listing, quantity);
                    success('Added to Cart', `${quantity} ${listing.unit} of ${listing.crop.name} added`);
                    onClose();
                  }}
                  className="px-4 py-3 rounded-xl border border-stone-300 hover:border-emerald-600 hover:bg-emerald-50 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={() => onProceedToCheckout(listing, quantity)}
                  className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-lg transition"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ListingDetailModal;
