import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../types';
import { apiService, setAuthToken } from '../services/api';
import { auth } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

export interface AuthContextType {
  user: AuthUser | null;
  role: 'farmer' | 'admin';
  isAdmin: boolean;
  token: string | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithCredentials: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInDemoUser: (uid?: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveBackendRole = async (idToken: string): Promise<'farmer' | 'admin'> => {
    try {
      setAuthToken(idToken);
      const profile = await apiService.getUserProfile();
      if (profile && profile.role === 'admin') {
        return 'admin';
      }
    } catch (err) {
      console.debug('User profile role check defaulted to farmer:', err);
    }
    return 'farmer'; // Strict deny-by-default
  };

  // Initialize and listen to real Firebase Authentication state
  useEffect(() => {
    // Purge legacy mock tokens from storage to enforce real auth
    if (typeof localStorage !== 'undefined') {
      const savedToken = localStorage.getItem('smart_agri_auth_token');
      if (savedToken && savedToken.startsWith('mock-token-')) {
        localStorage.removeItem('smart_agri_auth_token');
        localStorage.removeItem('smart_agri_auth_uid');
      }
    }

    // Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          setAuthToken(idToken);
          const role = await resolveBackendRole(idToken);
          const appUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Farmer',
            role,
            isMock: false,
          };
          setUser(appUser);
        } catch {
          setUser(null);
          setToken(null);
          setAuthToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
        setAuthToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      setAuthToken(idToken);
      const role = await resolveBackendRole(idToken);
      const appUser: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0] || 'Farmer',
        role,
        isMock: false,
      };
      setUser(appUser);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string) => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedName = fullName.trim();
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
      
      if (trimmedName && cred.user) {
        await updateProfile(cred.user, { displayName: trimmedName });
      }

      const idToken = await cred.user.getIdToken(true);
      setToken(idToken);
      setAuthToken(idToken);

      // Synchronize with backend profile; backend strictly sets role='farmer'
      try {
        await apiService.syncUserProfile({ displayName: trimmedName });
      } catch (e) {
        console.debug('User profile backend sync deferred:', e);
      }

      const appUser: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: trimmedName || cred.user.email?.split('@')[0] || 'Farmer',
        role: 'farmer', // Public registration is ALWAYS farmer
        isMock: false,
      };
      setUser(appUser);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  // Retain for backward compatibility with existing code/tests
  const signInWithCredentials = signInWithEmail;

  const signInDemoUser = (uid = 'lead_agronomist') => {
    if (import.meta.env.PROD || !import.meta.env.DEV) {
      console.error('Demo authentication is strictly forbidden in production mode.');
      throw new Error('Test role switching and mock tokens are strictly forbidden in production mode.');
    }
    const mockToken = `mock-token-${uid}`;
    const role = uid.includes('admin') ? 'admin' : 'farmer';
    const demoUser: AuthUser = {
      uid,
      email: `${uid}@smart-agri.dev`,
      displayName: uid.includes('admin')
        ? `Administrator ${uid.replace('_', ' ').toUpperCase()}`
        : `Farmer ${uid.replace('_', ' ').toUpperCase()}`,
      role,
      isMock: true,
    };
    setUser(demoUser);
    setToken(mockToken);
    setAuthToken(mockToken);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // Offline fallback
    }
    setUser(null);
    setToken(null);
    setAuthToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('smart_agri_auth_token');
      localStorage.removeItem('smart_agri_auth_uid');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'farmer',
        isAdmin: user?.role === 'admin',
        token,
        loading,
        signInWithEmail,
        signInWithCredentials,
        registerWithEmail,
        resetPassword,
        signInDemoUser,
        logout,
        isAuthenticated: !!user,
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
