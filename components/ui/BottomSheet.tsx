import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

/**
 * Mobile-optimized bottom sheet modal
 * Slides up from bottom on mobile, centered modal on desktop
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '90vh',
}) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when bottom sheet is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-300 rounded-t-lg shadow-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:rounded-lg md:border-2"
            style={{ maxHeight }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
          >
            {/* Handle bar (mobile only) */}
            <div className="md:hidden flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 id="bottom-sheet-title" className="text-lg font-bold font-mono uppercase">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 text-ink transition-colors -mr-2"
                  aria-label="Close"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Content */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: `calc(${maxHeight} - ${title ? '80px' : '40px'})` }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
