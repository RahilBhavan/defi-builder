import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import React, { useState } from 'react';
import type { LegoBlock } from '../types';
import { Block } from './Block';

interface SpineProps {
  blocks: LegoBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onOpenSuggester: () => void;
  onReorderBlocks: (draggedId: string, targetIndex: number) => void;
  onAddBlock?: (block: LegoBlock, targetIndex?: number) => void;
}

export const Spine: React.FC<SpineProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onOpenSuggester,
  onReorderBlocks,
  onAddBlock,
}) => {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    // Make drag image semi-transparent
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');

    if (draggedId && draggedId !== blocks[targetIndex]?.id) {
      onReorderBlocks(draggedId, targetIndex);
    }

    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDropFromExternal = (e: React.DragEvent<HTMLDivElement>, targetIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const blockData = e.dataTransfer.getData('application/json');
      if (blockData && onAddBlock) {
        const block = JSON.parse(blockData) as LegoBlock;
        // Create a new block with a unique ID
        const newBlock = { ...block, id: `${block.id}-${Date.now()}` };
        onAddBlock(newBlock, targetIndex ?? blocks.length);
      }
    } catch (error) {
      console.error('Failed to parse dropped block:', error);
    }
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center py-8 sm:py-20 px-4 sm:px-6"
      onClick={() => onSelectBlock(null)}
      onDragOver={(e) => {
        // Allow dropping blocks from external sources
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => handleDropFromExternal(e)}
      role="main"
      aria-label="Strategy builder workspace"
    >
      <div className="w-full max-w-[750px] flex flex-col gap-4 sm:gap-8 items-center">
        {/* Empty State */}
        {blocks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full h-96 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange hover:bg-gradient-to-br hover:from-orange/5 hover:to-transparent transition-all bg-white/90 shadow-lg group"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSuggester();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDropFromExternal(e, 0);
            }}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1 }}
              className="text-7xl mb-8 text-gray-300 group-hover:text-orange font-thin transition-colors"
            >
              +
            </motion.div>
            <p className="text-lg font-bold text-gray-700 group-hover:text-ink uppercase tracking-widest mb-3 transition-colors">
              Add Your First Block
            </p>
            <p className="text-sm text-gray-500 font-mono group-hover:text-gray-600 transition-colors mb-4">
              Click to open AI Palette or drag a block here
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
              <span className="px-2 py-1 bg-gray-100 rounded text-gray-500">⌘K</span>
              <span>or</span>
              <span className="px-2 py-1 bg-gray-100 rounded text-gray-500">Click + AI</span>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              {/* Drop Zone Above Block */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Check if it's an external block or internal reorder
                  const blockData = e.dataTransfer.getData('application/json');
                  if (blockData) {
                    e.dataTransfer.dropEffect = 'copy';
                    setDragOverIndex(index);
                  } else {
                    handleDragOver(e, index);
                  }
                }}
                onDrop={(e) => {
                  const blockData = e.dataTransfer.getData('application/json');
                  if (blockData && onAddBlock) {
                    handleDropFromExternal(e, index);
                  } else {
                    handleDrop(e, index);
                  }
                }}
                onDragLeave={handleDragLeave}
                className={`transition-all ${dragOverIndex === index ? 'h-16' : 'h-2'}`}
              >
                {dragOverIndex === index && (
                  <div className="h-full border-2 border-dashed border-orange bg-gradient-to-br from-orange/20 to-orange/5 rounded-lg flex items-center justify-center shadow-sm">
                    <div className="text-xs font-mono text-orange font-bold uppercase flex items-center gap-2">
                      <span>↓</span> Drop Here
                    </div>
                  </div>
                )}
              </div>

              {/* Connector */}
              {index > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 48, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-0.5 bg-gradient-to-b from-success-green to-success-green/50 mx-auto relative flex items-center justify-center"
                >
                  <div className="bg-white border-2 border-success-green text-success-green p-2 rounded-full z-10 shadow-sm">
                    <ArrowDown size={14} />
                  </div>
                </motion.div>
              )}

              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: draggedBlockId === block.id ? 0.5 : 1,
                  scale: draggedBlockId === block.id ? 0.95 : 1,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="w-full"
                draggable
                onDragStart={(e) => {
                  // Convert to DragEvent if needed
                  const dragEvent = e as unknown as React.DragEvent<HTMLDivElement>;
                  handleDragStart(dragEvent, block.id);
                  // Add visual feedback
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.cursor = 'grabbing';
                  }
                }}
                onDragEnd={(e) => {
                  handleDragEnd();
                  // Reset cursor
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.cursor = 'grab';
                  }
                }}
                style={{ cursor: 'grab' }}
              >
                <Block
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                />
              </motion.div>
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Drop Zone at End */}
        {blocks.length > 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const blockData = e.dataTransfer.getData('application/json');
              if (blockData) {
                e.dataTransfer.dropEffect = 'copy';
              } else {
                e.dataTransfer.dropEffect = 'move';
              }
              setDragOverIndex(blocks.length);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const blockData = e.dataTransfer.getData('application/json');
              if (blockData && onAddBlock) {
                handleDropFromExternal(e, blocks.length);
              } else {
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId) {
                  onReorderBlocks(draggedId, blocks.length);
                }
              }
              setDraggedBlockId(null);
              setDragOverIndex(null);
            }}
            onDragLeave={handleDragLeave}
            className={`transition-all ${dragOverIndex === blocks.length ? 'h-16' : 'h-2'}`}
          >
            {dragOverIndex === blocks.length && (
              <div className="h-full border-2 border-dashed border-orange bg-gradient-to-br from-orange/20 to-orange/5 rounded-lg flex items-center justify-center shadow-sm">
                <div className="text-xs font-mono text-orange font-bold uppercase flex items-center gap-2">
                  <span>↓</span> Drop Here
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Button at bottom if blocks exist */}
        {blocks.length > 0 && (
          <motion.div layout className="mx-auto mt-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSuggester();
              }}
              className="w-14 h-14 bg-white border-2 border-dashed border-gray-300 hover:border-orange hover:bg-orange/5 flex items-center justify-center text-gray-400 hover:text-orange transition-all shadow-sm rounded-lg group"
              title="Add another block"
            >
              <span className="text-2xl group-hover:scale-125 transition-transform font-thin">
                +
              </span>
            </button>
            <p className="text-xs text-gray-400 text-center mt-3 font-mono">Add another block</p>
          </motion.div>
        )}
      </div>

      {/* Bottom padding for scrolling */}
      <div className="h-64 flex-shrink-0" />
    </div>
  );
};
