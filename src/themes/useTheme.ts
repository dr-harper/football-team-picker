import { useSettings } from '../contexts/SettingsContext';
import type { ThemeConfig } from './themeConfig';

export function useTheme(): ThemeConfig {
  const { theme } = useSettings();
  return theme;
}
