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
    // Note: onLoad is intentionally not in dependencies to avoid infinite loops
    // It should be memoized with useCallback by the caller if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);
}
