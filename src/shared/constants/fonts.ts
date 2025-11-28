export type FontFamily = 'system' | 'urbanist' | 'jetbrains-mono' | 'ibm-plex-sans' | 'manrope' | 'ubuntu-sans';

export const FONT_FAMILIES: Record<FontFamily, { name: string; cssValue: string }> = {
  'system': {
    name: 'System Default',
    cssValue: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  'urbanist': {
    name: 'Urbanist',
    cssValue: '"Urbanist", -apple-system, BlinkMacSystemFont, sans-serif'
  },
  'jetbrains-mono': {
    name: 'JetBrains Mono',
    cssValue: '"JetBrains Mono", "Courier New", monospace'
  },
  'ibm-plex-sans': {
    name: 'IBM Plex Sans',
    cssValue: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif'
  },
  'manrope': {
    name: 'Manrope',
    cssValue: '"Manrope", -apple-system, BlinkMacSystemFont, sans-serif'
  },
  'ubuntu-sans': {
    name: 'Ubuntu Sans',
    cssValue: '"Ubuntu Sans", -apple-system, BlinkMacSystemFont, sans-serif'
  }
};

