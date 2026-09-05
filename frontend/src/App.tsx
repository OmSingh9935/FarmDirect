import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { ToastProvider } from './context/ToastContext.js';
import Navbar from './components/common/Navbar.js';
import AuthModal from './components/auth/AuthModal.js';
import VoiceAssistantModal from './components/common/VoiceAssistantModal.js';
import Marketplace from './pages/buyer/Marketplace.js';
import ListingDetailModal from './pages/buyer/ListingDetailModal.js';
import CartDrawer from './pages/buyer/CartDrawer.js';
import CheckoutModal from './pages/buyer/CheckoutModal.js';
import OrderTracking from './pages/buyer/OrderTracking.js';
import FarmerDashboard from './pages/farmer/FarmerDashboard.js';
import ProduceManagement from './pages/farmer/ProduceManagement.js';
import FarmerOrders from './pages/farmer/FarmerOrders.js';
import FarmerPayouts from './pages/farmer/FarmerPayouts.js';
import FarmerProfile from './pages/farmer/FarmerProfile.js';
import HubDashboard from './pages/hub/HubDashboard.js';
import { Listing } from './types/index.js';

const MainApp: React.FC = () => {
  const { role, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [singleBuyItem, setSingleBuyItem] = useState<{ listing: Listing; quantity: number } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);

  // Sync role changes to default views
  React.useEffect(() => {
    if (role === 'farmer' && (currentTab === 'home' || currentTab.startsWith('hub-'))) {
      setCurrentTab('farmer-dash');
    } else if (role === 'hub_admin' && (currentTab === 'home' || currentTab.startsWith('farmer-'))) {
      setCurrentTab('hub-analytics');
    }
  }, [role]);

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
  };

  const handleQuickBuy = (listing: Listing, quantity: number = 10) => {
    const validQty = Math.max(1, Math.min(listing.quantity, quantity));
    setSingleBuyItem({ listing, quantity: validQty });
    setIsCheckoutOpen(true);
  };

  const handleUpdateSingleBuyQuantity = (quantity: number) => {
    setSingleBuyItem((prev) => {
      if (!prev) return null;
      const validQty = Math.max(1, Math.min(prev.listing.quantity, quantity));
      return { ...prev, quantity: validQty };
    });
  };

  const handleProceedFromDetail = (listing: Listing, quantity: number) => {
    setSelectedListing(null);
    const validQty = Math.max(1, Math.min(listing.quantity, quantity));
    setSingleBuyItem({ listing, quantity: validQty });
    setIsCheckoutOpen(true);
  };

  const handleCartCheckout = () => {
    setSingleBuyItem(null);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (orderId: string) => {
    setTrackedOrderId(orderId);
    setCurrentTab('orders');
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openVoiceAssistant={() => setIsVoiceOpen(true)}
      />

      {/* Main View Switching */}
      <main className="flex-1">
        {/* Buyer Views */}
        {currentTab === 'home' && (
          <Marketplace
            onSelectListing={handleSelectListing}
            onQuickBuy={handleQuickBuy}
          />
        )}

        {currentTab === 'orders' && (
          <OrderTracking
            initialOrderId={trackedOrderId}
            onBrowseMore={() => setCurrentTab('home')}
          />
        )}

        {/* Farmer Views */}
        {currentTab === 'farmer-dash' && (
          <FarmerDashboard
            onNavigate={(tab) => setCurrentTab(tab)}
            openVoiceAssistant={() => setIsVoiceOpen(true)}
          />
        )}

        {currentTab === 'farmer-produce' && <ProduceManagement />}
        {currentTab === 'farmer-orders' && <FarmerOrders />}
        {currentTab === 'farmer-payouts' && <FarmerPayouts />}
        {currentTab === 'farmer-profile' && <FarmerProfile />}

        {/* Hub Operations & Admin Views */}
        {currentTab === 'hub-analytics' && <HubDashboard initialSubtab="analytics" />}
        {currentTab === 'hub-purchases' && <HubDashboard initialSubtab="purchases" />}
        {currentTab === 'hub-users' && <HubDashboard initialSubtab="users" />}
        {currentTab === 'hub-intake' && <HubDashboard initialSubtab="intake" />}
        {currentTab === 'hub-dispatch' && <HubDashboard initialSubtab="dispatch" />}
        {currentTab === 'hub-config' && <HubDashboard initialSubtab="config" />}
        {currentTab === 'hub-disputes' && <HubDashboard initialSubtab="disputes" />}
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-10 text-xs border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <div className="inline-block bg-white/95 rounded-xl px-3 py-1.5 shadow-sm mb-2">
              <img
                src="/logo.png"
                alt="Farm Direct — Direct Harvest & Escrow"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-stone-400 text-xs mt-0.5 max-w-md">
              Direct Farmer-to-Buyer Marketplace with Escrow & Central Hub Logistics.
            </p>
          </div>
          <div className="text-[11px] text-stone-500 space-y-1 sm:text-right">
            <div>© {new Date().getFullYear()} Farm Direct • Direct Harvest & Escrow</div>
            <div>Node.js • Express • Prisma ORM (SQLite/Postgres) • React • Tailwind CSS</div>
          </div>
        </div>
      </footer>

      {/* Modals and Drawers */}
      <AuthModal />
      
      <ListingDetailModal
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        onProceedToCheckout={handleProceedFromDetail}
      />

      <CartDrawer onCheckout={handleCartCheckout} />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        singleBuyItem={singleBuyItem}
        onUpdateSingleBuyQuantity={handleUpdateSingleBuyQuantity}
        onOrderSuccess={handleOrderSuccess}
      />

      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        setCurrentTab={setCurrentTab}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
