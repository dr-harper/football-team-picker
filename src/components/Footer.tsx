import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChangelogModal } from './ChangelogModal';

const Footer: React.FC = () => {
    const [showChangelog, setShowChangelog] = useState(false);

    return (
        <>
            <footer className="text-white bg-green-900 dark:bg-green-950 py-4 text-center">
                <p className="text-sm text-white/70">
                    Made by <a href="https://mikeyharper.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Mikey Harper</a>
                    {' · '}
                    <a href="https://github.com/dr-harper/football-team-picker" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Source</a>
                    {' · '}
                    <Link to="/privacy" className="underline hover:text-white transition-colors">Privacy</Link>
                    {' · '}
                    <Link to="/terms" className="underline hover:text-white transition-colors">Terms</Link>
                    {' · '}
                    <button
                        onClick={() => setShowChangelog(true)}
                        className="font-mono hover:text-white transition-colors underline"
                    >
                        v{__APP_VERSION__}
                    </button>
                </p>
            </footer>
            <ChangelogModal
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
                content={__CHANGELOG__}
            />
        </>
    );
};

export default Footer;
