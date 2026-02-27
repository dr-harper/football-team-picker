import { toPng } from 'html-to-image';

const HIDDEN_SELECTORS = ['.delete-button', '.color-picker', '.color-circle', '.generate-ai-summary'];

export interface ExportResult {
    success: boolean;
    error?: string;
}

function setElementsVisibility(elements: (HTMLElement | null)[], display: string) {
    elements.forEach(element => {
        HIDDEN_SELECTORS.forEach(selector => {
            element?.querySelectorAll(selector).forEach(el => {
                (el as HTMLElement).style.display = display;
            });
        });
    });
}

const VOTE_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

// Reference width at 1x pixel density — all sizes scale proportionally from this
const BASE_WIDTH = 600;

function scaled(value: number, scale: number): number {
    return Math.round(value * scale);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string[] {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/** Render all team setup elements into a single PNG data URL */
export async function generateTeamsImage(setupCount: number, taglines?: string[]): Promise<string | null> {
    const elements = Array.from({ length: setupCount }, (_, i) =>
        document.getElementById(`team-setup-${i}`),
    );
    if (elements.some(el => !el)) return null;

    setElementsVisibility(elements, 'none');

    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;

        const images = await Promise.all(
            elements.map(async element => {
                if (!element) return null;
                const dataUrl = await toPng(element, { backgroundColor: '#146434' });
                const img = new Image();
                img.src = dataUrl;
                await new Promise(resolve => (img.onload = resolve));
                return img;
            }),
        );

        const maxWidth = Math.max(...images.map(img => img?.width || 0));
        const isVote = setupCount > 1;

        // Scale all sizes proportionally to the captured image width
        const scale = Math.max(1, maxWidth / BASE_WIDTH);
        const taglinePadding    = scaled(10, scale);
        const taglineLineHeight = scaled(22, scale);
        const taglineFont       = `italic ${scaled(16, scale)}px Arial`;
        const footerHeightSingle = scaled(40, scale);
        const footerHeightVote   = scaled(64, scale);
        const footerHeight = isVote ? footerHeightVote : footerHeightSingle;
        const voteFontSize   = scaled(20, scale);
        const creditFontSize = scaled(13, scale);

        const taglineStripHeight = (lines: string[]) =>
            lines.length * taglineLineHeight + taglinePadding * 2;

        // Pre-wrap taglines at the correct scaled font so heights are accurate
        const wrappedTaglines = (taglines ?? []).map(t =>
            t ? wrapText(context, t, taglineFont, maxWidth - taglinePadding * 2) : [],
        );
        const taglinesHeight = wrappedTaglines.reduce(
            (sum, lines) => sum + (lines.length ? taglineStripHeight(lines) : 0), 0,
        );
        const totalHeight = images.reduce((sum, img) => sum + (img?.height || 0), 0) + taglinesHeight;

        canvas.width = maxWidth;
        canvas.height = totalHeight + footerHeight;

        let yOffset = 0;
        images.forEach((img, i) => {
            if (img) {
                context.drawImage(img, 0, yOffset, img.width, img.height);
                yOffset += img.height;
            }
            const lines = wrappedTaglines[i];
            if (lines?.length) {
                const stripHeight = taglineStripHeight(lines);
                context.fillStyle = '#1a5c35';
                context.fillRect(0, yOffset, canvas.width, stripHeight);
                context.fillStyle = 'rgba(255,255,255,0.9)';
                context.font = taglineFont;
                context.textAlign = 'center';
                context.textBaseline = 'top';
                lines.forEach((line, li) => {
                    context.fillText(line, canvas.width / 2, yOffset + taglinePadding + li * taglineLineHeight);
                });
                yOffset += stripHeight;
            }
        });

        // Footer
        const footerY = totalHeight;
        context.fillStyle = '#0A2507';
        context.fillRect(0, footerY, canvas.width, footerHeight);
        context.textAlign = 'center';

        if (isVote) {
            const voteEmojis = VOTE_EMOJIS.slice(0, setupCount).join('  ');
            context.fillStyle = '#facc15';
            context.font = `bold ${voteFontSize}px Arial`;
            context.textBaseline = 'middle';
            context.fillText(`⬆️ React to vote  ${voteEmojis}`, canvas.width / 2, footerY + footerHeightVote * 0.35);
            context.fillStyle = 'rgba(255,255,255,0.5)';
            context.font = `${creditFontSize}px Arial`;
            context.fillText('teamshuffle.app', canvas.width / 2, footerY + footerHeightVote * 0.75);
        } else {
            context.fillStyle = 'white';
            context.font = `bold ${voteFontSize}px Arial`;
            context.textBaseline = 'middle';
            context.fillText('Made with teamshuffle.app', canvas.width / 2, footerY + footerHeightSingle / 2);
        }

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Failed to generate image:', error);
        return null;
    } finally {
        setElementsVisibility(elements, '');
    }
}

function dateStamp(): string {
    return new Date().toISOString().split('T')[0].replace(/-/g, '_');
}

/** Download the generated image as a PNG file */
export async function exportImage(setupCount: number, taglines?: string[]): Promise<ExportResult> {
    try {
        const dataUrl = await generateTeamsImage(setupCount, taglines);
        if (!dataUrl) return { success: false, error: 'Failed to generate image' };
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Football_teams_${dateStamp()}.png`;
        link.click();
        return { success: true };
    } catch (err) {
        console.error('Export failed:', err);
        return { success: false, error: 'Failed to export image' };
    }
}

/** Share the generated image via the native share API or WhatsApp fallback */
export async function shareImage(setupCount: number, taglines?: string[]): Promise<ExportResult> {
    try {
        const dataUrl = await generateTeamsImage(setupCount, taglines);
        if (!dataUrl) return { success: false, error: 'Failed to generate image for sharing' };
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `Football_teams_${dateStamp()}.png`, { type: 'image/png' });
        const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
        if (nav.canShare && nav.canShare({ files: [file] })) {
            await nav.share({
                files: [file],
                title: 'TeamShuffle Teams',
                text: 'Made with teamshuffle.app',
            });
        } else {
            const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent('Check out the teams I made on teamshuffle.app')}`;
            window.open(shareUrl, '_blank');
        }
        return { success: true };
    } catch (err) {
        console.error('Sharing failed:', err);
        return { success: false, error: 'Failed to share image' };
    }
}
