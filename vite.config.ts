import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// APP_PREVIEW=1 로 빌드하면 미리보기판: /chulgeun-dojang/preview/ 에 올라가고,
// 기록 저장소·설치 앱·서비스 워커가 본 앱과 완전히 분리된다. (.github/workflows/deploy.yml)
const PREVIEW = process.env.APP_PREVIEW === '1';
const BASE = PREVIEW ? '/chulgeun-dojang/preview/' : '/chulgeun-dojang/';

export default defineConfig({
  base: BASE,
  define: {
    __PREVIEW__: JSON.stringify(PREVIEW),
    __APP_VERSION__: JSON.stringify(pkg.version),
    // 빌드마다 다른 값 (업데이트 안내 비교용)
    __BUILD_ID__: JSON.stringify(String(Date.now())),
    // 폰에 새 버전이 들어왔는지 확인용 (한국 시간 빌드 시각)
    __BUILD_TIME__: JSON.stringify(
      new Date(Date.now() + 9 * 3600_000).toISOString().slice(5, 16).replace('T', ' '),
    ),
  },
  plugins: [
    react(),
    VitePWA({
      // 사용 중 자동 새로고침으로 입력이 날아가지 않도록 'prompt' 모드로 받아 두고,
      // 앱을 내렸을 때(화면이 가려졌을 때) 적용한다 → 다음에 열면 새 버전. (src/main.tsx)
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: PREVIEW ? '출근도장 미리보기' : '출근도장',
        short_name: PREVIEW ? '도장 미리보기' : '출근도장',
        description: '출근일과 메모를 기록하고 월별 근무일지를 보내는 앱',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        theme_color: PREVIEW ? '#e67700' : '#1b7f3b',
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
        // 본 앱의 서비스 워커가 미리보기 주소(/preview/)를 가로채지 않게 한다.
        navigateFallbackDenylist: PREVIEW ? [] : [/^\/chulgeun-dojang\/preview\//],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
