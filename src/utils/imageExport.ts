import { toPng } from 'html-to-image';
import type { ThemeConfig } from '../themes';

const HIDDEN_SELECTORS = ['.delete-button', '.color-picker', '.color-circle', '.generate-ai-summary'];

export interface ExportResult {
    success: boolean;
    error?: string;
}

type ExportConfig = ThemeConfig['export'];

function setElementsVisibility(elements: (HTMLElement | null)[], display: string) {
    elements.forEach(element => {
        HIDDEN_SELECTORS.forEach(selector => {
            element?.querySelectorAll(selector).forEach(el => {
                (el as HTMLElement).style.display = display;
            });
        });
    });
}

/** Render all team setup elements into a single PNG data URL */
export async function generateTeamsImage(setupCount: number, exportConfig: ExportConfig): Promise<string | null> {
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
                const dataUrl = await toPng(element, { backgroundColor: exportConfig.cardBg });
                const img = new Image();
                img.src = dataUrl;
                await new Promise(resolve => (img.onload = resolve));
                return img;
            }),
        );

        const totalHeight = images.reduce((sum, img) => sum + (img?.height || 0), 0);
        const maxWidth = Math.max(...images.map(img => img?.width || 0));

        canvas.width = maxWidth;
        canvas.height = totalHeight + 40;

        let yOffset = 0;
        images.forEach(img => {
            if (img) {
                context.drawImage(img, 0, yOffset, img.width, img.height);
                yOffset += img.height;
            }
        });

        context.fillStyle = exportConfig.watermarkBg;
        context.fillRect(0, totalHeight, canvas.width, 40);

        context.fillStyle = exportConfig.watermarkText;
        context.font = exportConfig.watermarkFont;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Made with teamshuffle.app', canvas.width / 2, totalHeight + 20);

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
export async function exportImage(setupCount: number, exportConfig: ExportConfig): Promise<ExportResult> {
    try {
        const dataUrl = await generateTeamsImage(setupCount, exportConfig);
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
export async function shareImage(setupCount: number, exportConfig: ExportConfig): Promise<ExportResult> {
    try {
        const dataUrl = await generateTeamsImage(setupCount, exportConfig);
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
