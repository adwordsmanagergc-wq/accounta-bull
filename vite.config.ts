import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/
// so the app must be built with a base path matching the repo name.
// If you name your GitHub repo something OTHER than "accountabull-web",
// change the value below to "/<your-repo-name>/" (keep the slashes).
const REPO_BASE = '/accountabull-web/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? REPO_BASE,
})
