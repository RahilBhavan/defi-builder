/**
 * Analytics Modal
 * Main entry point for analytics dashboard
 */

import { motion } from 'framer-motion';
import { BarChart3, Edit, Plus, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';
import { DashboardBuilder } from './DashboardBuilder';
import { DashboardView } from './DashboardView';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);

  const { data: dashboards, isLoading } = typedTrpc.dashboards.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const defaultDashboard = dashboards?.find((d: any) => d.isDefault) || dashboards?.[0];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-6xl h-[90vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-ink" />
            <h2 className="text-lg font-bold font-mono uppercase">Analytics Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink transition-colors"
            aria-label="Close"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showBuilder ? (
            <DashboardBuilder
              dashboardId={editingDashboardId || undefined}
              onSave={() => {
                setShowBuilder(false);
                setEditingDashboardId(null);
              }}
              onClose={() => {
                setShowBuilder(false);
                setEditingDashboardId(null);
              }}
            />
          ) : isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-mono">Loading dashboard...</p>
            </div>
          ) : defaultDashboard ? (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    setEditingDashboardId(defaultDashboard.id);
                    setShowBuilder(true);
                  }}
                >
                  <Edit size={14} className="mr-2" />
                  Edit Dashboard
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs ml-2"
                  onClick={() => setShowBuilder(true)}
                >
                  <Plus size={14} className="mr-2" />
                  New Dashboard
                </Button>
              </div>
              <DashboardView
                widgets={defaultDashboard.widgets || []}
                onEdit={() => {
                  setEditingDashboardId(defaultDashboard.id);
                  setShowBuilder(true);
                }}
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="font-mono mb-4">No dashboard yet</p>
              <Button variant="secondary" onClick={() => setShowBuilder(true)}>
                <Plus size={14} className="mr-2" />
                Create Dashboard
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
