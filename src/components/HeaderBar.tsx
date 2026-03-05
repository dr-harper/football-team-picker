import React from 'react';
import AppHeader from './AppHeader';
import { useAuth } from '../contexts/AuthContext';

const HeaderBar: React.FC = () => {
    const { user } = useAuth();

    return <AppHeader showDashboardLink={!!user} />;
};

export default HeaderBar;
