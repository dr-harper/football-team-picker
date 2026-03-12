import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    badge?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title, icon, badge, defaultOpen = false, children,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
                {icon}
                <span className="text-white font-medium text-sm flex-1">{title}</span>
                {badge && <span className="text-white/30 text-xs">{badge}</span>}
                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
