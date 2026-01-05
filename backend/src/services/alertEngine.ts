/**
 * Alert Engine
 * Evaluates alert conditions and triggers notifications
 */

import { logger } from '../utils/logger';
import * as priceFeedService from './priceFeed';
import type { PriceUpdate } from './priceFeed';

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: number | string;
  field: string;
  token?: string;
}

export interface Alert {
  id: string;
  userId: string;
  name: string;
  type: 'price' | 'position' | 'strategy' | 'time';
  condition: AlertCondition;
  isActive: boolean;
}

/**
 * Evaluate alert condition
 */
export function evaluateCondition(
  condition: AlertCondition,
  currentValue: number | string
): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case 'gt':
      return Number(currentValue) > Number(value);
    case 'gte':
      return Number(currentValue) >= Number(value);
    case 'lt':
      return Number(currentValue) < Number(value);
    case 'lte':
      return Number(currentValue) <= Number(value);
    case 'eq':
      return String(currentValue) === String(value);
    case 'neq':
      return String(currentValue) !== String(value);
    default:
      return false;
  }
}

/**
 * Check price alerts
 */
export async function checkPriceAlerts(
  alerts: Alert[],
  priceUpdate: PriceUpdate
): Promise<Alert[]> {
  const triggered: Alert[] = [];

  for (const alert of alerts) {
    if (!alert.isActive || alert.type !== 'price') continue;

    const condition = alert.condition;
    if (condition.token !== priceUpdate.token) continue;

    if (condition.field === 'price' || condition.field === '') {
      const shouldTrigger = evaluateCondition(condition, priceUpdate.price);
      if (shouldTrigger) {
        triggered.push(alert);
        logger.info(
          `Price alert triggered: ${alert.name} (${condition.token} ${condition.operator} ${condition.value})`,
          'AlertEngine'
        );
      }
    }
  }

  return triggered;
}

/**
 * Check position alerts
 */
export async function checkPositionAlerts(
  alerts: Alert[],
  positionData: {
    pnl?: number;
    value?: number;
    amount?: number;
    [key: string]: number | undefined;
  }
): Promise<Alert[]> {
  const triggered: Alert[] = [];

  for (const alert of alerts) {
    if (!alert.isActive || alert.type !== 'position') continue;

    const condition = alert.condition;
    const fieldValue = positionData[condition.field];

    if (fieldValue !== undefined) {
      const shouldTrigger = evaluateCondition(condition, fieldValue);
      if (shouldTrigger) {
        triggered.push(alert);
        logger.info(
          `Position alert triggered: ${alert.name} (${condition.field} ${condition.operator} ${condition.value})`,
          'AlertEngine'
        );
      }
    }
  }

  return triggered;
}

/**
 * Check strategy alerts
 */
export async function checkStrategyAlerts(
  alerts: Alert[],
  strategyData: {
    performance?: number;
    return?: number;
    [key: string]: number | undefined;
  }
): Promise<Alert[]> {
  const triggered: Alert[] = [];

  for (const alert of alerts) {
    if (!alert.isActive || alert.type !== 'strategy') continue;

    const condition = alert.condition;
    const fieldValue = strategyData[condition.field];

    if (fieldValue !== undefined) {
      const shouldTrigger = evaluateCondition(condition, fieldValue);
      if (shouldTrigger) {
        triggered.push(alert);
        logger.info(
          `Strategy alert triggered: ${alert.name} (${condition.field} ${condition.operator} ${condition.value})`,
          'AlertEngine'
        );
      }
    }
  }

  return triggered;
}
