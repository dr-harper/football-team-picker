import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="text-white bg-green-900 dark:bg-green-950 py-4 text-center">
            <p className="text-sm">
                Built in React by <a href="https://mikeyharper.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">Mikey Harper</a> and AI, hosted on <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">GitHub</a>, code available <a href="https://github.com/dr-harper/football-team-picker" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">here</a>. Visit the app at <a href="https://teamshuffle.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">teamshuffle.app</a>.
            </p>
        </footer>
    );
};

export default Footer;
