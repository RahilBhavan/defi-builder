/**
 * Create Alert Modal
 * Form for creating new alerts
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import { Button } from '../ui/Button';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ALERT_TYPES = [
  { value: 'price', label: 'Price Alert' },
  { value: 'position', label: 'Position Alert' },
  { value: 'strategy', label: 'Strategy Alert' },
  { value: 'time', label: 'Time-Based Alert' },
] as const;

const OPERATORS = [
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'gte', label: 'Greater Than or Equal (≥)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'lte', label: 'Less Than or Equal (≤)' },
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not Equals (≠)' },
] as const;

const TOKENS = ['ETH', 'USDC', 'DAI', 'WBTC', 'USDT', 'AAVE', 'LINK', 'UNI'] as const;

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createAlert } = useAlerts();
  const [name, setName] = useState('');
  const [type, setType] = useState<'price' | 'position' | 'strategy' | 'time'>('price');
  const [operator, setOperator] = useState<'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'>('gt');
  const [value, setValue] = useState('');
  const [field, setField] = useState('');
  const [token, setToken] = useState('ETH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Alert name is required');
      return;
    }

    if (type === 'price' && !token) {
      showError('Token is required for price alerts');
      return;
    }

    if (!value) {
      showError('Value is required');
      return;
    }

    if (type !== 'time' && !field) {
      showError('Field is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const condition: any = {
        operator,
        value: type === 'price' || type === 'position' ? Number.parseFloat(value) : value,
        field: type === 'time' ? 'time' : field,
      };

      if (type === 'price') {
        condition.token = token;
      }

      await createAlert({
        name: name.trim(),
        type,
        condition,
      });

      setName('');
      setValue('');
      setField('');
      setToken('ETH');
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error already handled by useAlerts hook
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
        className="bg-canvas w-full max-w-md border-2 border-ink shadow-2xl relative"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 className="text-lg font-bold font-mono uppercase">Create Alert</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink transition-colors"
            aria-label="Close"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="alert-name"
              className="block text-xs font-bold uppercase text-gray-500 mb-2"
            >
              Alert Name *
            </label>
            <input
              id="alert-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
              placeholder="ETH Price Alert"
            />
          </div>

          <div>
            <label
              htmlFor="alert-type"
              className="block text-xs font-bold uppercase text-gray-500 mb-2"
            >
              Alert Type *
            </label>
            <select
              id="alert-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
            >
              {ALERT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {type === 'price' && (
            <div>
              <label
                htmlFor="alert-token"
                className="block text-xs font-bold uppercase text-gray-500 mb-2"
              >
                Token *
              </label>
              <select
                id="alert-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
              >
                {TOKENS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type !== 'time' && (
            <div>
              <label
                htmlFor="alert-field"
                className="block text-xs font-bold uppercase text-gray-500 mb-2"
              >
                Field *
              </label>
              <input
                id="alert-field"
                type="text"
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
                placeholder={
                  type === 'price' ? 'price' : type === 'position' ? 'pnl' : 'performance'
                }
              />
            </div>
          )}

          <div>
            <label
              htmlFor="alert-operator"
              className="block text-xs font-bold uppercase text-gray-500 mb-2"
            >
              Operator *
            </label>
            <select
              id="alert-operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value as typeof operator)}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="alert-value"
              className="block text-xs font-bold uppercase text-gray-500 mb-2"
            >
              Value *
            </label>
            <input
              id="alert-value"
              type={type === 'time' ? 'text' : 'number'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
              placeholder={type === 'price' ? '2500' : type === 'position' ? '1000' : '10'}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
