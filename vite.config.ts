import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Itera',
        short_name: 'Itera',
        description: 'Spaced-repetition learning for software, CS, and compilers.',
        // Itera's canvas (--itera-canvas), not the pre-rebrand dark palette:
        // the app is light-only for now, so a dark splash/chrome color would
        // flash the wrong background before first paint.
        theme_color: '#f6f7f9',
        background_color: '#f6f7f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'itera-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
