import React, { useState, useEffect } from 'react';
import { CreditCard, Download, CheckCircle2, Clock, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

export const FarmerPayouts: React.FC = () => {
  const { user } = useAuth();
  const { success } = useToast();
  const [payoutData, setPayoutData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getFarmerPayouts()
      .then((res) => setPayoutData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Export CSV
  const handleDownloadStatement = () => {
    if (!payoutData?.payouts || payoutData.payouts.length === 0) return;

    const headers = ['Order ID', 'Date', 'Produce', 'Quantity', 'Gross (INR)', 'Commission Deducted (INR)', 'Net Payout (INR)', 'Status', 'Payout Ref'];
    const rows = payoutData.payouts.map((p: any) => [
      p.orderId,
      new Date(p.date).toLocaleDateString(),
      p.cropName,
      p.quantity,
      p.grossAmount,
      p.commissionDeducted,
      p.netPayout,
      p.status,
      p.payoutTxRef || 'Pending',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FarmDirect_Payout_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Statement Downloaded', 'Your CSV payout settlement ledger has been saved.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Farmer Payouts & Settlement Ledger</h1>
          <p className="text-xs text-stone-500">
            Transparent breakdown of gross sales, platform commission, and bank transfers.
          </p>
        </div>

        <button
          onClick={handleDownloadStatement}
          disabled={!payoutData?.payouts?.length}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs shadow-sm transition disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-emerald-700" />
          <span>Download Statement (CSV)</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Settled */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Settled Earnings</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-950 mt-2">
            ₹{payoutData?.totalSettled ? payoutData.totalSettled.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            Disbursed to Bank / UPI
          </div>
        </div>

        {/* Pending Escrow */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Locked in Escrow</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-stone-900 mt-2">
            ₹{payoutData?.totalPendingEscrow ? payoutData.totalPendingEscrow.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-stone-500 font-medium mt-1">
            Releases upon buyer delivery acceptance
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Payout Account</span>
            <div className="text-sm font-extrabold text-stone-900 mt-1">
              {user?.farmerProfile?.upiId || 'UPI / Bank Linked'}
            </div>
            <div className="text-[11px] text-stone-400 font-mono mt-0.5">
              IFSC: {user?.farmerProfile?.ifscCode || 'HDFC0001234'}
            </div>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Instant NEFT / IMPS Automatic Route</span>
          </div>
        </div>

      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-stone-900">Settlement Transactions</h2>
          <span className="text-xs text-stone-400">{payoutData?.payouts?.length || 0} Transactions</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-stone-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : !payoutData?.payouts?.length ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No settlement records found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-stone-400 border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Crop Lot</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4">Net Farmer Payout</th>
                  <th className="py-3 px-4">Payout Ref (UTR)</th>
                  <th className="py-3 px-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {payoutData.payouts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-stone-50 transition">
                    <td className="py-3.5 px-4 text-stone-600">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-mono text-stone-400">#{p.orderId.slice(0, 8)}</td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">{p.cropName} ({p.quantity})</td>
                    <td className="py-3.5 px-4 text-stone-700">₹{p.grossAmount}</td>
                    <td className="py-3.5 px-4 text-rose-700">
                      -₹{p.commissionDeducted} ({p.commissionPercentage}%)
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-900 text-sm">
                      ₹{p.netPayout}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-500 text-[11px]">
                      {p.payoutTxRef || 'Pending Escrow Release'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {p.status}
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
  );
};

export default FarmerPayouts;
