import { ReactFlowProvider } from '@xyflow/react';
import type React from 'react';
import type { ValidationResult } from '../../services/strategyValidator';
import type { LegoBlock } from '../../types';
import { Spine } from '../Spine';

interface StrategyCanvasProps {
  blocks: LegoBlock[];
  selectedBlockId: string | null;
  validationResult: ValidationResult | null;
  onBlocksChange: (blocks: LegoBlock[]) => void;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onConfigureBlock: (id: string) => void;
  onOpenSuggester: () => void;
  showGrid: boolean;
  showMinimap: boolean;
}

export const StrategyCanvas: React.FC<StrategyCanvasProps> = ({
  blocks,
  selectedBlockId,
  onBlocksChange,
  onSelectBlock,
  onDeleteBlock,
  onOpenSuggester,
  showGrid,
}) => {
  const handleReorderBlocks = (draggedId: string, targetIndex: number) => {
    // Find the dragged block
    const draggedIndex = blocks.findIndex((b) => b.id === draggedId);
    if (draggedIndex === -1) return;

    // Create new array with reordered blocks
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    if (removed) {
      newBlocks.splice(targetIndex, 0, removed);
      // Update blocks via parent callback
      onBlocksChange(newBlocks);
    }
  };

  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <Spine
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
          onDeleteBlock={onDeleteBlock}
          onOpenSuggester={onOpenSuggester}
          onReorderBlocks={handleReorderBlocks}
        />
      </div>
    </ReactFlowProvider>
  );
};
