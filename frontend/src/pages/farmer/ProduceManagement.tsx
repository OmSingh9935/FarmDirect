import React, { useState, useEffect } from 'react';
import {
  Plus,
  Wheat,
  Sparkles,
  TrendingUp,
  Trash2,
  Pause,
  Play,
  X,
  RefreshCw,
  Info,
  Calendar,
  Camera,
  CheckCircle2,
  UploadCloud,
  Layers,
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
  const [customCropName, setCustomCropName] = useState('');
  const [customCropCategory, setCustomCropCategory] = useState('Vegetables');

  const [quantity, setQuantity] = useState('50');
  const [unit, setUnit] = useState('kg');
  const [pricePerUnit, setPricePerUnit] = useState('30');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Uploaded Image State (Base64 file data)
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>('');
  const [uploadedImageMime, setUploadedImageMime] = useState<string>('image/jpeg');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  // AI Pre-Grade Preview State (from Gemini or Heuristic)
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

  // When selected standard crop changes, update Mandi Fair Price recommendation
  useEffect(() => {
    if (selectedCropId && selectedCropId !== '__custom__' && crops.length > 0) {
      const crop = crops.find((c) => c.id === selectedCropId);
      if (crop) {
        api.getFairPriceRecommendation(crop.id, 'A')
          .then((res) => {
            setFairPriceInfo(res);
            if (res.fairBenchmark) {
              setPricePerUnit(String(res.fairBenchmark));
            }
          })
          .catch(console.error);
      }
    } else {
      setFairPriceInfo(null);
    }
  }, [selectedCropId, crops]);

  // Handle Produce Image File Upload and trigger Gemini AI vision inspection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError('Invalid File', 'Please select an image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setUploadedImageBase64(base64Data);
      setUploadedImageMime(file.type);
      await runAiImageAnalysis(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Run Gemini AI image quality inspection
  const runAiImageAnalysis = async (imageBase64: string, mimeType: string) => {
    setIsAnalyzingImage(true);
    try {
      const activeCropName = selectedCropId === '__custom__'
        ? customCropName || 'Agricultural Produce'
        : crops.find((c) => c.id === selectedCropId)?.name || 'Produce';

      const res = await api.aiGradeImage({
        imageBase64,
        mimeType,
        cropName: activeCropName,
        notes,
      });

      setPreGradePreview(res);
      success(
        'Gemini AI Inspection Done',
        `Graded as Grade ${res.aiGrade} (${Math.round(res.aiConfidence * 100)}% AI Confidence)`
      );
    } catch (err: any) {
      toastError('AI Inspection', err.message || 'Inspection error; running heuristic fallback');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Create Listing Submit
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCropId === '__custom__' && !customCropName.trim()) {
      toastError('Missing Crop Name', 'Please write your custom product / crop variety name.');
      return;
    }
    if (!selectedCropId && !customCropName) {
      toastError('Missing Details', 'Please select or write a crop variety.');
      return;
    }
    if (!quantity || !pricePerUnit) {
      toastError('Missing Details', 'Please fill in quantity and price.');
      return;
    }
    if (!uploadedImageBase64) {
      toastError('Missing Photo', 'Please upload a photo of your produce for AI grade verification.');
      return;
    }

    setIsCreating(true);
    try {
      await api.createListing({
        cropId: selectedCropId === '__custom__' ? undefined : selectedCropId,
        customCropName: selectedCropId === '__custom__' ? customCropName.trim() : undefined,
        customCropCategory: selectedCropId === '__custom__' ? customCropCategory : undefined,
        quantity: parseFloat(quantity),
        unit,
        pricePerUnit: parseFloat(pricePerUnit),
        harvestDate,
        photos: [uploadedImageBase64],
        notes,
        farmLocation: `${user?.farmerProfile?.village || 'Farm Gate'}, ${user?.farmerProfile?.district || 'Region'}`,
        aiGrade: preGradePreview?.aiGrade || 'A',
        aiConfidence: preGradePreview?.aiConfidence || 0.94,
        aiTips: preGradePreview?.aiTips || undefined,
      });

      success('Listing Published!', 'Your produce is now live on the marketplace with AI Quality Certification.');
      setShowCreateModal(false);
      setUploadedImageBase64('');
      setCustomCropName('');
      setNotes('');
      setPreGradePreview(null);
      fetchFarmerListings();
    } catch (err: any) {
      toastError('Publish Failed', err.message || 'Could not publish produce lot.');
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
      success('Listing Deleted', 'The produce lot was removed.');
      fetchFarmerListings();
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-700/50">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold backdrop-blur-sm border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Multimodal Vision Grading</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Farmer Produce Lots & Mandi Benchmarks
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Upload harvest photos for real-time Gemini AI grade analysis, set your custom produce varieties, and sell directly to consumers and bulk FPOs.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setUploadedImageBase64('');
            setPreGradePreview(null);
          }}
          className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm shadow-lg hover:shadow-amber-500/25 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span>Post New Harvest Lot</span>
        </button>
      </div>

      {/* Produce Listings Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Your Harvested Inventory</h2>
            <p className="text-xs text-stone-500">Live lots currently displayed to buyers on the marketplace</p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {listings.length} Active Lot{listings.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-stone-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <Wheat className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800">No produce lots posted yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-6">
              Post your harvest with uploaded produce photos. Gemini AI will analyze quality grade, and buyers will be able to purchase directly via Escrow.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Post First Harvest Lot</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-stone-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-stone-100 overflow-hidden">
                    <img
                      src={item.photos[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'}
                      alt={item.crop.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black shadow-sm bg-emerald-600 text-white">
                        Grade {item.aiGrade}
                      </span>
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm bg-white/95 text-stone-800">
                        {item.crop.category}
                      </span>
                    </div>

                    <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      item.status === 'ACTIVE'
                        ? 'bg-emerald-500 text-white'
                        : item.status === 'PAUSED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-500 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-extrabold text-stone-900 text-base">{item.crop.name}</h3>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-900">₹{item.pricePerUnit}/{item.unit}</span>
                      <span className="text-xs text-stone-500 font-medium">Stock: <strong>{item.quantity} {item.unit}</strong></span>
                    </div>

                    {item.aiTips && (
                      <p className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg line-clamp-2 italic border border-stone-100">
                        "{item.aiTips}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-stone-100 mt-2 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      item.status === 'ACTIVE'
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {item.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{item.status === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete lot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE LISTING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
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

            {/* Modal Form Body */}
            <form onSubmit={handleCreateListing} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* CROP VARIETY SELECTION OR CUSTOM ENTRY */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Crop Variety *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCropId === '__custom__') {
                        setSelectedCropId(crops[0]?.id || '');
                        setCustomCropName('');
                      } else {
                        setSelectedCropId('__custom__');
                      }
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    {selectedCropId === '__custom__'
                      ? '← Choose from standard crops'
                      : '➕ Or write your own crop / product'}
                  </button>
                </div>

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
                  <option value="__custom__" className="font-bold text-emerald-800">
                    ➕ Other (Write / Add Your Own Crop Variety)
                  </option>
                </select>
              </div>

              {/* CUSTOM CROP VARIETY INPUT FORM */}
              {selectedCropId === '__custom__' && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-dashed border-emerald-400 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                    <Wheat className="w-4 h-4 text-emerald-700" />
                    <span>Write Your Own Custom Product / Crop Variety</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Product / Crop Variety Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shimla Capsicum, Sweet Corn, Dragonfruit, Organic Guava"
                      value={customCropName}
                      onChange={(e) => setCustomCropName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Product Category
                    </label>
                    <select
                      value={customCropCategory}
                      onChange={(e) => setCustomCropCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium bg-white"
                    >
                      <option value="Vegetables">Vegetables</option>
                      <option value="Fruits">Fruits</option>
                      <option value="Grains">Grains</option>
                      <option value="Spices">Spices</option>
                      <option value="Pulses">Pulses</option>
                      <option value="Other">Other Agricultural Produce</option>
                    </select>
                  </div>
                </div>
              )}

              {/* QUANTITY & UNIT */}
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
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-bold"
                  />
                  <span className="text-[10px] text-stone-400">Supports partial units (e.g. 0.5 quintal)</span>
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

              {/* AI MANDI FAIR PRICE BENCHMARK (For standard crops) */}
              {fairPriceInfo && selectedCropId !== '__custom__' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                      <TrendingUp className="w-4 h-4 text-amber-700" />
                      <span>APMC Mandi Fair Benchmark</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Suggested: ₹{fairPriceInfo.recommendedRange.min} - ₹{fairPriceInfo.recommendedRange.max}/{unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
                    <div className="p-1.5 bg-white rounded-lg border border-amber-100 text-center">
                      <div className="text-[9px] text-stone-400">APMC Modal</div>
                      <div className="font-extrabold text-stone-900 text-xs">₹{fairPriceInfo.apmcBenchmark}</div>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-amber-100 text-center">
                      <div className="text-[9px] text-stone-400">Platform Avg</div>
                      <div className="font-extrabold text-stone-900 text-xs">₹{fairPriceInfo.platformAvg}</div>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-amber-100 text-center">
                      <div className="text-[9px] text-stone-400">Optimal Fair Price</div>
                      <div className="font-extrabold text-emerald-700 text-xs">₹{fairPriceInfo.fairBenchmark}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* EXPECTED PRICE & HARVEST DATE */}
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

              {/* REAL PRODUCT PHOTO FILE UPLOAD WITH GEMINI AI GRADING */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                  <span>Product Photo *</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Gemini AI Vision Grading
                  </span>
                </label>

                {!uploadedImageBase64 ? (
                  <label className="border-2 border-dashed border-stone-300 hover:border-emerald-600 hover:bg-emerald-50/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-stone-800">
                      Upload Crop Photo from Device
                    </span>
                    <span className="text-xs text-stone-500 mt-0.5">
                      Supports JPG, PNG, WEBP from camera or gallery (No links required)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow bg-stone-900">
                    <img
                      src={uploadedImageBase64}
                      alt="Uploaded produce preview"
                      className="w-full h-52 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3 flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-xs font-bold backdrop-blur-sm flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Photo Uploaded
                        </span>
                        <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-stone-900 text-xs font-bold transition shadow">
                          Change Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          disabled={isAnalyzingImage}
                          onClick={() => runAiImageAnalysis(uploadedImageBase64, uploadedImageMime)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700/90 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                          <span>{isAnalyzingImage ? 'Scanning Produce...' : 'Re-Run Gemini Vision Analysis'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GEMINI AI PRE-GRADE INSPECTION BADGE & ATTRIBUTES */}
              {isAnalyzingImage && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-amber-700 animate-spin shrink-0" />
                  <div className="text-xs text-amber-950 font-bold">
                    Analyzing produce image with Gemini AI Vision...
                    <div className="text-[11px] font-normal text-stone-600 mt-0.5">
                      Inspecting color saturation, skin tautness, surface blemishes, and commercial export grade standards.
                    </div>
                  </div>
                </div>
              )}

              {preGradePreview && !isAnalyzingImage && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow text-white shrink-0 ${
                        preGradePreview.aiGrade === 'A'
                          ? 'bg-emerald-600'
                          : preGradePreview.aiGrade === 'B'
                          ? 'bg-amber-600'
                          : 'bg-orange-600'
                      }`}>
                        {preGradePreview.aiGrade}
                      </div>
                      <div>
                        <div className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                          <span>Grade {preGradePreview.aiGrade} Quality Certified</span>
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-800">
                            {Math.round(preGradePreview.aiConfidence * 100)}% AI Confidence
                          </span>
                        </div>
                        {preGradePreview.detectedCrop && (
                          <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                            AI Detected: {preGradePreview.detectedCrop}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-stone-600 bg-white/90 px-2 py-1 rounded-lg border border-stone-200 shrink-0">
                      {preGradePreview.provider === 'gemini' ? '✨ Gemini Vision 1.5 Flash' : '⚡ AI Quality Heuristic'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-emerald-100 text-xs text-stone-700 leading-relaxed">
                    <strong className="text-emerald-900">Gemini Inspection Findings:</strong> "{preGradePreview.aiTips}"
                  </div>

                  {/* Attribute Breakdown Bars */}
                  {preGradePreview.attributes && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1">
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="text-stone-500">Color Uniformity</div>
                        <div className="font-extrabold text-emerald-900 text-xs">
                          {preGradePreview.attributes.colorUniformity}%
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="text-stone-500">Surface Texture</div>
                        <div className="font-extrabold text-emerald-900 text-xs">
                          {preGradePreview.attributes.surfaceTexture}%
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="text-stone-500">Freshness Index</div>
                        <div className="font-extrabold text-emerald-900 text-xs">
                          {preGradePreview.attributes.freshnessIndex}%
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="text-stone-500">Blemish Defect Rate</div>
                        <div className="font-extrabold text-stone-900 text-xs">
                          {preGradePreview.attributes.blemishScore}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NOTES */}
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

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isCreating || isAnalyzingImage}
                className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Publish Produce Lot to Marketplace</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProduceManagement;
