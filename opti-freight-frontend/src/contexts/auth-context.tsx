// This is a new file

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Declarar window.solana para TypeScript
declare global {
  interface Window {
    solana?: {
      isConnected?: boolean;
      disconnect: () => Promise<void>;
    };
  }
}

// --- Auth Context ---
interface User {
  name: string;
  nickname: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (name: string, nickname: string, email: string, password: string, onSuccess?: () => void) => boolean;
  login: (email: string, password: string, onSuccess?: () => void) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for users database
const getUsersDB = (): User[] => {
  try {
    const users = localStorage.getItem('usersDB');
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error("Could not access localStorage", error);
    return [];
  }
};

const saveUsersDB = (users: User[]) => {
  try {
    localStorage.setItem('usersDB', JSON.stringify(users));
  } catch (error) {
    console.error("Could not save to localStorage", error);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Signup function
  const signup = (name: string, nickname: string, email: string, password: string, onSuccess?: () => void): boolean => {
    const users = getUsersDB();

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return false; // User already exists
    }

    // Create new user
    const newUser: User = { name, nickname, email, password };
    users.push(newUser);
    saveUsersDB(users);

    // Set as current user
    try {
      localStorage.setItem('currentUser', JSON.stringify(newUser));
    } catch (error) {
      console.error("Could not save current user", error);
    }
    setUser(newUser);

    // Call success callback after state update
    if (onSuccess) {
      setTimeout(onSuccess, 0);
    }

    return true;
  };

  // Login function
  const login = (email: string, password: string, onSuccess?: () => void): boolean => {
    const users = getUsersDB();

    // Find user with matching credentials
    const foundUser = users.find(u => u.email === email && u.password === password);

    if (!foundUser) {
      return false; // Invalid credentials
    }

    // Set as current user
    try {
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
    } catch (error) {
      console.error("Could not save current user", error);
    }
    setUser(foundUser);

    // Call success callback after state update
    if (onSuccess) {
      setTimeout(onSuccess, 0);
    }

    return true;
  };

  const logout = async () => {
    try {
      localStorage.removeItem('currentUser');

      // Desconectar Phantom wallet si está conectada
      if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
        try {
          await window.solana.disconnect();
          console.log('🔌 Wallet desconectada al cerrar sesión');
        } catch (error) {
          console.error('Error al desconectar wallet:', error);
        }
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
    setUser(null);
  };

  const authValue = { user, loading, signup, login, logout };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
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
