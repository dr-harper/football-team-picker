import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { HealthMenuItem } from './HealthStatus';

interface AppHeaderProps {
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    titleExtra?: React.ReactNode;
    showDashboardLink?: boolean;
    menuExtras?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    subtitle,
    onBack,
    titleExtra,
    showDashboardLink = false,
    menuExtras,
}) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const avatarChar = (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

    return (
        <header className="bg-green-900 dark:bg-green-950 text-white p-4 flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-2 min-w-0">
                {onBack ? (
                    <Button onClick={onBack} variant="ghost" size="icon" className="text-white shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                ) : (
                    <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
                        <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
                        <span className="font-bold text-xl">Team Shuffle</span>
                    </Link>
                )}
                {title && (
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xl truncate">{title}</span>
                            {titleExtra}
                        </div>
                        {subtitle && (
                            <div className="text-green-300 text-xs truncate">{subtitle}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
                {showDashboardLink && (
                    <Link
                        to="/dashboard"
                        className="hidden sm:flex text-green-300 hover:text-white text-sm items-center gap-1 transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                    </Link>
                )}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(v => !v)}
                        className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm hover:bg-green-500 transition-colors"
                        aria-label="User menu"
                    >
                        {avatarChar}
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-10 w-52 bg-green-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-white/10">
                                <div className="text-white text-sm font-medium truncate">
                                    {user?.displayName || user?.email}
                                </div>
                            </div>
                            <HealthMenuItem />
                            {menuExtras}
                            <button
                                onClick={() => { logout(); navigate('/'); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/70 hover:bg-white/5 hover:text-red-400 transition-colors border-t border-white/5"
                            >
                                <LogOut className="w-4 h-4" /> Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
