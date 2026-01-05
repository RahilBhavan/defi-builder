/**
 * WebSocket Server for Real-Time Data Feeds
 * Handles price updates, portfolio monitoring, and live position tracking
 */

import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger';
import * as priceFeedService from './priceFeed';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'price_update' | 'error';
  channel?: string;
  data?: unknown;
  tokens?: string[];
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private subscriptions: Map<WebSocket, Set<string>> = new Map(); // client -> tokens
  private tokenSubscribers: Map<string, Set<WebSocket>> = new Map(); // token -> clients

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized on /ws', 'WebSocket');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    logger.info(`WebSocket client connected: ${clientId}`, 'WebSocket');

    this.clients.add(ws);
    this.subscriptions.set(ws, new Set());

    // Send welcome message
    this.send(ws, {
      type: 'pong',
      data: { message: 'Connected to DeFi Builder WebSocket', timestamp: Date.now() },
    });

    // Handle messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error(
          'Error parsing WebSocket message',
          error instanceof Error ? error : new Error(String(error)),
          'WebSocket'
        );
        this.send(ws, {
          type: 'error',
          data: { message: 'Invalid message format' },
        });
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(
        'WebSocket error',
        error instanceof Error ? error : new Error(String(error)),
        'WebSocket'
      );
      this.handleDisconnection(ws);
    });

    // Ping/pong for keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, { type: 'ping' });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.tokens && message.tokens.length > 0) {
          this.subscribe(ws, message.tokens);
        }
        break;

      case 'unsubscribe':
        if (message.tokens && message.tokens.length > 0) {
          this.unsubscribe(ws, message.tokens);
        }
        break;

      case 'pong':
        // Client responded to ping
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`, 'WebSocket');
    }
  }

  /**
   * Subscribe client to token price updates
   */
  private subscribe(ws: WebSocket, tokens: string[]): void {
    const clientSubscriptions = this.subscriptions.get(ws) || new Set();

    tokens.forEach((token) => {
      clientSubscriptions.add(token);

      // Add client to token's subscriber list
      if (!this.tokenSubscribers.has(token)) {
        this.tokenSubscribers.set(token, new Set());
      }
      this.tokenSubscribers.get(token)?.add(ws);
    });

    this.subscriptions.set(ws, clientSubscriptions);

    // Subscribe to price feed service
    priceFeedService.subscribe(tokens, (update) => {
      this.broadcastPriceUpdate(update);
    });

    logger.info(`Client subscribed to tokens: ${tokens.join(', ')}`, 'WebSocket');

    this.send(ws, {
      type: 'pong',
      data: { message: `Subscribed to ${tokens.join(', ')}`, tokens },
    });
  }

  /**
   * Unsubscribe client from token price updates
   */
  private unsubscribe(ws: WebSocket, tokens: string[]): void {
    const clientSubscriptions = this.subscriptions.get(ws);

    if (!clientSubscriptions) return;

    tokens.forEach((token) => {
      clientSubscriptions.delete(token);

      // Remove client from token's subscriber list
      const subscribers = this.tokenSubscribers.get(token);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.tokenSubscribers.delete(token);
          // Unsubscribe from price feed service
          priceFeedService.unsubscribe(token);
        }
      }
    });

    logger.info(`Client unsubscribed from tokens: ${tokens.join(', ')}`, 'WebSocket');
  }

  /**
   * Broadcast price update to all subscribed clients
   */
  private async broadcastPriceUpdate(update: {
    token: string;
    price: number;
    timestamp: number;
  }): Promise<void> {
    const subscribers = this.tokenSubscribers.get(update.token);
    if (!subscribers || subscribers.size === 0) return;

    const message: WebSocketMessage = {
      type: 'price_update',
      channel: `price:${update.token}`,
      data: update,
    };

    const messageStr = JSON.stringify(message);

    // Send to all subscribers
    subscribers.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error(
            'Error sending price update',
            error instanceof Error ? error : new Error(String(error)),
            'WebSocket'
          );
        }
      }
    });

    // Check alerts for this price update
    try {
      const activeAlerts = await prisma.alert.findMany({
        where: {
          isActive: true,
          type: 'price',
        },
      });

      const alerts = activeAlerts.map((alert) => ({
        id: alert.id,
        userId: alert.userId,
        name: alert.name,
        type: alert.type as 'price' | 'position' | 'strategy' | 'time',
        condition: JSON.parse(alert.condition),
        isActive: alert.isActive,
      }));

      const triggered = await checkPriceAlerts(alerts, update);

      // Update triggered alerts and notify users
      for (const alert of triggered) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            triggerCount: { increment: 1 },
            lastTriggeredAt: new Date(),
            triggeredAt: new Date(),
          },
        });

        // Send alert notification to user's WebSocket clients
        const userClients = Array.from(this.clients).filter((client) => {
          // In a real implementation, you'd track which user each client belongs to
          // For now, we'll broadcast to all clients (can be improved with user tracking)
          return client.readyState === WebSocket.OPEN;
        });

        const alertMessage: WebSocketMessage = {
          type: 'error', // Using error type for alert notifications
          channel: `alert:${alert.id}`,
          data: {
            alertId: alert.id,
            alertName: alert.name,
            type: 'price',
            token: update.token,
            price: update.price,
            condition: alert.condition,
          },
        };

        userClients.forEach((client) => {
          try {
            client.send(JSON.stringify(alertMessage));
          } catch (error) {
            logger.error(
              'Error sending alert notification',
              error instanceof Error ? error : new Error(String(error)),
              'WebSocket'
            );
          }
        });
      }
    } catch (error) {
      logger.error(
        'Error checking alerts',
        error instanceof Error ? error : new Error(String(error)),
        'WebSocket'
      );
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    const subscriptions = this.subscriptions.get(ws);
    if (subscriptions) {
      // Unsubscribe from all tokens
      this.unsubscribe(ws, Array.from(subscriptions));
    }

    this.clients.delete(ws);
    this.subscriptions.delete(ws);

    logger.info('WebSocket client disconnected', 'WebSocket');
  }

  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(
          'Error sending WebSocket message',
          error instanceof Error ? error : new Error(String(error)),
          'WebSocket'
        );
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error(
            'Error broadcasting message',
            error instanceof Error ? error : new Error(String(error)),
            'WebSocket'
          );
        }
      }
    });
  }

  /**
   * Get connection stats
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    tokenSubscriptions: Record<string, number>;
  } {
    const tokenSubscriptions: Record<string, number> = {};
    this.tokenSubscribers.forEach((subscribers, token) => {
      tokenSubscriptions[token] = subscribers.size;
    });

    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.size,
        0
      ),
      tokenSubscriptions,
    };
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss?.close();
    logger.info('WebSocket server closed', 'WebSocket');
  }
}

export const webSocketService = new WebSocketService();
