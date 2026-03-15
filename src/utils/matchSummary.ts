import { callGemini, GeminiContent } from './geminiClient';
import { MATCH_SUMMARY_FROM_EVENTS_PROMPT } from '../constants/aiPrompts';
import { Game, Team, GoalScorer, MatchEvent } from '../types';
import { resolvePlayerName } from './playerLookup';

function formatTime(sec: number): string {
    return `${Math.floor(sec / 60)}'`;
}

function buildMatchContext(
    game: Game,
    teams: Team[],
    goalScorers: GoalScorer[],
    matchEvents: MatchEvent[],
    lookup: Record<string, string>,
): string {
    const lines: string[] = [];

    // Teams and score
    const t1 = teams[0];
    const t2 = teams[1];
    const score = game.score ?? { team1: 0, team2: 0 };
    lines.push(`${t1.name} ${score.team1} - ${score.team2} ${t2.name}`);
    lines.push('');

    // Rosters
    lines.push(`${t1.name}: ${t1.players.map(p => p.name).join(', ')}`);
    lines.push(`${t2.name}: ${t2.players.map(p => p.name).join(', ')}`);
    lines.push('');

    // Duration
    if (game.matchStartedAt && game.matchEndedAt) {
        const durationMin = Math.round((game.matchEndedAt - game.matchStartedAt - (game.totalPausedMs ?? 0)) / 60000);
        lines.push(`Match duration: ${durationMin} minutes`);
    }

    // Goal timeline
    const goalEntries = goalScorers.flatMap(gs =>
        (gs.goalTimes ?? []).map(t => ({
            time: formatTime(t),
            player: resolvePlayerName(gs.playerId, lookup),
            goals: 1,
        }))
    ).sort((a, b) => parseInt(a.time) - parseInt(b.time));

    if (goalEntries.length > 0) {
        lines.push('');
        lines.push('Goals:');
        for (const g of goalEntries) {
            lines.push(`  ${g.time} ${g.player}`);
        }
    }

    // Top scorers
    const topScorers = [...goalScorers]
        .filter(g => g.goals >= 2)
        .sort((a, b) => b.goals - a.goals);
    if (topScorers.length > 0) {
        lines.push('');
        lines.push('Multi-goal scorers:');
        for (const gs of topScorers) {
            lines.push(`  ${resolvePlayerName(gs.playerId, lookup)}: ${gs.goals} goals`);
        }
    }

    // Match events (non-goal)
    const noteworthy = matchEvents.filter(e =>
        e.type !== 'goal' && e.type !== 'note' && e.transcript
    );
    if (noteworthy.length > 0) {
        lines.push('');
        lines.push('Key moments:');
        for (const e of noteworthy) {
            const time = e.elapsedSec !== undefined ? formatTime(e.elapsedSec) : '';
            const player = e.playerId ? resolvePlayerName(e.playerId, lookup) : '';
            lines.push(`  ${time} [${e.type}] ${player} — ${e.transcript}`);
        }
    }

    // Voice commentary / notes
    const notes = matchEvents.filter(e => e.type === 'note' && e.transcript);
    if (notes.length > 0) {
        lines.push('');
        lines.push('Commentary:');
        for (const n of notes) {
            const time = n.elapsedSec !== undefined ? formatTime(n.elapsedSec) : '';
            lines.push(`  ${time} "${n.transcript}"`);
        }
    }

    // MOTM
    if (game.manOfTheMatch) {
        const motmName = resolvePlayerName(game.manOfTheMatch, lookup);
        lines.push('');
        lines.push(`Man of the Match: ${motmName}`);
        if (game.motmNotes) lines.push(`  "${game.motmNotes}"`);
    }

    return lines.join('\n');
}

export async function generateMatchSummary(
    game: Game,
    teams: Team[],
    goalScorers: GoalScorer[],
    matchEvents: MatchEvent[],
    lookup: Record<string, string>,
    apiKey?: string,
): Promise<string> {
    const context = buildMatchContext(game, teams, goalScorers, matchEvents, lookup);
    const prompt = MATCH_SUMMARY_FROM_EVENTS_PROMPT + context;

    const contents: GeminiContent[] = [
        { role: 'user', parts: [{ text: prompt }] },
    ];

    const response = await callGemini('gemini-2.5-flash-lite', contents, apiKey);
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No summary generated');
    return text.trim();
}
