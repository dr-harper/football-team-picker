import React, { useEffect } from 'react';
import { NOTIFICATION_TIMEOUT_MS } from '../constants/gameConstants';

interface NotificationProps {
    message: string;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, NOTIFICATION_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div role="status" aria-live="polite" className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded shadow-lg">
            {message}
        </div>
    );
};

export default Notification;
