import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { NOTIFICATION_TIMEOUT_MS } from '../constants/gameConstants';
import { useTheme } from '../themes';

interface NotificationProps {
    message: string;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
    const t = useTheme();

    useEffect(() => {
        const timer = setTimeout(onClose, NOTIFICATION_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={t.notification}
        >
            {message}
        </motion.div>
    );
};

export default Notification;
