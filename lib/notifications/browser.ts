/**
 * Browser Notification Service
 * Handles browser notification permissions and display
 */

import { logger } from '../monitoring/logger';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

class BrowserNotificationService {
  private permission: NotificationPermission = 'default';

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('Browser does not support notifications', 'Notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    if (this.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      logger.error(
        'Error requesting notification permission',
        error instanceof Error ? error : new Error(String(error)),
        'Notifications'
      );
      return 'denied';
    }
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check if permission is granted
   */
  hasPermission(): boolean {
    if (!this.isSupported()) return false;
    return Notification.permission === 'granted';
  }

  /**
   * Show a notification
   */
  async show(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      logger.warn('Browser does not support notifications', 'Notifications');
      return;
    }

    if (!this.hasPermission()) {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        logger.warn('Notification permission not granted', 'Notifications');
        return;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      logger.error(
        'Error showing notification',
        error instanceof Error ? error : new Error(String(error)),
        'Notifications'
      );
    }
  }

  /**
   * Show price alert notification
   */
  async showPriceAlert(token: string, price: number, condition: string): Promise<void> {
    await this.show({
      title: `Price Alert: ${token}`,
      body: `${token} is now $${price.toFixed(2)} (${condition})`,
      tag: `price-${token}`,
      requireInteraction: false,
    });
  }

  /**
   * Show position alert notification
   */
  async showPositionAlert(message: string): Promise<void> {
    await this.show({
      title: 'Position Alert',
      body: message,
      tag: 'position-alert',
      requireInteraction: false,
    });
  }

  /**
   * Show strategy alert notification
   */
  async showStrategyAlert(strategyName: string, message: string): Promise<void> {
    await this.show({
      title: `Strategy Alert: ${strategyName}`,
      body: message,
      tag: `strategy-${strategyName}`,
      requireInteraction: false,
    });
  }
}

export const browserNotificationService = new BrowserNotificationService();
