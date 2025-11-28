import { COLOR_SCHEMES, ColorScheme } from '@shared/constants/colorSchemes';
import { Theme } from '@shared/types/common';

/**
 * Применяет цветовую схему к документу
 */
export function applyColorScheme(scheme: ColorScheme, theme: Theme) {
  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const colors = COLOR_SCHEMES[scheme][isDark ? 'dark' : 'light'];
  
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

