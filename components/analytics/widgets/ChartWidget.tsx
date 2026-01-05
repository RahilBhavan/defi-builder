/**
 * Chart Widget Component
 * Displays a chart (placeholder for now)
 */

import type React from 'react';
import { LineChart } from 'recharts';

export interface ChartWidgetConfig {
  title: string;
  type: 'line' | 'bar' | 'area';
  data: Array<{ name: string; value: number }>;
  dataKey: string;
}

interface ChartWidgetProps {
  config: ChartWidgetConfig;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ config }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="text-xs text-gray-500 uppercase mb-2 font-mono">{config.title}</div>
      <div className="flex-1 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400 text-sm">
          <p className="font-mono">{config.type} Chart</p>
          <p className="text-xs mt-1">Coming Soon</p>
        </div>
      </div>
    </div>
  );
};
