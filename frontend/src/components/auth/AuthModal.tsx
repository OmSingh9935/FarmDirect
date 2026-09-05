import React, { useState, useEffect } from 'react';
import {
  X,
  Wheat,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Building2,
  UserPlus,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import api from '../../services/api.js';
import { UserRole } from '../../types/index.js';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalRole, loginWithUser } = useAuth();
  const { success, error: toastError } = useToast();

  // 'login' or 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Selected role for login or registration
  const [selectedRole, setSelectedRole] = useState<UserRole>(authModalRole || 'buyer');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Farmer registration form state
  const [farmerForm, setFarmerForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    village: '',
    pincode: '',
    district: '',
    state: 'Maharashtra',
    upiId: '',
  });
  const [showFarmerPassword, setShowFarmerPassword] = useState(false);

  // Buyer registration form state
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    buyerType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BULK_FPO',
    orgName: '',
    gstin: '',
    addressLine: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
  });
  const [showBuyerPassword, setShowBuyerPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // Synchronize role whenever authModalRole changes
  useEffect(() => {
    const r = authModalRole || 'buyer';
    setSelectedRole(r);
    if (r === 'hub_admin') {
      setMode('login');
      setLoginEmail('omsingh203090@gmail.com');
      setLoginPassword('Omsingh@123');
    } else {
      if (loginEmail === 'omsingh203090@gmail.com') {
        setLoginEmail('');
        setLoginPassword('');
      }
    }
  }, [authModalRole, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginEmail.includes('@')) {
      toastError('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      toastError('Missing Password', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(loginEmail, loginPassword);
      loginWithUser(res.user);
      success('Welcome Back', `Successfully signed in as ${res.user.name}`);
      closeAuthModal();
    } catch (err: any) {
      toastError('Sign In Failed', err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle Farmer Registration Submit
  const handleFarmerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerForm.name || !farmerForm.email || !farmerForm.password || !farmerForm.phone || !farmerForm.village || !farmerForm.pincode) {
      toastError('Missing Details', 'Please fill in all mandatory fields.');
      return;
    }
    if (farmerForm.password.length < 6) {
      toastError('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerFarmer(farmerForm);
      loginWithUser(res.user);
      success('Farmer Account Created', `Welcome to FarmDirect, ${res.user.name}!`);
      closeAuthModal();
    } catch (err: any) {
      toastError('Registration Failed', err.message || 'Could not complete farmer registration.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Buyer Registration Submit
  const handleBuyerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerForm.name || !buyerForm.email || !buyerForm.password || !buyerForm.phone || !buyerForm.addressLine || !buyerForm.city || !buyerForm.pincode) {
      toastError('Missing Details', 'Please fill in all mandatory fields.');
      return;
    }
    if (buyerForm.buyerType === 'BULK_FPO' && !buyerForm.orgName) {
      toastError('Missing Org Name', 'Please provide the Organization / FPO name.');
      return;
    }
    if (buyerForm.password.length < 6) {
      toastError('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerBuyer(buyerForm);
      loginWithUser(res.user);
      success('Buyer Account Created', `Welcome to FarmDirect, ${res.user.name}!`);
      closeAuthModal();
    } catch (err: any) {
      toastError('Registration Failed', err.message || 'Could not complete buyer registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header bar with FarmDirect logo */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 px-6 py-5 text-white text-center relative shrink-0">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-emerald-300 hover:text-white transition p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-block bg-white rounded-2xl px-4 py-2 shadow-md mx-auto mb-2 border border-white/40">
            <img
              src="/logo.png"
              alt="Farm Direct"
              className="h-8 sm:h-9 w-auto object-contain mx-auto"
            />
          </div>
          <h2 className="text-base font-extrabold tracking-tight text-white">
            {mode === 'login' ? 'Sign In to Your Account' : 'Create a New Account'}
          </h2>
          <p className="text-xs text-emerald-200">DIRECT HARVEST & ESCROW MARKETPLACE</p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-50 shrink-0">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-bold transition border-b-2 ${
              mode === 'login'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              if (selectedRole === 'hub_admin') setSelectedRole('buyer');
            }}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-bold transition border-b-2 ${
              mode === 'register'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New User Registration</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* ================= MODE: LOGIN ================= */}
          {mode === 'login' && (
            <div>
              {/* Role Indicator / Selector */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Sign In As
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('buyer');
                      if (loginEmail === 'omsingh203090@gmail.com') {
                        setLoginEmail('');
                        setLoginPassword('');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'buyer'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                    <span>Buyer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('farmer');
                      if (loginEmail === 'omsingh203090@gmail.com') {
                        setLoginEmail('');
                        setLoginPassword('');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'farmer'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Wheat className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Farmer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('hub_admin');
                      setLoginEmail('omsingh203090@gmail.com');
                      setLoginPassword('Omsingh@123');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'hub_admin'
                        ? 'bg-white text-amber-950 shadow-sm ring-1 ring-amber-300'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

              {/* Special Banner for Admin Role */}
              {selectedRole === 'hub_admin' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900">Admin & Hub Lead Portal</div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      Platform credentials pre-loaded for <strong>omsingh203090@gmail.com</strong>.
                    </div>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your account password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 transition"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm shadow transition disabled:opacity-50 ${
                    selectedRole === 'hub_admin'
                      ? 'bg-amber-700 hover:bg-amber-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {selectedRole === 'hub_admin'
                          ? 'Sign In as Admin'
                          : selectedRole === 'farmer'
                          ? 'Sign In as Farmer'
                          : 'Sign In as Buyer'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to Register */}
              <div className="text-center pt-4 border-t border-stone-100 mt-4">
                <p className="text-xs text-stone-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      if (selectedRole === 'hub_admin') setSelectedRole('buyer');
                    }}
                    className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 ml-0.5"
                  >
                    <span>Register new account</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ================= MODE: REGISTER ================= */}
          {mode === 'register' && (
            <div>
              {/* Role Toggle for Registration */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Register Account Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'buyer'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                    <span>Buyer Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('farmer')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'farmer'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Wheat className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Farmer Account</span>
                  </button>
                </div>
              </div>

              {/* FARMER REGISTRATION FORM */}
              {selectedRole === 'farmer' && (
                <form onSubmit={handleFarmerRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Farmer Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={farmerForm.name}
                        onChange={(e) => setFarmerForm({ ...farmerForm, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="farmer@example.com"
                        value={farmerForm.email}
                        onChange={(e) => setFarmerForm({ ...farmerForm, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Create Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <input
                        type={showFarmerPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Create strong password"
                        value={farmerForm.password}
                        onChange={(e) => setFarmerForm({ ...farmerForm, password: e.target.value })}
                        className="w-full pl-9 pr-10 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowFarmerPassword(!showFarmerPassword)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                        tabIndex={-1}
                      >
                        {showFarmerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="+91 98220 12345"
                          value={farmerForm.phone}
                          onChange={(e) => setFarmerForm({ ...farmerForm, phone: e.target.value })}
                          className="w-full pl-8 pr-2 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                        <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Pincode *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="422202"
                          value={farmerForm.pincode}
                          onChange={(e) => setFarmerForm({ ...farmerForm, pincode: e.target.value })}
                          className="w-full pl-8 pr-2 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                        <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Village / Taluka *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dindori"
                        value={farmerForm.village}
                        onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        District
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Nashik"
                        value={farmerForm.district}
                        onChange={(e) => setFarmerForm({ ...farmerForm, district: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      UPI ID for Direct Payouts (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ramesh@okhdfcbank"
                      value={farmerForm.upiId}
                      onChange={(e) => setFarmerForm({ ...farmerForm, upiId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow transition disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Farmer...</span>
                      </span>
                    ) : (
                      'Register Farmer & Access Portal'
                    )}
                  </button>
                </form>
              )}

              {/* BUYER REGISTRATION FORM */}
              {selectedRole === 'buyer' && (
                <form onSubmit={handleBuyerRegister} className="space-y-3">
                  {/* Buyer Type Toggle */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Buyer Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBuyerForm({ ...buyerForm, buyerType: 'INDIVIDUAL' })}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                          buyerForm.buyerType === 'INDIVIDUAL'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Individual Consumer
                      </button>
                      <button
                        type="button"
                        onClick={() => setBuyerForm({ ...buyerForm, buyerType: 'BULK_FPO' })}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                          buyerForm.buyerType === 'BULK_FPO'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Bulk / FPO Buyer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {buyerForm.buyerType === 'BULK_FPO' ? 'Contact Person Name *' : 'Full Name *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Sharma"
                        value={buyerForm.name}
                        onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {buyerForm.buyerType === 'BULK_FPO' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Org / Company Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="GreenFresh FPO"
                            value={buyerForm.orgName}
                            onChange={(e) => setBuyerForm({ ...buyerForm, orgName: e.target.value })}
                            className="w-full pl-8 pr-2 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                          />
                          <Building2 className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          GSTIN (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="27AABCG1234F1Z5"
                          value={buyerForm.gstin}
                          onChange={(e) => setBuyerForm({ ...buyerForm, gstin: e.target.value })}
                          className="w-full px-2 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="buyer@example.com"
                        value={buyerForm.email}
                        onChange={(e) => setBuyerForm({ ...buyerForm, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Create Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <input
                        type={showBuyerPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Create strong password"
                        value={buyerForm.password}
                        onChange={(e) => setBuyerForm({ ...buyerForm, password: e.target.value })}
                        className="w-full pl-9 pr-10 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowBuyerPassword(!showBuyerPassword)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                        tabIndex={-1}
                      >
                        {showBuyerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="+91 98200 45678"
                          value={buyerForm.phone}
                          onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })}
                          className="w-full pl-8 pr-2 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                        <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Pincode *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="400050"
                          value={buyerForm.pincode}
                          onChange={(e) => setBuyerForm({ ...buyerForm, pincode: e.target.value })}
                          className="w-full pl-8 pr-2 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                        <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Flat/Shop, Building, Street, Area"
                      value={buyerForm.addressLine}
                      onChange={(e) => setBuyerForm({ ...buyerForm, addressLine: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Mumbai"
                        value={buyerForm.city}
                        onChange={(e) => setBuyerForm({ ...buyerForm, city: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Maharashtra"
                        value={buyerForm.state}
                        onChange={(e) => setBuyerForm({ ...buyerForm, state: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow transition disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Buyer Account...</span>
                      </span>
                    ) : (
                      'Register Buyer & Start Ordering'
                    )}
                  </button>
                </form>
              )}

              {/* Switch back to Login */}
              <div className="text-center pt-4 border-t border-stone-100 mt-4">
                <p className="text-xs text-stone-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 ml-0.5"
                  >
                    <span>Sign In here</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
