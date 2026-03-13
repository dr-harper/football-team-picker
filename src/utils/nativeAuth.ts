import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

let googleAuthInitialised = false;

function ensureGoogleAuthInit() {
    if (googleAuthInitialised) return;
    if (Capacitor.isNativePlatform()) {
        GoogleAuth.initialize({
            clientId: '88950522814-q2irelc9ufgkf12gqe9tj9t30kbg5o1i.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
        });
    }
    googleAuthInitialised = true;
}

export async function nativeGoogleSignIn(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        await signInWithPopup(auth, googleProvider);
        return;
    }

    ensureGoogleAuthInit();

    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser.authentication.idToken;

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
}
