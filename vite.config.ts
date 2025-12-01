import { defineConfig } from 'vite'

// Minimal config without ESM-only plugin to avoid require/ESM loading issues
// https://vite.dev/config/
export default defineConfig({
  // If you want React fast-refresh / SWC support, install a compatible
  // @vitejs/plugin-react version that matches your environment and Node.
})
