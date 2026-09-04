import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, Truck, MapPin, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Order } from '../../types/index.js';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

export const FarmerOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getOrders(statusFilter || undefined)
      .then((res) => setOrders(res.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Farmer Produce Orders</h1>
          <p className="text-xs text-stone-500">
            Fulfill buyer orders, verify pickup modes, and track escrow settlements.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['', 'ESCROW_HELD', 'HUB_VERIFIED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st ? st.replace('_', ' ') : 'All Orders'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-bold text-stone-700">No orders in this category</h3>
            <p className="text-xs text-stone-400 mt-1">Incoming buyer orders will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {orders.map((o) => {
              // 0.5 quintal rule: FARM_DIRECT = Logistics Pickup, HUB_CONSOLIDATED = Farmer Drop-off
              const isPickupTruck = o.deliveryType === 'FARM_DIRECT';

              return (
                <div key={o.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-stone-50/70 transition">
                  
                  {/* Order info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-400">#{o.id.slice(0, 8)}</span>
                        <h3 className="font-extrabold text-sm text-stone-900">{o.listing?.crop?.name}</h3>
                        
                        {/* 0.5 Quintal Threshold Pickup Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          isPickupTruck
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          <Truck className="w-3 h-3" />
                          {isPickupTruck ? 'Logistics Pickup Truck (≥0.5 Qtl)' : 'Farmer Drop-off (<0.5 Qtl)'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                        <span>Quantity: <strong className="text-stone-800">{o.quantity} {o.unit}</strong></span>
                        <span>•</span>
                        <span>Buyer: <strong className="text-stone-800">{o.buyer?.name}</strong></span>
                        <span>•</span>
                        <span>Ordered: {new Date(o.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Discrepancy indicator if hub altered weight or grade */}
                      {o.discrepancyAdjusted && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Hub inspection adjusted quantity/grade. Settlement adjusted.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Settlement */}
                  <div className="text-right shrink-0 self-end md:self-center">
                    <div className="text-xs text-stone-400 font-medium">Gross Escrow Amount</div>
                    <div className="text-base font-extrabold text-stone-900">₹{o.totalAmount}</div>

                    <div className="mt-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        o.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'DELIVERED'
                          ? 'bg-amber-100 text-amber-900'
                          : o.status === 'ESCROW_HELD'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default FarmerOrders;
