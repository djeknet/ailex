import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {}
  },
  async viteFinal(config) {
    // Remove @crxjs/vite-plugin from Storybook to avoid conflicts
    if (config.plugins) {
      config.plugins = config.plugins.filter((plugin: any) => {
        // Filter out crx plugin and any plugin that might reference it
        const pluginName = plugin?.name || '';
        return !pluginName.includes('crx') && pluginName !== 'vite-plugin-crx';
      });
    }
    
    // Disable HMR overlay for cleaner development
    config.server = config.server || {};
    config.server.hmr = config.server.hmr || {};
    if (typeof config.server.hmr === 'object') {
      config.server.hmr.overlay = false;
    }
    
    // Add path aliases
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
      '@ui': path.resolve(__dirname, '../src/ui'),
      '@shared': path.resolve(__dirname, '../src/shared'),
      // Mock i18n for Storybook
      '@shared/i18n/useTranslation': path.resolve(__dirname, './mocks/useTranslation.ts'),
      // Mock stores for Storybook
      '@shared/stores/chatStore': path.resolve(__dirname, './mocks/chatStore.ts'),
      '@shared/stores/settingsStore': path.resolve(__dirname, './mocks/settingsStore.ts'),
    };
    
    return config;
  },
};
export default config;