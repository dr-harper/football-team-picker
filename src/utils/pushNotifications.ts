import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../types';

// Convert URL-safe base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Hash an endpoint URL to create a stable document ID
async function hashEndpoint(endpoint: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(endpoint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
}

export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function isInstalledPwa(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Record<string, unknown>).standalone === true
    );
}

export function isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
}

export async function subscribeToPush(userId: string): Promise<boolean> {
    if (!isPushSupported()) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
        console.error('VAPID public key not configured');
        return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subJson = subscription.toJSON();
    const subId = await hashEndpoint(subscription.endpoint);

    await setDoc(doc(db, 'users', userId, 'pushSubscriptions', subId), {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        createdAt: Date.now(),
    });

    return true;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
    const subscription = await getExistingSubscription();
    if (!subscription) return;

    const subId = await hashEndpoint(subscription.endpoint);
    await subscription.unsubscribe();
    await deleteDoc(doc(db, 'users', userId, 'pushSubscriptions', subId));
}

export async function saveNotificationPreferences(
    userId: string,
    prefs: NotificationPreferences,
): Promise<void> {
    await setDoc(doc(db, 'users', userId), { notificationPreferences: prefs }, { merge: true });
}

export async function getNotificationPreferences(
    userId: string,
): Promise<NotificationPreferences> {
    const snap = await getDoc(doc(db, 'users', userId));
    const data = snap.data();
    if (!data?.notificationPreferences) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data.notificationPreferences };
}

export async function getSubscriptionCount(userId: string): Promise<number> {
    const snap = await getDocs(collection(db, 'users', userId, 'pushSubscriptions'));
    return snap.size;
}
