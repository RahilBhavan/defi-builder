/**
 * Metric Widget Component
 * Displays a single metric value
 */

import type React from 'react';

export interface MetricWidgetConfig {
  title: string;
  value: number | string;
  format?: 'currency' | 'percent' | 'number';
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}

interface MetricWidgetProps {
  config: MetricWidgetConfig;
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({ config }) => {
  const formatValue = () => {
    if (config.format === 'currency') {
      return `$${Number(config.value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    if (config.format === 'percent') {
      return `${Number(config.value).toFixed(2)}%`;
    }
    if (typeof config.value === 'number') {
      return config.value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    return config.value;
  };

  const getTrendColor = () => {
    if (config.trend === 'up') return 'text-green-600';
    if (config.trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-xs text-gray-500 uppercase mb-2 font-mono">{config.title}</div>
      <div className={`text-3xl font-bold font-mono mb-1 ${getTrendColor()}`}>{formatValue()}</div>
      {config.change !== undefined && (
        <div className={`text-sm font-mono ${getTrendColor()}`}>
          {config.change >= 0 ? '+' : ''}
          {config.change.toFixed(2)}%
        </div>
      )}
    </div>
  );
};
