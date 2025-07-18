export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    let sanitized = hex.replace('#', '');
    if (sanitized.length === 3) {
        sanitized = sanitized.split('').map(c => c + c).join('');
    }
    if (sanitized.length !== 6) return null;
    const num = parseInt(sanitized, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

export function colorDistance(c1: string, c2: string): number {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    if (!rgb1 || !rgb2) return Infinity;
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function areColorsTooSimilar(c1: string, c2: string, threshold = 100): boolean {
    return colorDistance(c1, c2) < threshold;
}

export function pickSecondColor(primary: string, palette: string[]): string {
    const viable = palette.filter(c => c !== primary && !areColorsTooSimilar(c, primary));
    const options = viable.length > 0 ? viable : palette.filter(c => c !== primary);
    return options[Math.floor(Math.random() * options.length)];
}
