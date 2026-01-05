/**
 * Create Collection Modal
 * Allows users to create new strategy collections
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (collectionId: string) => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = typedTrpc.marketplace.createCollection.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Collection name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const collection = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });

      showSuccess('Collection created successfully');
      setName('');
      setDescription('');
      setIsPublic(false);
      onSuccess?.(collection.id);
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create collection');
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

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-md border-2 border-ink shadow-2xl relative"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 className="text-lg font-bold font-mono uppercase">Create Collection</h2>
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
              htmlFor="collection-name"
              className="block text-xs font-bold uppercase text-gray-500 mb-2"
            >
              Collection Name *
            </label>
            <input
              id="collection-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
              placeholder="My Strategy Collection"
            />
          </div>

          <div>
            <label
              htmlFor="collection-description"
              className="block text-xs font-bold uppercase text-gray-500 mb-2"
            >
              Description
            </label>
            <textarea
              id="collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm resize-none"
              placeholder="A curated collection of my favorite strategies..."
            />
            <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="collection-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <label htmlFor="collection-public" className="text-sm text-gray-700">
              Make this collection public
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
