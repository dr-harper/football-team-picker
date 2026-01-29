import React from 'react';
import { useTheme } from '../themes';

const Footer: React.FC = () => {
    const t = useTheme();

    return (
        <footer className={t.footer.container}>
            <p className="text-sm">
                Built in React by <a href="https://mikeyharper.uk" target="_blank" rel="noopener noreferrer" className={t.footer.link}>Mikey Harper</a> and AI, hosted on <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={t.footer.link}>GitHub</a>, code available <a href="https://github.com/dr-harper/football-team-picker" target="_blank" rel="noopener noreferrer" className={t.footer.link}>here</a>. Visit the app at <a href="https://teamshuffle.app" target="_blank" rel="noopener noreferrer" className={t.footer.link}>teamshuffle.app</a>.
            </p>
        </footer>
    );
};

export default Footer;
