import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import manifest from './manifest.json';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      crx({ manifest: manifest as any }),
      viteStaticCopy({
        targets: [
          { src: 'src/_locales', dest: '' },
          { src: 'icons', dest: '' },
          { src: 'fonts', dest: '' },
          { src: 'videos', dest: '' },
          { src: 'site-prompts.json', dest: '' }
        ]
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    build: {
      target: 'es2020',
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        format: {
          comments: false
        }
      } : undefined,
      rollupOptions: {
        input: {
          sidepanel: 'src/ui/sidepanel/index.html',
          fullscreen: 'src/ui/fullscreen/index.html'
        }
      }
    }
  };
});

