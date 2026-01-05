import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  Box,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Landmark,
  Loader2,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AVAILABLE_BLOCKS, PROTOCOL_COLORS } from '../../constants';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { trpc } from '../../lib/api/trpc';
import { suggestNextBlocks } from '../../services/geminiService';
import type { LegoBlock } from '../../types';
import { Protocol } from '../../types';

interface AIBlockSuggesterProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlock: (block: LegoBlock) => void;
  currentBlocks: LegoBlock[];
}

const getIcon = (iconName: string, size = 16) => {
  const props = { size, strokeWidth: 1.5 };
  switch (iconName) {
    case 'swap':
      return <ArrowRightLeft {...props} />;
    case 'supply':
      return <Landmark {...props} />;
    case 'trigger':
      return <Activity {...props} />;
    case 'shield':
      return <Shield {...props} />;
    default:
      return <Box {...props} />;
  }
};

// Cache for AI suggestions (keyed by blocks hash)
const suggestionCache = new Map<string, { blocks: LegoBlock[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate cache key from blocks
function getCacheKey(blocks: LegoBlock[]): string {
  return blocks.map((b) => `${b.type}-${b.category}`).join('|');
}

// Fallback heuristic suggestions
function getFallbackSuggestions(blocks: LegoBlock[]): LegoBlock[] {
  if (blocks.length === 0) {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'ENTRY').slice(0, 3);
  }

  const lastBlock = blocks[blocks.length - 1];
  if (!lastBlock) return AVAILABLE_BLOCKS.slice(0, 3);

  if (lastBlock.category === 'ENTRY') {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'PROTOCOL').slice(0, 3);
  }

  const hasEntry = blocks.some((b) => b.category === 'ENTRY');
  const hasProtocol = blocks.some((b) => b.category === 'PROTOCOL');
  const hasExit = blocks.some((b) => b.category === 'EXIT');

  if (hasEntry && hasProtocol && !hasExit) {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'EXIT').slice(0, 3);
  }

  return AVAILABLE_BLOCKS.filter((b) => b.category === 'RISK').slice(0, 3);
}

// Category colors for visual hierarchy
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ENTRY: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  PROTOCOL: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  EXIT: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  RISK: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  OTHER: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

