'use client';

/**
 * Authentication context.
 * 
 * In dev mode (no Firebase configured), provides a mock user.
 * When Firebase is configured, will use Firebase Auth client SDK.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dev mode mock user
const DEV_USER: User = {
  uid: 'dev-user-001',
  email: 'dev@devora.local',
  display_name: 'Dev User',
  photo_url: null,
  role: 'individual',
  created_at: new Date().toISOString(),
  settings: {
    preferredLLM: 'gemini',
    defaultFramework: 'nextjs',
    defaultStyling: 'tailwind',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with Firebase Auth onAuthStateChanged when configured
    // For now, use dev mode mock
    const timer = setTimeout(() => {
      setUser(DEV_USER);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const signIn = useCallback(async (_email: string, _password: string) => {
    setLoading(true);
    // TODO: Firebase signInWithEmailAndPassword
    await new Promise((r) => setTimeout(r, 800));
    setUser(DEV_USER);
    setLoading(false);
  }, []);

  const signUp = useCallback(async (_email: string, _password: string, name: string) => {
    setLoading(true);
    // TODO: Firebase createUserWithEmailAndPassword
    await new Promise((r) => setTimeout(r, 800));
    setUser({ ...DEV_USER, display_name: name });
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    // TODO: Firebase signOut
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    // TODO: Firebase sendPasswordResetEmail
    await new Promise((r) => setTimeout(r, 800));
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    // TODO: Firebase getIdToken
    return 'dev-token';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

