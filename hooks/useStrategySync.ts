import { useEffect } from 'react';
import type { LegoBlock } from '../types';

/**
 * Hook for syncing strategy blocks with backend
 * Currently a placeholder - can be extended to sync with tRPC
 */
export function useStrategySync(blocks: LegoBlock[], onLoad?: (blocks: LegoBlock[]) => void) {
  useEffect(() => {
    // Placeholder for future backend sync
    // This can be extended to:
    // - Auto-save to backend via tRPC
    // - Load from backend on mount
    // - Handle conflicts when multiple tabs are open

    if (onLoad) {
      // For now, this is a no-op
      // In the future, this could load from backend
    }
  }, [blocks, onLoad]);
}
