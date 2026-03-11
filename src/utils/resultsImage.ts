import { toPng } from 'html-to-image';
import { MotionGlobalConfig } from 'framer-motion';
import { GoalScorer, Team } from '../types';
import { resolvePlayerName, type PlayerId } from './playerLookup';
import { logger } from './logger';

export interface ResultsImageData {
    leagueName?: string;
    gameTitle?: string;
    gameDate?: number;
    teams: Team[];
    score: { team1: number; team2: number };
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    lookup: Record<string, string>;
    enableAssists?: boolean;
    weatherEmoji?: string;
    temperature?: number;
    rainProbability?: number;
}

const WIDTH = 1080;
const PAD = 40;
const CONTENT_WIDTH = WIDTH - PAD * 2;

const BG = '#0f4c24';
const HEADER_BG = '#0A2507';
const CARD_BG = 'rgba(255,255,255,0.08)';
const CARD_BORDER = 'rgba(255,255,255,0.12)';
const WHITE = '#ffffff';
const WHITE_70 = 'rgba(255,255,255,0.7)';
const WHITE_40 = 'rgba(255,255,255,0.4)';
const GREEN_300 = 'rgba(134,239,172,0.85)';
const GOLD = '#fbbf24';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function resolve(id: PlayerId, lookup: Record<string, string>): string {
    return resolvePlayerName(id, lookup);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = CARD_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();
}

/** Capture the pitch DOM element as an Image */
async function capturePitch(): Promise<HTMLImageElement | null> {
    // The completed game view wraps the pitch in a container — find it
    const pitchEl = document.querySelector('[role="group"][aria-label*="pitch"]') as HTMLElement | null;
    if (!pitchEl) return null;

    // Hide swap hint during capture
    const swapHint = pitchEl.querySelector('.swap-hint') as HTMLElement | null;
    if (swapHint) swapHint.style.display = 'none';

    MotionGlobalConfig.skipAnimations = true;
    const savedScrollY = window.scrollY;
    window.scrollTo(0, 0);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
        const dataUrl = await toPng(pitchEl, { backgroundColor: '#146434', pixelRatio: 2 });
        const img = new Image();
        img.src = dataUrl;
        await new Promise(r => (img.onload = r));
        return img;
    } catch {
        return null;
    } finally {
        if (swapHint) swapHint.style.display = '';
        window.scrollTo(0, savedScrollY);
        MotionGlobalConfig.skipAnimations = false;
    }
}

/** Find which team a player belongs to (0 or 1), returns -1 if not found */
function findPlayerTeam(playerId: string, teams: Team[]): number {
    for (let t = 0; t < teams.length; t++) {
        if (teams[t].players.some(p => (p.playerId ?? p.name) === playerId)) return t;
    }
    return -1;
}

