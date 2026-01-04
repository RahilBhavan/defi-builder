import { motion } from 'framer-motion';
import { Eye, GitFork, Search, Star, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../lib/api/trpc';

// Type assertion to work around TypeScript inference issue with nested routers
// This is a known issue with tRPC v11 type inference
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue with nested routers
const typedTrpc = trpc as any;
import { useToast } from '../../hooks/useToast';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStrategy?: (strategyId: string) => void;
}

type SortBy = 'newest' | 'popular' | 'trending' | 'rating';
type Category = 'all' | 'yield-farming' | 'arbitrage' | 'liquidity' | 'trading';

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  isOpen,
  onClose,
  onLoadStrategy,
}) => {
  const { isConnected } = useWallet();
  const { success: showSuccess, error: showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [category, setCategory] = useState<Category>('all');
  const [page, setPage] = useState(1);
  const [addToCollectionStrategyId, setAddToCollectionStrategyId] = useState<string | null>(null);
  // const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null); // Reserved for future use

  const { data: discoverData, isLoading: isLoadingDiscover } =
    typedTrpc.marketplace.discover.useQuery({
      page,
      limit: 20,
      category: category === 'all' ? undefined : category,
      sortBy,
      search: searchQuery || undefined,
    });

  const { data: featuredStrategies, isLoading: isLoadingFeatured } =
    typedTrpc.marketplace.featured.useQuery(undefined, {
      enabled: page === 1 && !searchQuery,
    });

  const { data: trendingStrategies, isLoading: isLoadingTrending } =
    typedTrpc.marketplace.trending.useQuery(
      { limit: 10 },
      {
        enabled: page === 1 && !searchQuery && sortBy === 'trending',
      }
    );

  const forkMutation = typedTrpc.marketplace.forkStrategy.useMutation();
  const rateMutation = typedTrpc.marketplace.rateStrategy.useMutation();

  const strategies = useMemo(() => {
    // Show trending strategies if sortBy is trending
    if (page === 1 && !searchQuery && sortBy === 'trending' && trendingStrategies) {
      return trendingStrategies;
    }
    // Show featured strategies on first page with no search
    if (page === 1 && !searchQuery && featuredStrategies && featuredStrategies.length > 0) {
      return featuredStrategies;
    }
    return discoverData?.strategies || [];
  }, [discoverData, featuredStrategies, trendingStrategies, page, searchQuery, sortBy]);

  const handleFork = async (strategyId: string, name: string) => {
    if (!isConnected) {
      showError('Please connect your wallet to fork strategies');
      return;
    }

    try {
      const forked = await forkMutation.mutateAsync({
        originalId: strategyId,
        name: `${name} (Fork)`,
      });
      showSuccess('Strategy forked successfully!');
      if (onLoadStrategy) {
        onLoadStrategy(forked.id);
      }
      onClose();
    } catch (_error) {
      showError('Failed to fork strategy');
    }
  };

  const handleRate = async (strategyId: string, rating: number) => {
    if (!isConnected) {
      showError('Please connect your wallet to rate strategies');
      return;
    }

    try {
      await rateMutation.mutateAsync({
        strategyId,
        rating,
      });
      showSuccess('Rating submitted!');
    } catch (_error) {
      showError('Failed to submit rating');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: Using div for modal provides better control over styling and behavior
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-12 touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketplace-modal-title"
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
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 id="marketplace-modal-title" className="text-lg font-bold font-mono uppercase">
            Strategy Marketplace
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink transition-colors"
            aria-label="Close marketplace"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search strategies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
            >
              <option value="all">All Categories</option>
              <option value="yield-farming">Yield Farming</option>
              <option value="arbitrage">Arbitrage</option>
              <option value="liquidity">Liquidity</option>
              <option value="trading">Trading</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="trending">Trending</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingDiscover || isLoadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 bg-white border border-gray-200">
                  <Skeleton height={20} className="mb-2" />
                  <Skeleton height={14} className="mb-4" />
                  <Skeleton height={12} width="60%" />
                </div>
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-mono">No strategies found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategies.map((strategy: any) => ( // biome-ignore lint/suspicious/noExplicitAny: Strategy type from tRPC is complex
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onFork={() => handleFork(strategy.id, strategy.name)}
                  onRate={(rating) => handleRate(strategy.id, rating)}
                  onSelect={() => {
                    // Reserved for future use
                    // setSelectedStrategyId(strategy.id);
                  }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {discoverData && discoverData.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="px-4 py-2 font-mono text-sm">
                Page {page} of {discoverData.pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= discoverData.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface StrategyCardProps {
  // biome-ignore lint/suspicious/noExplicitAny: Strategy type from tRPC is complex
  strategy: any;
  onFork: () => void;
  onRate: (rating: number) => void;
  onAddToCollection: () => void;
  onSelect: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onFork,
  onRate,
  onAddToCollection,
  onSelect,
}) => {
  const avgRating = strategy.averageRating || 0;
  const ratingCount = strategy.ratingCount || 0;

  return (
    <div className="p-4 bg-white border border-gray-200 hover:border-orange transition-colors cursor-pointer">
      <div onClick={onSelect}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-ink text-sm uppercase">{strategy.name}</h3>
          {strategy.isFeatured && (
            <span className="px-2 py-0.5 bg-orange text-white text-xs font-mono uppercase">
              Featured
            </span>
          )}
        </div>

        {strategy.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{strategy.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Eye size={14} />
            <span>{strategy.viewCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitFork size={14} />
            <span>{strategy._count?.forks || strategy.forkCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500" />
            <span>
              {avgRating.toFixed(1)} ({ratingCount})
            </span>
          </div>
        </div>

        {strategy.user && (
          <button
            onClick={() => {
              // Open user profile modal (to be implemented)
              // For now, just show user info
            }}
            className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-mono">
              {strategy.user.username?.[0] || strategy.user.walletAddress.slice(2, 4).toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 font-mono">
              {strategy.user.username || `${strategy.user.walletAddress.slice(0, 6)}...`}
            </span>
          </button>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="primary" className="flex-1 text-xs px-3 py-1.5" onClick={onFork}>
          Fork
        </Button>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(star)}
              className="text-yellow-400 hover:text-yellow-500"
            >
              <Star size={16} fill={star <= Math.round(avgRating) ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
