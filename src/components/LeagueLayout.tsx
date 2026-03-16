import React from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { LeagueNavProvider, useLeagueNav } from '../contexts/LeagueNavContext';
import MobileBottomNav from './MobileBottomNav';

const LeagueLayoutInner: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { tab, setTab, upcomingCount } = useLeagueNav();

    const isGamePage = /\/game\//.test(location.pathname);

    const handleSetTab = (t: typeof tab) => {
        if (isGamePage) {
            // Navigate back to league page — context tab will be set by LeaguePage on mount
            navigate(`/league/${code}?tab=${t}`);
        } else {
            setTab(t);
        }
    };

    return (
        <>
            <Outlet />
            <MobileBottomNav
                tab={isGamePage ? 'completed' : tab}
                setTab={handleSetTab}
                upcomingCount={upcomingCount}
            />
        </>
    );
};

const LeagueLayout: React.FC = () => (
    <LeagueNavProvider>
        <LeagueLayoutInner />
    </LeagueNavProvider>
);

export default LeagueLayout;
