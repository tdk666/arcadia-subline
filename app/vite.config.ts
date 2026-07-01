import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Arcadia SubLine',
        short_name: 'Arcadia',
        description: 'Le métro parisien comme plateau de jeu culturel',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        // 'any' : l'app est portrait par défaut, MAIS le mini-jeu de démolition
        // a besoin du paysage. 'portrait' verrouillait l'app installée → la
        // Bastille restait coincée derrière l'écran « pivote ton téléphone ».
        orientation: 'any',
        background_color: '#15110c',
        theme_color: '#15110c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // hors précache (chargés à la demande, puis cache navigateur) :
        // la mascotte/le modèle 3D (lourds) et le chunk Three.js de l'avatar.
        globIgnores: ['**/mascotte/**', '**/avatar3d-*.js'],
        navigateFallback: '/index.html',
        // les appels Supabase ne passent jamais par le cache SW
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/],
        // OFFLINE-FIRST (doctrine : le tunnel ne casse jamais la première
        // impression) — polices et style de carte servis depuis le cache après
        // la première visite ; les TUILES restent réseau (trop lourdes).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts-css', expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-woff2',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(styles|fonts|sprites)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'map-style', expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@content': fileURLToPath(new URL('../content', import.meta.url)),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
  },
});
