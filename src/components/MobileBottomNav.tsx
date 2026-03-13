import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Trophy, BarChart2, Users, User, Wallet, TableProperties, MoreHorizontal } from 'lucide-react';

export type TabKey = 'upcoming' | 'completed' | 'table' | 'stats' | 'members' | 'profile' | 'finance';

const moreTabKeys: TabKey[] = ['finance', 'members', 'profile'];

interface MobileBottomNavProps {
    tab: TabKey;
    setTab: (t: TabKey) => void;
    upcomingCount: number;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ tab, setTab, upcomingCount }) => {
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    // Close More menu when clicking outside
    useEffect(() => {
        if (!moreOpen) return;
        const handler = (e: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [moreOpen]);

    const isMoreActive = moreTabKeys.includes(tab);

    const primaryTabs: { key: TabKey; icon: typeof Calendar; label: string }[] = [
        { key: 'upcoming', icon: Calendar, label: upcomingCount > 0 ? 'Games' : 'Games' },
        { key: 'completed', icon: Trophy, label: 'Results' },
        { key: 'table', icon: TableProperties, label: 'Table' },
        { key: 'stats', icon: BarChart2, label: 'Stats' },
    ];

    const moreTabs: { key: TabKey; icon: typeof Calendar; label: string }[] = [
        { key: 'finance', icon: Wallet, label: 'Finance' },
        { key: 'members', icon: Users, label: 'Settings' },
        { key: 'profile', icon: User, label: 'Profile' },
    ];

    return (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40" ref={moreRef}>
            {/* More menu popover */}
            {moreOpen && (
                <div className="mx-3 mb-1 bg-green-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {moreTabs.map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => { setTab(key); setMoreOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-colors ${
                                tab === key ? 'text-green-400 bg-white/10' : 'text-white/70 hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-4.5 h-4.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Bottom bar */}
            <div className="bg-green-950/95 backdrop-blur-lg border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] flex items-stretch">
                {primaryTabs.map(({ key, icon: Icon, label }) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => { setTab(key); setMoreOpen(false); }}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                                active ? 'text-green-400' : 'text-white/40'
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{label}</span>
                        </button>
                    );
                })}
                <button
                    onClick={() => setMoreOpen(prev => !prev)}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                        isMoreActive || moreOpen ? 'text-green-400' : 'text-white/40'
                    }`}
                >
                    <MoreHorizontal className="w-5 h-5" />
                    <span className="text-[10px] font-medium">More</span>
                </button>
            </div>
        </div>
    );
};

export default MobileBottomNav;
