import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Mochimon/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/Mochimon/index.html',
        navigateFallbackDenylist: [/^\/Mochimon\/sw\.js/, /^\/Mochimon\/workbox-/],
      },
      manifest: {
        name: 'Mochimon',
        short_name: 'Mochimon',
        description: 'もちものリスト管理アプリ',
        theme_color: '#4a90e2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/Mochimon/',
        start_url: '/Mochimon/',
        lang: 'ja',
        icons: [
          {
            src: 'Mochimon192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'Mochimon512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
