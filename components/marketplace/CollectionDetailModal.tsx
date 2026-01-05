/**
 * Collection Detail Modal
 * Displays a collection with its strategies
 */

import { motion } from 'framer-motion';
import { Eye, GitFork, Star, X } from 'lucide-react';
import type React from 'react';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface CollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  onLoadStrategy?: (strategyId: string) => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export const CollectionDetailModal: React.FC<CollectionDetailModalProps> = ({
  isOpen,
  onClose,
  collectionId,
  onLoadStrategy,
}) => {
  const { data: collection, isLoading } = typedTrpc.marketplace.getCollection.useQuery(
    { id: collectionId },
    {
      enabled: isOpen && !!collectionId,
    }
  );

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
        className="bg-canvas w-full max-w-4xl h-[90vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white flex-shrink-0">
          <h2 className="text-lg font-bold font-mono uppercase">
            {isLoading ? 'Loading...' : collection?.name || 'Collection'}
          </h2>
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
            <div className="space-y-4">
              <Skeleton height={100} />
              <Skeleton height={200} />
            </div>
          ) : collection ? (
            <>
              {/* Collection Info */}
              <div className="bg-white border border-gray-200 p-6 mb-6">
                {collection.description && (
                  <p className="text-sm text-gray-600 mb-4">{collection.description}</p>
                )}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Created by:</span>
                    <span className="font-mono font-bold">
                      {collection.user.username ||
                        `${collection.user.walletAddress.slice(0, 6)}...`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Strategies:</span>
                    <span className="font-mono font-bold">{collection.strategies.length}</span>
                  </div>
                  {collection.isPublic && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Public
                    </span>
                  )}
                </div>
              </div>

              {/* Strategies */}
              <div>
                <h3 className="text-lg font-bold font-mono uppercase mb-4">Strategies</h3>
                {collection.strategies.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="font-mono">No strategies in this collection yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collection.strategies.map((item: any) => {
                      const strategy = item.strategy;
                      return (
                        <div
                          key={strategy.id}
                          className="bg-white border border-gray-200 hover:border-orange transition-colors p-4"
                        >
                          <h4 className="font-bold text-ink mb-2">{strategy.name}</h4>
                          {strategy.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                              {strategy.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Eye size={12} />
                              <span>{strategy.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork size={12} />
                              <span>{strategy._count?.originalForks || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star size={12} className="text-yellow-500" />
                              <span>{strategy._count?.ratings || 0}</span>
                            </div>
                          </div>
                          {onLoadStrategy && (
                            <Button
                              variant="secondary"
                              fullWidth
                              className="text-xs"
                              onClick={() => {
                                onLoadStrategy(strategy.id);
                                onClose();
                              }}
                            >
                              View Strategy
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="font-mono">Collection not found</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
