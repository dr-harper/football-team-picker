import type { ThemeName, ThemeConfig } from './themeConfig';
import { classicTheme } from './classicTheme';
import { glassTheme } from './glassTheme';
import { sundayLeagueTheme } from './sundayLeagueTheme';

export type { ThemeName, ThemeConfig };

export const themes: Record<ThemeName, ThemeConfig> = {
  classic: classicTheme,
  glass: glassTheme,
  sundayLeague: sundayLeagueTheme,
};

export const DEFAULT_THEME: ThemeName = 'sundayLeague';

export { useTheme } from './useTheme';
