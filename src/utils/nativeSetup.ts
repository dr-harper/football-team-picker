import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export async function initialiseNativeApp() {
    if (!Capacitor.isNativePlatform()) return;

    try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#14532d' });
    } catch {
        // Status bar not available
    }

    try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {
        // Splash screen not available
    }
}
