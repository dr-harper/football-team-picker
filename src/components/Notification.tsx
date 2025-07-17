import React, { useEffect } from 'react';

interface NotificationProps {
    message: string;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000); // Automatically close after 5 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="bg-purple-600 text-white px-4 py-2 rounded shadow-lg">
            {message}
        </div>
    );
};

export default Notification;
