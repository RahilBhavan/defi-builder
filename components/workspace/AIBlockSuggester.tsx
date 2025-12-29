import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  Box,
  ChevronDown,
  ChevronRight,
  Landmark,
  Loader2,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AVAILABLE_BLOCKS } from '../../constants';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { suggestNextBlocks } from '../../services/geminiService';
import type { LegoBlock } from '../../types';
import { trpc } from '../../utils/trpc';

interface AIBlockSuggesterProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlock: (block: LegoBlock) => void;
  currentBlocks: LegoBlock[];
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'swap':
      return <ArrowRightLeft size={18} />;
    case 'supply':
      return <Landmark size={18} />;
    case 'trigger':
      return <Activity size={18} />;
    case 'shield':
      return <Shield size={18} />;
    case 'clock':
      return <Activity size={18} />;
    case 'bar-chart':
      return <Activity size={18} />;
    case 'trending-up':
      return <Activity size={18} />;
    case 'arrow-down':
      return <ArrowRightLeft size={18} />;
    case 'arrow-up':
      return <ArrowRightLeft size={18} />;
    case 'arrow-up-circle':
      return <ArrowRightLeft size={18} />;
    case 'droplet':
      return <Box size={18} />;
    case 'zap':
      return <Activity size={18} />;
    case 'lock':
      return <Shield size={18} />;
    case 'code':
      return <Box size={18} />;
    case 'sliders':
      return <Activity size={18} />;
    case 'alert-triangle':
      return <Shield size={18} />;
    case 'refresh-cw':
      return <Activity size={18} />;
    default:
      return <Box size={18} />;
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

