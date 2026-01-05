/**
 * Browser Notification Service Tests
 * Tests for browser notification permissions and display
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browserNotificationService } from '../browser';

// Mock Notification API
const mockNotification = vi.fn();
const mockRequestPermission = vi.fn();

class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = mockRequestPermission;

  constructor(
    public title: string,
    public options?: NotificationOptions
  ) {
    mockNotification(title, options);
  }

  close = vi.fn();
  onclick = null;
}

// Replace global Notification
global.Notification = MockNotification as any;

describe('BrowserNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockNotification.permission = 'default';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Permission Management', () => {
    it('should check if notifications are supported', () => {
      expect(browserNotificationService.isSupported()).toBe(true);
    });

    it('should check permission status', () => {
      MockNotification.permission = 'granted';
      expect(browserNotificationService.hasPermission()).toBe(true);

      MockNotification.permission = 'denied';
      expect(browserNotificationService.hasPermission()).toBe(false);
    });

    it('should request permission', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const permission = await browserNotificationService.requestPermission();

      expect(permission).toBe('granted');
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should return cached permission if already granted', async () => {
      MockNotification.permission = 'granted';

      const permission = await browserNotificationService.requestPermission();

      expect(permission).toBe('granted');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      mockRequestPermission.mockResolvedValue('denied');

      const permission = await browserNotificationService.requestPermission();

      expect(permission).toBe('denied');
    });
  });

  describe('Showing Notifications', () => {
    beforeEach(() => {
      MockNotification.permission = 'granted';
    });

    it('should show notification with basic options', async () => {
      await browserNotificationService.show({
        title: 'Test Notification',
        body: 'Test message',
      });

      expect(mockNotification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          body: 'Test message',
        })
      );
    });

    it('should show notification with custom options', async () => {
      await browserNotificationService.show({
        title: 'Test',
        body: 'Message',
        icon: '/custom-icon.png',
        badge: '/badge.png',
        tag: 'test-tag',
        requireInteraction: true,
      });

      expect(mockNotification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          body: 'Message',
          icon: '/custom-icon.png',
          badge: '/badge.png',
          tag: 'test-tag',
          requireInteraction: true,
        })
      );
    });

    it('should not show notification if permission denied', async () => {
      MockNotification.permission = 'denied';
      mockRequestPermission.mockResolvedValue('denied');

      await browserNotificationService.show({
        title: 'Test',
        body: 'Message',
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should auto-close notification after 5 seconds', async () => {
      vi.useFakeTimers();
      const notification = new MockNotification('Test', {});
      mockNotification.mockReturnValue(notification);

      await browserNotificationService.show({
        title: 'Test',
        body: 'Message',
      });

      vi.advanceTimersByTime(5000);

      expect(notification.close).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle notification click', async () => {
      const notification = new MockNotification('Test', {});
      mockNotification.mockReturnValue(notification);
      const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {});

      await browserNotificationService.show({
        title: 'Test',
        body: 'Message',
      });

      if (notification.onclick) {
        notification.onclick(new Event('click'));
      }

      expect(focusSpy).toHaveBeenCalled();
      expect(notification.close).toHaveBeenCalled();
      focusSpy.mockRestore();
    });
  });

  describe('Specialized Notifications', () => {
    beforeEach(() => {
      MockNotification.permission = 'granted';
    });

    it('should show price alert notification', async () => {
      await browserNotificationService.showPriceAlert('ETH', 2500, 'ETH > $2500');

      expect(mockNotification).toHaveBeenCalledWith(
        'ETH',
        expect.objectContaining({
          title: 'Price Alert: ETH',
          body: 'ETH is now $2500.00 (ETH > $2500)',
          tag: 'price-ETH',
        })
      );
    });

    it('should show position alert notification', async () => {
      await browserNotificationService.showPositionAlert('Position P&L exceeded threshold');

      expect(mockNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Position Alert',
          body: 'Position P&L exceeded threshold',
          tag: 'position-alert',
        })
      );
    });

    it('should show strategy alert notification', async () => {
      await browserNotificationService.showStrategyAlert(
        'My Strategy',
        'Strategy performance exceeded target'
      );

      expect(mockNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Strategy Alert: My Strategy',
          body: 'Strategy performance exceeded target',
          tag: 'strategy-My Strategy',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle notification errors gracefully', async () => {
      MockNotification.permission = 'granted';
      mockNotification.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await browserNotificationService.show({
        title: 'Test',
        body: 'Message',
      });

      // Should not throw
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
