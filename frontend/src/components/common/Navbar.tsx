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
  const { user, role, logout, openAuthModal } = useAuth();
  const { totalQuantity, openCart } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo and Brand */}
          <div
            className="flex items-center cursor-pointer shrink-0 py-1"
            onClick={() => setCurrentTab(role === 'hub_admin' ? 'hub-analytics' : role === 'farmer' ? 'farmer-dash' : 'home')}
          >
            <img
              src="/logo.png"
              alt="Farm Direct — Direct Harvest & Escrow"
              className="h-10 sm:h-11 w-auto object-contain transition hover:opacity-95"
            />
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

            {/* Real Portal Access for Farmers and Admin when logged out */}
            {!user && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => openAuthModal('farmer')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition"
                >
                  <Wheat className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Farmer Portal</span>
                </button>
                <button
                  onClick={() => openAuthModal('hub_admin')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-semibold transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin</span>
                </button>
              </div>
            )}

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
