/**
 * Alert Manager Component
 * Main UI for managing alerts
 */

import { motion } from 'framer-motion';
import { Bell, BellOff, Plus, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import { Button } from '../ui/Button';
import { CreateAlertModal } from './CreateAlertModal';

interface AlertManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertManager: React.FC<AlertManagerProps> = ({ isOpen, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { alerts, isLoading, deleteAlert, updateAlert } = useAlerts();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    await deleteAlert(id);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await updateAlert(id, { isActive: !currentStatus });
  };

  if (!isOpen) return null;

  return (
    <>
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
          className="bg-canvas w-full max-w-3xl h-[90vh] border-2 border-ink shadow-2xl relative flex flex-col"
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white flex-shrink-0">
            <h2 className="text-lg font-bold font-mono uppercase">Alert Manager</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={14} className="mr-2" />
                New Alert
              </Button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 text-ink transition-colors"
                aria-label="Close"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <p className="font-mono">Loading alerts...</p>
              </div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="font-mono mb-4">No alerts yet</p>
                <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
                  <Plus size={14} className="mr-2" />
                  Create Alert
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert: any) => {
                  const condition = alert.condition || {};
                  return (
                    <div
                      key={alert.id}
                      className={`border-2 p-4 rounded ${
                        alert.isActive ? 'border-orange bg-orange/5' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-ink">{alert.name}</h3>
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-mono uppercase rounded">
                              {alert.type}
                            </span>
                            {alert.isActive ? (
                              <Bell size={14} className="text-orange" />
                            ) : (
                              <BellOff size={14} className="text-gray-400" />
                            )}
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {alert.type === 'price' && condition.token && (
                              <span>
                                {condition.token} {condition.operator} ${condition.value}
                              </span>
                            )}
                            {alert.type === 'position' && (
                              <span>
                                Position {condition.field} {condition.operator} {condition.value}
                              </span>
                            )}
                            {alert.type === 'strategy' && (
                              <span>
                                Strategy {condition.field} {condition.operator} {condition.value}
                              </span>
                            )}
                            {alert.type === 'time' && <span>Scheduled alert</span>}
                          </div>
                          {alert.triggerCount > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Triggered {alert.triggerCount} time
                              {alert.triggerCount !== 1 ? 's' : ''}
                              {alert.lastTriggeredAt && (
                                <span>
                                  {' '}
                                  (last: {new Date(alert.lastTriggeredAt).toLocaleString()})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggle(alert.id, alert.isActive)}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title={alert.isActive ? 'Disable alert' : 'Enable alert'}
                          >
                            {alert.isActive ? (
                              <Bell size={16} className="text-orange" />
                            ) : (
                              <BellOff size={16} className="text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(alert.id)}
                            className="p-2 hover:bg-red-50 rounded transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <CreateAlertModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
          }}
        />
      )}
    </>
  );
};
