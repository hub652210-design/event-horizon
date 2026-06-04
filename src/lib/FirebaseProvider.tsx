import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { TrackedItem, TrackStatus, UserPreferences } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  trackedItems: TrackedItem[];
  preferences: UserPreferences | null;
  
  // Auth actions
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  
  // Sync DB actions other devices fetch instantly
  trackItem: (item: Omit<TrackedItem, 'userId' | 'updatedAt'>) => Promise<void>;
  updateTrackItem: (itemId: string, updates: Partial<Omit<TrackedItem, 'userId' | 'itemId' | 'updatedAt'>>) => Promise<void>;
  untrackItem: (itemId: string) => Promise<void>;
  savePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside a FirebaseProvider');
  return context;
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Default guest list back up initially
  useEffect(() => {
    // Check if guest token active
    const savedGuest = localStorage.getItem('cineorbit_guest_active');
    if (savedGuest === 'true' && !auth.currentUser) {
      setIsGuest(true);
    }
  }, []);

  // 1. Auth listener hook
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsGuest(false);
        localStorage.removeItem('cineorbit_guest_active');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 2. Real-time synchronizer for User Tracker Data
  useEffect(() => {
    if (!user) {
      // In guest mode, load tracked items from local storage to keep offline functionality alive
      const saved = localStorage.getItem('cineorbit_guest_items');
      if (saved) {
        setTrackedItems(JSON.parse(saved));
      } else {
        setTrackedItems([]);
      }
      return;
    }

    const trackedCollPath = `users/${user.uid}/tracked`;
    const q = collection(db, trackedCollPath);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TrackedItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as TrackedItem);
      });
      // Sort client-side to preemptively avoid potential index-latency or index-requirement error blocks in Firestore
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setTrackedItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, trackedCollPath);
    });

    return unsubscribe;
  }, [user, isGuest]);

  // 3. User Preferences real-time sync hook
  useEffect(() => {
    if (!user) {
      const savedPrefs = localStorage.getItem('cineorbit_guest_prefs');
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      } else {
        setPreferences({ preferredVibe: 'Sci-Fi Explorer', username: 'Guest Explorer' });
      }
      return;
    }

    const prefDocPath = `users/${user.uid}/profile/preference`;
    const unsubscribe = onSnapshot(doc(db, prefDocPath), (snapshot) => {
      if (snapshot.exists()) {
        setPreferences(snapshot.data() as UserPreferences);
      } else {
        setPreferences({
          preferredVibe: 'Sci-Fi Explorer',
          username: user.displayName || user.email?.split('@')[0] || 'Member',
          avatarUrl: user.photoURL || ''
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, prefDocPath);
    });

    return unsubscribe;
  }, [user, isGuest]);

  // Handle guest data local storage backups
  const saveGuestItems = (items: TrackedItem[]) => {
    localStorage.setItem('cineorbit_guest_items', JSON.stringify(items));
    setTrackedItems(items);
  };

  const saveGuestPrefs = (prefs: UserPreferences) => {
    localStorage.setItem('cineorbit_guest_prefs', JSON.stringify(prefs));
    setPreferences(prefs);
  };

  // Auth Operations
  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      // Create user preference record
      const prefDocPath = `users/${cred.user.uid}/profile/preference`;
      await setDoc(doc(db, prefDocPath), {
        userId: cred.user.uid,
        username,
        preferredVibe: 'Sci-Fi Explorer',
        avatarUrl: '',
        updatedAt: new Date().toISOString()
      });
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setIsGuest(false);
    localStorage.removeItem('cineorbit_guest_active');
    setTrackedItems([]);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('cineorbit_guest_active', 'true');
  };

  // Synced Tracking actions
  const trackItem = async (item: Omit<TrackedItem, 'userId' | 'updatedAt'>) => {
    const timeIso = new Date().toISOString();
    
    if (!user) {
      const newItem: TrackedItem = {
        ...item,
        userId: 'guest',
        updatedAt: timeIso
      };
      const exists = trackedItems.some(i => i.itemId === item.itemId);
      let updatedList = [];
      if (exists) {
        updatedList = trackedItems.map(i => i.itemId === item.itemId ? newItem : i);
      } else {
        updatedList = [newItem, ...trackedItems];
      }
      saveGuestItems(updatedList);
      return;
    }

    const docPath = `users/${user.uid}/tracked/${item.itemId}`;
    try {
      const dbItem: TrackedItem = {
        ...item,
        userId: user.uid,
        id: `${user.uid}_${item.itemId}`,
        updatedAt: timeIso
      };
      await setDoc(doc(db, docPath), dbItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  };

  const updateTrackItem = async (itemId: string, updates: Partial<Omit<TrackedItem, 'userId' | 'itemId' | 'updatedAt'>>) => {
    const timeIso = new Date().toISOString();

    if (!user) {
      const updatedList = trackedItems.map(i => {
        if (i.itemId === itemId) {
          return {
            ...i,
            ...updates,
            updatedAt: timeIso
          } as TrackedItem;
        }
        return i;
      });
      saveGuestItems(updatedList);
      return;
    }

    const docPath = `users/${user.uid}/tracked/${itemId}`;
    try {
      // Use setDoc with merge set to true for complete atomic overwrite protection
      await setDoc(doc(db, docPath), {
        ...updates,
        updatedAt: timeIso
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  };

  const untrackItem = async (itemId: string) => {
    if (!user) {
      const updatedList = trackedItems.filter(i => i.itemId !== itemId);
      saveGuestItems(updatedList);
      return;
    }

    const docPath = `users/${user.uid}/tracked/${itemId}`;
    try {
      await deleteDoc(doc(db, docPath));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  };

  const savePreferences = async (prefs: Partial<UserPreferences>) => {
    const timeIso = new Date().toISOString();
    
    if (!user) {
      const updatedPrefs = {
        ...preferences,
        ...prefs
      } as UserPreferences;
      saveGuestPrefs(updatedPrefs);
      return;
    }

    const docPath = `users/${user.uid}/profile/preference`;
    try {
      await setDoc(doc(db, docPath), {
        ...prefs,
        userId: user.uid,
        updatedAt: timeIso
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isGuest,
      trackedItems,
      preferences,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      continueAsGuest,
      trackItem,
      updateTrackItem,
      untrackItem,
      savePreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
}
