import React, { useState, lazy, Suspense } from 'react';
import { Spine } from './Spine';
import { AIBlockSuggester } from './workspace/AIBlockSuggester';
import { BlockConfigPanel } from './workspace/BlockConfigPanel';
import { ExecuteButton } from './workspace/ExecuteButton';
import { ValidationStatus } from './workspace/ValidationStatus';
import { NetworkBadge } from './workspace/NetworkBadge';
import { SecondaryMenu } from './workspace/SecondaryMenu';
import { ZoomControls } from './workspace/ZoomControls';

// Lazy load modals and heavy components
const BacktestModal = lazy(() => import('./modals/BacktestModal').then(m => ({ default: m.BacktestModal })));
const PortfolioModal = lazy(() => import('./modals/PortfolioModal').then(m => ({ default: m.PortfolioModal })));
const StrategyLibraryModal = lazy(() => import('./modals/StrategyLibraryModal').then(m => ({ default: m.StrategyLibraryModal })));
const SettingsModal = lazy(() => import('./modals/SettingsModal').then(m => ({ default: m.SettingsModal })));
const OptimizationPanel = lazy(() => import('./OptimizationPanel').then(m => ({ default: m.OptimizationPanel })));
import { executeStrategy } from '../services/executionEngine';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { exportBlocks, importBlocks } from '../services/strategyStorage';
import { DeFiBacktestResult } from '../services/defiBacktestEngine';
import { useWorkspaceState } from '../hooks/useWorkspaceState';

const Workspace: React.FC = () => {
  // Extract workspace state management
  const {
    blocks,
    setBlocks,
    selectedBlockId,
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [backtestResult, setBacktestResult] = useState<DeFiBacktestResult | null>(null);

  // Modal states
  const [showBacktestPanel, setShowBacktestPanel] = useState(false);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [showPortfolioPanel, setShowPortfolioPanel] = useState(false);
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const handleExport = useCallback(() => {
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
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export strategy');
    }
  }, [blocks]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const importedBlocks = importBlocks(json);
          setBlocks(importedBlocks);
        } catch (error) {
          console.error('Import failed:', error);
          alert(error instanceof Error ? error.message : 'Failed to import strategy');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setBlocks]);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const result = await executeStrategy(blocks);
      setBacktestResult(result);
      setShowBacktestPanel(true); // Show results after execution
    } catch (error) {
      console.error('Strategy execution failed:', error);
      alert('Strategy execution failed. Please check the console for details.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenPalette: () => setShowLeftPanel(true),
    onExecute: () => {
        if (validationResult?.valid && !isExecuting) handleExecute();
    },
    onEscape: () => {
      setShowLeftPanel(false);
      setShowRightPanel(false);
      setSelectedBlockId(null);
      setShowBacktestPanel(false);
      setShowOptimizationPanel(false);
      setShowPortfolioPanel(false);
      setShowLibraryPanel(false);
      setShowSettingsPanel(false);
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
    <div className="relative w-full h-screen bg-canvas overflow-hidden flex flex-col">
      
      {/* 1. Canvas Layer - Center area for Spine */}
      <main className="relative w-full h-full overflow-hidden bg-dot-pattern">
         <div 
            className="w-full h-full overflow-y-auto"
            style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
         >
            <Spine
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={handleSelectBlock}
                onDeleteBlock={handleDeleteBlock}
                onOpenSuggester={() => setShowLeftPanel(true)}
            />
         </div>
      </main>

      {/* 2. Persistent UI Layer */}
      <NetworkBadge />
      
      <SecondaryMenu 
        onOpenBacktest={() => setShowBacktestPanel(true)}
        onOpenPortfolio={() => setShowPortfolioPanel(true)} 
        onOpenLibrary={() => setShowLibraryPanel(true)}
        onOpenSettings={() => setShowSettingsPanel(true)}
        onExport={handleExport}
        onImport={handleImport}
      />

      <ExecuteButton
        isValid={validationResult?.valid ?? false}
        isExecuting={isExecuting}
        onClick={handleExecute}
      />

      <div className="fixed bottom-12 left-12 flex gap-4 z-40 items-center">
        <button
            onClick={() => setShowOptimizationPanel(true)}
            className="px-4 py-3 bg-white border border-gray-300 hover:border-orange hover:text-orange text-ink font-mono text-xs font-bold uppercase transition-colors shadow-sm"
        >
            [05] OPTIMIZE
        </button>
        <div className="flex gap-1">
          <button
            onClick={undoBlocks}
            disabled={!canUndo}
            className="px-3 py-2 bg-white border border-gray-300 hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed text-ink font-mono text-xs font-bold uppercase transition-colors shadow-sm"
            aria-label="Undo"
            title="Undo (Cmd/Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redoBlocks}
            disabled={!canRedo}
            className="px-3 py-2 bg-white border border-gray-300 hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed text-ink font-mono text-xs font-bold uppercase transition-colors shadow-sm"
            aria-label="Redo"
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>
        <ValidationStatus validationResult={validationResult} />
      </div>

      <ZoomControls zoomLevel={zoomLevel} onZoomChange={setZoomLevel} />

      {/* Palette Toggle - Left Edge */}
      <button
        onClick={() => setShowLeftPanel(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 w-12 h-32 bg-white border-r border-y border-gray-300 flex items-center justify-center hover:w-14 hover:border-ink transition-all z-30 shadow-sm group"
        aria-label="Open block palette"
      >
        <span className="transform -rotate-90 font-mono text-xs font-bold whitespace-nowrap text-gray-400 group-hover:text-ink">
          + AI
        </span>
      </button>

      {/* 3. On-Demand Panels Layer */}
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

      {/* Modals - Lazy loaded */}
      <Suspense fallback={null}>
        {showBacktestPanel && (
          <BacktestModal 
            isOpen={showBacktestPanel}
            onClose={() => setShowBacktestPanel(false)}
            result={backtestResult}
          />
        )}
        {showPortfolioPanel && (
          <PortfolioModal
            isOpen={showPortfolioPanel}
            onClose={() => setShowPortfolioPanel(false)}
          />
        )}
        {showLibraryPanel && (
          <StrategyLibraryModal
            isOpen={showLibraryPanel}
            onClose={() => setShowLibraryPanel(false)}
          />
        )}
        {showSettingsPanel && (
          <SettingsModal
            isOpen={showSettingsPanel}
            onClose={() => setShowSettingsPanel(false)}
          />
        )}
        {showOptimizationPanel && (
          <OptimizationPanel
            isOpen={showOptimizationPanel}
            onClose={() => setShowOptimizationPanel(false)}
            blocks={blocks}
          />
        )}
      </Suspense>

    </div>
  );
};

export default Workspace;
