/**
 * Add to Collection Modal
 * Allows users to add a strategy to one or more collections
 */

import { motion } from 'framer-motion';
import { FolderPlus, Plus, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';
import { CreateCollectionModal } from './CreateCollectionModal';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  onSuccess?: () => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  strategyId,
  onSuccess,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());

  // Get user's collections
  const {
    data: collections,
    isLoading,
    refetch,
  } = typedTrpc.marketplace.getCollections.useQuery(
    { isPublic: undefined }, // Get all user's collections (public and private)
    {
      enabled: isOpen,
    }
  );

  const addMutation = typedTrpc.marketplace.addStrategyToCollection.useMutation();

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleToggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollections(newSelected);
  };

  const handleAdd = async () => {
    if (selectedCollections.size === 0) {
      showError('Please select at least one collection');
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedCollections).map((collectionId) =>
          addMutation.mutateAsync({
            collectionId,
            strategyId,
          })
        )
      );

      showSuccess(`Added to ${selectedCollections.size} collection(s)`);
      setSelectedCollections(new Set());
      onSuccess?.();
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to add to collection');
    }
  };

  const handleCreateSuccess = (collectionId: string) => {
    setSelectedCollections(new Set([collectionId]));
    refetch();
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
          className="bg-canvas w-full max-w-md border-2 border-ink shadow-2xl relative flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white flex-shrink-0">
            <h2 className="text-lg font-bold font-mono uppercase">Add to Collection</h2>
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
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-mono">Loading collections...</p>
              </div>
            ) : collections && collections.length > 0 ? (
              <div className="space-y-2">
                {collections.map((collection: any) => (
                  <button
                    key={collection.id}
                    onClick={() => handleToggleCollection(collection.id)}
                    className={`w-full p-4 border-2 transition-colors text-left ${
                      selectedCollections.has(collection.id)
                        ? 'border-orange bg-orange/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-ink mb-1">{collection.name}</h3>
                        {collection.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {collection.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{collection._count?.strategies || 0} strategies</span>
                          {collection.isPublic && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              Public
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 ml-4 ${
                          selectedCollections.has(collection.id)
                            ? 'border-orange bg-orange'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedCollections.has(collection.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderPlus size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="font-mono mb-4">No collections yet</p>
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create Collection
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-300 p-6 flex gap-3 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              New Collection
            </Button>
            <div className="flex-1" />
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={selectedCollections.size === 0 || addMutation.isPending}
            >
              {addMutation.isPending
                ? 'Adding...'
                : `Add to ${selectedCollections.size} Collection(s)`}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};
