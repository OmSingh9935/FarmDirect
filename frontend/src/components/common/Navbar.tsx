import React, { useState } from 'react';
import {
  ShoppingBag,
  Bell,
  User as UserIcon,
  LogOut,
  Sparkles,
  Layers,
  Truck,
  ShieldCheck,
  Wheat,
  SlidersHorizontal,
  Mic,
  TrendingUp,
  CreditCard,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openVoiceAssistant?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openVoiceAssistant }) => {
  const { user, role, logout, openAuthModal, demoLogin } = useAuth();
  const { totalQuantity, openCart } = useCart();
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setCurrentTab(role === 'hub_admin' ? 'hub-analytics' : role === 'farmer' ? 'farmer-dash' : 'home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <Wheat className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-1">
                Farm<span className="text-emerald-600">Direct</span>
              </span>
              <span className="hidden sm:block text-[10px] tracking-wider uppercase font-semibold text-stone-500">
                Direct Harvest & Escrow
              </span>
            </div>
          </div>

          {/* Role-Specific Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-xs">
            {role === 'buyer' && (
              <>
                <button
                  onClick={() => setCurrentTab('home')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'home'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Marketplace
                </button>
                <button
                  onClick={() => setCurrentTab('orders')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'orders'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  My Orders & Tracking
                </button>
              </>
            )}

            {role === 'farmer' && (
              <>
                <button
                  onClick={() => setCurrentTab('farmer-dash')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'farmer-dash'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentTab('farmer-produce')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'farmer-produce'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  My Produce & Mandi
                </button>
                <button
                  onClick={() => setCurrentTab('farmer-orders')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'farmer-orders'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setCurrentTab('farmer-payouts')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'farmer-payouts'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Payouts Ledger
                </button>
                <button
                  onClick={() => setCurrentTab('farmer-profile')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'farmer-profile'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Profile & Bank
                </button>
              </>
            )}

            {role === 'hub_admin' && (
              <>
                <button
                  onClick={() => setCurrentTab('hub-analytics')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    currentTab === 'hub-analytics'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => setCurrentTab('hub-purchases')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    currentTab === 'hub-purchases'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Purchases Ledger</span>
                </button>
                <button
                  onClick={() => setCurrentTab('hub-users')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    currentTab === 'hub-users'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users Directory</span>
                </button>
                <button
                  onClick={() => setCurrentTab('hub-intake')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'hub-intake'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Intake & Grading
                </button>
                <button
                  onClick={() => setCurrentTab('hub-dispatch')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'hub-dispatch'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Dispatch Kanban
                </button>
                <button
                  onClick={() => setCurrentTab('hub-config')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'hub-config'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Thresholds
                </button>
                <button
                  onClick={() => setCurrentTab('hub-disputes')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    currentTab === 'hub-disputes'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
                  }`}
                >
                  Disputes
                </button>
              </>
            )}
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Voice Assistant Button */}
            {openVoiceAssistant && (
              <button
                onClick={openVoiceAssistant}
                title="Voice Assistant & Navigation"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-100/70 text-emerald-900 hover:bg-emerald-200 transition font-medium text-xs border border-emerald-300"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                <span className="hidden sm:inline">Voice Assist</span>
              </button>
            )}

            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 transition font-medium text-xs border border-amber-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Switch Role</span>
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-2xl border border-stone-200 p-2 z-50">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-2 py-1">
                    Instant Demo Login
                  </div>
                  <button
                    onClick={() => {
                      demoLogin('farmer');
                      setShowDemoMenu(false);
                      setCurrentTab('farmer-dash');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 text-stone-800 font-medium flex items-center gap-2"
                  >
                    <Wheat className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-emerald-950">Ramesh (Farmer)</div>
                      <div className="text-[10px] text-stone-500">Listings, Mandi AI, Payouts</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin('buyer');
                      setShowDemoMenu(false);
                      setCurrentTab('home');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 text-stone-800 font-medium flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-sky-600" />
                    <div>
                      <div className="font-semibold text-emerald-950">Priya (Consumer Buyer)</div>
                      <div className="text-[10px] text-stone-500">Browse, Escrow, Delivery</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin('bulk_buyer');
                      setShowDemoMenu(false);
                      setCurrentTab('home');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 text-stone-800 font-medium flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-emerald-950">GreenFresh (Bulk FPO)</div>
                      <div className="text-[10px] text-stone-500">Bulk procurement, GST billing</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin('hub_admin');
                      setShowDemoMenu(false);
                      setCurrentTab('hub-analytics');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 text-stone-800 font-medium flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-semibold text-emerald-950">Rajesh (Hub Admin)</div>
                      <div className="text-[10px] text-stone-500">Analytics, Purchases, Directory</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Buyer Cart Button */}
            {role === 'buyer' && (
              <button
                onClick={openCart}
                className="relative p-2 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-stone-100 transition"
                title="Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {totalQuantity}
                  </span>
                )}
              </button>
            )}

            {/* User Session or Login Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-stone-900 truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-stone-100 text-stone-600">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / OTP</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
