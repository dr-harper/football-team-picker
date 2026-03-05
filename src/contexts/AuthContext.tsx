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
    needsPlayerTags: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    updateDisplayName: (name: string) => Promise<void>;
    updatePlayerTags: (tags: string[], positions: string[]) => Promise<void>;
    updateBio: (bio: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};

interface EnsureResult {
    needsDisplayName: boolean;
    needsPlayerTags: boolean;
}

// Returns flags for what the user still needs to set up
async function ensureUserDoc(user: User): Promise<EnsureResult> {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            displayName: user.displayName || user.email?.split('@')[0] || 'Player',
            email: user.email,
            createdAt: Date.now(),
            hasSetName: false,
            hasSetTags: false,
        });
        return { needsDisplayName: true, needsPlayerTags: false };
    }
    const data = snap.data();
    return {
        needsDisplayName: data.hasSetName === false,
        needsPlayerTags: data.hasSetTags === false,
    };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsDisplayName, setNeedsDisplayName] = useState(false);
    const [needsPlayerTags, setNeedsPlayerTags] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                try {
                    const result = await ensureUserDoc(u);
                    setNeedsDisplayName(result.needsDisplayName);
                    setNeedsPlayerTags(result.needsPlayerTags);
                } catch (err) { console.error('[ensureUserDoc]', err); }
            } else {
                setNeedsDisplayName(false);
                setNeedsPlayerTags(false);
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
        // Email sign-ups explicitly provide a name — mark as set, but still need tags
        await setDoc(doc(db, 'users', cred.user.uid), {
            displayName,
            email: cred.user.email,
            createdAt: Date.now(),
            hasSetName: true,
            hasSetTags: false,
        });
        setNeedsDisplayName(false);
        setNeedsPlayerTags(true);
    };

    const signInWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        await signOut(auth);
        setNeedsDisplayName(false);
        setNeedsPlayerTags(false);
    };

    const updateDisplayName = async (name: string) => {
        if (!user) return;
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, 'users', user.uid), { displayName: name, hasSetName: true }, { merge: true });
        setNeedsDisplayName(false);
        // Refresh user object so displayName is up to date in context
        setUser({ ...user, displayName: name } as User);
    };

    const updatePlayerTags = async (tags: string[], positions: string[]) => {
        if (!user) return;
        await setDoc(
            doc(db, 'users', user.uid),
            { playerTags: tags, preferredPositions: positions, hasSetTags: true },
            { merge: true }
        );
        setNeedsPlayerTags(false);
    };

    const updateBio = async (bio: string) => {
        if (!user) return;
        await setDoc(doc(db, 'users', user.uid), { bio }, { merge: true });
    };

    return (
        <AuthContext.Provider value={{ user, loading, needsDisplayName, needsPlayerTags, signIn, signUp, signInWithGoogle, logout, updateDisplayName, updatePlayerTags, updateBio }}>
            {children}
        </AuthContext.Provider>
    );
};
