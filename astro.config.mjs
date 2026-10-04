import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    server: {
      // Proxy /api to the backend during dev (avoids CORS).
      // The backend routes have NO /api prefix, so it is stripped here.
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt'],
        manifest: {
          name: 'WatchTrading',
          short_name: 'WatchTrading',
          description: 'Manage your watch collection, trades and counterparties.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api') ||
                url.origin === 'http://localhost:5000' ||
                url.origin === 'https://localhost:5001',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  },
  server: {
    host: true,
    port: 4321,
  },
});