import React, { useState, useEffect } from 'react';
import {
  Layers,
  Scale,
  Truck,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
  User,
  MapPin,
  TrendingUp,
  CreditCard,
  Download,
  Search,
  Filter,
  Users,
  Wheat,
  ShoppingBag,
} from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface HubDashboardProps {
  initialSubtab?: string;
}

export const HubDashboard: React.FC<HubDashboardProps> = ({ initialSubtab = 'analytics' }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeSubtab, setActiveSubtab] = useState<'analytics' | 'purchases' | 'users' | 'intake' | 'dispatch' | 'config' | 'disputes'>('analytics');

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);

  // Purchases Master Ledger State
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesStatusFilter, setPurchasesStatusFilter] = useState('');
  const [purchasesBuyerType, setPurchasesBuyerType] = useState('');

  // Users Directory State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersSearch, setUsersSearch] = useState('');

  // Intake & Grading State
  const [intakeData, setIntakeData] = useState<{ total: number; dropoffLane: any[]; pickupLane: any[] }>({
    total: 0,
    dropoffLane: [],
    pickupLane: [],
  });
  const [selectedOrderForGrading, setSelectedOrderForGrading] = useState<any>(null);
  const [gradingWeight, setGradingWeight] = useState('');
  const [gradingGrade, setGradingGrade] = useState<'A' | 'B' | 'C'>('A');
  const [gradingNotes, setGradingNotes] = useState('');
  const [gradingLoading, setGradingLoading] = useState(false);

  // Dispatch Kanban State
  const [dispatchKanban, setDispatchKanban] = useState<Record<string, any[]>>({
    READY: [],
    ASSIGNED: [],
    IN_TRANSIT: [],
    DELIVERED: [],
  });
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [eta, setEta] = useState('Today 4:30 PM');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Threshold Config State
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [editingThreshold, setEditingThreshold] = useState<any>(null);

  // Disputes State
  const [disputes, setDisputes] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialSubtab === 'intake') setActiveSubtab('intake');
    else if (initialSubtab === 'dispatch') setActiveSubtab('dispatch');
    else if (initialSubtab === 'config') setActiveSubtab('config');
    else if (initialSubtab === 'disputes') setActiveSubtab('disputes');
    else if (initialSubtab === 'purchases') setActiveSubtab('purchases');
    else if (initialSubtab === 'users') setActiveSubtab('users');
    else setActiveSubtab('analytics');
  }, [initialSubtab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubtab === 'analytics') {
        const res = await api.getAdminAnalytics();
        setAnalytics(res);
      } else if (activeSubtab === 'purchases') {
        const res = await api.getPurchasesLedger({
          search: purchasesSearch || undefined,
          status: purchasesStatusFilter || undefined,
          buyerType: purchasesBuyerType || undefined,
        });
        setPurchases(res.purchases || []);
      } else if (activeSubtab === 'users') {
        const res = await api.getAdminUsers({
          role: usersRoleFilter || undefined,
          search: usersSearch || undefined,
        });
        setUsersList(res.users || []);
      } else if (activeSubtab === 'intake') {
        const res = await api.getIntakeQueue();
        setIntakeData(res);
      } else if (activeSubtab === 'dispatch') {
        const res = await api.getDispatchBoard();
        setDispatchKanban(res.kanban);
      } else if (activeSubtab === 'config') {
        const res = await api.getThresholdConfig();
        setThresholds(res.thresholds || []);
      } else if (activeSubtab === 'disputes') {
        const res = await api.getDisputes();
        setDisputes(res.disputes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubtab, purchasesStatusFilter, purchasesBuyerType, usersRoleFilter]);

  // Export Purchases CSV
  const handleExportPurchasesCsv = () => {
    if (!purchases.length) return;

    const headers = [
      'Order ID',
      'Date',
      'Buyer Name',
      'Buyer Email',
      'Buyer Phone',
      'Buyer Type',
      'Delivery Destination',
      'Produce Name',
      'Category',
      'Quantity',
      'Unit',
      'Confirmed Grade',
      'Farmer Name',
      'Farmer Village',
      'Unit Price (INR)',
      'Subtotal (INR)',
      'Commission Deducted (INR)',
      'Total Paid (INR)',
      'Farmer Net Payout (INR)',
      'Escrow Status',
      'Pipeline Status',
    ];

    const rows = purchases.map((p) => [
      p.orderId,
      new Date(p.createdAt).toLocaleDateString(),
      `"${p.buyer.name}"`,
      p.buyer.email,
      p.buyer.phone,
      p.buyer.buyerType,
      `"${p.buyer.city}, ${p.buyer.state}"`,
      `"${p.produce.cropName}"`,
      p.produce.category,
      p.produce.quantity,
      p.produce.unit,
      p.produce.confirmedGrade,
      `"${p.farmer.name}"`,
      `"${p.farmer.village}"`,
      p.financials.unitPrice,
      p.financials.subtotal,
      p.financials.commissionAmount,
      p.financials.totalAmountPaid,
      p.financials.farmerNetPayout,
      p.escrow.status,
      p.pipelineStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FarmDirect_Master_Purchases_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Purchases Exported', 'Master purchases ledger CSV downloaded successfully.');
  };

  // Execute Grading & Discrepancy Rule Engine
  const handleExecuteGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForGrading || !gradingWeight) return;

    setGradingLoading(true);
    try {
      const res = await api.gradeProduce({
        orderId: selectedOrderForGrading.id,
        actualWeight: parseFloat(gradingWeight),
        confirmedGrade: gradingGrade,
        staffNotes: gradingNotes,
      });

      success('Inspection Complete', res.message);
      setSelectedOrderForGrading(null);
      loadData();
    } catch (err: any) {
      toastError('Grading Failed', err.message);
    } finally {
      setGradingLoading(false);
    }
  };

  // Update Dispatch Board Assignment
  const handleUpdateDispatch = async (dispatchId: string, status?: string) => {
    setDispatchLoading(true);
    try {
      await api.updateDispatch({
        dispatchId,
        status,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
        vehicleId: vehicleId || undefined,
        eta: eta || undefined,
      });
      success('Dispatch Board Updated', `Status moved to ${status || 'Assigned'}`);
      setSelectedDispatch(null);
      loadData();
    } catch (err: any) {
      toastError('Dispatch Update Failed', err.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  // Update DB Threshold & Commission Config
  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThreshold) return;

    try {
      await api.updateThresholdConfig({
        cropId: editingThreshold.cropId,
        quintalThreshold: parseFloat(editingThreshold.quintalEquivalentThreshold),
        commissionPercentage: parseFloat(editingThreshold.commissionPercentage),
      });
      success('Configuration Updated', 'New threshold and commission rate active in database.');
      setEditingThreshold(null);
      loadData();
    } catch (err: any) {
      toastError('Config Update Failed', err.message);
    }
  };

  // Resolve Dispute
  const handleResolveDispute = async (disputeId: string, action: string) => {
    try {
      await api.resolveDispute({
        disputeId,
        action,
        resolutionNotes: `Resolved by ${user?.name || 'Hub Admin'}: ${action}`,
      });
      success('Dispute Resolved', `Action ${action} processed successfully.`);
      loadData();
    } catch (err: any) {
      toastError('Resolution Failed', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header & Subtab Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Central Agricultural Logistics Hub & Marketplace Administration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Admin Intelligence & Operations Center
          </h1>
        </div>

        {/* Subtab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveSubtab('analytics')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'analytics' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            <span>Platform Analytics</span>
          </button>

          <button
            onClick={() => setActiveSubtab('purchases')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'purchases' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
            <span>Purchases Ledger</span>
          </button>

          <button
            onClick={() => setActiveSubtab('users')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'users' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-700" />
            <span>Registered Users</span>
          </button>

          <button
            onClick={() => setActiveSubtab('intake')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'intake' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-700" />
            <span>Intake & Grading</span>
          </button>

          <button
            onClick={() => setActiveSubtab('dispatch')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'dispatch' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-purple-700" />
            <span>Dispatch Kanban</span>
          </button>

          <button
            onClick={() => setActiveSubtab('config')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'config' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-700" />
            <span>Thresholds</span>
          </button>

          <button
            onClick={() => setActiveSubtab('disputes')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeSubtab === 'disputes' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
            <span>Disputes</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: PLATFORM EXECUTIVE ANALYTICS                                   */}
      {/* ========================================================================= */}
      {activeSubtab === 'analytics' && (
        <div className="space-y-6">
          {loading || !analytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-3xl border border-stone-200 animate-pulse p-4"></div>
              ))}
            </div>
          ) : (
            <>
              {/* Top Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* Total Registered Users */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Registered Users</span>
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="text-3xl font-extrabold text-stone-900 mt-2">
                    {analytics.users.total}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-stone-600">
                    <span className="text-emerald-700">{analytics.users.farmers} Farmers</span> • 
                    <span className="text-sky-700">{analytics.users.individualBuyers} Consumers</span> • 
                    <span className="text-purple-700">{analytics.users.bulkFpoBuyers} Bulk FPOs</span>
                  </div>
                </div>

                {/* Total GMV Purchased */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Gross Merchandise Value (GMV)</span>
                    <TrendingUp className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-950 mt-2">
                    ₹{analytics.financials.totalGMV.toLocaleString()}
                  </div>
                  <div className="text-xs text-stone-500 mt-1 font-medium">
                    Across {analytics.operations.totalOrders} total marketplace orders
                  </div>
                </div>

                {/* Platform Commission Earned */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Platform Commission Earned</span>
                    <CreditCard className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-700 mt-2">
                    ₹{analytics.financials.totalCommissionEarned.toLocaleString()}
                  </div>
                  <div className="text-xs text-stone-500 mt-1 font-medium">
                    Settled upon buyer receipt confirmation
                  </div>
                </div>

                {/* Escrow Funds Locked */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Active Escrow Balance</span>
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-3xl font-extrabold text-amber-900 mt-2">
                    ₹{analytics.financials.escrowHeld.toLocaleString()}
                  </div>
                  <div className="text-xs text-stone-500 mt-1 font-medium">
                    Protected in escrow awaiting delivery
                  </div>
                </div>

              </div>

              {/* Secondary Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Volume & Quality Stats */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-stone-900">Trading Volume & Quality Control</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500">Total Produce Traded:</span>
                      <span className="font-bold text-stone-900">{analytics.operations.totalWeightKg} kg ({analytics.operations.totalWeightQuintals} Quintals)</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500">Active Marketplace Listings:</span>
                      <span className="font-bold text-stone-900">{analytics.operations.activeListingsCount} Lots</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500">Hub Grading Adjustments:</span>
                      <span className="font-bold text-amber-800">{analytics.operations.discrepancyOrdersCount} Orders ({analytics.operations.discrepancyRate}%)</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-500">Disbursed Farmer Payouts:</span>
                      <span className="font-bold text-emerald-800">₹{analytics.financials.escrowReleased.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Pipeline Orders Distribution */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-stone-900">Order Pipeline Status Breakdown</h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(analytics.operations.ordersByStatus).map(([st, count]) => (
                      <div key={st} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                        <span className="font-medium text-stone-700">{st.replace('_', ' ')}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-white border shadow-2xs">
                          {count as number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Traded Crops */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-stone-900">Top Traded Crops (By GMV)</h3>
                  <div className="space-y-2.5 text-xs">
                    {analytics.topCrops.map((c: any, i: number) => (
                      <div key={c.name} className="p-3 rounded-xl border border-stone-100 bg-stone-50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-stone-900">{i + 1}. {c.name}</div>
                          <div className="text-[11px] text-stone-400">{c.category} • {c.ordersCount} orders</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-emerald-950">₹{c.gmv.toLocaleString()}</div>
                          <div className="text-[10px] text-stone-400">{c.volumeKg} kg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PURCHASES MASTER LEDGER ("WHO WHAT HOW MUCH")                  */}
      {/* ========================================================================= */}
      {activeSubtab === 'purchases' && (
        <div className="space-y-4">
          
          {/* Controls & Export Header */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search buyer name, email, produce, farmer..."
                value={purchasesSearch}
                onChange={(e) => setPurchasesSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={purchasesBuyerType}
                onChange={(e) => setPurchasesBuyerType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
              >
                <option value="">All Buyer Types</option>
                <option value="INDIVIDUAL">Individual Consumers</option>
                <option value="BULK_FPO">Bulk / FPO Buyers</option>
              </select>

              <select
                value={purchasesStatusFilter}
                onChange={(e) => setPurchasesStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
              >
                <option value="">All Pipeline Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="ESCROW_HELD">Escrow Held</option>
                <option value="HUB_VERIFIED">Hub Verified</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
                <option value="COMPLETED">Completed</option>
                <option value="DISPUTED">Disputed</option>
              </select>

              <button
                onClick={loadData}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>

              <button
                onClick={handleExportPurchasesCsv}
                disabled={!purchases.length}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Purchases (CSV)</span>
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-stone-900">
                  Master Purchases & Transactions Ledger
                </h2>
                <p className="text-[11px] text-stone-500">
                  Comprehensive audit trail of who bought what produce, from which grower, and for how much.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {purchases.length} Records
              </span>
            </div>

            {loading ? (
              <div className="p-8 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : purchases.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-500">
                No purchases matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200 bg-stone-50">
                    <tr>
                      <th className="py-3 px-3">Order / Date</th>
                      <th className="py-3 px-3">Who Purchased (Buyer)</th>
                      <th className="py-3 px-3">What (Produce Lot)</th>
                      <th className="py-3 px-3">From Whom (Farmer)</th>
                      <th className="py-3 px-3">Quantity</th>
                      <th className="py-3 px-3">How Much (Total Paid)</th>
                      <th className="py-3 px-3">Platform Fee</th>
                      <th className="py-3 px-3">Farmer Net</th>
                      <th className="py-3 px-3">Escrow Status</th>
                      <th className="py-3 px-3">Pipeline Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {purchases.map((p) => (
                      <tr key={p.orderId} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-3">
                          <div className="font-mono text-[11px] font-bold text-stone-700">#{p.orderShortId}</div>
                          <div className="text-[10px] text-stone-400">{new Date(p.createdAt).toLocaleDateString()}</div>
                        </td>

                        {/* Who */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-stone-900">{p.buyer.name}</div>
                          <div className="text-[10px] text-stone-500 flex items-center gap-1">
                            <span className="px-1 rounded bg-stone-100 text-[9px] font-bold uppercase">{p.buyer.buyerType}</span>
                            <span>{p.buyer.city}</span>
                          </div>
                        </td>

                        {/* What */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-emerald-950">{p.produce.cropName}</div>
                          <div className="text-[10px] text-stone-500">
                            Grade: <strong className="text-emerald-700">{p.produce.confirmedGrade}</strong> (₹{p.financials.unitPrice}/{p.produce.unit})
                          </div>
                        </td>

                        {/* From Whom */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-stone-900">{p.farmer.name}</div>
                          <div className="text-[10px] text-stone-500">{p.farmer.village}, {p.farmer.district}</div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-stone-900">{p.produce.quantity} {p.produce.unit}</span>
                          <div className="text-[10px] text-stone-400">
                            {p.deliveryType === 'FARM_DIRECT' ? 'Farm-Direct' : 'Consolidated'}
                          </div>
                        </td>

                        {/* How Much */}
                        <td className="py-3 px-3 font-extrabold text-sm text-stone-900">
                          ₹{p.financials.totalAmountPaid}
                        </td>

                        {/* Commission */}
                        <td className="py-3 px-3 font-bold text-emerald-800">
                          ₹{p.financials.commissionAmount}
                          <span className="text-[10px] text-stone-400 block font-normal">({p.financials.commissionPercentage}%)</span>
                        </td>

                        {/* Net Farmer Payout */}
                        <td className="py-3 px-3 font-bold text-stone-800">
                          ₹{p.financials.farmerNetPayout}
                        </td>

                        {/* Escrow Status */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.escrow.status === 'RELEASED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.escrow.status === 'REFUNDED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {p.escrow.status}
                          </span>
                        </td>

                        {/* Pipeline Stage */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                            {p.pipelineStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: REGISTERED USERS DIRECTORY (FARMERS & BUYERS)                  */}
      {/* ========================================================================= */}
      {activeSubtab === 'users' && (
        <div className="space-y-4">
          
          {/* Controls */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setUsersRoleFilter('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  usersRoleFilter === '' ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setUsersRoleFilter('farmer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  usersRoleFilter === 'farmer' ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                🌾 Farmers Only
              </button>
              <button
                onClick={() => setUsersRoleFilter('buyer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  usersRoleFilter === 'buyer' ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                🛒 Buyers Only
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-stone-900">Registered Users Directory</h2>
                <p className="text-[11px] text-stone-500">Live profiles stored in database with contact and KYC verification.</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {usersList.length} Total
              </span>
            </div>

            {loading ? (
              <div className="p-8 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-stone-100 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-500">
                No registered users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200 bg-stone-50">
                    <tr>
                      <th className="py-3 px-4">User Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Email / Phone</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4">Activity</th>
                      <th className="py-3 px-4">Financial Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {u.name}
                          {u.buyerDetails?.orgName && (
                            <span className="text-[10px] text-stone-400 block font-normal">{u.buyerDetails.orgName}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'farmer'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.role === 'buyer'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {u.role === 'buyer' && u.buyerDetails?.buyerType === 'BULK_FPO' ? 'Bulk FPO' : u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-stone-800">{u.email}</div>
                          <div className="text-[10px] text-stone-400">{u.phone}</div>
                        </td>

                        <td className="py-3.5 px-4 text-stone-600">
                          {u.role === 'farmer' && u.farmerDetails ? (
                            <span>{u.farmerDetails.village}, {u.farmerDetails.district} ({u.farmerDetails.pincode})</span>
                          ) : u.role === 'buyer' && u.buyerDetails ? (
                            <span>{u.buyerDetails.city}, {u.buyerDetails.state}</span>
                          ) : (
                            <span>Central Operations</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-stone-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.role === 'farmer' && u.farmerDetails ? (
                            <span className="font-semibold text-emerald-800">{u.farmerDetails.activeListingsCount} Active Listings</span>
                          ) : u.role === 'buyer' && u.buyerDetails ? (
                            <span className="font-semibold text-sky-800">{u.buyerDetails.totalOrdersPlaced} Orders Placed</span>
                          ) : (
                            <span>Platform Admin</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-stone-900">
                          {u.role === 'buyer' && u.buyerDetails ? (
                            <span>Spent: ₹{u.buyerDetails.totalSpent.toLocaleString()}</span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: INTAKE & GRADING STATION                                       */}
      {/* ========================================================================= */}
      {activeSubtab === 'intake' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Lane 1: Farmer Drop-off */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <h2 className="text-base font-extrabold text-stone-900">Lane 1: Farmer Drop-off</h2>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {intakeData.dropoffLane.length} Orders
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-4">
                  Consolidated lots (&lt; 0.5 quintal) dropped off by local farmers at village collection dock.
                </p>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {intakeData.dropoffLane.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100/70 transition space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] text-stone-400">#{o.id.slice(0, 8)}</span>
                          <h4 className="font-extrabold text-xs text-stone-900">{o.listing?.crop?.name}</h4>
                          <div className="text-[11px] text-stone-500">
                            Farmer: {o.listing?.farmer?.name} ({o.listing?.farmer?.farmerProfile?.village})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-stone-800">{o.quantity} {o.unit}</div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-emerald-800 border">
                            AI Grade {o.listing?.aiGrade}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400">Status: {o.status}</span>
                        <button
                          onClick={() => {
                            setSelectedOrderForGrading(o);
                            setGradingWeight(String(o.quantity));
                            setGradingGrade(o.listing?.aiGrade || 'A');
                          }}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs"
                        >
                          <Scale className="w-3 h-3" />
                          <span>Weigh & Grade</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lane 2: Logistics Pickup */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <h2 className="text-base font-extrabold text-stone-900">Lane 2: Logistics Pickup</h2>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {intakeData.pickupLane.length} Orders
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-4">
                  Farm-Direct lots (≥ 0.5 quintal threshold) arriving via dedicated collection trucks.
                </p>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {intakeData.pickupLane.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100/70 transition space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] text-stone-400">#{o.id.slice(0, 8)}</span>
                          <h4 className="font-extrabold text-xs text-stone-900">{o.listing?.crop?.name}</h4>
                          <div className="text-[11px] text-stone-500">
                            Farmer: {o.listing?.farmer?.name} ({o.listing?.farmer?.farmerProfile?.village})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-stone-800">{o.quantity} {o.unit}</div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-amber-800 border">
                            AI Grade {o.listing?.aiGrade}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400">Status: {o.status}</span>
                        <button
                          onClick={() => {
                            setSelectedOrderForGrading(o);
                            setGradingWeight(String(o.quantity));
                            setGradingGrade(o.listing?.aiGrade || 'A');
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs"
                        >
                          <Scale className="w-3 h-3" />
                          <span>Weigh & Grade</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* GRADING MODAL with Automated Discrepancy Rule Engine */}
      {selectedOrderForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <button
              onClick={() => setSelectedOrderForGrading(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
                <Scale className="w-3 h-3" />
                <span>Hub Quality Inspection Station</span>
              </div>
              <h3 className="text-lg font-extrabold text-stone-900">
                Grade & Weigh Order #{selectedOrderForGrading.id.slice(0, 8)}
              </h3>
              <p className="text-xs text-stone-500">
                Produce: {selectedOrderForGrading.listing?.crop?.name} (Listed: {selectedOrderForGrading.quantity} {selectedOrderForGrading.unit}, AI Grade {selectedOrderForGrading.listing?.aiGrade})
              </p>
            </div>

            {/* Side-by-Side Comparison Box */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
              <div>
                <div className="text-stone-400 font-bold uppercase text-[10px]">AI Pre-Grade Certificate</div>
                <div className="font-extrabold text-emerald-800 text-sm mt-0.5">
                  Grade {selectedOrderForGrading.listing?.aiGrade}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Confidence: {Math.round((selectedOrderForGrading.listing?.aiConfidence || 0.9) * 100)}%
                </div>
              </div>

              <div>
                <div className="text-stone-400 font-bold uppercase text-[10px]">Listed Batch Weight</div>
                <div className="font-extrabold text-stone-900 text-sm mt-0.5">
                  {selectedOrderForGrading.quantity} {selectedOrderForGrading.unit}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Base Unit Price: ₹{selectedOrderForGrading.unitPrice}/{selectedOrderForGrading.unit}
                </div>
              </div>
            </div>

            <form onSubmit={handleExecuteGrading} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Digital Scale Weight ({selectedOrderForGrading.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={gradingWeight}
                  onChange={(e) => setGradingWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-extrabold text-stone-900 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Staff Verified Grade (Confirm or Override) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A', 'B', 'C'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGradingGrade(g)}
                      className={`py-2 rounded-xl border font-bold text-xs transition ${
                        gradingGrade === g
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Grade {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Inspection Log & Discrepancy Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Scale calibration checked. Size uniformity verified..."
                  value={gradingNotes}
                  onChange={(e) => setGradingNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
                <span className="font-bold">Automated Discrepancy Rule Engine:</span> If confirmed grade or scale weight differs from the listing, the platform automatically recalculates the invoice price, adjusts escrow, and queues the refund difference for the buyer.
              </div>

              <button
                type="submit"
                disabled={gradingLoading}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                {gradingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Execute Rule Engine & Mark Hub Verified</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: DISPATCH KANBAN BOARD                                          */}
      {/* ========================================================================= */}
      {activeSubtab === 'dispatch' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-stone-900">Dispatch & Carrier Board</h2>
            <span className="text-xs text-stone-500">Advance shipments across logistics lifecycle</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* READY */}
            <div className="bg-stone-100 rounded-2xl p-4 space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Ready to Ship</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
                  {dispatchKanban.READY?.length || 0}
                </span>
              </div>

              {dispatchKanban.READY?.map((d) => (
                <div key={d.id} className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-2">
                  <div className="font-extrabold text-xs text-stone-900">{d.order?.listing?.crop?.name}</div>
                  <div className="text-[11px] text-stone-500">#{d.orderId.slice(0, 8)} • {d.order?.quantity} {d.order?.unit}</div>
                  <div className="text-[10px] text-stone-400 truncate">Destination: {d.order?.deliveryAddress || 'Mumbai'}</div>
                  <button
                    onClick={() => {
                      setSelectedDispatch(d);
                      setDriverName('Mahesh Kadam');
                      setVehicleId('MH-12-QZ-9020');
                    }}
                    className="w-full mt-2 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-[11px]"
                  >
                    Assign Route & Driver
                  </button>
                </div>
              ))}
            </div>

            {/* ASSIGNED */}
            <div className="bg-sky-50/70 rounded-2xl p-4 space-y-3 min-h-[500px] border border-sky-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-950">Assigned Route</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  {dispatchKanban.ASSIGNED?.length || 0}
                </span>
              </div>

              {dispatchKanban.ASSIGNED?.map((d) => (
                <div key={d.id} className="bg-white rounded-xl p-3.5 border border-sky-200 shadow-xs space-y-2">
                  <div className="font-extrabold text-xs text-stone-900">{d.order?.listing?.crop?.name}</div>
                  <div className="text-[11px] text-stone-600">Carrier: {d.vehicleId} ({d.driverName})</div>
                  <div className="text-[10px] text-sky-700 font-bold">ETA: {d.eta || 'Scheduled'}</div>
                  <button
                    onClick={() => handleUpdateDispatch(d.id, 'IN_TRANSIT')}
                    className="w-full mt-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px]"
                  >
                    Dispatch to In Transit
                  </button>
                </div>
              ))}
            </div>

            {/* IN_TRANSIT */}
            <div className="bg-amber-50/70 rounded-2xl p-4 space-y-3 min-h-[500px] border border-amber-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">In Transit</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {dispatchKanban.IN_TRANSIT?.length || 0}
                </span>
              </div>

              {dispatchKanban.IN_TRANSIT?.map((d) => (
                <div key={d.id} className="bg-white rounded-xl p-3.5 border border-amber-200 shadow-xs space-y-2">
                  <div className="font-extrabold text-xs text-stone-900">{d.order?.listing?.crop?.name}</div>
                  <div className="text-[11px] text-stone-600">Live Driver: {d.driverName}</div>
                  <div className="text-[10px] text-amber-700 font-bold animate-pulse">Status: En Route</div>
                  <button
                    onClick={() => handleUpdateDispatch(d.id, 'DELIVERED')}
                    className="w-full mt-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px]"
                  >
                    Confirm Delivery at Door
                  </button>
                </div>
              ))}
            </div>

            {/* DELIVERED */}
            <div className="bg-emerald-50/70 rounded-2xl p-4 space-y-3 min-h-[500px] border border-emerald-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">Delivered</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {dispatchKanban.DELIVERED?.length || 0}
                </span>
              </div>

              {dispatchKanban.DELIVERED?.map((d) => (
                <div key={d.id} className="bg-white rounded-xl p-3.5 border border-emerald-200 shadow-xs space-y-1">
                  <div className="font-extrabold text-xs text-stone-900">{d.order?.listing?.crop?.name}</div>
                  <div className="text-[11px] text-stone-500">#{d.orderId.slice(0, 8)}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Delivered
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* DRIVER ASSIGNMENT MODAL */}
      {selectedDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <button onClick={() => setSelectedDispatch(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-base text-stone-900">Assign Driver & Vehicle</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Driver Contact Phone</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                  placeholder="+91 98222 11990"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Estimated Delivery (ETA)</label>
                <input
                  type="text"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <button
                type="button"
                onClick={() => handleUpdateDispatch(selectedDispatch.id, 'ASSIGNED')}
                disabled={dispatchLoading}
                className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs transition"
              >
                Confirm Route Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: COMMISSION & 0.5 QUINTAL THRESHOLD CONFIG                       */}
      {/* ========================================================================= */}
      {activeSubtab === 'config' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Per-Crop Threshold & Platform Commission Database</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              These dynamic DB values control the 0.5-quintal logistics cutoff and marketplace commission percentage everywhere in the application.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-stone-400 border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="py-3 px-4">Crop Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quintal Threshold (Farm-Direct)</th>
                  <th className="py-3 px-4">Threshold in kg</th>
                  <th className="py-3 px-4">Platform Commission (%)</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {thresholds.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50 transition">
                    <td className="py-3.5 px-4 font-bold text-stone-900">{t.crop.name}</td>
                    <td className="py-3.5 px-4 text-stone-600">{t.crop.category}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                      {t.quintalEquivalentThreshold} quintal
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 font-semibold">
                      {t.quintalEquivalentThreshold * 100} kg
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-800">
                      {t.commissionPercentage}%
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setEditingThreshold(t)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-bold text-[11px]"
                      >
                        Edit Config
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingThreshold && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-3">
              <h3 className="font-extrabold text-amber-950 text-sm">
                Edit Parameters: {editingThreshold.crop.name}
              </h3>
              <form onSubmit={handleSaveThreshold} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Quintal Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={editingThreshold.quintalEquivalentThreshold}
                    onChange={(e) => setEditingThreshold({ ...editingThreshold, quintalEquivalentThreshold: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Platform Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    required
                    value={editingThreshold.commissionPercentage}
                    onChange={(e) => setEditingThreshold({ ...editingThreshold, commissionPercentage: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                  >
                    Save Changes to DB
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingThreshold(null)}
                    className="px-3 py-2 bg-stone-200 text-stone-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 7: DISPUTES CONSOLE                                               */}
      {/* ========================================================================= */}
      {activeSubtab === 'disputes' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Buyer Quality Disputes & Escrow Resolution</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Hub staff review reported transit damages, inspection variance, and issue full or partial escrow refunds.
            </p>
          </div>

          {disputes.length === 0 ? (
            <div className="text-center py-12 text-xs text-stone-500">
              No active disputes recorded. All orders running smoothly!
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.id} className="p-5 rounded-2xl border border-stone-200 bg-stone-50 space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[10px] text-stone-400">Dispute #{d.id.slice(0, 8)}</div>
                      <h4 className="font-extrabold text-sm text-stone-900">
                        Order #{d.orderId.slice(0, 8)} • {d.order?.listing?.crop?.name}
                      </h4>
                      <div className="text-[11px] text-stone-600 mt-0.5">
                        Buyer: {d.order?.buyer?.name} | Total Escrow: ₹{d.order?.totalAmount}
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      d.status === 'OPEN' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-800">
                    <span className="font-bold text-rose-800">Reported Issue: </span>
                    {d.reason}
                  </div>

                  {d.status === 'OPEN' && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleResolveDispute(d.id, 'FULL_REFUND')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition"
                      >
                        Authorize Full Escrow Refund (₹{d.order?.totalAmount})
                      </button>
                      <button
                        onClick={() => handleResolveDispute(d.id, 'PARTIAL_REFUND')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition"
                      >
                        Authorize 50% Partial Refund
                      </button>
                      <button
                        onClick={() => handleResolveDispute(d.id, 'REGRADE')}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-bold text-xs transition"
                      >
                        Re-grade & Close
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default HubDashboard;
