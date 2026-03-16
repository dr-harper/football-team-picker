import React from 'react';
import { Calendar, Trophy, TableProperties, BarChart2, Wallet, Users, User } from 'lucide-react';
import { type TabKey } from './MobileBottomNav';

interface NavigationRailProps {
    tab: TabKey;
    setTab: (t: TabKey) => void;
    upcomingCount: number;
}

const allTabs: { key: TabKey; icon: typeof Calendar; label: string }[] = [
    { key: 'upcoming', icon: Calendar, label: 'Games' },
    { key: 'completed', icon: Trophy, label: 'Results' },
    { key: 'table', icon: TableProperties, label: 'Table' },
    { key: 'stats', icon: BarChart2, label: 'Stats' },
    { key: 'finance', icon: Wallet, label: 'Finance' },
    { key: 'members', icon: Users, label: 'Settings' },
    { key: 'profile', icon: User, label: 'Profile' },
];

const NavigationRail: React.FC<NavigationRailProps> = ({ tab, setTab, upcomingCount }) => {
    return (
        <nav className="hidden md:flex flex-col items-center fixed left-0 top-0 bottom-0 w-[72px] z-30 bg-green-950/95 backdrop-blur-lg border-r border-white/10 pt-16 pb-4 gap-1 overflow-y-auto">
            {allTabs.map(({ key, icon: Icon, label }) => {
                const active = tab === key;
                return (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className="group relative flex flex-col items-center justify-center w-full py-2 transition-colors"
                    >
                        <div
                            className={`flex items-center justify-center w-12 h-8 rounded-2xl transition-all ${
                                active
                                    ? 'bg-white/15'
                                    : 'group-hover:bg-white/5'
                            }`}
                        >
                            <Icon className={`w-5 h-5 transition-colors ${
                                active ? 'text-green-400' : 'text-white/40 group-hover:text-white/60'
                            }`} />
                        </div>
                        {key === 'upcoming' && upcomingCount > 0 && (
                            <span className="absolute top-1 right-2.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-green-500 text-white text-[9px] font-bold px-1">
                                {upcomingCount}
                            </span>
                        )}
                        <span className={`text-[10px] mt-0.5 font-medium transition-colors ${
                            active ? 'text-green-400' : 'text-white/40 group-hover:text-white/60'
                        }`}>
                            {label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default NavigationRail;
