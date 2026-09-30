import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { toDomainUser } from '../services/mappers/userMapper';
import type { User } from '../types/domain';
import type { PlatformUserRecord } from '../types/platform';

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  role: string | null;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isEditor, setIsEditor] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setRole(null);
        setIsAdmin(false);
        setIsEditor(false);
        setIsLoading(false);
        return;
      }

      // Check Firebase custom claims first
      try {
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        const claimRole = typeof claims.role === 'string' ? claims.role : (claims.admin ? 'admin' : null);
        if (claimRole === 'admin' || claims.admin === true) {
          setIsAdmin(true);
          setIsEditor(true);
          setRole('admin');
        }
      } catch (err) {
        console.warn('[AuthContext] Error reading token claims:', err);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (snapshot) => {
        let detectedRole = 'user';
        if (snapshot.exists()) {
          const data = snapshot.data() as PlatformUserRecord;
          setUserProfile(toDomainUser({ ...data, uid: firebaseUser.uid }));
          detectedRole = String(data?.role || 'user').toLowerCase();
        } else {
          setUserProfile(
            toDomainUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Student',
              email: firebaseUser.email || undefined,
            }),
          );
        }

        const adminStatus = detectedRole === 'admin' || isAdmin;
        const editorStatus = adminStatus || ['editor', 'creator', 'author', 'moderator'].includes(detectedRole);

        setRole(detectedRole);
        setIsAdmin(adminStatus);
        setIsEditor(editorStatus);
        setIsLoading(false);
      },
      (error) => {
        console.warn('[AuthContext] Profile subscription warning:', error);
        setUserProfile(
          toDomainUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || undefined,
          }),
        );
        setIsLoading(false);
      },
    );

    return () => unsubscribeProfile();
  }, [firebaseUser, isAdmin]);

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUserProfile(null);
    setRole(null);
    setIsAdmin(false);
    setIsEditor(false);
  };

  const getIdToken = async (forceRefresh = false) => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(forceRefresh);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        role,
        isAdmin,
        isEditor,
        isLoading,
        signIn,
        signOut,
        getIdToken,
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
