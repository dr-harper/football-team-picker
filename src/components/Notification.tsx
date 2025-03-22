import React, { useEffect } from 'react';

interface NotificationProps {
    message: string;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000); // Automatically close after 3 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50">
            {message}
        </div>
    );
};

export default Notification;
