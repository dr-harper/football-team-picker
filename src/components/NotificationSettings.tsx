import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../types';
import {
    isPushSupported,
    isInstalledPwa,
    isIos,
    getPermissionState,
    getExistingSubscription,
    subscribeToPush,
    unsubscribeFromPush,
    saveNotificationPreferences,
    getNotificationPreferences,
} from '../utils/pushNotifications';

const PREF_LABELS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: 'gameScheduled', label: 'New game scheduled', description: 'When an admin creates a game in your league' },
    { key: 'availabilityReminder', label: 'Availability reminder', description: 'Reminder the day before if you haven\'t responded' },
    { key: 'teamsGenerated', label: 'Teams generated', description: 'When teams are picked for a game' },
    { key: 'resultRecorded', label: 'Result recorded', description: 'When the final score is posted' },
    { key: 'paymentReminder', label: 'Payment reminder', description: 'Weekly reminder if you owe money' },
];

const NotificationSettings: React.FC = () => {
    const { user } = useAuth();
    const [subscribed, setSubscribed] = useState<boolean | null>(null);
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [loading, setLoading] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const supported = isPushSupported();
    const installed = isInstalledPwa();
    const iosNotInstalled = isIos() && !installed;

    useEffect(() => {
        if (!user || !supported) return;

        const load = async () => {
            const sub = await getExistingSubscription();
            setSubscribed(!!sub);
            const savedPrefs = await getNotificationPreferences(user.uid);
            setPrefs(savedPrefs);
            setPermissionDenied(getPermissionState() === 'denied');
        };

        load().catch((err) => console.error('Failed to load notification settings:', err));
    }, [user, supported]);

    if (!user || !supported) return null;

    const handleSubscribe = async () => {
        setLoading(true);
        const success = await subscribeToPush(user.uid);
        if (success) {
            setSubscribed(true);
            setPermissionDenied(false);
        } else {
            setPermissionDenied(getPermissionState() === 'denied');
        }
        setLoading(false);
    };

    const handleUnsubscribe = async () => {
        setLoading(true);
        await unsubscribeFromPush(user.uid);
        setSubscribed(false);
        setLoading(false);
    };

    const handleToggle = async (key: keyof NotificationPreferences) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        await saveNotificationPreferences(user.uid, updated);
    };

    // iOS not installed — show guidance
    if (iosNotInstalled) {
        return (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-white/70" />
                    <h3 className="text-white font-semibold text-sm">Enable Notifications</h3>
                </div>
                <p className="text-white/50 text-sm mb-3">
                    To receive notifications on iPhone, add Team Shuffle to your Home Screen:
                </p>
                <ol className="text-white/50 text-sm space-y-1.5 list-decimal list-inside">
                    <li>Tap the <strong className="text-white/70">Share</strong> button in Safari</li>
                    <li>Scroll down and tap <strong className="text-white/70">Add to Home Screen</strong></li>
                    <li>Open Team Shuffle from your Home Screen</li>
                    <li>Come back here to enable notifications</li>
                </ol>
            </div>
        );
    }

    // Permission denied by browser
    if (permissionDenied) {
        return (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <BellOff className="w-5 h-5 text-red-400" />
                    <h3 className="text-white font-semibold text-sm">Notifications Blocked</h3>
                </div>
                <p className="text-white/50 text-sm">
                    You previously blocked notifications. To enable them, open your browser settings and allow notifications for this site, then refresh the page.
                </p>
            </div>
        );
    }

    // Not subscribed yet
    if (!subscribed) {
        return (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-white/70" />
                    <h3 className="text-white font-semibold text-sm">Notifications</h3>
                </div>
                <p className="text-white/50 text-sm mb-3">
                    Get notified about new games, team selections, results, and payment reminders.
                </p>
                <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                >
                    {loading ? 'Enabling...' : 'Enable Notifications'}
                </button>
            </div>
        );
    }

    // Subscribed — show preference toggles
    return (
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-green-400" />
                    <h3 className="text-white font-semibold text-sm">Notifications</h3>
                </div>
                <button
                    onClick={handleUnsubscribe}
                    disabled={loading}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors"
                >
                    Disable
                </button>
            </div>
            <div className="space-y-2">
                {PREF_LABELS.map(({ key, label, description }) => (
                    <label
                        key={key}
                        className="flex items-start gap-3 cursor-pointer group"
                        onClick={() => handleToggle(key)}
                    >
                        <div className="pt-0.5 shrink-0">
                            <div
                                className={`w-9 h-5 rounded-full transition-colors relative ${
                                    prefs[key] ? 'bg-green-500' : 'bg-white/15'
                                }`}
                            >
                                <div
                                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                        prefs[key] ? 'translate-x-4' : 'translate-x-0.5'
                                    }`}
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-sm">{label}</div>
                            <div className="text-white/40 text-xs">{description}</div>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default NotificationSettings;
