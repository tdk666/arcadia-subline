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
        orientation: 'portrait',
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
        // la mascotte (~1 Mo) n'est pas pré-cachée : chargée à la demande
        // (FTUE / récompense), puis mise en cache par le navigateur.
        globIgnores: ['**/mascotte/**'],
        navigateFallback: '/index.html',
        // les appels Supabase ne passent jamais par le cache SW
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/],
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
