import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    needsDisplayName: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};

// Returns true if the user needs to set a display name
async function ensureUserDoc(user: User): Promise<boolean> {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            displayName: user.displayName || user.email?.split('@')[0] || 'Player',
            email: user.email,
            createdAt: Date.now(),
            hasSetName: false,
        });
        return true;
    }
    const data = snap.data();
    return data.hasSetName === false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsDisplayName, setNeedsDisplayName] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                try {
                    const needs = await ensureUserDoc(u);
                    setNeedsDisplayName(needs);
                } catch (err) { console.error('[ensureUserDoc]', err); }
            } else {
                setNeedsDisplayName(false);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, displayName: string) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        // Email sign-ups explicitly provide a name — mark as set
        await setDoc(doc(db, 'users', cred.user.uid), {
            displayName,
            email: cred.user.email,
            createdAt: Date.now(),
            hasSetName: true,
        });
        setNeedsDisplayName(false);
    };

    const signInWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        await signOut(auth);
        setNeedsDisplayName(false);
    };

    const updateDisplayName = async (name: string) => {
        if (!user) return;
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, 'users', user.uid), { displayName: name, hasSetName: true }, { merge: true });
        setNeedsDisplayName(false);
        // Refresh user object so displayName is up to date in context
        setUser({ ...user, displayName: name } as User);
    };

    return (
        <AuthContext.Provider value={{ user, loading, needsDisplayName, signIn, signUp, signInWithGoogle, logout, updateDisplayName }}>
            {children}
        </AuthContext.Provider>
    );
};