export const AIBlockSuggester: React.FC<AIBlockSuggesterProps> = ({
  isOpen,
  onClose,
  onAddBlock,
  currentBlocks,
}) => {
  const { error: showError, warning: showWarning } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [expandedCategory, setExpandedCategory] = useState<string>('PROTOCOL');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<LegoBlock[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch AI suggestions from backend (optional - will work without backend)
  let isLoadingBackend = false;
  let backendSuggestions: LegoBlock[] | undefined = undefined;
  try {
    // @ts-expect-error - tRPC might not be fully configured
    const query = trpc?.ai?.getSuggestions?.useQuery?.(
      { currentBlocks },
      {
        enabled: isOpen && false, // Disabled for now until backend is fully set up
        refetchOnWindowFocus: false,
        retry: 1,
      }
    );
    if (query) {
      isLoadingBackend = query.isLoading ?? false;
      backendSuggestions = query.data;
    }
  } catch (error) {
    // Backend not available, continue without it
    console.debug('Backend AI suggestions not available:', error);
  }

  const isLoadingAISuggestions = isLoadingAI || isLoadingBackend;

  // Fetch AI suggestions when blocks change (fallback to Gemini)
  useEffect(() => {
    if (!isOpen) return;

    // Prefer backend suggestions if available
    if (backendSuggestions && backendSuggestions.length > 0) {
      // Convert backend suggestions to blocks (simplified)
      // In production, this would map AI suggestions to actual blocks
      return;
    }

    const cacheKey = getCacheKey(currentBlocks);
    const cached = suggestionCache.get(cacheKey);

    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAiSuggestions(cached.blocks);
      setAiError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Fetch AI suggestions
    setIsLoadingAI(true);
    setAiError(null);

    suggestNextBlocks(currentBlocks, undefined, signal)
      .then((suggestions) => {
        if (!signal.aborted) {
          setAiSuggestions(suggestions);
          setAiError(null);

          // Cache the suggestions
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

          // Show warning but don't block UI
          if (errorMessage !== 'Request cancelled') {
            showWarning('AI suggestions unavailable. Using fallback suggestions.');
          }

          // Use fallback
          setAiSuggestions(getFallbackSuggestions(currentBlocks));
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setIsLoadingAI(false);
        }
      });

    // Cleanup on unmount or when blocks change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentBlocks, isOpen, showWarning]);

  // Use AI suggestions if available, otherwise fallback
  const suggestedBlocks = useMemo(() => {
    if (aiSuggestions.length > 0) {
      return aiSuggestions;
    }
    return getFallbackSuggestions(currentBlocks);
  }, [aiSuggestions, currentBlocks]);

  // Filter blocks by search (using debounced query)
  const filteredBlocks = useMemo(() => {
    if (!debouncedSearchQuery) return AVAILABLE_BLOCKS;
    const query = debouncedSearchQuery.toLowerCase();
    return AVAILABLE_BLOCKS.filter(
      (block) =>
        block.label.toLowerCase().includes(query) ||
        (block.params && JSON.stringify(block.params).toLowerCase().includes(query))
    );
  }, [debouncedSearchQuery]);

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const grouped: Record<string, LegoBlock[]> = {};
    filteredBlocks.forEach((block) => {
      const category = block.category || 'OTHER';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(block);
    });
    return grouped;
  }, [filteredBlocks]);

  const categoryNames: Record<string, string> = {
    ENTRY: 'ENTRY CONDITIONS',
    PROTOCOL: 'PROTOCOL ACTIONS',
    EXIT: 'EXIT CONDITIONS',
    RISK: 'RISK MANAGEMENT',
    OTHER: 'OTHER',
  };

  const handleAddBlock = (template: LegoBlock) => {
    onAddBlock(template);
    setSearchQuery('');
    if (window.innerWidth < 1024) onClose(); // Close on mobile add
  };

  const handleDragStart = (e: React.DragEvent, block: LegoBlock) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(block));
    e.dataTransfer.setData('text/plain', block.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

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
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-0 top-0 h-full w-80 bg-canvas/95 backdrop-blur-md border-r border-ink z-50 flex flex-col shadow-2xl"
          >
            {/* Header / Suggestions */}
            <div className="p-0 border-b border-gray-300 flex-shrink-0">
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles
                    size={14}
                    className={`${isLoadingAI ? 'animate-pulse' : ''} text-orange`}
                  />
                  <h3 className="text-xs font-bold uppercase text-gray-500">Suggested Next</h3>
                  {isLoadingAI && (
                    <Loader2 size={12} className="animate-spin text-orange ml-auto" />
                  )}
                  {aiError && !isLoadingAI && (
                    <AlertCircle size={12} className="text-gray-400 ml-auto" title={aiError} />
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto scroll-smooth pr-2 -mr-2">
                  {isLoadingAI ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-full p-3 bg-white border border-gray-300 animate-pulse"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-gray-200 rounded" />
                            <div className="flex-1 space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-3/4" />
                              <div className="h-2 bg-gray-200 rounded w-1/2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {suggestedBlocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => handleAddBlock(block)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, block)}
                          onDragEnd={handleDragEnd}
                          className="w-full p-3 bg-white border border-gray-300 hover:border-ink transition-all text-left group shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 group-hover:text-ink">
                              {getIcon(block.icon)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-ink truncate">{block.label}</p>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                {block.description}
                              </p>
                            </div>
                            {aiSuggestions.length > 0 && aiSuggestions.includes(block) && (
                              <Sparkles size={10} className="text-orange flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-300 bg-white flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blocks..."
                  className="w-full h-10 pl-3 pr-10 border border-gray-300 focus:border-ink font-mono text-sm outline-none bg-gray-50 focus:bg-white transition-colors rounded-lg"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <Search size={16} />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto bg-canvas scroll-smooth">
              {Object.entries(blocksByCategory).map(([category, blocks]) => (
                <div key={category} className="border-b border-gray-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategory((prev) => (prev === category ? '' : category))
                    }
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors bg-white"
                  >
                    <span
                      id={`category-header-${category}`}
                      className="text-xs font-bold uppercase text-ink tracking-wider"
                    >
                      {categoryNames[category] || category}
                    </span>
                    <span className="text-gray-400">
                      {expandedCategory === category ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </span>
                  </button>

                  <AnimatePresence>
                    {expandedCategory === category && (
                      <motion.div
                        id={`category-${category}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                        role="region"
                        aria-labelledby={`category-header-${category}`}
                      >
                        <div className="px-6 pb-6 pt-2 space-y-2 bg-gray-50 inner-shadow">
                          {(blocks as LegoBlock[]).map((block) => (
                            <button
                              key={block.id}
                              type="button"
                              onClick={() => handleAddBlock(block)}
                              draggable
                              onDragStart={(e) => handleDragStart(e, block)}
                              onDragEnd={handleDragEnd}
                              className="w-full p-3 bg-white border border-gray-200 hover:border-ink transition-all text-left group cursor-grab active:cursor-grabbing rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-gray-400 group-hover:text-ink transition-colors">
                                  {getIcon(block.icon)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-ink truncate">
                                    {block.label}
                                  </p>
                                  <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                    {block.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
