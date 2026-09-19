import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types/finance';
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  getFirebaseConfig,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  FirebaseConfig
} from '../services/firebase';
import { StorageService } from '../services/storage';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  currency: string;
  setCurrency: (c: string) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateFirebaseConfig: (cfg: FirebaseConfig) => void;
  resetFirebaseConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyState] = useState<string>(StorageService.getCurrency());
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState<boolean>(!!getFirebaseConfig()?.apiKey);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    StorageService.saveCurrency(newCurrency);
  };

  const login = async () => {
    setLoading(true);
    try {
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
    } catch (err: any) {
      console.error('Login error:', err);
      alert(`Sign in note: ${err.message || 'Check Firebase settings'}. You can still use Demo Mode.`);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOutUser();
    setUser(null);
  };

  const updateFirebaseConfig = (cfg: FirebaseConfig) => {
    saveCustomFirebaseConfig(cfg);
    setIsFirebaseConfigured(true);
  };

  const resetFirebaseConfig = () => {
    clearCustomFirebaseConfig();
    setIsFirebaseConfigured(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        currency,
        setCurrency,
        login,
        logout,
        updateFirebaseConfig,
        resetFirebaseConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
