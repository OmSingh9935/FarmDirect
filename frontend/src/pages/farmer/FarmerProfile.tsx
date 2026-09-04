import React, { useState } from 'react';
import { User, MapPin, CreditCard, Globe, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import api from '../../services/api.js';

export const FarmerProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [village, setVillage] = useState(user?.farmerProfile?.village || '');
  const [pincode, setPincode] = useState(user?.farmerProfile?.pincode || '');
  const [district, setDistrict] = useState(user?.farmerProfile?.district || '');
  const [state, setState] = useState(user?.farmerProfile?.state || 'Maharashtra');
  const [bankAccountNumber, setBankAccountNumber] = useState(user?.farmerProfile?.bankAccountNumber || '');
  const [ifscCode, setIfscCode] = useState(user?.farmerProfile?.ifscCode || '');
  const [upiId, setUpiId] = useState(user?.farmerProfile?.upiId || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.farmerProfile?.preferredLanguage || 'en');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateFarmerProfile({
        name,
        phone,
        village,
        pincode,
        district,
        state,
        bankAccountNumber,
        ifscCode,
        upiId,
        preferredLanguage,
      });
      await refreshUser();
      success('Profile Updated', 'Your farmer details and bank information have been saved.');
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Kisan Profile & Banking Setup</h1>
        <p className="text-xs text-stone-500">Configure your regional farm location and payout account credentials.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-700" />
            <span>Personal & Contact Info</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Registered Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Location & Hub Mapping */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Farm Village & Logistics Hub Location</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Village / Taluka</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Pincode</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Banking & UPI */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span>Bank Account / UPI for Escrow Payouts</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">UPI ID (Instant Transfer)</label>
              <input
                type="text"
                placeholder="username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                placeholder="e.g. 91880011223344"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">IFSC Code</label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-stone-400" />
                Preferred Voice & UI Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-stone-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save Profile & Banking Details</span>
          </button>
        </div>

      </form>
    </div>
  );
};

export default FarmerProfile;