interface BlockCardProps {
  block: LegoBlock;
  isAISuggested?: boolean;
  onAdd: (block: LegoBlock) => void;
  onDragStart: (e: React.DragEvent, block: LegoBlock) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

function BlockCard({ block, isAISuggested, onAdd, onDragStart, onDragEnd }: BlockCardProps) {
  const accentColor = PROTOCOL_COLORS[block.protocol] || PROTOCOL_COLORS[Protocol.GENERIC];
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, block);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd(e);
  };

  return (
    <motion.button
      type="button"
      onClick={() => onAdd(block)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full p-3 bg-white border rounded-lg text-left group
        transition-all duration-150
        ${isDragging ? 'opacity-50 shadow-lg' : 'shadow-sm hover:shadow-md'}
        cursor-grab active:cursor-grabbing
        border-gray-200 hover:border-gray-300
      `}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
      }}
      aria-label={`Add ${block.label} block to strategy`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div className="text-gray-300 group-hover:text-gray-400 transition-colors">
          <GripVertical size={14} />
        </div>

        {/* Icon */}
        <div
          className="p-1.5 rounded"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {getIcon(block.icon)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded"
              style={{
                backgroundColor: `${accentColor}15`,
                color: accentColor,
              }}
            >
              {block.protocol}
            </span>
            {isAISuggested && (
              <Sparkles size={10} className="text-orange" aria-label="AI suggested" />
            )}
          </div>
          <p className="text-xs font-bold text-ink truncate uppercase tracking-wide">
            {block.label}
          </p>
          <p className="text-[10px] text-gray-400 truncate mt-0.5 font-mono">{block.description}</p>
        </div>
      </div>
    </motion.button>
  );
}

export const AIBlockSuggester: React.FC<AIBlockSuggesterProps> = ({
  isOpen,
  onClose,
  onAddBlock,
  currentBlocks,
}) => {
  const { warning: showWarning } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [expandedCategory, setExpandedCategory] = useState<string>('PROTOCOL');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<LegoBlock[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch AI suggestions from backend
  const backendQuery = trpc.ai.getSuggestions.useQuery(
    { currentBlocks, query: searchQuery || undefined },
    {
      enabled: isOpen,
      refetchOnWindowFocus: false,
      retry: 2,
    }
  );

  // Handle query errors
  useEffect(() => {
    if (backendQuery.error) {
      // Silently fall back to client-side suggestions
    }
  }, [backendQuery.error]);

  // Use backend suggestions if available, otherwise use fallback
  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    // Fallback to client-side rule-based suggestions
    const cacheKey = getCacheKey(currentBlocks);
    const cached = suggestionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAiSuggestions(cached.blocks);
      setAiError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoadingAI(true);
    setAiError(null);

    suggestNextBlocks(currentBlocks, searchQuery || undefined, signal)
      .then((suggestions) => {
        if (!signal.aborted) {
          setAiSuggestions(suggestions);
          setAiError(null);
          suggestionCache.set(cacheKey, {
            blocks: suggestions,
            timestamp: Date.now(),
          });
        }
      })
      .catch((error) => {
        if (!signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setAiError(errorMessage);
          if (errorMessage !== 'Request cancelled') {
            showWarning('AI suggestions unavailable. Using fallback suggestions.');
          }
          setAiSuggestions(getFallbackSuggestions(currentBlocks));
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setIsLoadingAI(false);
        }
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentBlocks, isOpen, showWarning]);

  const suggestedBlocks = useMemo(() => {
    if (aiSuggestions.length > 0) {
      return aiSuggestions;
    }
    return getFallbackSuggestions(currentBlocks);
  }, [aiSuggestions, currentBlocks]);

  const filteredBlocks = useMemo(() => {
    if (!debouncedSearchQuery) return AVAILABLE_BLOCKS;
    const query = debouncedSearchQuery.toLowerCase();
    return AVAILABLE_BLOCKS.filter(
      (block) =>
        block.label.toLowerCase().includes(query) ||
        block.protocol.toLowerCase().includes(query) ||
        block.category.toLowerCase().includes(query)
    );
  }, [debouncedSearchQuery]);

  const blocksByCategory = useMemo(() => {
    const grouped: Record<string, LegoBlock[]> = {};
    const order = ['ENTRY', 'PROTOCOL', 'EXIT', 'RISK'];
    order.forEach((cat) => (grouped[cat] = []));

    filteredBlocks.forEach((block) => {
      const category = block.category || 'OTHER';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(block);
    });

    return grouped;
  }, [filteredBlocks]);

  const categoryLabels: Record<string, string> = {
    ENTRY: 'Entry Conditions',
    PROTOCOL: 'Protocol Actions',
    EXIT: 'Exit Conditions',
    RISK: 'Risk Management',
    OTHER: 'Other',
  };

  const handleAddBlock = useCallback(
    (template: LegoBlock) => {
      onAddBlock(template);
      setSearchQuery('');
      if (window.innerWidth < 1024) onClose();
    },
    [onAddBlock, onClose]
  );

  const handleDragStart = useCallback((e: React.DragEvent, block: LegoBlock) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(block));
    e.dataTransfer.setData('text/plain', block.id);
  }, []);

  const handleDragEnd = useCallback((_e: React.DragEvent) => {
    // Reset any drag states
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            data-onboarding="block-palette"
            initial={{ x: -340 }}
            animate={{ x: 0 }}
            exit={{ x: -340 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="palette-title"
            className="fixed left-0 top-14 bottom-0 w-[320px] bg-white border-r border-gray-200 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <header className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange/10 rounded">
                  <Sparkles size={14} className="text-orange" />
                </div>
                <h2
                  id="palette-title"
                  className="text-sm font-bold text-ink uppercase tracking-wide"
                >
                  Block Palette
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-ink hover:bg-gray-100 rounded transition-colors"
                aria-label="Close palette"
              >
                <X size={16} />
              </button>
            </header>

            {/* AI Suggestions Section */}
            <section className="p-4 border-b border-gray-200 bg-gradient-to-b from-orange/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles
                  size={12}
                  className={`text-orange ${isLoadingAI ? 'animate-pulse' : ''}`}
                />
                <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                  Suggested Next
                </h3>
                {isLoadingAI && <Loader2 size={10} className="animate-spin text-orange ml-auto" />}
                {aiError && !isLoadingAI && (
                  <AlertCircle size={10} className="text-gray-400 ml-auto" />
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isLoadingAI
                  ? [...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white border border-gray-200 rounded-lg animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))
                  : suggestedBlocks.map((block) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        isAISuggested={aiSuggestions.includes(block)}
                        onAdd={handleAddBlock}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
              </div>
            </section>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blocks..."
                  className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg text-sm font-mono
                    focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/10
                    bg-gray-50 focus:bg-white transition-colors"
                  aria-label="Search for blocks"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-ink"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <nav className="flex-1 overflow-y-auto" aria-label="Block categories">
              {Object.entries(blocksByCategory).map(([category, blocks]) => {
                if (blocks.length === 0) return null;
                const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER;
                const isExpanded = expandedCategory === category;

                if (!colors) return null;

                return (
                  <div key={category} className="border-b border-gray-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? '' : category)}
                      className={`
                        w-full px-4 py-3 flex items-center justify-between
                        hover:bg-gray-50 transition-colors
                        ${isExpanded ? 'bg-gray-50' : ''}
                      `}
                      aria-expanded={isExpanded}
                      aria-controls={`category-${category}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${colors.bg} ${colors.text}`}
                        >
                          {category}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {categoryLabels[category]}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({blocks.length})
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          id={`category-${category}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {blocks.map((block) => (
                              <BlockCard
                                key={block.id}
                                block={block}
                                onAdd={handleAddBlock}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* Footer hint */}
            <footer className="p-3 border-t border-gray-200 bg-gray-50">
              <p className="text-[10px] text-gray-400 text-center font-mono">
                Drag blocks to canvas or click to add
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
