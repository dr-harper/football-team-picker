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

const INTRO_BANNER_HEIGHT = 60;
const FOOTER_HEIGHT = 40;

/** Render all team setup elements into a single PNG data URL */
export async function generateTeamsImage(setupCount: number, intro?: string): Promise<string | null> {
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

        const totalHeight = images.reduce((sum, img) => sum + (img?.height || 0), 0);
        const maxWidth = Math.max(...images.map(img => img?.width || 0));
        const introBannerHeight = intro ? INTRO_BANNER_HEIGHT : 0;

        canvas.width = maxWidth;
        canvas.height = totalHeight + introBannerHeight + FOOTER_HEIGHT;

        // Intro banner
        if (intro) {
            context.fillStyle = '#0d3d20';
            context.fillRect(0, 0, canvas.width, introBannerHeight);
            context.fillStyle = '#facc15'; // yellow-400
            context.font = 'bold 22px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(intro, canvas.width / 2, introBannerHeight / 2);
        }

        let yOffset = introBannerHeight;
        images.forEach(img => {
            if (img) {
                context.drawImage(img, 0, yOffset, img.width, img.height);
                yOffset += img.height;
            }
        });

        // Footer
        context.fillStyle = '#0A2507';
        context.fillRect(0, totalHeight + introBannerHeight, canvas.width, FOOTER_HEIGHT);
        context.fillStyle = 'white';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Made with teamshuffle.app', canvas.width / 2, totalHeight + introBannerHeight + FOOTER_HEIGHT / 2);

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
export async function exportImage(setupCount: number, intro?: string): Promise<ExportResult> {
    try {
        const dataUrl = await generateTeamsImage(setupCount, intro);
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
export async function shareImage(setupCount: number, intro?: string): Promise<ExportResult> {
    try {
        const dataUrl = await generateTeamsImage(setupCount, intro);
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
