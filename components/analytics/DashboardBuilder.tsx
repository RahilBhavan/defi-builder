/**
 * Dashboard Builder Component
 * Simple dashboard builder (drag-and-drop coming in future)
 */

import { motion } from 'framer-motion';
import { BarChart3, Plus, Save, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';
import { DashboardView, type Widget } from './DashboardView';

interface DashboardBuilderProps {
  dashboardId?: string;
  onSave?: () => void;
  onClose?: () => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

const WIDGET_TEMPLATES: Widget[] = [
  {
    id: 'total-return',
    type: 'metric',
    config: { title: 'Total Return', value: 0, format: 'currency' },
    position: { x: 0, y: 0, w: 1, h: 1 },
  },
  {
    id: 'sharpe-ratio',
    type: 'metric',
    config: { title: 'Sharpe Ratio', value: 0, format: 'number' },
    position: { x: 1, y: 0, w: 1, h: 1 },
  },
  {
    id: 'max-drawdown',
    type: 'metric',
    config: { title: 'Max Drawdown', value: 0, format: 'percent' },
    position: { x: 2, y: 0, w: 1, h: 1 },
  },
  {
    id: 'win-rate',
    type: 'metric',
    config: { title: 'Win Rate', value: 0, format: 'percent' },
    position: { x: 0, y: 1, w: 1, h: 1 },
  },
];

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  onSave,
  onClose,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [name, setName] = useState('My Dashboard');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const createMutation = typedTrpc.dashboards.create.useMutation();
  const updateMutation = typedTrpc.dashboards.update.useMutation();

  const handleAddWidget = (template: Widget) => {
    const newWidget: Widget = {
      ...template,
      id: `${template.id}-${Date.now()}`,
      position: {
        x: widgets.length % 3,
        y: Math.floor(widgets.length / 3),
        w: 1,
        h: 1,
      },
    };
    setWidgets([...widgets, newWidget]);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Dashboard name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (dashboardId) {
        await updateMutation.mutateAsync({
          id: dashboardId,
          name: name.trim(),
          widgets,
          layout: {},
        });
        showSuccess('Dashboard updated successfully');
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          widgets,
          layout: {},
          isDefault: false,
        });
        showSuccess('Dashboard created successfully');
      }
      onSave?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-ink" />
          <h2 className="text-lg font-bold font-mono uppercase">Dashboard Builder</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink transition-colors"
            aria-label="Close"
          >
            <X size={24} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dashboard Name */}
      <div className="mb-4">
        <label
          htmlFor="dashboard-name"
          className="block text-xs font-bold uppercase text-gray-500 mb-2"
        >
          Dashboard Name
        </label>
        <input
          id="dashboard-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
          placeholder="My Dashboard"
        />
      </div>

      {/* Widget Templates */}
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">Add Widget</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {WIDGET_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleAddWidget(template)}
              className="p-3 border border-gray-200 hover:border-orange transition-colors text-left"
            >
              <div className="text-xs font-mono font-bold mb-1">{template.config.title}</div>
              <div className="text-xs text-gray-500">{template.type}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto mb-4">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">Preview</h3>
        {widgets.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-gray-200 rounded">
            <p className="font-mono">No widgets yet. Add widgets above.</p>
          </div>
        ) : (
          <DashboardView widgets={widgets} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end border-t border-gray-200 pt-4">
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          <Save size={14} className="mr-2" />
          {isSaving ? 'Saving...' : 'Save Dashboard'}
        </Button>
      </div>
    </div>
  );
};
