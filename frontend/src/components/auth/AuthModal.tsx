import React, { useState, useEffect, useRef } from 'react';
import { X, Wheat, ShoppingBag, ArrowRight, CheckCircle2, ShieldCheck, Mail, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import api from '../../services/api.js';
import { UserRole } from '../../types/index.js';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalRole, loginWithUser, demoLogin } = useAuth();
  const { success, error: toastError } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>(authModalRole || 'buyer');
  const [step, setStep] = useState<'email' | 'otp' | 'farmer_onboarding' | 'buyer_onboarding'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [onboardingToken, setOnboardingToken] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // 6 segmented OTP inputs
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Farmer Onboarding Form State
  const [farmerForm, setFarmerForm] = useState({
    name: '',
    phone: '',
    village: '',
    pincode: '',
    district: '',
    bankAccountNumber: '',
    ifscCode: '',
    upiId: '',
    preferredLanguage: 'en',
    aadhaarOptional: '',
  });

  // Buyer Onboarding Form State
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    phone: '',
    buyerType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BULK_FPO',
    orgName: '',
    gstin: '',
    addressLine: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
  });

  useEffect(() => {
    setSelectedRole(authModalRole);
  }, [authModalRole]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isAuthModalOpen) return null;

  // 1. Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      toastError('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    setDevOtpHint(null);
    try {
      const res = await api.requestOtp(email, selectedRole);
      setCooldown(res.cooldown || 60);
      setStep('otp');
      success('Verification Code Sent', res.message);

      // Check for dev OTP helper
      setTimeout(async () => {
        try {
          const devRes = await api.getDevOtp(email);
          if (devRes.otp) setDevOtpHint(devRes.otp);
        } catch {
          // ignore
        }
      }, 500);
    } catch (err: any) {
      toastError('OTP Request Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance segmented OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste handling
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || '';
        }
        setOtpDigits(newDigits);
        const nextIdx = Math.min(pasted.length, 5);
        inputRefs.current[nextIdx]?.focus();
      }
      return;
    }

    const cleanChar = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      toastError('Invalid Code', 'Please enter all 6 digits of the verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(email, code);

      if (res.isNewUser && res.onboardingToken) {
        setOnboardingToken(res.onboardingToken);
        if (selectedRole === 'farmer') {
          setStep('farmer_onboarding');
        } else {
          setStep('buyer_onboarding');
        }
        success('Email Verified', 'Please complete your profile to finish registration.');
      } else if (res.user) {
        loginWithUser(res.user);
        success('Welcome Back', `Signed in as ${res.user.name}`);
        closeAuthModal();
      }
    } catch (err: any) {
      toastError('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Complete Farmer Onboarding
  const handleFarmerOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerForm.name || !farmerForm.phone || !farmerForm.village || !farmerForm.pincode) {
      toastError('Missing Details', 'Please fill in all mandatory profile fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.completeFarmerOnboarding({
        onboardingToken,
        ...farmerForm,
      });
      loginWithUser(res.user);
      success('Registration Complete', 'Welcome to FarmDirect! Your farmer account is active.');
      closeAuthModal();
    } catch (err: any) {
      toastError('Onboarding Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Complete Buyer Onboarding
  const handleBuyerOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerForm.name || !buyerForm.phone || !buyerForm.addressLine || !buyerForm.city || !buyerForm.pincode) {
      toastError('Missing Details', 'Please fill in all required delivery details');
      return;
    }

    setLoading(true);
    try {
      const res = await api.completeBuyerOnboarding({
        onboardingToken,
        ...buyerForm,
      });
      loginWithUser(res.user);
      success('Account Created', 'Welcome to FarmDirect marketplace!');
      closeAuthModal();
    } catch (err: any) {
      toastError('Onboarding Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header bar */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 px-6 py-6 text-white text-center relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-emerald-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-block bg-white rounded-2xl px-4 py-2.5 shadow-lg mx-auto mb-3 border border-white/40">
            <img
              src="/logo.png"
              alt="Farm Direct — Direct Harvest & Escrow"
              className="h-9 sm:h-10 w-auto object-contain mx-auto"
            />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">Secure Portal Access</h2>
          <p className="text-xs text-emerald-200 mt-0.5">DIRECT HARVEST & ESCROW</p>
        </div>

        {/* Modal Body */}
        <div className="p-6">

          {/* STEP 1: Email Entry & Role Selection */}
          {step === 'email' && (
            <div>
              {/* Role Toggle */}
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('farmer')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'farmer'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Wheat className="w-4 h-4 text-emerald-600" />
                    I'm a Farmer
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                      selectedRole === 'buyer'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-sky-600" />
                    I'm a Buyer
                  </button>
                </div>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant Demo Login Divider */}
              <div className="mt-6 pt-5 border-t border-stone-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center mb-3">
                  Or Test Instantly with Demo Profiles
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => demoLogin('farmer')}
                    className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-900 text-xs font-semibold flex flex-col items-center gap-1 transition"
                  >
                    <Wheat className="w-4 h-4 text-emerald-600" />
                    <span>Farmer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => demoLogin('buyer')}
                    className="p-2 rounded-lg border border-sky-200 bg-sky-50/50 hover:bg-sky-100/70 text-sky-900 text-xs font-semibold flex flex-col items-center gap-1 transition"
                  >
                    <ShoppingBag className="w-4 h-4 text-sky-600" />
                    <span>Buyer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => demoLogin('hub_admin')}
                    className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-amber-900 text-xs font-semibold flex flex-col items-center gap-1 transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Hub Staff</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Segmented OTP Input */}
          {step === 'otp' && (
            <div>
              <div className="text-center mb-5">
                <p className="text-xs text-stone-500">We sent a 6-digit verification code to</p>
                <p className="text-sm font-bold text-stone-900">{email}</p>
              </div>

              {/* Dev OTP Helper Banner */}
              {devOtpHint && (
                <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold">Local Dev Code: </span>
                    <span className="font-mono font-bold tracking-widest text-sm text-emerald-700">{devOtpHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = devOtpHint.split('');
                      setOtpDigits(chars);
                    }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                  >
                    Fill Code
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6 Segmented Inputs */}
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className="w-11 h-12 text-center text-xl font-extrabold rounded-xl border-2 border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none bg-stone-50"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.some((d) => !d)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify Code & Continue'}
                </button>

                {/* Resend Cooldown */}
                <div className="flex items-center justify-between text-xs text-stone-500 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="hover:text-stone-800"
                  >
                    Change email
                  </button>

                  {cooldown > 0 ? (
                    <span className="flex items-center gap-1 text-stone-400">
                      <Clock className="w-3.5 h-3.5" />
                      Resend code in {cooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Farmer Onboarding */}
          {step === 'farmer_onboarding' && (
            <form onSubmit={handleFarmerOnboard} className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              <div className="border-b border-stone-200 pb-2 mb-3">
                <h3 className="font-bold text-sm text-stone-900">Farmer Registration</h3>
                <p className="text-xs text-stone-500">Provide your farm and payout details</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Ramesh Kumar"
                  value={farmerForm.name}
                  onChange={(e) => setFarmerForm({ ...farmerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98220 12345"
                    value={farmerForm.phone}
                    onChange={(e) => setFarmerForm({ ...farmerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    placeholder="422202"
                    value={farmerForm.pincode}
                    onChange={(e) => setFarmerForm({ ...farmerForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Village / Taluka *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dindori"
                    value={farmerForm.village}
                    onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">District</label>
                  <input
                    type="text"
                    placeholder="Nashik"
                    value={farmerForm.district}
                    onChange={(e) => setFarmerForm({ ...farmerForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">UPI ID or Bank Account for Payouts</label>
                <input
                  type="text"
                  placeholder="ramesh@upi or Bank A/C"
                  value={farmerForm.upiId}
                  onChange={(e) => setFarmerForm({ ...farmerForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Aadhaar Reference (Optional for MVP)</label>
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX (Optional)"
                  value={farmerForm.aadhaarOptional}
                  onChange={(e) => setFarmerForm({ ...farmerForm, aadhaarOptional: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow transition"
              >
                {loading ? 'Creating Farmer Account...' : 'Complete Farmer Registration'}
              </button>
            </form>
          )}

          {/* STEP 4: Buyer Onboarding */}
          {step === 'buyer_onboarding' && (
            <form onSubmit={handleBuyerOnboard} className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              <div className="border-b border-stone-200 pb-2 mb-3">
                <h3 className="font-bold text-sm text-stone-900">Buyer Registration</h3>
                <p className="text-xs text-stone-500">Configure your delivery address and buyer type</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Buyer Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBuyerForm({ ...buyerForm, buyerType: 'INDIVIDUAL' })}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      buyerForm.buyerType === 'INDIVIDUAL'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    Individual Consumer
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyerForm({ ...buyerForm, buyerType: 'BULK_FPO' })}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      buyerForm.buyerType === 'BULK_FPO'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                        : 'border-stone-200 text-stone-600'
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
                <input
                  type="text"
                  required
                  placeholder="Priya Sharma"
                  value={buyerForm.name}
                  onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              {buyerForm.buyerType === 'BULK_FPO' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Organization / FPO Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="GreenFresh Producers Co-op Ltd"
                      value={buyerForm.orgName}
                      onChange={(e) => setBuyerForm({ ...buyerForm, orgName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="27AABCG1234F1Z5"
                      value={buyerForm.gstin}
                      onChange={(e) => setBuyerForm({ ...buyerForm, gstin: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98200 45678"
                    value={buyerForm.phone}
                    onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    placeholder="400050"
                    value={buyerForm.pincode}
                    onChange={(e) => setBuyerForm({ ...buyerForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Delivery Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Flat / Building, Street Name, Area"
                  value={buyerForm.addressLine}
                  onChange={(e) => setBuyerForm({ ...buyerForm, addressLine: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mumbai"
                    value={buyerForm.city}
                    onChange={(e) => setBuyerForm({ ...buyerForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Maharashtra"
                    value={buyerForm.state}
                    onChange={(e) => setBuyerForm({ ...buyerForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow transition"
              >
                {loading ? 'Setting Up Buyer Account...' : 'Complete Buyer Registration'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
