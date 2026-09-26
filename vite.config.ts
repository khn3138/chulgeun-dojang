import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: '/chulgeun-dojang/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '출근도장',
        short_name: '출근도장',
        description: '출근일과 메모를 기록하고 월별 근무일지를 보내는 앱',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/chulgeun-dojang/',
        scope: '/chulgeun-dojang/',
        theme_color: '#1b7f3b',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // jsPDF의 .html() 기능용 선택 의존성 — 이 앱은 쓰지 않으므로 오프라인 캐시에서 뺀다.
        globIgnores: ['**/html2canvas-*.js', '**/purify.es-*.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
