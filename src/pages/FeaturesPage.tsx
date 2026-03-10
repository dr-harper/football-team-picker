import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Zap, Users, Trophy, BarChart3, PoundSterling, Share2, Shield, Shuffle, Calendar, ClipboardList, Award } from 'lucide-react';

const features = [
    {
        icon: <Zap className="w-6 h-6 text-amber-400" />,
        title: 'Instant Team Picker',
        description: 'Paste your player list and get fair, balanced teams in one click. Tag players as goalkeeper, striker, or defender to influence the split. No account needed.',
    },
    {
        icon: <Shuffle className="w-6 h-6 text-blue-400" />,
        title: 'Multiple Drafts',
        description: 'Generate three different team setups at once. Compare them side by side, swap individual players between teams, then pick the one you like best.',
    },
    {
        icon: <Share2 className="w-6 h-6 text-green-400" />,
        title: 'Export & Share',
        description: 'Save your team sheet as an image or share it directly to WhatsApp, iMessage, or any app. The pitch graphic shows formations and player positions.',
    },
    {
        icon: <Users className="w-6 h-6 text-purple-400" />,
        title: 'League Management',
        description: 'Create a league and invite your mates with a simple join code. Manage members, promote admins, and keep everything organised in one place.',
    },
    {
        icon: <Calendar className="w-6 h-6 text-cyan-400" />,
        title: 'Game Scheduling',
        description: 'Schedule games with date, time, and venue. Players mark themselves as available, maybe, or unavailable. Add ringers as guests without needing an account.',
    },
    {
        icon: <ClipboardList className="w-6 h-6 text-orange-400" />,
        title: 'Availability Tracking',
        description: 'See at a glance who is in, who is maybe, and who cannot make it. Admins can set availability on behalf of players and assign preferred positions.',
    },
    {
        icon: <Trophy className="w-6 h-6 text-yellow-400" />,
        title: 'Match Results',
        description: 'Record final scores, goal scorers, assists, and Man of the Match after each game. Track attendance and see who actually turned up.',
    },
    {
        icon: <BarChart3 className="w-6 h-6 text-emerald-400" />,
        title: 'League Statistics',
        description: 'Full leaderboards for goals, assists, win rate, clean sheets, and MOTM awards. Filter by time period. See your personal highlights and form streak.',
    },
    {
        icon: <PoundSterling className="w-6 h-6 text-lime-400" />,
        title: 'Finance Tracking',
        description: 'Set a cost per game and track who owes what. Record payments, approve player-submitted expenses, and see running balances with weekly charts.',
    },
    {
        icon: <Award className="w-6 h-6 text-pink-400" />,
        title: 'Player Profiles & Badges',
        description: 'Set your preferred positions and player tags. Earn badges like Hat-trick Hero, MOTM Machine, Ever Present, and On Fire based on your stats.',
    },
    {
        icon: <Shield className="w-6 h-6 text-indigo-400" />,
        title: 'Smart Team Generation',
        description: 'The algorithm respects position tags to ensure each team gets goalkeepers, defenders, and forwards. Lock specific players to the same team with #1 and #2 tags.',
    },
];

const FeaturesPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <header className="bg-green-900 dark:bg-green-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="text-white shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
                        <span className="font-bold text-xl">Team Shuffle</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/demo')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        Try demo
                    </button>
                    <button
                        onClick={() => navigate('/auth?mode=signup')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                    >
                        Get started
                    </button>
                </div>
            </header>

            <div className="p-4 sm:p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Hero */}
                    <div className="text-center py-8 sm:py-12">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                            Everything you need to run your kickabout
                        </h1>
                        <p className="text-green-200/70 text-base sm:text-lg max-w-xl mx-auto">
                            From splitting teams in seconds to tracking stats across an entire season — Team Shuffle handles the admin so you can focus on playing.
                        </p>
                    </div>

                    {/* Feature grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                        {features.map(f => (
                            <div
                                key={f.title}
                                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 mt-0.5">{f.icon}</div>
                                    <div>
                                        <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                                        <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center pb-12">
                        <div className="bg-white/10 border border-white/10 rounded-2xl p-8">
                            <h2 className="text-xl font-bold text-white mb-2">Ready to get started?</h2>
                            <p className="text-white/50 text-sm mb-6">
                                The team picker works instantly without an account. Sign up to unlock leagues, stats, and finance tracking.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    Try the team picker
                                </button>
                                <button
                                    onClick={() => navigate('/demo')}
                                    className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    Explore demo league
                                </button>
                                <button
                                    onClick={() => navigate('/auth?mode=signup')}
                                    className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                                >
                                    Create account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeaturesPage;
