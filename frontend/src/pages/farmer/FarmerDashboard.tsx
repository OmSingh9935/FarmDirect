import React, { useState, useEffect } from 'react';
import {
  Wheat,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Mic,
} from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface FarmerDashboardProps {
  onNavigate: (tab: string) => void;
  openVoiceAssistant?: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ onNavigate, openVoiceAssistant }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFarmerDashboard()
      .then((res) => {
        setStats(res.stats);
        setRecentActivity(res.recentActivity || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Farmer Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold mb-2">
            <Wheat className="w-3.5 h-3.5" />
            <span>Kisan Dashboard • {user?.farmerProfile?.village || 'Nashik'}, {user?.farmerProfile?.district || 'MH'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Farmer'}!
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl">
            Track orders placed by buyers across regional cities, monitor APMC Mandi price benchmarks, and receive verified bank payouts.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          {openVoiceAssistant && (
            <button
              onClick={openVoiceAssistant}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition"
            >
              <Mic className="w-4 h-4 text-emerald-300" />
              <span>Voice Assist (बोलकर चलाएं)</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('farmer-produce')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Produce Listing</span>
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Active Listings */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400">Active Listings</div>
            <div className="text-2xl font-extrabold text-stone-900 mt-1">
              {stats?.activeListings ?? 3}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">Available on Marketplace</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Wheat className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400">Pending Orders</div>
            <div className="text-2xl font-extrabold text-stone-900 mt-1">
              {stats?.pendingOrders ?? 2}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">Held in Escrow</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Payout */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400">Settled Payouts</div>
            <div className="text-2xl font-extrabold text-stone-900 mt-1">
              ₹{stats?.monthlyPayout ? stats.monthlyPayout.toLocaleString() : '14,280'}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">Direct Bank / UPI Credits</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Farmer Rating */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400">Farmer Quality Rating</div>
            <div className="text-2xl font-extrabold text-stone-900 mt-1">
              {stats?.averageRating ?? 4.9} ★
            </div>
            <div className="text-[11px] text-stone-500 font-semibold mt-1">
              {stats?.reviewsCount ?? 18} Buyer Reviews
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Recent Orders / Pipeline Activity Feed */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-stone-900">Recent Produce Orders</h2>
          <button
            onClick={() => onNavigate('farmer-orders')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-500">
            No incoming orders yet. Post a produce listing to start receiving orders!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-stone-400 border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Produce</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Buyer Name</th>
                  <th className="py-2.5 px-3">Escrow Status</th>
                  <th className="py-2.5 px-3">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {recentActivity.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-3 font-mono text-stone-500">#{o.id.slice(0, 8)}</td>
                    <td className="py-3 px-3 font-bold text-stone-900">{o.listing?.crop?.name}</td>
                    <td className="py-3 px-3 text-stone-700">{o.quantity} {o.unit}</td>
                    <td className="py-3 px-3 text-stone-700">{o.buyer?.name || 'Verified Buyer'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'ESCROW_HELD'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-emerald-950">₹{o.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default FarmerDashboard;
