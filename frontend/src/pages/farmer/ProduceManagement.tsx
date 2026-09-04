import React, { useState, useEffect } from 'react';
import {
  Plus,
  Wheat,
  Sparkles,
  TrendingUp,
  Trash2,
  Pause,
  Play,
  Edit2,
  X,
  RefreshCw,
  Info,
  Calendar,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { Listing, Crop } from '../../types/index.js';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

export const ProduceManagement: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [selectedCropId, setSelectedCropId] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [unit, setUnit] = useState('kg');
  const [pricePerUnit, setPricePerUnit] = useState('30');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800');
  const [isCreating, setIsCreating] = useState(false);

  // AI Pre-Grade Preview State
  const [preGradePreview, setPreGradePreview] = useState<any>(null);
  // AI Fair Price Suggestion State
  const [fairPriceInfo, setFairPriceInfo] = useState<any>(null);

  const fetchFarmerListings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listRes, cropsRes] = await Promise.all([
        api.getListings({ farmerId: user.id }),
        api.getCrops(),
      ]);
      setListings(listRes.listings || []);
      setCrops(cropsRes.crops || []);
      if (cropsRes.crops?.length > 0 && !selectedCropId) {
        setSelectedCropId(cropsRes.crops[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerListings();
  }, [user]);

  // When crop or notes change, update AI Pre-Grade preview & Mandi Fair Price recommendation
  useEffect(() => {
    if (selectedCropId && crops.length > 0) {
      const crop = crops.find((c) => c.id === selectedCropId);
      if (crop) {
        // AI Pre-grade preview
        api.previewPreGrade({ cropName: crop.name, notes })
          .then((res) => setPreGradePreview(res))
          .catch(console.error);

        // Mandi fair price recommendation
        api.getFairPriceRecommendation(crop.id, 'A')
          .then((res) => {
            setFairPriceInfo(res);
            if (res.fairBenchmark) {
              setPricePerUnit(String(res.fairBenchmark));
            }
          })
          .catch(console.error);
      }
    }
  }, [selectedCropId, notes]);

  // Create Listing
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCropId || !quantity || !pricePerUnit) {
      toastError('Missing Details', 'Please fill in all mandatory listing fields');
      return;
    }

    setIsCreating(true);
    try {
      await api.createListing({
        cropId: selectedCropId,
        quantity: parseFloat(quantity),
        unit,
        pricePerUnit: parseFloat(pricePerUnit),
        harvestDate,
        photos: [photoUrl],
        notes,
        farmLocation: `${user?.farmerProfile?.village || 'Dindori'}, ${user?.farmerProfile?.district || 'Nashik'}`,
      });

      success('Listing Published!', 'Your produce is now live on the marketplace with AI Pre-Grade verification.');
      setShowCreateModal(false);
      fetchFarmerListings();
    } catch (err: any) {
      toastError('Publish Failed', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle Pause/Resume
  const handleToggleStatus = async (listing: Listing) => {
    const newStatus = listing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.updateListing(listing.id, { status: newStatus });
      success('Status Updated', `Listing is now ${newStatus}`);
      fetchFarmerListings();
    } catch (err: any) {
      toastError('Update Failed', err.message);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.deleteListing(id);
      success('Listing Deleted', 'Produce lot removed from catalog');
      fetchFarmerListings();
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Produce Listings & APMC Mandi Engine
          </h1>
          <p className="text-xs text-stone-500">
            Publish harvest lots, view AI pre-grade certificates, and align prices with regional APMC feeds.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Produce Listing</span>
        </button>
      </div>

      {/* Listings Table / Cards */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center">
            <Wheat className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-bold text-stone-700">No active produce listings</h3>
            <p className="text-xs text-stone-500 mt-1">Post your first harvest lot to connect with regional buyers.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
            >
              Create First Listing
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {listings.map((item) => (
              <div key={item.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-stone-50/70 transition">
                
                {/* Produce & Image */}
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={item.photos[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'}
                    alt={item.crop.name}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-stone-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-stone-900">{item.crop.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'PAUSED'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                      <span>Quantity: <strong className="text-stone-800">{item.quantity} {item.unit}</strong></span>
                      <span>•</span>
                      <span>Price: <strong className="text-emerald-800">₹{item.pricePerUnit}/{item.unit}</strong></span>
                      <span>•</span>
                      <span>Harvested: {new Date(item.harvestDate).toLocaleDateString()}</span>
                    </div>

                    {/* AI Pre-grade Badge & Tip */}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        AI Grade {item.aiGrade} ({Math.round(item.aiConfidence * 100)}%)
                      </span>
                      {item.aiTips && (
                        <span className="text-stone-500 truncate max-w-md hidden sm:inline">
                          Tip: {item.aiTips}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Listing Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 transition text-xs flex items-center gap-1 font-semibold"
                    title={item.status === 'ACTIVE' ? 'Pause Listing' : 'Resume Listing'}
                  >
                    {item.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{item.status === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-rose-50 hover:border-rose-200 text-stone-500 hover:text-rose-600 transition"
                    title="Delete Listing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE LISTING MODAL with AI Pre-Grade & Mandi Suggestions */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-emerald-300" />
                <h3 className="font-extrabold text-base">Post Harvest Produce Lot</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-emerald-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateListing} className="p-6 space-y-4">
              
              {/* Crop Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Crop Variety *
                </label>
                <select
                  value={selectedCropId}
                  onChange={(e) => setSelectedCropId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity (with partial quintal support) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    placeholder="e.g. 50 or 0.5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-bold"
                  />
                  <span className="text-[10px] text-stone-400">Supports partial-quintal (e.g. 0.5 quintal)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-semibold bg-white"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="quintal">Quintals (100 kg)</option>
                  </select>
                </div>
              </div>

              {/* AI FAIR PRICE SUGGESTION PANEL (Section 5 requirement) */}
              {fairPriceInfo && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                      <TrendingUp className="w-4 h-4 text-amber-700" />
                      <span>AI Fair Price Suggestion (APMC Feed + Platform Avg)</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Recommended: ₹{fairPriceInfo.recommendedRange.min} - ₹{fairPriceInfo.recommendedRange.max}/{unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="p-2 bg-white rounded-lg border border-amber-100">
                      <div className="text-[10px] text-stone-400">APMC Mandi Modal</div>
                      <div className="font-extrabold text-stone-900">₹{fairPriceInfo.apmcBenchmark}/{unit}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-amber-100">
                      <div className="text-[10px] text-stone-400">Platform Recent Avg</div>
                      <div className="font-extrabold text-stone-900">₹{fairPriceInfo.platformAvg}/{unit}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-amber-100">
                      <div className="text-[10px] text-stone-400">Optimal Fair Benchmark</div>
                      <div className="font-extrabold text-emerald-700">₹{fairPriceInfo.fairBenchmark}/{unit}</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 italic leading-relaxed pt-1">
                    "{fairPriceInfo.advice}"
                  </p>
                </div>
              )}

              {/* Price & Harvest Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Expected Price per {unit} (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-extrabold text-emerald-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Harvest Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
              </div>

              {/* Photo Upload & AI Pre-grade Simulation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Produce Photo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* AI PRE-GRADE BADGE & TIP (Section 5 requirement) */}
              {preGradePreview && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                    {preGradePreview.aiGrade}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>AI Pre-Grade Certificate: Grade {preGradePreview.aiGrade}</span>
                      <span className="text-[10px] font-normal text-stone-500">
                        ({Math.round(preGradePreview.aiConfidence * 100)}% CV confidence)
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      <strong>AI Tip:</strong> "{preGradePreview.aiTips}"
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Produce Notes & Quality Highlights
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Naturally ripened, Grade A uniform sizing, pesticide-safe..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2"
              >
                {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Publish Produce to Marketplace</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProduceManagement;
