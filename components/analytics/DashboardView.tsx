/**
 * Dashboard View Component
 * Displays a dashboard with widgets
 */

import type React from 'react';
import { useMemo } from 'react';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { ChartWidget } from './widgets/ChartWidget';
import { MetricWidget } from './widgets/MetricWidget';

export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table';
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

interface DashboardViewProps {
  widgets: Widget[];
  onEdit?: () => void;
  className?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  widgets,
  onEdit,
  className = '',
}) => {
  const sortedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    });
  }, [widgets]);

  if (widgets.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 p-12 text-center ${className}`}>
        <p className="text-gray-500 font-mono mb-4">No widgets in this dashboard</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-orange text-white font-mono text-sm hover:bg-orange/90 transition-colors"
          >
            Add Widgets
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold font-mono uppercase">Analytics Dashboard</h2>
          <ConnectionStatus showLabel={false} />
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-orange text-white font-mono text-sm hover:bg-orange/90 transition-colors"
          >
            Edit Dashboard
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedWidgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-white border border-gray-200 p-4 rounded"
            style={{
              gridColumn: `span ${widget.position.w || 1}`,
              gridRow: `span ${widget.position.h || 1}`,
            }}
          >
            {widget.type === 'metric' && (
              <MetricWidget config={widget.config as MetricWidgetConfig} />
            )}
            {widget.type === 'chart' && <ChartWidget config={widget.config as ChartWidgetConfig} />}
            {widget.type === 'table' && <TableWidget config={widget.config as any} />}
          </div>
        ))}
      </div>
    </div>
  );
};

const TableWidget: React.FC<{ config: { title: string; columns: string[] } }> = ({ config }) => {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase mb-2">{config.title}</div>
      <div className="text-sm text-gray-400">Table widget (Coming Soon)</div>
    </div>
  );
};
