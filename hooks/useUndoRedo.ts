import { useCallback, useEffect, useRef, useState } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Custom hook for undo/redo functionality
 * @param initialState - Initial state value
 * @param maxHistorySize - Maximum number of history entries (default: 50)
 * @returns Tuple of [currentState, setState, undo, redo, canUndo, canRedo]
 */
export function useUndoRedo<T>(
  initialState: T,
  maxHistorySize = 50
): [T, (newState: T | ((prev: T) => T)) => void, () => void, () => void, boolean, boolean] {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const isUndoingRef = useRef(false);
  const isRedoingRef = useRef(false);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current.clear();
    };
  }, []);

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      // Don't add to history if we're in the middle of undo/redo
      if (isUndoingRef.current || isRedoingRef.current) {
        return;
      }

      setHistory((prev) => {
        const nextPresent =
          typeof newState === 'function' ? (newState as (prev: T) => T)(prev.present) : newState;

        // Don't add to history if state hasn't changed
        if (nextPresent === prev.present) {
          return prev;
        }

        const newPast = [...prev.past, prev.present];

        // Limit history size
        const trimmedPast =
          newPast.length > maxHistorySize ? newPast.slice(-maxHistorySize) : newPast;

        return {
          past: trimmedPast,
          present: nextPresent,
          future: [], // Clear future when new action is performed
        };
      });
    },
    [maxHistorySize]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) {
        return prev;
      }

      isUndoingRef.current = true;
      const previous = prev.past[prev.past.length - 1];
      if (previous === undefined) {
        return prev;
      }
      const newPast = prev.past.slice(0, -1);

      const timeoutId = setTimeout(() => {
        isUndoingRef.current = false;
        timeoutRefs.current.delete(timeoutId);
      }, 0);
      timeoutRefs.current.add(timeoutId);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) {
        return prev;
      }

      isRedoingRef.current = true;
      const next = prev.future[0];
      if (next === undefined) {
        return prev;
      }
      const newFuture = prev.future.slice(1);

      const timeoutId = setTimeout(() => {
        isRedoingRef.current = false;
        timeoutRefs.current.delete(timeoutId);
      }, 0);
      timeoutRefs.current.add(timeoutId);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return [history.present, setState, undo, redo, canUndo, canRedo];
}
