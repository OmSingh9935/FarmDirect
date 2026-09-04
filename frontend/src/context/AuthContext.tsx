import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';
import api from '../services/api.js';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalRole: UserRole;
  openAuthModal: (initialRole?: UserRole) => void;
  closeAuthModal: () => void;
  setRole: (role: UserRole) => void;
  loginWithUser: (user: User) => void;
  logout: () => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole>('buyer');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole>('buyer');

  const refreshUser = async () => {
    try {
      const res = await api.me();
      if (res.user) {
        setUser(res.user);
        setRoleState(res.user.role as UserRole);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const openAuthModal = (initialRole: UserRole = 'buyer') => {
    setAuthModalRole(initialRole);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const loginWithUser = (newUser: User) => {
    setUser(newUser);
    setRoleState(newUser.role);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setRoleState('buyer');
  };

  const demoLogin = async (demoRole: string) => {
    setLoading(true);
    try {
      const res = await api.demoLogin(demoRole);
      setUser(res.user);
      setRoleState(res.user.role as UserRole);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAuthModalOpen,
        authModalRole,
        openAuthModal,
        closeAuthModal,
        setRole,
        loginWithUser,
        logout,
        demoLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
