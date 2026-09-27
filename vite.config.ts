import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' keeps the build portable — it can be hosted at any path
// (GitHub Pages, a sub-folder, or opened from a static file server).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
