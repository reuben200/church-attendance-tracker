import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Automatically manages asset arrays and injects them into your sw.js file
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src', // Assumes your sw.js sits inside your src/ directory
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectManifest: {
          // Automatically finds and caches all your compiled React code and public images
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg}'],
        },
        manifest: {
          name: 'Igbe Attendance',
          short_name: 'Igbe PWA',
          theme_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/pwa_icon_192.jpg', sizes: '192x192', type: 'image/jpeg' },
            { src: '/pwa_icon_512.jpg', sizes: '512x512', type: 'image/jpeg' }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
