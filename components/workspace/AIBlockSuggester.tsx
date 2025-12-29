import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LegoBlock } from '../../types';
import { AVAILABLE_BLOCKS } from '../../constants';
import { Search, Sparkles, X, ChevronRight, ChevronDown, ArrowRightLeft, Landmark, Activity, Shield, Box } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface AIBlockSuggesterProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlock: (block: LegoBlock) => void;
  currentBlocks: LegoBlock[];
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'swap': return <ArrowRightLeft size={18} />;
    case 'supply': return <Landmark size={18} />;
    case 'trigger': return <Activity size={18} />;
    case 'shield': return <Shield size={18} />;
    default: return <Box size={18} />;
  }
};

export const AIBlockSuggester: React.FC<AIBlockSuggesterProps> = ({
  isOpen,
  onClose,
  onAddBlock,
  currentBlocks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [expandedCategory, setExpandedCategory] = useState<string>('PROTOCOL');

  // Smart suggestions based on current blocks
  const suggestedBlocks = useMemo(() => {
    if (currentBlocks.length === 0) {
      return AVAILABLE_BLOCKS.filter(b => b.category === 'ENTRY').slice(0, 3);
    }

    const lastBlock = currentBlocks[currentBlocks.length - 1];

    if (lastBlock.category === 'ENTRY') {
      return AVAILABLE_BLOCKS.filter(b => b.category === 'PROTOCOL').slice(0, 3);
    }

    const hasEntry = currentBlocks.some(b => b.category === 'ENTRY');
    const hasProtocol = currentBlocks.some(b => b.category === 'PROTOCOL');
    const hasExit = currentBlocks.some(b => b.category === 'EXIT');

    if (hasEntry && hasProtocol && !hasExit) {
      return AVAILABLE_BLOCKS.filter(b => b.category === 'EXIT').slice(0, 3);
    }

    return AVAILABLE_BLOCKS.filter(b => b.category === 'RISK').slice(0, 3);
  }, [currentBlocks]);

  // Filter blocks by search (using debounced query)
  const filteredBlocks = useMemo(() => {
    if (!debouncedSearchQuery) return AVAILABLE_BLOCKS;
    const query = debouncedSearchQuery.toLowerCase();
    return AVAILABLE_BLOCKS.filter(
      block =>
        block.label.toLowerCase().includes(query) ||
        (block.params && JSON.stringify(block.params).toLowerCase().includes(query))
    );
  }, [debouncedSearchQuery]);

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const grouped: Record<string, LegoBlock[]> = {};
    filteredBlocks.forEach(block => {
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
            <div className="p-0 border-b border-gray-300">
               <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-orange" />
                    <h3 className="text-xs font-bold uppercase text-gray-500">Suggested Next</h3>
                </div>
                <div className="space-y-2">
                    {suggestedBlocks.map(block => (
                    <button
                        key={block.id}
                        onClick={() => handleAddBlock(block)}
                        className="w-full p-3 bg-white border border-gray-300 hover:border-ink transition-all text-left group shadow-sm hover:shadow-md"
                    >
                        <div className="flex items-center gap-3">
                        <span className="text-gray-600 group-hover:text-ink">{getIcon(block.icon)}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-ink truncate">{block.label}</p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{block.description}</p>
                        </div>
                        </div>
                    </button>
                    ))}
                </div>
               </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-300 bg-white">
               <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search blocks..."
                    className="w-full h-10 pl-3 pr-10 border border-gray-300 focus:border-ink font-mono text-sm outline-none bg-gray-50 focus:bg-white transition-colors"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                    <Search size={16} />
                </div>
               </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto bg-canvas">
              {Object.entries(blocksByCategory).map(([category, blocks]) => (
                <div key={category} className="border-b border-gray-200 last:border-b-0">
                  <button
                    onClick={() => setExpandedCategory(prev => (prev === category ? '' : category))}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors bg-white"
                  >
                    <span id={`category-header-${category}`} className="text-xs font-bold uppercase text-ink tracking-wider">
                      {categoryNames[category] || category}
                    </span>
                    <span className="text-gray-400">
                      {expandedCategory === category ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
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
                        {(blocks as LegoBlock[]).map(block => (
                            <button
                            key={block.id}
                            onClick={() => handleAddBlock(block)}
                            className="w-full p-3 bg-white border border-gray-200 hover:border-ink transition-all text-left group"
                            >
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400 group-hover:text-ink transition-colors">{getIcon(block.icon)}</span>
                                <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-ink truncate">{block.label}</p>
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