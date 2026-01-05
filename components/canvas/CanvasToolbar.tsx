import type React from 'react';
import type { ValidationResult } from '../../services/strategyValidator';
import { SecondaryMenu } from '../workspace/SecondaryMenu';
import { ValidationStatus } from '../workspace/ValidationStatus';

interface CanvasToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAutoLayout: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  onExecute: () => void;
  isExecuting: boolean;
  validationResult: ValidationResult | null;
  onOpenBacktest: () => void;
  onOpenOptimization: () => void;
  onOpenPaperTrading: () => void;
  onOpenSettings: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onExport,
  onImport,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onExecute,
  isExecuting,
  validationResult,
  onOpenBacktest,
  onOpenOptimization,
  onOpenPaperTrading,
  onOpenSettings,
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-4">
      {/* Left side - Validation and controls */}
      <div className="flex items-center gap-4">
        <ValidationStatus validationResult={validationResult} />
      </div>

      {/* Right side - Menu */}
      <SecondaryMenu
        onOpenBacktest={onOpenBacktest}
        onOpenPortfolio={() => {}} // Not in props, can be added later
        onOpenLibrary={() => {}} // Not in props, can be added later
        onOpenSettings={onOpenSettings}
        onOpenPaperTrading={onOpenPaperTrading}
        onExport={onExport}
        onImport={onImport}
      />
    </div>
  );
};
