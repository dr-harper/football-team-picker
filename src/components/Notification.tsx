import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
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
        <motion.div
            role="status"
            aria-live="polite"
            className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded shadow-lg"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            {message}
        </motion.div>
    );
};

export default Notification;
