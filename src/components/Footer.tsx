import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="text-white bg-green-900 dark:bg-green-950 py-4 text-center">
            <p className="text-sm text-white/70">
                Made by <a href="https://mikeyharper.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Mikey Harper</a>
                {' · '}
                <a href="https://github.com/dr-harper/football-team-picker" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Source</a>
                {' · '}
                <Link to="/privacy" className="underline hover:text-white transition-colors">Privacy</Link>
                {' · '}
                <Link to="/terms" className="underline hover:text-white transition-colors">Terms</Link>
            </p>
        </footer>
    );
};

export default Footer;
