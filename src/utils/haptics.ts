import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticLight() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
        // Haptics not available
    }
}

export async function hapticMedium() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
        // Haptics not available
    }
}

export async function hapticSuccess() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await Haptics.notification({ type: NotificationType.Success });
    } catch {
        // Haptics not available
    }
}
