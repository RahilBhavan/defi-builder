/**
 * User Profile Modal
 * Displays creator profile with their strategies and stats
 */

import { motion } from 'framer-motion';
import { Eye, GitFork, Star, X } from 'lucide-react';
import type React from 'react';
import { trpc } from '../../lib/api/trpc';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  walletAddress?: string;
  onLoadStrategy?: (strategyId: string) => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  walletAddress,
  onLoadStrategy,
}) => {
  const { data: profile, isLoading } = typedTrpc.marketplace.getUserProfile.useQuery(
    { userId, walletAddress },
    {
      enabled: isOpen && (!!userId || !!walletAddress),
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
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 className="text-lg font-bold font-mono uppercase">Creator Profile</h2>
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
          ) : profile ? (
            <>
              {/* Profile Header */}
              <div className="bg-white border border-gray-200 p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center text-2xl font-mono font-bold">
                    {profile.username?.[0]?.toUpperCase() ||
                      profile.walletAddress.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold font-mono mb-1">
                      {profile.username || `${profile.walletAddress.slice(0, 6)}...`}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono mb-4">{profile.walletAddress}</p>
                    {profile.bio && <p className="text-sm text-gray-600 mb-4">{profile.bio}</p>}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold font-mono text-orange">
                          {profile.stats?.publicStrategies || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Public Strategies</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold font-mono text-orange">
                          {profile.stats?.totalViews || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Total Views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold font-mono text-orange">
                          {profile.stats?.totalForks || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Total Forks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold font-mono text-orange">
                          {profile.stats?.totalRatings || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Ratings Given</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategies */}
              <div>
                <h4 className="text-lg font-bold font-mono uppercase mb-4">Public Strategies</h4>
                {profile.strategies.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="font-mono">No public strategies yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.strategies.map((strategy: any) => (
                      <div
                        key={strategy.id}
                        className="bg-white border border-gray-200 hover:border-orange transition-colors p-4"
                      >
                        <h5 className="font-bold text-ink mb-2">{strategy.name}</h5>
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
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="font-mono">User not found</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
