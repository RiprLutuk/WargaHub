import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/wargahub.svg', 'icons/wargahub-192.svg', 'icons/wargahub-512.svg'],
      manifest: {
        name: 'WargaHub',
        short_name: 'WargaHub',
        description: 'Informasi, layanan, dan transparansi lingkungan warga.',
        theme_color: '#07574f',
        background_color: '#fbf8f1',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'id-ID',
        categories: ['productivity', 'social'],
        icons: [
          { src: '/icons/wargahub-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/wargahub-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/documentation\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/documentation': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
  },
});
