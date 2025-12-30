import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'DeFi Builder',
          short_name: 'DeFi Builder',
          description: 'Visual, AI-powered DeFi strategy builder',
          theme_color: '#FF5500',
          background_color: '#FAFAF8',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.coingecko\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'coingecko-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
              },
            },
          ],
        },
      }),
    ],
    // API keys are now managed server-side - no client-side exposure
    // Removed VITE_GEMINI_API_KEY from client build
    build: {
      sourcemap: process.env.NODE_ENV === 'production' ? false : true, // No source maps in production
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'chart-vendor': ['recharts'],
            'web3-vendor': ['wagmi', 'viem', '@tanstack/react-query'],
            'trpc-vendor': ['@trpc/client', '@trpc/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Warn if chunk exceeds 1MB
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
