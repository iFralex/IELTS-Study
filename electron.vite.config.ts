import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Packages that use package.json "exports" subpath entries (e.g. "zod/v4")
// which Electron's ASAR resolver cannot handle. Bundle them at build time so
// no live require("zod/v4") call ever reaches the ASAR runtime resolver.
const BUNDLE_IN_MAIN = ['ai', '@ai-sdk/anthropic', '@ai-sdk/google', '@ai-sdk/openai', 'zod']

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: BUNDLE_IN_MAIN })],
    build: {
      rollupOptions: {
        // Ensure native modules (better-sqlite3) remain external
        external: ['better-sqlite3'],
      },
    },
  },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: { alias: { '@renderer': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss()],
  },
})
