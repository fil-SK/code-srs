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
      // workbox-build's default glob is js/css/html only, which left every
      // bundled .woff2 and the Today hero's PNG mask out of the precache: the
      // installed PWA came back online rendering in system-ui without its
      // imagery, contradicting the self-hosted-fonts intent (audit 2026-08-22).
      // Scoped to the asset types this build actually emits and the app
      // actually uses - not a catch-all - and still no runtimeCaching, so
      // Supabase and auth requests keep going to the network.
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
      // The glob above already matches every manifest icon in dist/, and
      // leaving this on adds a second, byte-identical precache entry for
      // itera-logo.png.
      includeManifestIcons: false,
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
  // .env / .env.local stay at the repository root rather than moving into this
  // workspace, so environment discovery is unchanged by the relocation. Resolved
  // from this config file's own directory, never from process.cwd(), so `npm run
  // dev` at the root and `npm run dev --workspace @itera/web` load the same files.
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
