import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { UserProfile } from '../types/finance';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const LOCAL_STORAGE_FB_CONFIG_KEY = 'yuki_finance_custom_fb_config';
const LOCAL_STORAGE_DEMO_USER_KEY = 'yuki_finance_demo_user';

// Get config from either environment variables or localStorage
export function getFirebaseConfig(): FirebaseConfig | null {
  const customConfig = localStorage.getItem(LOCAL_STORAGE_FB_CONFIG_KEY);
  if (customConfig) {
    try {
      return JSON.parse(customConfig);
    } catch {
      // ignore
    }
  }

  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey && envKey !== 'YOUR_API_KEY') {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function initFirebase(): Auth | null {
  const config = getFirebaseConfig();
  if (!config || !config.apiKey) {
    return null;
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    return auth;
  } catch (err) {
    console.warn('Failed to initialize Firebase SDK:', err);
    return null;
  }
}

// Initial attempt
initFirebase();

/**
 * Sign in with Google (using real Firebase if configured, or demo mode)
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  const currentAuth = auth || initFirebase();

  if (currentAuth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(currentAuth, provider);
      const user = result.user;
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Google User',
        photoURL: user.photoURL || undefined,
        currency: 'THB',
        isDemo: false,
      };
    } catch (error: any) {
      console.warn('Real Google popup error, offering demo fallback:', error.message);
      // If error is unauthorized domain or missing config, throw or let caller handle
      throw error;
    }
  }

  // Fallback / Demo Google Login
  const demoProfile: UserProfile = {
    uid: 'google-demo-user-101',
    email: 'yuki.finance@gmail.com',
    displayName: 'Yuki J. (Google)',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    currency: 'THB',
    isDemo: true,
  };
  localStorage.setItem(LOCAL_STORAGE_DEMO_USER_KEY, JSON.stringify(demoProfile));
  return demoProfile;
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_DEMO_USER_KEY);
}

/**
 * Get current persisted user or demo session
 */
export function getSavedSession(): UserProfile | null {
  const saved = localStorage.getItem(LOCAL_STORAGE_DEMO_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Subscribe to Auth State
 */
export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  const currentAuth = auth || initFirebase();
  if (currentAuth) {
    return onAuthStateChanged(currentAuth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        callback({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Google User',
          photoURL: fbUser.photoURL || undefined,
          currency: 'THB',
          isDemo: false,
        });
      } else {
        callback(getSavedSession());
      }
    });
  }

  // Fallback to local session listener
  callback(getSavedSession());
  return () => {};
}

export function saveCustomFirebaseConfig(config: FirebaseConfig) {
  localStorage.setItem(LOCAL_STORAGE_FB_CONFIG_KEY, JSON.stringify(config));
  initFirebase();
}

export function clearCustomFirebaseConfig() {
  localStorage.removeItem(LOCAL_STORAGE_FB_CONFIG_KEY);
}
