import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Shuffle, User, Activity } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues } from '../utils/firestore';
import { League } from '../types';
import HomeTab from './home/HomeTab';
import ProfileTab from './home/ProfileTab';
import HealthTab from './home/HealthTab';

type TabKey = 'home' | 'quick' | 'profile' | 'health';

const tabs: { key: TabKey; icon: typeof Home; label: string }[] = [
    { key: 'home', icon: Home, label: 'Home' },
    { key: 'quick', icon: Shuffle, label: 'Quick Mode' },
    { key: 'profile', icon: User, label: 'My Profile' },
    { key: 'health', icon: Activity, label: 'Health' },
];

const AuthenticatedHome: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);

    const activeTab = (searchParams.get('tab') as TabKey) || 'home';

    const setTab = (tab: TabKey) => {
        if (tab === 'quick') {
            navigate('/pick-teams');
            return;
        }
        if (tab === 'home') {
            setSearchParams({}, { replace: true });
        } else {
            setSearchParams({ tab }, { replace: true });
        }
    };

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        getUserLeagues(user.uid).then(userLeagues => {
            if (!cancelled) {
                setLeagues(userLeagues);
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [user]);

    // Single-league user: auto-redirect to their league
    useEffect(() => {
        if (!loading && leagues.length === 1 && activeTab === 'home') {
            navigate(`/league/${leagues[0].joinCode}`, { replace: true });
        }
    }, [loading, leagues, activeTab, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <AppHeader />

            {/* Top tab bar */}
            <div className="sticky top-0 z-20 bg-green-900/95 dark:bg-green-950/95 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex">
                        {tabs.map(({ key, icon: Icon, label }) => {
                            const active = key === 'quick' ? false : activeTab === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                                        active
                                            ? 'border-green-400 text-green-400'
                                            : 'border-transparent text-white/40 hover:text-white/60'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden xs:inline">{label}</span>
                                    <span className="xs:hidden">{label.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab content */}
            <div className="max-w-3xl mx-auto p-4 sm:p-6">
                {!loading && leagues.length !== 1 && (
                    <h1 className="text-2xl font-bold text-white mb-5">
                        Hey, {user?.displayName || 'Player'}!
                    </h1>
                )}

                {activeTab === 'home' && <HomeTab leagues={leagues} loading={loading} />}
                {activeTab === 'profile' && <ProfileTab leagues={leagues} />}
                {activeTab === 'health' && <HealthTab leagues={leagues} />}
            </div>
        </div>
    );
};

export default AuthenticatedHome;
