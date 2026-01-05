/**
 * Strategy Visibility Dialog
 * Allows users to make strategies public or private
 */

import { Globe, Lock, Tag, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';

interface StrategyVisibilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  currentVisibility: boolean;
  currentCategory?: string | null;
  currentTags: string[];
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'yield-farming', label: 'Yield Farming' },
  { value: 'arbitrage', label: 'Arbitrage' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'trading', label: 'Trading' },
  { value: 'defi', label: 'DeFi' },
  { value: 'other', label: 'Other' },
];

export const StrategyVisibilityDialog: React.FC<StrategyVisibilityDialogProps> = ({
  isOpen,
  onClose,
  strategyId,
  currentVisibility,
  currentCategory,
  currentTags,
  onSuccess,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [isPublic, setIsPublic] = useState(currentVisibility);
  const [category, setCategory] = useState(currentCategory || '');
  const [tags, setTags] = useState(currentTags.join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type assertion for tRPC nested router
  // biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
  const typedTrpc = trpc as any;

  const updateMutation = typedTrpc.marketplace.updateVisibility.useMutation();

  const handleSubmit = async () => {
    if (isPublic && !category) {
      showError('Please select a category when making strategy public');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await updateMutation.mutateAsync({
        strategyId,
        isPublic,
        category: isPublic ? category : undefined,
        tags: isPublic && tagArray.length > 0 ? tagArray : undefined,
      });

      showSuccess(
        isPublic
          ? 'Strategy is now public and visible in the marketplace!'
          : 'Strategy is now private'
      );
      onSuccess?.();
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update strategy visibility');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="bg-canvas border-2 border-ink shadow-2xl relative w-full max-w-md">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 className="text-lg font-bold font-mono uppercase">Strategy Visibility</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink transition-colors"
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Visibility Toggle */}
          <div>
            <label className="block text-sm font-mono font-bold mb-3">Visibility</label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  isPublic ? 'border-orange bg-orange/10' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Globe size={20} className={isPublic ? 'text-orange' : 'text-gray-400'} />
                <div className="flex-1 text-left">
                  <div className="font-mono font-bold">Public</div>
                  <div className="text-xs text-gray-600">
                    Visible in marketplace, can be discovered by others
                  </div>
                </div>
                {isPublic && (
                  <div className="w-4 h-4 rounded-full bg-orange border-2 border-orange" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  !isPublic ? 'border-orange bg-orange/10' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Lock size={20} className={!isPublic ? 'text-orange' : 'text-gray-400'} />
                <div className="flex-1 text-left">
                  <div className="font-mono font-bold">Private</div>
                  <div className="text-xs text-gray-600">Only visible to you</div>
                </div>
                {!isPublic && (
                  <div className="w-4 h-4 rounded-full bg-orange border-2 border-orange" />
                )}
              </button>
            </div>
          </div>

          {/* Category (only if public) */}
          {isPublic && (
            <div>
              <label className="block text-sm font-mono font-bold mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags (only if public) */}
          {isPublic && (
            <div>
              <label className="block text-sm font-mono font-bold mb-2">
                <Tag size={16} className="inline mr-1" />
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., uniswap, ethereum, defi"
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">Help others discover your strategy</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || (isPublic && !category)}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
