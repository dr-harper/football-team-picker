import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer style={{ backgroundColor: '#0A2507' }} className="text-white py-4 text-center">
            <p className="text-sm">
                Built in React by <a href="https://mikeyharper.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">Mikey Harper</a> and AI, hosted on <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">GitHub</a>, code available <a href="https://github.com/dr-harper/football-team-picker" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">here</a>.
            </p>
        </footer>
    );
};

export default Footer;
