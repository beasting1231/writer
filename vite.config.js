import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ensure proper MIME types are set
    fs: {
      strict: true,
    },
  },
  build: {
    // Ensure proper module handling
    modulePreload: true,
  },
  // Use relative base path for better compatibility
  base: './',
})
