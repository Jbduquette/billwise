import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { serviceWorker } from './pwa/vite-plugin.mjs'

// base: './' keeps the build portable — it can be hosted at any path
// (GitHub Pages, a sub-folder, or opened from a static file server).
// serviceWorker() writes dist/sw.js so the site installs as an offline app.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
})
