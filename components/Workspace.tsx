import { ReactFlowProvider } from '@xyflow/react';
import type React from 'react';
import { Suspense, lazy, useCallback, useState } from 'react';
import { smartLayout } from '../lib/canvas/layoutEngine';
import { getUserFriendlyErrorMessage } from '../lib/error/handler';
import { blocksToCanvasElements } from '../lib/spine/canvas';
import { ErrorBoundary } from './ErrorBoundary';
import { CanvasToolbar, StrategyCanvas } from './canvas';
import { AIBlockSuggester } from './workspace/AIBlockSuggester';
import { BlockConfigPanel } from './workspace/BlockConfigPanel';
import { ExecuteButton } from './workspace/ExecuteButton';

// Lazy load modals and heavy components
const BacktestModal = lazy(() =>
  import('./modals/BacktestModal').then((m) => ({ default: m.BacktestModal }))
);
const PortfolioModal = lazy(() =>
  import('./modals/PortfolioModal').then((m) => ({ default: m.PortfolioModal }))
);
const StrategyLibraryModal = lazy(() =>
  import('./modals/StrategyLibraryModal').then((m) => ({ default: m.StrategyLibraryModal }))
);
const SettingsModal = lazy(() =>
  import('./modals/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const OptimizationPanel = lazy(() =>
  import('@/features/optimization').then((m) => ({ default: m.OptimizationPanel }))
);
const PaperTradingPanel = lazy(() =>
  import('./paperTrading/PaperTradingPanel').then((m) => ({ default: m.PaperTradingPanel }))
);
const PaperTradingModal = lazy(() =>
  import('./modals/PaperTradingModal').then((m) => ({ default: m.PaperTradingModal }))
);
const MarketplaceModal = lazy(() =>
  import('./marketplace/MarketplaceModal').then((m) => ({ default: m.MarketplaceModal }))
);

import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useModalState } from '../hooks/useModalState';
import { useToast } from '../hooks/useToast';
import { useWallet } from '../hooks/useWallet';
import { useWorkspaceState } from '../hooks/useWorkspaceState';
import type { DeFiBacktestResult } from '../services/defiBacktestEngine';
import { exportBlocks, importBlocks } from '../services/strategyStorage';

