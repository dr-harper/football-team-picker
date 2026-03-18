import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
    return (
        <motion.div
            className="text-center py-8 px-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="flex justify-center mb-3"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
                {icon}
            </motion.div>
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-green-200/70 text-sm mb-4">{description}</p>
            {action}
        </motion.div>
    );
};

export default EmptyState;
