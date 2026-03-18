import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import App from '../App';
import AuthenticatedHome from './AuthenticatedHome';
import FootballLoader from '../components/FootballLoader';

const HomePage: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="bg-green-900 dark:bg-green-950 text-white p-4 h-14" />
                <FootballLoader />
            </div>
        );
    }

    if (user) return <AuthenticatedHome />;
    return <App />;
};

export default HomePage;
