/**
 * Alert Engine Tests
 * Tests for alert condition evaluation and triggering
 */

import { describe, expect, it } from 'vitest';
import {
  type Alert,
  type AlertCondition,
  checkPositionAlerts,
  checkPriceAlerts,
  checkStrategyAlerts,
  evaluateCondition,
} from '../alertEngine';

describe('Alert Engine', () => {
  describe('evaluateCondition', () => {
    it('should evaluate greater than condition', () => {
      const condition: AlertCondition = { operator: 'gt', value: 100, field: 'value' };
      expect(evaluateCondition(condition, 150)).toBe(true);
      expect(evaluateCondition(condition, 50)).toBe(false);
      expect(evaluateCondition(condition, 100)).toBe(false);
    });

    it('should evaluate greater than or equal condition', () => {
      const condition: AlertCondition = { operator: 'gte', value: 100, field: 'value' };
      expect(evaluateCondition(condition, 150)).toBe(true);
      expect(evaluateCondition(condition, 100)).toBe(true);
      expect(evaluateCondition(condition, 50)).toBe(false);
    });

    it('should evaluate less than condition', () => {
      const condition: AlertCondition = { operator: 'lt', value: 100, field: 'value' };
      expect(evaluateCondition(condition, 50)).toBe(true);
      expect(evaluateCondition(condition, 150)).toBe(false);
      expect(evaluateCondition(condition, 100)).toBe(false);
    });

    it('should evaluate less than or equal condition', () => {
      const condition: AlertCondition = { operator: 'lte', value: 100, field: 'value' };
      expect(evaluateCondition(condition, 50)).toBe(true);
      expect(evaluateCondition(condition, 100)).toBe(true);
      expect(evaluateCondition(condition, 150)).toBe(false);
    });

    it('should evaluate equals condition', () => {
      const condition: AlertCondition = { operator: 'eq', value: 100, field: 'value' };
      expect(evaluateCondition(condition, 100)).toBe(true);
      expect(evaluateCondition(condition, '100')).toBe(true);
      expect(evaluateCondition(condition, 50)).toBe(false);
    });

    it('should evaluate not equals condition', () => {
      const condition: AlertCondition = { operator: 'neq', value: 100, field: 'value' };
      expect(evaluateCondition(condition, 50)).toBe(true);
      expect(evaluateCondition(condition, 100)).toBe(false);
    });

    it('should handle string values', () => {
      const condition: AlertCondition = { operator: 'eq', value: 'active', field: 'status' };
      expect(evaluateCondition(condition, 'active')).toBe(true);
      expect(evaluateCondition(condition, 'inactive')).toBe(false);
    });
  });

  describe('checkPriceAlerts', () => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        userId: 'user1',
        name: 'ETH Above 2500',
        type: 'price',
        condition: { operator: 'gt', value: 2500, field: 'price', token: 'ETH' },
        isActive: true,
      },
      {
        id: '2',
        userId: 'user1',
        name: 'ETH Below 2000',
        type: 'price',
        condition: { operator: 'lt', value: 2000, field: 'price', token: 'ETH' },
        isActive: true,
      },
      {
        id: '3',
        userId: 'user1',
        name: 'BTC Above 50000',
        type: 'price',
        condition: { operator: 'gt', value: 50000, field: 'price', token: 'BTC' },
        isActive: true,
      },
      {
        id: '4',
        userId: 'user1',
        name: 'Inactive Alert',
        type: 'price',
        condition: { operator: 'gt', value: 1000, field: 'price', token: 'ETH' },
        isActive: false,
      },
    ];

    it('should trigger alert when price exceeds threshold', async () => {
      const priceUpdate = { token: 'ETH', price: 2600, timestamp: Date.now() };
      const triggered = await checkPriceAlerts(mockAlerts, priceUpdate);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('1');
    });

    it('should trigger alert when price falls below threshold', async () => {
      const priceUpdate = { token: 'ETH', price: 1900, timestamp: Date.now() };
      const triggered = await checkPriceAlerts(mockAlerts, priceUpdate);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('2');
    });

    it('should not trigger alert for different token', async () => {
      const priceUpdate = { token: 'ETH', price: 60000, timestamp: Date.now() };
      const triggered = await checkPriceAlerts(mockAlerts, priceUpdate);

      // Should not trigger BTC alert
      expect(triggered.every((a) => a.id !== '3')).toBe(true);
    });

    it('should not trigger inactive alerts', async () => {
      const priceUpdate = { token: 'ETH', price: 2000, timestamp: Date.now() };
      const triggered = await checkPriceAlerts(mockAlerts, priceUpdate);

      expect(triggered.every((a) => a.id !== '4')).toBe(true);
    });

    it('should handle empty alerts array', async () => {
      const priceUpdate = { token: 'ETH', price: 2500, timestamp: Date.now() };
      const triggered = await checkPriceAlerts([], priceUpdate);

      expect(triggered).toHaveLength(0);
    });
  });

  describe('checkPositionAlerts', () => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        userId: 'user1',
        name: 'P&L Above 1000',
        type: 'position',
        condition: { operator: 'gt', value: 1000, field: 'pnl' },
        isActive: true,
      },
      {
        id: '2',
        userId: 'user1',
        name: 'P&L Below -500',
        type: 'position',
        condition: { operator: 'lt', value: -500, field: 'pnl' },
        isActive: true,
      },
      {
        id: '3',
        userId: 'user1',
        name: 'Value Above 10000',
        type: 'position',
        condition: { operator: 'gt', value: 10000, field: 'value' },
        isActive: true,
      },
    ];

    it('should trigger alert when P&L exceeds threshold', async () => {
      const positionData = { pnl: 1500, value: 5000, amount: 1.0 };
      const triggered = await checkPositionAlerts(mockAlerts, positionData);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('1');
    });

    it('should trigger alert when P&L falls below threshold', async () => {
      const positionData = { pnl: -600, value: 5000, amount: 1.0 };
      const triggered = await checkPositionAlerts(mockAlerts, positionData);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('2');
    });

    it('should trigger alert when value exceeds threshold', async () => {
      const positionData = { pnl: 500, value: 15000, amount: 1.0 };
      const triggered = await checkPositionAlerts(mockAlerts, positionData);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('3');
    });

    it('should not trigger when condition not met', async () => {
      const positionData = { pnl: 500, value: 5000, amount: 1.0 };
      const triggered = await checkPositionAlerts(mockAlerts, positionData);

      expect(triggered).toHaveLength(0);
    });

    it('should handle missing field values', async () => {
      const positionData = { pnl: 500 };
      const triggered = await checkPositionAlerts(mockAlerts, positionData);

      // Should not trigger value-based alert
      expect(triggered.every((a) => a.id !== '3')).toBe(true);
    });
  });

  describe('checkStrategyAlerts', () => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        userId: 'user1',
        name: 'Performance Above 20%',
        type: 'strategy',
        condition: { operator: 'gt', value: 20, field: 'performance' },
        isActive: true,
      },
      {
        id: '2',
        userId: 'user1',
        name: 'Return Above 15%',
        type: 'strategy',
        condition: { operator: 'gt', value: 15, field: 'return' },
        isActive: true,
      },
    ];

    it('should trigger alert when performance exceeds threshold', async () => {
      const strategyData = { performance: 25, return: 10 }; // Only performance > 20, return < 15
      const triggered = await checkStrategyAlerts(mockAlerts, strategyData);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('1');
    });

    it('should trigger alert when return exceeds threshold', async () => {
      const strategyData = { performance: 10, return: 18 };
      const triggered = await checkStrategyAlerts(mockAlerts, strategyData);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('2');
    });

    it('should trigger multiple alerts when multiple conditions met', async () => {
      const strategyData = { performance: 25, return: 18 };
      const triggered = await checkStrategyAlerts(mockAlerts, strategyData);

      expect(triggered).toHaveLength(2);
    });

    it('should not trigger when conditions not met', async () => {
      const strategyData = { performance: 10, return: 10 };
      const triggered = await checkStrategyAlerts(mockAlerts, strategyData);

      expect(triggered).toHaveLength(0);
    });
  });
});
