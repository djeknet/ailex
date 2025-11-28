import { FONT_FAMILIES, FontFamily } from '@shared/constants/fonts';

/**
 * Применяет шрифт к документу
 */
export function applyFontFamily(fontFamily: FontFamily) {
  const fontConfig = FONT_FAMILIES[fontFamily];
  if (fontConfig) {
    document.documentElement.style.setProperty('font-family', fontConfig.cssValue);
    document.body.style.fontFamily = fontConfig.cssValue;
  }
}

