import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { User, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const HeaderBar: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { darkMode, setDarkMode } = useSettings();

    return (
        <header className="bg-green-900 text-white px-4 py-3 flex items-center justify-between relative z-10 dark:bg-green-950">
            <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
                <span className="font-bold text-xl">Team Shuffle</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Toggle dark mode"
                >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                {user ? (
                    <Button
                        onClick={() => navigate('/dashboard')}
                        variant="ghost"
                        size="sm"
                        className="text-white flex items-center gap-1 text-xs"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                ) : (
                    <Button
                        onClick={() => navigate('/auth')}
                        variant="ghost"
                        size="sm"
                        className="text-white flex items-center gap-1 text-xs"
                    >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign In</span>
                    </Button>
                )}
            </div>
        </header>
    );
};

export default HeaderBar;
