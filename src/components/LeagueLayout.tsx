import React from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { LeagueNavProvider, useLeagueNav } from '../contexts/LeagueNavContext';
import MobileBottomNav from './MobileBottomNav';
import NavigationRail from './NavigationRail';

const LeagueLayoutInner: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { tab, setTab, upcomingCount } = useLeagueNav();

    const isGamePage = /\/game\//.test(location.pathname);

    const handleSetTab = (t: typeof tab) => {
        if (isGamePage) {
            navigate(`/league/${code}?tab=${t}`);
        } else {
            setTab(t);
        }
    };

    return (
        <>
            <NavigationRail
                tab={isGamePage ? 'completed' : tab}
                setTab={handleSetTab}
                upcomingCount={upcomingCount}
            />
            <div className="md:pl-[72px] transition-[padding] duration-200 ease-out">
                <Outlet />
            </div>
            <div className="md:hidden">
                <MobileBottomNav
                    tab={isGamePage ? 'completed' : tab}
                    setTab={handleSetTab}
                    upcomingCount={upcomingCount}
                />
            </div>
        </>
    );
};

const LeagueLayout: React.FC = () => (
    <LeagueNavProvider>
        <LeagueLayoutInner />
    </LeagueNavProvider>
);

export default LeagueLayout;
