/**
 * WebSocket Client for Real-Time Data Feeds
 * Handles connection, reconnection, and message routing
 */

import { logger } from '../monitoring/logger';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'price_update' | 'error' | 'alert';
  channel?: string;
  data?: unknown;
  tokens?: string[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type ConnectionStatusCallback = (status: ConnectionStatus) => void;
export type PriceUpdateCallback = (update: {
  token: string;
  price: number;
  timestamp: number;
}) => void;
export type AlertCallback = (alert: {
  alertId: string;
  alertName: string;
  type: string;
  token?: string;
  price?: number;
  condition: unknown;
}) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private status: ConnectionStatus = 'disconnected';
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private priceCallbacks: Map<string, Set<PriceUpdateCallback>> = new Map();
  private alertCallbacks: Set<AlertCallback> = new Set();
  private subscribedTokens: Set<string> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(url?: string) {
    // Use environment variable or default to localhost
    // Handle both browser and Node.js environments
    if (typeof window !== 'undefined' && window.location) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = url || `${wsProtocol}//${window.location.hostname}:3001/ws`;
      this.url = wsHost;
    } else {
      // Node.js/test environment
      this.url = url || 'ws://localhost:3001/ws';
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        logger.info('WebSocket connected', 'WebSocketClient');

        // Resubscribe to all tokens
        if (this.subscribedTokens.size > 0) {
          this.subscribe(Array.from(this.subscribedTokens));
        }

        // Start ping interval
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          logger.error(
            'Error parsing WebSocket message',
            error instanceof Error ? error : new Error(String(error)),
            'WebSocketClient'
          );
        }
      };

      this.ws.onerror = (error) => {
        logger.error(
          'WebSocket error',
          error instanceof Error ? error : new Error(String(error)),
          'WebSocketClient'
        );
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.updateStatus('disconnected');
        this.stopPingInterval();

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          logger.warn('Max reconnection attempts reached', 'WebSocketClient');
        }
      };
    } catch (error) {
      this.isConnecting = false;
      this.updateStatus('disconnected');
      logger.error(
        'Failed to create WebSocket connection',
        error instanceof Error ? error : new Error(String(error)),
        'WebSocketClient'
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopPingInterval();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  /**
   * Subscribe to price updates for tokens
   */
  subscribe(tokens: string[]): void {
    tokens.forEach((token) => this.subscribedTokens.add(token));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        tokens,
      });
    }
  }

  /**
   * Unsubscribe from price updates for tokens
   */
  unsubscribe(tokens: string[]): void {
    tokens.forEach((token) => this.subscribedTokens.delete(token));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        tokens,
      });
    }
  }

  /**
   * Register callback for price updates
   */
  onPriceUpdate(token: string, callback: PriceUpdateCallback): () => void {
    if (!this.priceCallbacks.has(token)) {
      this.priceCallbacks.set(token, new Set());
    }
    this.priceCallbacks.get(token)?.add(callback);

    // Subscribe if not already subscribed
    if (!this.subscribedTokens.has(token)) {
      this.subscribe([token]);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.priceCallbacks.get(token);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.priceCallbacks.delete(token);
          this.unsubscribe([token]);
        }
      }
    };
  }

  /**
   * Register callback for connection status changes
   */
  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for alert notifications
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'price_update':
        if (message.data && typeof message.data === 'object') {
          const update = message.data as { token: string; price: number; timestamp: number };
          const callbacks = this.priceCallbacks.get(update.token);
          if (callbacks) {
            callbacks.forEach((callback) => {
              try {
                callback(update);
              } catch (error) {
                logger.error(
                  'Error in price update callback',
                  error instanceof Error ? error : new Error(String(error)),
                  'WebSocketClient'
                );
              }
            });
          }
        }
        break;

      case 'pong':
        // Server responded to ping
        break;

      case 'error':
        // Check if it's actually an alert notification
        if (message.data && typeof message.data === 'object' && 'alertId' in message.data) {
          const alertData = message.data as {
            alertId: string;
            alertName: string;
            type: string;
            token?: string;
            price?: number;
            condition: unknown;
          };
          this.alertCallbacks.forEach((callback) => {
            try {
              callback(alertData);
            } catch (error) {
              logger.error(
                'Error in alert callback',
                error instanceof Error ? error : new Error(String(error)),
                'WebSocketClient'
              );
            }
          });
        } else {
          logger.error(
            'WebSocket error from server',
            new Error(JSON.stringify(message.data)),
            'WebSocketClient'
          );
        }
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`, 'WebSocketClient');
    }
  }

  /**
   * Send message to server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(
          'Error sending WebSocket message',
          error instanceof Error ? error : new Error(String(error)),
          'WebSocketClient'
        );
      }
    }
  }

  /**
   * Update connection status and notify callbacks
   */
  private updateStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusCallbacks.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          logger.error(
            'Error in status callback',
            error instanceof Error ? error : new Error(String(error)),
            'WebSocketClient'
          );
        }
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    this.updateStatus('reconnecting');

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);

    logger.info(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
      'WebSocketClient'
    );
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();
