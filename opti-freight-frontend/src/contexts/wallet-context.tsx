"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// --- Wallet Context ---
interface WalletContextType {
  isWalletConnected: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within an AuthProvider');
  }
  return context;
};

// --- Auth Context ---
interface User {
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      const wasWalletConnected = localStorage.getItem('walletConnected') === 'true';
      if (wasWalletConnected) {
        setIsWalletConnected(true);
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth functions
  const login = (name: string, email: string) => {
    const newUser = { name, email };
    try {
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
    setUser(newUser);
  };

  const logout = () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('walletConnected');
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
    setUser(null);
    setIsWalletConnected(false);
  };

  // Wallet functions
  const connectWallet = () => {
    try {
      localStorage.setItem('walletConnected', 'true');
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
    setIsWalletConnected(true);
  };

  const disconnectWallet = () => {
    try {
      localStorage.removeItem('walletConnected');
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
    setIsWalletConnected(false);
  };

  const authValue = { user, loading, login, logout };
  const walletValue = { isWalletConnected, connectWallet, disconnectWallet };

  if (loading) {
    return null; // or a loading spinner screen
  }

  return (
    <AuthContext.Provider value={authValue}>
      <WalletContext.Provider value={walletValue}>
        {children}
      </WalletContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
