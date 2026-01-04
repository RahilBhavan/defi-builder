/**
 * Reviews Section Component
 * Displays and allows adding reviews for a strategy
 */

import { motion } from 'framer-motion';
import { MessageSquare, Send, Star } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { trpc } from '../../lib/api/trpc';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface ReviewsSectionProps {
  strategyId: string;
  onReviewAdded?: () => void;
}

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  strategyId,
  onReviewAdded,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Get strategy with reviews
  const { data: strategy, isLoading, refetch } = typedTrpc.marketplace.getStrategy.useQuery(
    { id: strategyId },
    {
      enabled: !!strategyId,
    }
  );

  const addReviewMutation = typedTrpc.marketplace.addReview.useMutation();

  const reviews = strategy?.reviews || [];
  const hasMoreReviews = (strategy as any)?._count?.reviews > reviews.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewContent.trim() || reviewContent.length < 10) {
      showError('Review must be at least 10 characters');
      return;
    }

    if (reviewContent.length > 1000) {
      showError('Review must be less than 1000 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await addReviewMutation.mutateAsync({
        strategyId,
        content: reviewContent.trim(),
      });

      showSuccess('Review added successfully');
      setReviewContent('');
      setShowForm(false);
      refetch();
      onReviewAdded?.();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Failed to add review'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={100} />
        <Skeleton height={100} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold font-mono uppercase flex items-center gap-2">
          <MessageSquare size={20} />
          Reviews ({reviews.length}
          {hasMoreReviews && `+${(strategy as any)._count.reviews - reviews.length}`})
        </h3>
        {!showForm && (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => setShowForm(true)}
          >
            Write Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-gray-50 border border-gray-200"
        >
          <label
            htmlFor="review-content"
            className="block text-xs font-bold uppercase text-gray-500 mb-2"
          >
            Your Review *
          </label>
          <textarea
            id="review-content"
            value={reviewContent}
            onChange={(e) => setReviewContent(e.target.value)}
            minLength={10}
            maxLength={1000}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange font-mono text-sm resize-none"
            placeholder="Share your thoughts about this strategy..."
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">
              {reviewContent.length}/1000 characters (min: 10)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setReviewContent('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || reviewContent.length < 10}
                className="flex items-center gap-2"
              >
                <Send size={14} />
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </motion.form>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="font-mono">No reviews yet</p>
          <p className="text-sm mt-2">Be the first to review this strategy!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div
              key={review.id}
              className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  {review.user.username?.[0]?.toUpperCase() ||
                    review.user.walletAddress.slice(2, 4).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">
                      {review.user.username ||
                        `${review.user.walletAddress.slice(0, 6)}...`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>
                </div>
              </div>
            </div>
          ))}

          {hasMoreReviews && (
            <div className="text-center pt-4">
              <Button variant="secondary" className="text-xs">
                Load More Reviews (
                {(strategy as any)._count.reviews - reviews.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

