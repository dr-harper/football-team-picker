import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import App from '../App';
import AuthenticatedHome from './AuthenticatedHome';

const HomePage: React.FC = () => {
    const { user, loading } = useAuth();

    // While auth is resolving, show a skeleton matching the authenticated layout
    // This prevents flashing the anonymous team generator for logged-in users
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="bg-green-900 dark:bg-green-950 text-white p-4 h-14" />
                <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-4">
                    <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse" />
                    <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
                    <div className="h-20 bg-white/10 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (user) return <AuthenticatedHome />;
    return <App />;
};

export default HomePage;
