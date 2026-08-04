import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path handling for different hosts:
//   - Vercel / Netlify / any root domain  -> "/"        (the default below)
//   - GitHub Pages PROJECT site            -> "/<repo>/" via the VITE_BASE env var
//
// The GitHub Actions workflow sets VITE_BASE="/accountabull-web/" automatically,
// so you don't need to touch anything here for either host. To deploy to a
// GitHub Pages repo with a different name, change VITE_BASE in the workflow.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})
