import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
const Notification = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000); // Automatically close after 3 seconds
        return () => clearTimeout(timer);
    }, [onClose]);
    return (_jsx("div", { className: "fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50", children: message }));
};
export default Notification;
