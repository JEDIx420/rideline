import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, // Ensure GLB and large assets are kept as separate files
    chunkSizeWarningLimit: 3000,
  },
  server: {
    port: 3000,
    open: true
  }
});
