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
      // Bundle analyzer (only in analyze mode)
      ...(process.env.ANALYZE === 'true'
        ? [
            visualizer({
              open: true,
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
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
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // UI libraries
              if (id.includes('framer-motion') || id.includes('lucide-react')) {
                return 'ui-vendor';
              }
              // Chart library (large, lazy load)
              if (id.includes('recharts')) {
                return 'chart-vendor';
              }
              // Web3 libraries
              if (id.includes('wagmi') || id.includes('viem') || id.includes('@tanstack/react-query')) {
                return 'web3-vendor';
              }
              // tRPC
              if (id.includes('@trpc')) {
                return 'trpc-vendor';
              }
              // Other large dependencies
              if (id.includes('reactflow')) {
                return 'reactflow-vendor';
              }
              // Default vendor chunk for other node_modules
              return 'vendor';
            }
            // Code split by route/feature
            if (id.includes('/components/modals/')) {
              return 'modals';
            }
            if (id.includes('/components/optimization/')) {
              return 'optimization';
            }
            if (id.includes('/services/optimization/')) {
              return 'optimization-engine';
            }
            if (id.includes('/services/backtest/')) {
              return 'backtest-engine';
            }
          },
          // Optimize chunk names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.[^.]*$/, '')
              : 'chunk';
            return `assets/${facadeModuleId}-[hash].js`;
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
