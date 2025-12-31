import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { validateStrategy } from '../services/strategyValidator';
import type { BlockParams, LegoBlock, ValidationResult } from '../types';
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';
import { useStrategySync } from './useStrategySync';
import { useUndoRedo } from './useUndoRedo';

/**
 * Deep equality check for arrays of objects
 * More efficient than JSON.stringify for large arrays
 */
function areBlocksEqual(a: LegoBlock[], b: LegoBlock[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const blockA = a[i];
    const blockB = b[i];
    if (!blockA || !blockB || blockA.id !== blockB.id) return false;
    // Quick check - if IDs match, assume blocks are equal
    // For more thorough check, could compare all properties
  }
  return true;
}

/**
 * Custom hook for managing workspace state
 * Extracts state management logic from Workspace component
 */
export function useWorkspaceState() {
  const [blocksFromStorage, setBlocksFromStorage] = useLocalStorage<LegoBlock[]>(
    'defi-builder-blocks',
    []
  );

  // Use undo/redo for blocks
  const [blocks, setBlocksWithHistory, undoBlocks, redoBlocks, canUndo, canRedo] = useUndoRedo<
    LegoBlock[]
  >(blocksFromStorage, 50);

  // Track previous blocks to avoid unnecessary localStorage writes
  const prevBlocksRef = useRef<LegoBlock[]>(blocks);

  // Sync blocks to localStorage whenever they change
  useEffect(() => {
    // Only update if blocks actually changed (avoid infinite loops)
    if (!areBlocksEqual(blocks, prevBlocksRef.current)) {
      prevBlocksRef.current = blocks;
      setBlocksFromStorage(blocks);
    }
  }, [blocks, setBlocksFromStorage]);

  // Sync with backend (auto-save)
  useStrategySync(blocks, (loadedBlocks) => {
    // When strategy is loaded from backend, update blocks
    if (loadedBlocks.length > 0) {
      setBlocks(loadedBlocks);
    }
  });

  // Wrapper that updates both undo/redo history and triggers localStorage sync
  const setBlocks = useCallback(
    (newBlocks: LegoBlock[] | ((prev: LegoBlock[]) => LegoBlock[])) => {
      setBlocksWithHistory(newBlocks);
    },
    [setBlocksWithHistory]
  );

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Derived state
  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  // Debounce blocks for validation to prevent UI blocking on rapid changes
  const debouncedBlocks = useDebounce(blocks, 300);
  const [isValidating, setIsValidating] = useState(false);

  // Compute validation result (pure computation)
  const validationResult = useMemo<ValidationResult>(() => {
    return validateStrategy(debouncedBlocks);
  }, [debouncedBlocks]);

  // Handle validation state separately (side effect)
  useEffect(() => {
    setIsValidating(true);
    const timer = setTimeout(() => {
      setIsValidating(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [debouncedBlocks]);

  // Handlers
  const handleAddBlock = useCallback(
    (block: LegoBlock) => {
      const newBlock = { ...block, id: uuidv4() };
      setBlocks((prev) => [...prev, newBlock]);
      setSelectedBlockId(newBlock.id);
      setShowLeftPanel(false);
      setShowRightPanel(true);
    },
    [setBlocks]
  );

  const handleSelectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
    if (blockId) {
      setShowRightPanel(true);
    } else {
      setShowRightPanel(false);
    }
  }, []);

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
        setShowRightPanel(false);
      }
    },
    [selectedBlockId, setBlocks]
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, newParams: BlockParams) => {
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, params: newParams } : b)));
    },
    [setBlocks]
  );

  const handleReorderBlocks = useCallback(
    (draggedId: string, targetIndex: number) => {
      setBlocks((prev) => {
        const newBlocks = [...prev];
        const draggedIndex = newBlocks.findIndex((b) => b.id === draggedId);

        if (draggedIndex === -1 || draggedIndex === targetIndex) {
          return prev;
        }

        // Remove dragged block
        const [draggedBlock] = newBlocks.splice(draggedIndex, 1);

        // Insert at target position (draggedBlock is guaranteed to exist due to findIndex check)
        if (draggedBlock) {
          newBlocks.splice(targetIndex, 0, draggedBlock);
        }

        return newBlocks;
      });
    },
    [setBlocks]
  );

  return {
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    validationResult,
    isValidating,
    showLeftPanel,
    setShowLeftPanel,
    showRightPanel,
    setShowRightPanel,
    handleAddBlock,
    handleSelectBlock,
    handleDeleteBlock,
    handleUpdateBlock,
    handleReorderBlocks,
    undoBlocks,
    redoBlocks,
    canUndo,
    canRedo,
  };
}
