import path from 'node:path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env vars (used by plugins)
  loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy CoinGecko API calls to avoid CORS issues
        '/api/coingecko': {
          target: 'https://api.coingecko.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url);
            });
          },
        },
        // Proxy Binance API calls to avoid CORS issues
        '/api/binance': {
          target: 'https://api.binance.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binance/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Binance proxy error', err);
            });
          },
        },
      },
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
          globIgnores: ['**/stats.html', '**/node_modules/**'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
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
            {
              urlPattern: /^https:\/\/.*\/trpc\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'trpc-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
              },
            },
          ],
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],
    // API keys are now managed server-side - no client-side exposure
    // Removed VITE_GEMINI_API_KEY from client build
    build: {
      sourcemap: process.env.NODE_ENV !== 'production', // No source maps in production
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (id.includes('node_modules')) {
              // React core (small, load first)
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // Chart library (large, separate chunk for lazy loading)
              if (id.includes('recharts')) {
                return 'chart-vendor';
              }
              // Framer Motion (large, separate chunk)
              if (id.includes('framer-motion')) {
                return 'framer-motion-vendor';
              }
              // Web3 libraries (can be lazy loaded)
              if (
                id.includes('wagmi') ||
                id.includes('viem') ||
                id.includes('@tanstack/react-query')
              ) {
                return 'web3-vendor';
              }
              // ReactFlow (large, separate chunk)
              if (id.includes('reactflow') || id.includes('@xyflow')) {
                return 'reactflow-vendor';
              }
              // tRPC (small, can be in main)
              if (id.includes('@trpc')) {
                return 'trpc-vendor';
              }
              // UI libraries (small)
              if (id.includes('lucide-react')) {
                return 'ui-icons-vendor';
              }
              // Dagre for layout
              if (id.includes('dagre')) {
                return 'dagre-vendor';
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
            if (id.includes('/features/optimization/')) {
              return 'optimization-feature';
            }
            if (id.includes('/features/backtesting/')) {
              return 'backtesting-feature';
            }
            if (id.includes('/services/optimization/')) {
              return 'optimization-engine';
            }
            if (id.includes('/services/backtest/')) {
              return 'backtest-engine';
            }
            // Charts components (use recharts, should be lazy loaded)
            if (id.includes('/components/optimization/') && id.includes('Graph')) {
              return 'charts';
            }
            // Return undefined for files that don't need special chunking
            return undefined;
          },
          // Optimize chunk names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId
                  .split('/')
                  .pop()
                  ?.replace(/\.[^.]*$/, '')
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
