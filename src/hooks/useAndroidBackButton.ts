import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const ROOT_PATHS = ['/', '/dashboard'];

export function useAndroidBackButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const lastBackPress = useRef(0);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handler = App.addListener('backButton', ({ canGoBack }) => {
            const isRoot = ROOT_PATHS.includes(location.pathname);

            if (!isRoot && canGoBack) {
                navigate(-1);
                return;
            }

            // Double-press to exit from root pages
            const now = Date.now();
            if (now - lastBackPress.current < 2000) {
                App.exitApp();
            } else {
                lastBackPress.current = now;
                // Brief toast-style hint — uses native Android toast via a simple DOM overlay
                showExitToast();
            }
        });

        return () => {
            handler.then(h => h.remove());
        };
    }, [location.pathname, navigate]);
}

function showExitToast() {
    const existing = document.getElementById('exit-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'exit-toast';
    toast.textContent = 'Press back again to exit';
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '8px 20px',
        borderRadius: '20px',
        fontSize: '14px',
        zIndex: '99999',
        pointerEvents: 'none',
        transition: 'opacity 0.3s',
    });

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 1700);
}