/** Generate a results image as a data URL (async because it captures the pitch DOM) */
export async function generateResultsImage(data: ResultsImageData): Promise<string | null> {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Capture pitch
        const pitchImg = await capturePitch();

        // Split goal scorers and assists by team
        const team1Goals = data.goalScorers.filter(g => findPlayerTeam(g.playerId, data.teams) === 0).sort((a, b) => b.goals - a.goals);
        const team2Goals = data.goalScorers.filter(g => findPlayerTeam(g.playerId, data.teams) === 1).sort((a, b) => b.goals - a.goals);
        const team1Assists = data.enableAssists ? data.assisters.filter(a => findPlayerTeam(a.playerId, data.teams) === 0).sort((a, b) => b.goals - a.goals) : [];
        const team2Assists = data.enableAssists ? data.assisters.filter(a => findPlayerTeam(a.playerId, data.teams) === 1).sort((a, b) => b.goals - a.goals) : [];

        // Layout heights
        const headerHeight = 100;
        const scoreHeight = 160;
        const pitchHeight = pitchImg ? Math.round((CONTENT_WIDTH / pitchImg.width) * pitchImg.height) : 0;
        const pitchGap = pitchImg ? 20 : 0;
        const maxGoalRows = Math.max(team1Goals.length, team2Goals.length);
        const maxAssistRows = Math.max(team1Assists.length, team2Assists.length);
        const hasGoals = maxGoalRows > 0;
        const hasAssists = maxAssistRows > 0;
        const hasMotm = !!data.motm;
        const ROW_H = 42;
        const SECTION_HEADER_H = 48;
        const scorersHeight = hasGoals ? maxGoalRows * ROW_H + SECTION_HEADER_H : 0;
        const assistsHeight = hasAssists ? maxAssistRows * ROW_H + SECTION_HEADER_H : 0;
        const motmHeight = hasMotm ? 64 : 0;
        const statsHeight = scorersHeight + assistsHeight + motmHeight > 0
            ? scorersHeight + assistsHeight + motmHeight + 40
            : 0;
        const footerHeight = 60;

        const totalHeight = headerHeight + scoreHeight + pitchGap + pitchHeight + pitchGap
            + statsHeight + footerHeight + PAD;
        canvas.width = WIDTH;
        canvas.height = totalHeight;

        // Background
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, WIDTH, totalHeight);

        // === Header ===
        ctx.fillStyle = HEADER_BG;
        ctx.fillRect(0, 0, WIDTH, headerHeight);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const titleParts = [data.leagueName, data.gameTitle].filter(Boolean);
        ctx.fillStyle = WHITE;
        ctx.font = `bold 32px ${FONT}`;
        ctx.fillText(titleParts.join('  ·  '), WIDTH / 2, 38);

        if (data.gameDate) {
            const dateStr = new Date(data.gameDate).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            });
            const weatherStr = data.weatherEmoji && data.temperature !== undefined
                ? `${data.weatherEmoji} ${data.temperature}°C${data.rainProbability !== undefined ? `  ·  ${data.rainProbability}% rain` : ''}`
                : '';
            const line2Parts = [dateStr, weatherStr].filter(Boolean);
            ctx.fillStyle = GREEN_300;
            ctx.font = `20px ${FONT}`;
            ctx.fillText(line2Parts.join('    ·    '), WIDTH / 2, 74);
        }

        let y = headerHeight + PAD / 2;

        // === Score ===
        drawCard(ctx, PAD, y, CONTENT_WIDTH, scoreHeight);
        const scoreMidX = WIDTH / 2;
        const scoreTextY = y + scoreHeight / 2;

        ctx.fillStyle = data.teams[0].color;
        ctx.font = `bold 26px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText(data.teams[0].name, scoreMidX - 100, scoreTextY - 28);

        ctx.fillStyle = data.teams[1].color;
        ctx.textAlign = 'left';
        ctx.fillText(data.teams[1].name, scoreMidX + 100, scoreTextY - 28);

        ctx.fillStyle = WHITE;
        ctx.font = `bold 72px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText(String(data.score.team1), scoreMidX - 36, scoreTextY + 28);
        ctx.textAlign = 'center';
        ctx.fillStyle = WHITE_40;
        ctx.font = `bold 52px ${FONT}`;
        ctx.fillText('-', scoreMidX, scoreTextY + 22);
        ctx.fillStyle = WHITE;
        ctx.font = `bold 72px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(String(data.score.team2), scoreMidX + 36, scoreTextY + 28);

        y += scoreHeight + pitchGap;

        // === Pitch ===
        if (pitchImg) {
            ctx.drawImage(pitchImg, PAD, y, CONTENT_WIDTH, pitchHeight);
            y += pitchHeight + pitchGap;
        }

        // === Stats per team (Goals, Assists beneath respective teams) ===
        if (statsHeight > 0) {
            drawCard(ctx, PAD, y, CONTENT_WIDTH, statsHeight);
            const colWidth = CONTENT_WIDTH / 2;
            let statsY = y + 16;

            if (hasGoals) {
                // Section header
                ctx.textAlign = 'center';
                ctx.fillStyle = '#4ade80';
                ctx.font = `bold 22px ${FONT}`;
                ctx.fillText('⚽  Goals', WIDTH / 2, statsY + 14);
                statsY += SECTION_HEADER_H;

                // Divider
                ctx.strokeStyle = CARD_BORDER;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(WIDTH / 2, statsY);
                ctx.lineTo(WIDTH / 2, statsY + maxGoalRows * ROW_H);
                ctx.stroke();

                // Team 1 goals (left column)
                team1Goals.forEach((gs, i) => {
                    const name = resolve(gs.playerId, data.lookup);
                    ctx.textAlign = 'left';
                    ctx.fillStyle = WHITE_70;
                    ctx.font = `20px ${FONT}`;
                    ctx.fillText(name, PAD + 28, statsY + i * ROW_H + 16);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = WHITE;
                    ctx.font = `bold 20px ${FONT}`;
                    ctx.fillText(`× ${gs.goals}`, PAD + colWidth - 20, statsY + i * ROW_H + 16);
                });

                // Team 2 goals (right column)
                team2Goals.forEach((gs, i) => {
                    const name = resolve(gs.playerId, data.lookup);
                    ctx.textAlign = 'left';
                    ctx.fillStyle = WHITE_70;
                    ctx.font = `20px ${FONT}`;
                    ctx.fillText(name, PAD + colWidth + 20, statsY + i * ROW_H + 16);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = WHITE;
                    ctx.font = `bold 20px ${FONT}`;
                    ctx.fillText(`× ${gs.goals}`, PAD + CONTENT_WIDTH - 28, statsY + i * ROW_H + 16);
                });

                statsY += maxGoalRows * ROW_H + 8;
            }

            if (hasAssists) {
                ctx.textAlign = 'center';
                ctx.fillStyle = '#60a5fa';
                ctx.font = `bold 22px ${FONT}`;
                ctx.fillText('🅰️  Assists', WIDTH / 2, statsY + 14);
                statsY += SECTION_HEADER_H;

                ctx.strokeStyle = CARD_BORDER;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(WIDTH / 2, statsY);
                ctx.lineTo(WIDTH / 2, statsY + maxAssistRows * ROW_H);
                ctx.stroke();

                team1Assists.forEach((a, i) => {
                    const name = resolve(a.playerId, data.lookup);
                    ctx.textAlign = 'left';
                    ctx.fillStyle = WHITE_70;
                    ctx.font = `20px ${FONT}`;
                    ctx.fillText(name, PAD + 28, statsY + i * ROW_H + 16);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = WHITE;
                    ctx.font = `bold 20px ${FONT}`;
                    ctx.fillText(`× ${a.goals}`, PAD + colWidth - 20, statsY + i * ROW_H + 16);
                });

                team2Assists.forEach((a, i) => {
                    const name = resolve(a.playerId, data.lookup);
                    ctx.textAlign = 'left';
                    ctx.fillStyle = WHITE_70;
                    ctx.font = `20px ${FONT}`;
                    ctx.fillText(name, PAD + colWidth + 20, statsY + i * ROW_H + 16);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = WHITE;
                    ctx.font = `bold 20px ${FONT}`;
                    ctx.fillText(`× ${a.goals}`, PAD + CONTENT_WIDTH - 28, statsY + i * ROW_H + 16);
                });

                statsY += maxAssistRows * ROW_H + 8;
            }

            if (hasMotm) {
                ctx.textAlign = 'center';
                ctx.fillStyle = GOLD;
                ctx.font = `bold 24px ${FONT}`;
                ctx.fillText(`🏆  Man of the Match: ${resolve(data.motm, data.lookup)}`, WIDTH / 2, statsY + 20);
            }

            y += statsHeight + 16;
        }

        // === Footer ===
        ctx.fillStyle = HEADER_BG;
        ctx.fillRect(0, totalHeight - footerHeight, WIDTH, footerHeight);
        ctx.fillStyle = WHITE_40;
        ctx.font = `bold 20px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Made with teamshuffle.app', WIDTH / 2, totalHeight - footerHeight / 2);

        return canvas.toDataURL('image/png');
    } catch (error) {
        logger.error('Failed to generate results image:', error);
        return null;
    }
}

function dateStamp(): string {
    return new Date().toISOString().split('T')[0].replace(/-/g, '_');
}

export async function exportResultsImage(data: ResultsImageData): Promise<{ success: boolean; error?: string }> {
    try {
        const dataUrl = await generateResultsImage(data);
        if (!dataUrl) return { success: false, error: 'Failed to generate results image' };
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Match_result_${dateStamp()}.png`;
        link.click();
        return { success: true };
    } catch (err) {
        logger.error('Results export failed:', err);
        return { success: false, error: 'Failed to export results image' };
    }
}

export async function shareResultsImage(data: ResultsImageData): Promise<{ success: boolean; error?: string }> {
    try {
        const dataUrl = await generateResultsImage(data);
        if (!dataUrl) return { success: false, error: 'Failed to generate results image' };

        const filename = `Match_result_${dateStamp()}.png`;
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };

        if (nav.share && nav.canShare) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: 'image/png' });
            try {
                await nav.share({ files: [file], title: 'Match Result', text: 'Made with teamshuffle.app' });
                return { success: true };
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return { success: true };
                }
            }
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();
        return { success: true };
    } catch (err) {
        logger.error('Results sharing failed:', err);
        return { success: false, error: 'Failed to share results image' };
    }
}