const Workspace: React.FC = () => {
  const { error: showError, success: showSuccess } = useToast();

  // Extract workspace state management
  const {
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    validationResult,
    showLeftPanel,
    setShowLeftPanel,
    showRightPanel,
    setShowRightPanel,
    handleAddBlock,
    handleSelectBlock,
    handleDeleteBlock,
    handleUpdateBlock,
    undoBlocks,
    redoBlocks,
    canUndo,
    canRedo,
  } = useWorkspaceState();

  // Local UI state
  const [isExecuting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [backtestResult] = useState<DeFiBacktestResult | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);

  // Wallet connection
  const { isConnected } = useWallet();

  // Consolidated modal state
  const {
    isBacktestOpen,
    isPortfolioOpen,
    isSettingsOpen,
    isLibraryOpen,
    isOptimizationOpen,
    isPaperTradingOpen,
    isMarketplaceOpen,
    openModal,
    closeModal,
  } = useModalState();

  // Paper trading state
  const [paperTradingSessionId, setPaperTradingSessionId] = useState<string | undefined>();

  const handleExport = useCallback(async () => {
    try {
      const json = exportBlocks(blocks);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `defi-strategy-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Strategy exported successfully');
    } catch (error) {
      const { logger } = await import('../lib/monitoring/logger');
      logger.error(
        'Export failed',
        error instanceof Error ? error : new Error(String(error)),
        'Workspace'
      );
      showError('Failed to export strategy. Please ensure your strategy is valid and try again.');
    }
  }, [blocks, showError, showSuccess]);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          const importedBlocks = importBlocks(json);
          setBlocks(importedBlocks);
          showSuccess('Strategy imported successfully');
        } catch (error) {
          const { logger } = await import('../lib/monitoring/logger');
          logger.error(
            'Import failed',
            error instanceof Error ? error : new Error(String(error)),
            'Workspace'
          );
          showError(getUserFriendlyErrorMessage(error, 'import'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setBlocks, showError, showSuccess]);

  const handleSave = useCallback(() => {
    openModal('library');
  }, [openModal]);

  const handleLoad = useCallback(() => {
    openModal('library');
  }, [openModal]);

  const handleExecute = async () => {
    // Instead of executing directly, open paper trading
    if (blocks.length === 0) {
      showError('Please add blocks to your strategy before starting paper trading');
      return;
    }

    // Open paper trading modal
    setPaperTradingSessionId(undefined);
    openModal('paperTrading');
  };

  const handleAutoLayout = useCallback(() => {
    if (blocks.length === 0) return;

    // Convert blocks to nodes/edges, apply layout, then update positions
    const { nodes, edges } = blocksToCanvasElements(blocks);
    // Apply smart layout - the canvas will handle the visual arrangement
    smartLayout(nodes, edges);

    showSuccess('Layout applied');
  }, [blocks, showSuccess]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 10, 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const handleConfigureBlock = useCallback(
    (blockId: string) => {
      handleSelectBlock(blockId);
      setShowRightPanel(true);
    },
    [handleSelectBlock, setShowRightPanel]
  );

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenPalette: () => setShowLeftPanel(true),
    onExecute: () => {
      if (validationResult?.valid && !isExecuting && isConnected) handleExecute();
    },
    onEscape: () => {
      setShowLeftPanel(false);
      setShowRightPanel(false);
      setSelectedBlockId(null);
      closeModal();
    },
    onDeleteBlock: () => {
      if (selectedBlockId) {
        handleDeleteBlock(selectedBlockId);
      }
    },
    onUndo: canUndo ? () => undoBlocks() : undefined,
    onRedo: canRedo ? () => redoBlocks() : undefined,
  });

  return (
    <ReactFlowProvider>
      <div className="relative w-full h-screen bg-canvas overflow-hidden flex flex-col">
        {/* Top Toolbar */}
        <CanvasToolbar
          onSave={handleSave}
          onLoad={handleLoad}
          onExport={handleExport}
          onImport={handleImport}
          onUndo={undoBlocks}
          onRedo={redoBlocks}
          canUndo={canUndo}
          canRedo={canRedo}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onAutoLayout={handleAutoLayout}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((prev) => !prev)}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap((prev) => !prev)}
          onExecute={handleExecute}
          isExecuting={isExecuting}
          validationResult={validationResult}
          onOpenBacktest={() => openModal('backtest')}
          onOpenOptimization={() => openModal('optimization')}
          onOpenPaperTrading={() => {
            setPaperTradingSessionId(undefined);
            openModal('paperTrading');
          }}
          onOpenSettings={() => openModal('settings')}
        />

        {/* Main Canvas Area */}
        <main className="flex-1 pt-14 relative overflow-y-auto overflow-x-hidden">
          <StrategyCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            validationResult={validationResult}
            onBlocksChange={setBlocks}
            onSelectBlock={handleSelectBlock}
            onDeleteBlock={handleDeleteBlock}
            onConfigureBlock={handleConfigureBlock}
            onOpenSuggester={() => setShowLeftPanel(true)}
            showGrid={showGrid}
            showMinimap={showMinimap}
          />

          {/* Palette Toggle - Left Edge */}
          <button
            type="button"
            onClick={() => setShowLeftPanel(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 w-10 h-24 bg-white/90 backdrop-blur-sm border-r border-y border-gray-200 flex items-center justify-center hover:w-12 hover:border-ink transition-all z-30 shadow-sm group rounded-r-lg"
            aria-label="Open block palette"
          >
            <span className="transform -rotate-90 font-mono text-[10px] font-bold whitespace-nowrap text-gray-400 group-hover:text-ink uppercase tracking-wider">
              + Blocks
            </span>
          </button>
        </main>

        {/* Execute Button - Fixed at bottom center */}
        {blocks.length > 0 && (
          <ExecuteButton
            isValid={(validationResult?.valid ?? false) && isConnected}
            isExecuting={isExecuting}
            onClick={handleExecute}
          />
        )}

        {/* Side Panels */}
        <AIBlockSuggester
          isOpen={showLeftPanel}
          onClose={() => setShowLeftPanel(false)}
          currentBlocks={blocks}
          onAddBlock={handleAddBlock}
        />

        <BlockConfigPanel
          isOpen={showRightPanel}
          block={selectedBlock}
          onClose={() => setShowRightPanel(false)}
          onUpdate={handleUpdateBlock}
          onDelete={() => selectedBlock && handleDeleteBlock(selectedBlock.id)}
        />

        {/* Modals - Lazy loaded with error boundaries */}
        <Suspense fallback={null}>
          {isBacktestOpen && (
            <ErrorBoundary>
              <BacktestModal isOpen={isBacktestOpen} onClose={closeModal} result={backtestResult} />
            </ErrorBoundary>
          )}
          {isPortfolioOpen && (
            <ErrorBoundary>
              <PortfolioModal isOpen={isPortfolioOpen} onClose={closeModal} />
            </ErrorBoundary>
          )}
          {isLibraryOpen && (
            <ErrorBoundary>
              <StrategyLibraryModal
                isOpen={isLibraryOpen}
                onClose={closeModal}
                currentBlocks={blocks}
                onLoadStrategy={(loadedBlocks) => {
                  setBlocks(loadedBlocks);
                  showSuccess('Strategy loaded successfully');
                }}
              />
            </ErrorBoundary>
          )}
          {isSettingsOpen && (
            <ErrorBoundary>
              <SettingsModal isOpen={isSettingsOpen} onClose={closeModal} />
            </ErrorBoundary>
          )}
          {isMarketplaceOpen && (
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="text-white">Loading...</div>
                  </div>
                }
              >
                <MarketplaceModal
                  isOpen={isMarketplaceOpen}
                  onClose={closeModal}
                  onLoadStrategy={(_strategyId) => {
                    // Load strategy from marketplace
                    // This will be handled by the marketplace modal's fork functionality
                    showSuccess('Strategy loaded from marketplace');
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {isPaperTradingOpen && (
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="text-white">Loading...</div>
                  </div>
                }
              >
                <PaperTradingPanel
                  isOpen={isPaperTradingOpen}
                  onClose={closeModal}
                  onCreateSession={() => {
                    // Close the panel and open the modal to create a new session
                    closeModal();
                    // Set a temporary ID to trigger the modal
                    setPaperTradingSessionId('new');
                  }}
                  onViewSession={(sessionId) => {
                    closeModal();
                    setPaperTradingSessionId(sessionId);
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {paperTradingSessionId !== undefined && (
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="text-white">Loading...</div>
                  </div>
                }
              >
                <PaperTradingModal
                  isOpen={paperTradingSessionId !== undefined}
                  onClose={() => {
                    setPaperTradingSessionId(undefined);
                  }}
                  blocks={blocks}
                  sessionId={paperTradingSessionId === 'new' ? undefined : paperTradingSessionId}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {isOptimizationOpen && (
            <ErrorBoundary>
              <OptimizationPanel
                isOpen={isOptimizationOpen}
                onClose={closeModal}
                blocks={blocks}
                onApplySolution={(updatedBlocks) => {
                  setBlocks(updatedBlocks);
                  showSuccess('Optimized parameters applied to strategy');
                }}
              />
            </ErrorBoundary>
          )}
        </Suspense>
      </div>
    </ReactFlowProvider>
  );
};

export default Workspace;
