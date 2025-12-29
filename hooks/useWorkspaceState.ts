import { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LegoBlock, ValidationResult, BlockParams } from '../types';
import { validateStrategy } from '../services/strategyValidator';
import { useLocalStorage } from './useLocalStorage';
import { useUndoRedo } from './useUndoRedo';

/**
 * Custom hook for managing workspace state
 * Extracts state management logic from Workspace component
 */
export function useWorkspaceState() {
  const [blocksFromStorage, setBlocksFromStorage] = useLocalStorage<LegoBlock[]>('defi-builder-blocks', []);
  
  // Use undo/redo for blocks
  const [blocks, setBlocksWithHistory, undoBlocks, redoBlocks, canUndo, canRedo] = useUndoRedo<LegoBlock[]>(
    blocksFromStorage,
    50
  );

  // Sync blocks to localStorage whenever they change
  useEffect(() => {
    if (JSON.stringify(blocks) !== JSON.stringify(blocksFromStorage)) {
      setBlocksFromStorage(blocks);
    }
  }, [blocks, blocksFromStorage, setBlocksFromStorage]);

  // Wrapper that updates both undo/redo history and triggers localStorage sync
  const setBlocks = useCallback((newBlocks: LegoBlock[] | ((prev: LegoBlock[]) => LegoBlock[])) => {
    setBlocksWithHistory(newBlocks);
  }, [setBlocksWithHistory]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Derived state
  const selectedBlock = useMemo(
    () => blocks.find(b => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  const validationResult = useMemo<ValidationResult>(() => {
    return validateStrategy(blocks);
  }, [blocks]);

  // Handlers
  const handleAddBlock = useCallback((block: LegoBlock) => {
    const newBlock = { ...block, id: uuidv4() };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowLeftPanel(false);
    setShowRightPanel(true);
  }, [setBlocks]);

  const handleSelectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
    if (blockId) {
      setShowRightPanel(true);
    } else {
      setShowRightPanel(false);
    }
  }, []);

  const handleDeleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
      setShowRightPanel(false);
    }
  }, [selectedBlockId, setBlocks]);

  const handleUpdateBlock = useCallback((blockId: string, newParams: BlockParams) => {
    setBlocks(prev => prev.map(b => (b.id === blockId ? { ...b, params: newParams } : b)));
  }, [setBlocks]);

  return {
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
  };
}

