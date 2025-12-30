import { motion } from 'framer-motion';
import { BookOpen, Copy, ExternalLink, Save, Search, Share2, Sparkles, Star, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import {
  createStrategyFromBlocks,
  deleteStrategy,
  getStrategies,
  saveStrategy,
} from '../../services/strategyStorage';
import { useCloudSync } from '../../services/cloudSync';
import {
  STRATEGY_TEMPLATES,
  type StrategyTemplate,
  getTemplatesByCategory,
  searchTemplates,
} from '../../services/strategyTemplates';
import { generateShareLink as createShareLink } from '../../services/strategySharing';
import type { LegoBlock, Strategy } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface StrategyLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBlocks?: LegoBlock[];
  onLoadStrategy?: (blocks: LegoBlock[]) => void;
}

type FilterType = 'all' | 'popular' | 'newest' | 'mySaved';
type ViewMode = 'templates' | 'saved';

export const StrategyLibraryModal: React.FC<StrategyLibraryModalProps> = ({
  isOpen,
  onClose,
  currentBlocks = [],
  onLoadStrategy,
}) => {
  const { success: showSuccess, error: showError, warning: showWarning } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveStrategyName, setSaveStrategyName] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('saved');
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [shareStrategy, setShareStrategy] = useState<Strategy | null>(null);
  const [syncToCloud, setSyncToCloud] = useState(false);
  const { strategies: cloudStrategies, syncStrategy } = useCloudSync();

  // Load strategies from storage and cloud
  useEffect(() => {
    if (isOpen) {
      const loaded = getStrategies();
      // Merge local and cloud strategies
      const allStrategies = [...loaded, ...cloudStrategies];
      // Remove duplicates by ID
      const uniqueStrategies = Array.from(
        new Map(allStrategies.map((s) => [s.id, s])).values()
      );
      setStrategies(uniqueStrategies);
    }
  }, [isOpen, cloudStrategies]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = STRATEGY_TEMPLATES;

    // Filter by category
    if (templateCategory !== 'all') {
      templates = getTemplatesByCategory(templateCategory as StrategyTemplate['category']);
    }

    // Apply search
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    return templates;
  }, [searchQuery, templateCategory]);

  // Filter and search strategies
  const filteredStrategies = useMemo(() => {
    let filtered = strategies;

    // Apply filter
    if (filter === 'popular') {
      // For now, mark strategies with more than 3 blocks as popular
      // In future, add a popularity/rating field
      filtered = filtered.filter((s) => s.blocks.length >= 4);
    } else if (filter === 'newest') {
      filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    } else if (filter === 'mySaved') {
      // All saved strategies are "my saved" for now
      filtered = filtered;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.blocks.some((b) => b.label.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [strategies, searchQuery, filter]);

  const handleLoadStrategy = (strategy: Strategy) => {
    if (!onLoadStrategy) {
      showWarning('Load strategy functionality not available');
      return;
    }

    try {
      onLoadStrategy(strategy.blocks);
      showSuccess(`Strategy "${strategy.name}" loaded successfully`);
      onClose();
    } catch (error) {
      showError('Failed to load strategy. Please try again.');
      console.error('Error loading strategy:', error);
    }
  };

  const handleLoadTemplate = (template: StrategyTemplate) => {
    if (!onLoadStrategy) {
      showWarning('Load template functionality not available');
      return;
    }

    try {
      // Generate new IDs for template blocks
      const blocksWithIds = template.blocks.map((block) => ({
        ...block,
        id: `${block.id}-${Date.now()}-${Math.random()}`,
      }));
      onLoadStrategy(blocksWithIds);
      showSuccess(`Template "${template.name}" loaded successfully`);
      onClose();
    } catch (error) {
      showError('Failed to load template. Please try again.');
      console.error('Error loading template:', error);
    }
  };

  const handleSaveCurrentStrategy = async () => {
    if (currentBlocks.length === 0) {
      showWarning('Cannot save an empty strategy');
      return;
    }

    if (!saveStrategyName.trim()) {
      showError('Please enter a strategy name');
      return;
    }

    try {
      const strategy = createStrategyFromBlocks(currentBlocks, saveStrategyName.trim());
      saveStrategy(strategy);
      
      // Sync to cloud if enabled
      if (syncToCloud) {
        try {
          await syncStrategy(strategy);
          showSuccess(`Strategy "${strategy.name}" saved and synced to cloud`);
        } catch (error) {
          showWarning(`Strategy saved locally but cloud sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        showSuccess(`Strategy "${strategy.name}" saved successfully`);
      }
      
      setStrategies(getStrategies());
      setShowSaveDialog(false);
      setSaveStrategyName('');
      setSyncToCloud(false);
    } catch (error) {
      showError('Failed to save strategy. Please try again.');
      console.error('Error saving strategy:', error);
    }
  };

  const handleDeleteStrategy = (strategyId: string, strategyName: string) => {
    setDeleteConfirm({ id: strategyId, name: strategyName });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    try {
      deleteStrategy(deleteConfirm.id);
      setStrategies(getStrategies());
      showSuccess('Strategy deleted successfully');
      setDeleteConfirm(null);
    } catch (error) {
      showError('Failed to delete strategy. Please try again.');
      console.error('Error deleting strategy:', error);
      setDeleteConfirm(null);
    }
  };

  const handleShareStrategy = (strategy: Strategy) => {
    setShareStrategy(strategy);
  };

  const generateShareLink = (strategy: Strategy): string => {
    // Use secure sharing service with validation and sanitization
    return createShareLink(strategy);
  };

  const copyShareLink = async (strategy: Strategy) => {
    const link = generateShareLink(strategy);
    try {
      await navigator.clipboard.writeText(link);
      showSuccess('Share link copied to clipboard!');
      setShareStrategy(null);
    } catch (error) {
      showError('Failed to copy link. Please try again.');
      console.error('Error copying link:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-12 touch-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-6xl h-[85vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 className="text-lg font-bold font-mono uppercase">Strategy Library</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 text-ink transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex gap-2">
          <button
            onClick={() => setViewMode('templates')}
            className={`px-4 py-2 text-xs font-bold uppercase transition-colors flex items-center gap-2 ${
              viewMode === 'templates'
                ? 'bg-ink text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={14} />
            Templates
          </button>
          <button
            onClick={() => setViewMode('saved')}
            className={`px-4 py-2 text-xs font-bold uppercase transition-colors flex items-center gap-2 ${
              viewMode === 'saved'
                ? 'bg-ink text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={14} />
            My Strategies ({strategies.length})
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder={
                viewMode === 'templates' ? 'Search templates...' : 'Search strategies...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 focus:border-ink outline-none text-sm font-sans"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
          <div className="flex gap-2">
            {viewMode === 'templates' ? (
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 bg-white focus:border-ink outline-none"
              >
                <option value="all">All Categories</option>
                <option value="DCA">DCA</option>
                <option value="Yield Farming">Yield Farming</option>
                <option value="Arbitrage">Arbitrage</option>
                <option value="Lending">Lending</option>
                <option value="Trading">Trading</option>
                <option value="Risk Management">Risk Management</option>
              </select>
            ) : (
              <>
                <button
                  onClick={() => setFilter('popular')}
                  className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${
                    filter === 'popular'
                      ? 'bg-ink text-white'
                      : 'bg-white border border-gray-300 hover:border-ink text-gray-600 hover:text-ink'
                  }`}
                >
                  Popular
                </button>
                <button
                  onClick={() => setFilter('newest')}
                  className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${
                    filter === 'newest'
                      ? 'bg-ink text-white'
                      : 'bg-white border border-gray-300 hover:border-ink text-gray-600 hover:text-ink'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setFilter('mySaved')}
                  className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${
                    filter === 'mySaved'
                      ? 'bg-ink text-white'
                      : 'bg-white border border-gray-300 hover:border-ink text-gray-600 hover:text-ink'
                  }`}
                >
                  My Saved
                </button>
              </>
            )}
            {currentBlocks.length > 0 && viewMode === 'saved' && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 text-xs font-bold uppercase bg-orange text-white hover:bg-orange/90 transition-colors flex items-center gap-2"
              >
                <Save size={14} />
                Save Current
              </button>
            )}
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-2 border-ink p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-bold font-mono uppercase mb-4">Save Strategy</h3>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={saveStrategyName}
                  onChange={(e) => setSaveStrategyName(e.target.value)}
                  placeholder="Enter strategy name..."
                  className="w-full h-10 px-3 border border-gray-300 font-mono text-sm focus:border-orange focus:outline-none mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveCurrentStrategy();
                    } else if (e.key === 'Escape') {
                      setShowSaveDialog(false);
                      setSaveStrategyName('');
                    }
                  }}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToCloud}
                    onChange={(e) => setSyncToCloud(e.target.checked)}
                    className="w-4 h-4 accent-orange"
                  />
                  <span className="text-xs text-gray-600">Sync to cloud</span>
                </label>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveStrategyName('');
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveCurrentStrategy}>
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {viewMode === 'templates' ? (
            filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm font-mono text-gray-500 uppercase mb-2">
                  {searchQuery ? 'No templates found' : 'No templates available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const blockCount = template.blocks.length;
                  const riskColors = {
                    Low: 'text-success-green bg-green-50',
                    Medium: 'text-orange bg-orange/10',
                    High: 'text-alert-red bg-red-50',
                  };
                  const difficultyColors = {
                    Beginner: 'text-blue-600 bg-blue-50',
                    Intermediate: 'text-orange bg-orange/10',
                    Advanced: 'text-purple-600 bg-purple-50',
                  };

                  return (
                    <div
                      key={template.id}
                      className="bg-white border border-gray-200 hover:border-ink shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-ink text-lg leading-tight">
                              {template.name}
                            </h3>
                            <Sparkles size={16} className="text-orange" />
                          </div>
                          <p className="text-xs text-gray-400 font-mono mb-2">
                            {template.category}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 flex-1">{template.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono uppercase bg-gray-100 text-gray-600 px-2 py-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 mb-6 text-xs font-mono">
                        <div>
                          <span className="text-gray-400 uppercase block mb-1">Blocks</span>
                          <span className="font-bold text-ink bg-gray-100 px-2 py-1">
                            {blockCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 uppercase block mb-1">Difficulty</span>
                          <span
                            className={`font-bold px-2 py-1 ${difficultyColors[template.difficulty]}`}
                          >
                            {template.difficulty}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 uppercase block mb-1">Risk</span>
                          <span className={`font-bold px-2 py-1 ${riskColors[template.riskLevel]}`}>
                            {template.riskLevel}
                          </span>
                        </div>
                        {template.estimatedAPY !== undefined && (
                          <div>
                            <span className="text-gray-400 uppercase block mb-1">Est. APY</span>
                            <span className="font-bold text-success-green bg-green-50 px-2 py-1">
                              {template.estimatedAPY}%
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="primary"
                        fullWidth
                        className="group-hover:bg-ink group-hover:text-white group-hover:border-ink"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredStrategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm font-mono text-gray-500 uppercase mb-2">
                {searchQuery ? 'No strategies found' : 'No saved strategies'}
              </p>
              {currentBlocks.length > 0 && !searchQuery && (
                <Button
                  variant="secondary"
                  onClick={() => setShowSaveDialog(true)}
                  className="mt-4"
                >
                  <Save size={14} className="mr-2" />
                  Save Current Strategy
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStrategies.map((strategy) => {
                const blockCount = strategy.blocks.length;
                const hasEntry = strategy.blocks.some((b) => b.category === 'ENTRY');
                const hasProtocol = strategy.blocks.some((b) => b.category === 'PROTOCOL');
                const hasExit = strategy.blocks.some((b) => b.category === 'EXIT');
                const isComplete = hasEntry && hasProtocol && hasExit;

                return (
                  <div
                    key={strategy.id}
                    className="bg-white border border-gray-200 hover:border-ink shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-ink text-lg leading-tight mb-1">
                          {strategy.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">
                          {new Date(strategy.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {blockCount >= 4 && (
                          <Star size={16} className="text-orange fill-orange" />
                        )}
                        <button
                          onClick={() => handleShareStrategy(strategy)}
                          className="text-gray-400 hover:text-orange transition-colors"
                          title="Share strategy"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStrategy(strategy.id, strategy.name)}
                          className="text-gray-400 hover:text-alert-red transition-colors"
                          title="Delete strategy"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-6 flex-1">
                      {blockCount} block{blockCount !== 1 ? 's' : ''} •{' '}
                      {isComplete ? 'Complete' : 'Incomplete'} strategy
                    </p>

                    <div className="flex items-center gap-4 mb-6 text-xs font-mono">
                      <div>
                        <span className="text-gray-400 uppercase block mb-1">Blocks</span>
                        <span className="font-bold text-ink bg-gray-100 px-2 py-1">
                          {blockCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 uppercase block mb-1">Status</span>
                        <span
                          className={`font-bold px-2 py-1 ${
                            isComplete
                              ? 'text-success-green bg-green-50'
                              : 'text-orange bg-orange/10'
                          }`}
                        >
                          {isComplete ? 'Complete' : 'Draft'}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      fullWidth
                      className="group-hover:bg-ink group-hover:text-white group-hover:border-ink"
                      onClick={() => handleLoadStrategy(strategy)}
                    >
                      Load Strategy
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteConfirm !== null}
          title="Delete Strategy"
          message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />

        {/* Share Dialog */}
        {shareStrategy && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-2 border-ink p-6 max-w-md w-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold font-mono uppercase mb-2">Share Strategy</h3>
                  <p className="text-sm text-gray-600">{shareStrategy.name}</p>
                </div>
                <button
                  onClick={() => setShareStrategy(null)}
                  className="p-1 hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generateShareLink(shareStrategy)}
                    readOnly
                    className="flex-1 h-10 px-3 border border-gray-300 font-mono text-xs focus:border-orange focus:outline-none bg-gray-50"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => copyShareLink(shareStrategy)}
                    className="flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Anyone with this link can import your strategy
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShareStrategy(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    window.open(generateShareLink(shareStrategy), '_blank');
                    setShareStrategy(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLink size={14} />
                  Open Link
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
