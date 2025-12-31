import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { logger } from './lib/monitoring/logger';
import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info(`Service Worker registered: ${registration.scope}`, 'ServiceWorker');
      })
      .catch((error) => {
        logger.error(
          'Service Worker registration failed',
          error instanceof Error ? error : new Error(String(error)),
          'ServiceWorker'
        );
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
