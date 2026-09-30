import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site under /<repo>/; override with BASE_PATH if hosting elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    proxy: {
      // Local stand-in for the Cloudflare relay (OpenCode endpoints only):
      // set Settings → Relay URL to "/relay" during `npm run dev`.
      '/relay': {
        target: 'https://opencode.ai',
        changeOrigin: true,
        rewrite: () => '/zen/go/v1/chat/completions',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const base = new URL(String(req.headers['x-target-base'] ?? 'https://opencode.ai/zen/go/v1'))
            proxyReq.path = base.pathname.replace(/\/+$/, '') + '/chat/completions'
            proxyReq.setHeader('User-Agent', 'manor-casebook/1.0')
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('x-target-base')
          })
        },
      },
    },
  },
})
