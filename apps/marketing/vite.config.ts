import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function publicMetadata(siteUrl: string): Plugin {
  const normalized = siteUrl.replace(/\/$/, '')
  const tags = normalized
    ? [
        `<link rel="canonical" href="${normalized}/" />`,
        `<meta property="og:image" content="${normalized}/og.png" />`,
        `<meta name="twitter:image" content="${normalized}/og.png" />`,
      ].join('\n    ')
    : ''

  return {
    name: 'itera-public-metadata',
    transformIndexHtml(html) {
      return html.replace('<!-- PUBLIC_URL_METADATA -->', tags)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), publicMetadata(env.VITE_SITE_URL ?? '')],
  }
})
