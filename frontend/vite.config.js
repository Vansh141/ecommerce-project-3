import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
    // In development the API is proxied so the browser sees one origin. That
    // keeps the refresh cookie same-site locally without needing SameSite=None.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Splitting stable vendor code from app code means a content change
        // does not invalidate React in every returning visitor's cache.
        // Vite 8 uses rolldown, which requires the function form here.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          if (/[\\/]node_modules[\\/](lucide-react|axios)[\\/]/.test(id)) {
            return 'ui-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
