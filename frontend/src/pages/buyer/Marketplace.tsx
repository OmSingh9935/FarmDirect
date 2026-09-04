import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  Calendar,
  Sparkles,
  ShoppingBag,
  ArrowUpDown,
  CheckCircle2,
  Wheat,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Listing } from '../../types/index.js';
import api from '../../services/api.js';
import { useCart } from '../../context/CartContext.js';
import { useToast } from '../../context/ToastContext.js';

interface MarketplaceProps {
  onSelectListing: (listing: Listing) => void;
  onQuickBuy: (listing: Listing) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectListing, onQuickBuy }) => {
  const { addToCart } = useCart();
  const { success } = useToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('freshness');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');

  const categories = [
    { label: 'All Harvests', value: '' },
    { label: '🥬 Vegetables', value: 'Vegetables' },
    { label: '🍎 Fruits', value: 'Fruits' },
    { label: '🌾 Grains', value: 'Grains' },
    { label: '🌶️ Spices', value: 'Spices' },
  ];

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await api.getListings({
        search: searchQuery,
        category: category || undefined,
        grade: selectedGrade || undefined,
        minPrice: minPrice !== '' ? minPrice : undefined,
        maxPrice: maxPrice !== '' ? maxPrice : undefined,
        sortBy,
      });
      setListings(res.listings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category, selectedGrade, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="min-h-screen pb-16">
      
      {/* Hero Banner with E-Commerce visual finish */}
      <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white py-12 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              100% Escrow-Protected Direct Agricultural Marketplace
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Farm-Direct Produce. <br />
              <span className="text-emerald-300">Guaranteed Freshness & Fair Price.</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-emerald-100 leading-relaxed max-w-xl">
              Connect directly with verified regional farmers. Funds are securely locked in platform escrow and only disbursed when you inspect and confirm delivery at your doorstep.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-white grid grid-cols-2 gap-4 sm:gap-6 shrink-0 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">15+</div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold mt-0.5">Verified Villages</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">0.5 Qtl</div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold mt-0.5">Threshold Logistics</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Search & Category Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search tomatoes, basmati rice, Nashik onions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
              >
                Search
              </button>
            </form>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-xs text-stone-500 font-medium shrink-0 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-emerald-500 bg-white"
              >
                <option value="freshness">Harvest Freshness (Newest)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  category === c.value
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {c.label}
              </button>
            ))}

            {/* Grade Filter Chips */}
            <div className="h-5 w-px bg-stone-300 mx-2 shrink-0"></div>
            <span className="text-xs text-stone-500 font-semibold shrink-0">AI Grade:</span>
            {['', 'A', 'B', 'C'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedGrade === g
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {g ? `Grade ${g}` : 'All Grades'}
              </button>
            ))}
          </div>
        </div>

        {/* Listings Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <span>Fresh Farm Harvests</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {listings.length} Lots Available
              </span>
            </h2>
          </div>

          {loading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse space-y-3">
                  <div className="w-full h-44 bg-stone-200 rounded-xl"></div>
                  <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                  <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                  <div className="h-6 bg-stone-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Wheat className="w-12 h-12 text-stone-400 mx-auto mb-3" />
              <h3 className="font-bold text-stone-800 text-base">No produce listings found</h3>
              <p className="text-xs text-stone-500 mt-1">Try adjusting your search terms or filters</p>
              <button
                onClick={() => {
                  setCategory('');
                  setSelectedGrade('');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-stone-200 hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                  onClick={() => onSelectListing(item)}
                >
                  {/* Photo & Badges Container */}
                  <div className="relative w-full h-48 bg-stone-100 overflow-hidden">
                    <img
                      src={item.photos[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'}
                      alt={item.crop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {/* AI Pre-Grade Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md shadow text-xs font-extrabold border border-stone-100">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.aiGrade === 'A'
                            ? 'bg-emerald-500'
                            : item.aiGrade === 'B'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      ></span>
                      <span className="text-stone-900">Grade {item.aiGrade}</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        ({Math.round(item.aiConfidence * 100)}%)
                      </span>
                    </div>

                    {/* Stock Quantity Badge */}
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-stone-900/80 text-white text-[11px] font-semibold backdrop-blur-sm">
                      {item.quantity} {item.unit} available
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Crop Name and Category */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-base text-stone-900 group-hover:text-emerald-700 transition">
                          {item.crop.name}
                        </h3>
                      </div>

                      {/* Farmer info and Village */}
                      <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-medium text-stone-700 truncate max-w-[140px]">
                            {item.farmer.name} • {item.farmer.village}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 font-bold shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.farmer.averageRating || 4.8}</span>
                        </div>
                      </div>

                      {/* Harvest Freshness */}
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-stone-500">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>Harvested: {new Date(item.harvestDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-extrabold text-emerald-950">
                          ₹{item.pricePerUnit}
                          <span className="text-xs font-medium text-stone-500">/{item.unit}</span>
                        </div>
                        <div className="text-[10px] text-stone-400">Ex-Farm Escrow Price</div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            addToCart(item, 10);
                            success('Added to Cart', `10 ${item.unit} of ${item.crop.name} added`);
                          }}
                          className="p-2 rounded-xl border border-stone-300 hover:border-emerald-600 hover:bg-emerald-50 text-stone-700 transition"
                          title="Add 10kg to Cart"
                        >
                          <ShoppingBag className="w-4 h-4 text-emerald-700" />
                        </button>
                        <button
                          onClick={() => onQuickBuy(item)}
                          className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow transition"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
