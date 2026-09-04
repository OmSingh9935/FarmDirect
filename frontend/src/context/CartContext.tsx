import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Listing } from '../types/index.js';

interface CartContextType {
  items: CartItem[];
  addToCart: (listing: Listing, quantity: number) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  removeFromCart: (listingId: string) => void;
  clearCart: () => void;
  subtotal: number;
  totalQuantity: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('farmdirect_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('farmdirect_cart', JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  const addToCart = (listing: Listing, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listing.id === listing.id);
      if (existing) {
        return prev.map((i) =>
          i.listing.id === listing.id
            ? { ...i, quantity: Math.min(listing.quantity, i.quantity + quantity) }
            : i
        );
      }
      return [...prev, { listing, quantity: Math.min(listing.quantity, quantity) }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (listingId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(listingId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.listing.id === listingId ? { ...i, quantity } : i))
    );
  };

  const removeFromCart = (listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listing.id !== listingId));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.listing.pricePerUnit * item.quantity,
    0
  );

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        totalQuantity,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
