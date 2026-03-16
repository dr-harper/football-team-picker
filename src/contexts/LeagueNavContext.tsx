import React, { createContext, useContext, useState, useCallback } from 'react';
import type { TabKey } from '../components/MobileBottomNav';

interface LeagueNavState {
    tab: TabKey;
    setTab: (t: TabKey) => void;
    upcomingCount: number;
    setUpcomingCount: (n: number) => void;
}

const LeagueNavContext = createContext<LeagueNavState | null>(null);

export const LeagueNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tab, setTabState] = useState<TabKey>('upcoming');
    const [upcomingCount, setUpcomingCount] = useState(0);

    const setTab = useCallback((t: TabKey) => setTabState(t), []);

    return (
        <LeagueNavContext.Provider value={{ tab, setTab, upcomingCount, setUpcomingCount }}>
            {children}
        </LeagueNavContext.Provider>
    );
};

export function useLeagueNav() {
    const ctx = useContext(LeagueNavContext);
    if (!ctx) throw new Error('useLeagueNav must be used within LeagueNavProvider');
    return ctx;
}
