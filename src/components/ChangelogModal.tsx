import { useEffect, useRef } from 'react';
import { ClipboardList, X } from 'lucide-react';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

export function ChangelogModal({ isOpen, onClose, content }: ChangelogModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const renderInlineMarkdown = (text: string): (string | JSX.Element)[] => {
        const parts: (string | JSX.Element)[] = [];
        const inlineRegex = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = inlineRegex.exec(text)) !== null) {
            if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
            if (match[1] && match[2]) {
                parts.push(<a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:underline">{match[1]}</a>);
            } else if (match[3]) {
                parts.push(<code key={key++} className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-700 text-green-700 dark:text-green-400">{match[3]}</code>);
            } else if (match[4]) {
                parts.push(<strong key={key++} className="font-semibold">{match[4]}</strong>);
            }
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) parts.push(text.slice(lastIndex));
        return parts.length > 0 ? parts : [text];
    };

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];
        let listItems: { text: string; level: number }[] = [];

        const flushList = () => {
            if (listItems.length === 0) return;
            elements.push(
                <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1.5 mb-4 text-sm text-gray-600 dark:text-gray-300">
                    {listItems.map((item, i) => (
                        <li key={i} style={{ paddingLeft: `${item.level * 16}px` }}>
                            {renderInlineMarkdown(item.text)}
                        </li>
                    ))}
                </ul>
            );
            listItems = [];
        };

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) { flushList(); return; }

            if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
                flushList();
                elements.push(<h1 key={idx} className="text-xl font-bold mb-4 text-green-700 dark:text-green-400">{trimmed.slice(2)}</h1>);
                return;
            }
            if (trimmed.startsWith('## ')) {
                flushList();
                elements.push(<h2 key={idx} className="text-base font-semibold mt-6 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white">{trimmed.slice(3)}</h2>);
                return;
            }
            if (trimmed.startsWith('### ')) {
                flushList();
                elements.push(<h3 key={idx} className="text-sm font-semibold mt-3 mb-1 text-green-700 dark:text-green-400">{trimmed.slice(4)}</h3>);
                return;
            }
            if (trimmed === '---') {
                flushList();
                elements.push(<hr key={idx} className="my-4 border-gray-200 dark:border-gray-700" />);
                return;
            }
            const listMatch = line.match(/^(\s*)- (.*)/);
            if (listMatch) {
                listItems.push({ text: listMatch[2], level: Math.floor(listMatch[1].length / 2) });
                return;
            }
            if (trimmed) {
                flushList();
                elements.push(<p key={idx} className="text-sm mb-2 text-gray-500 dark:text-gray-400">{renderInlineMarkdown(trimmed)}</p>);
            }
        });
        flushList();
        return elements;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div ref={modalRef} className="relative w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-gray-800">
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">What's New</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 70px)' }}>
                    {renderMarkdown(content)}
                </div>
            </div>
        </div>
    );
}
