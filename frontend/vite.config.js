import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

/**
 * Preconnect to the API's origin, injected into index.html at build time.
 *
 * In production the API is on a different host (see render.yaml), so the first
 * catalogue request pays for a DNS lookup and a TLS handshake before any JSON
 * moves. Starting that from the HTML, while the bundle downloads, takes it off
 * the path to the first product grid.
 *
 * Two details are deliberate:
 *  - It returns a tag descriptor instead of substituting a placeholder in
 *    index.html. A placeholder that is not replaced — or is replaced in the
 *    wrong spot — survives into the page as visible text and ends <head>
 *    parsing. With no placeholder there is nothing to get wrong, and when
 *    VITE_API_URL is empty or relative (the dev proxy) nothing is injected.
 *  - No `crossorigin` attribute. Every API call is credentialed
 *    (`withCredentials`), and browsers keep credentialed and anonymous
 *    connections apart, so an anonymous preconnect would warm a socket those
 *    requests could not use.
 */
function apiPreconnect(apiUrl) {
  let origin = '';
  try {
    if (apiUrl) origin = new URL(apiUrl).origin;
  } catch {
    // Relative (same-origin) or malformed: there is no separate host to warm.
  }

  return {
    name: 'touch-api-preconnect',
    transformIndexHtml() {
      if (!origin) return [];
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: origin }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig(({ mode }) => {
  // Only VITE_-prefixed variables are read, and only to build a connection hint.
  const env = loadEnv(mode, ROOT, 'VITE_');

  return {
    plugins: [react(), apiPreconnect(env.VITE_API_URL)],

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
  };
});
