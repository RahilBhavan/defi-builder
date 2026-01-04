import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  // Basic shortcuts
  onOpenPalette?: () => void;
  onExecute?: () => void;
  onEscape?: () => void;
  onDeleteBlock?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  // Canvas shortcuts
  onSelectAll?: () => void;
  onDuplicate?: () => void;
  onAutoLayout?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFitView?: () => void;
  onSave?: () => void;
  onLoad?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const handlersRef = useRef(handlers);

  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      // Cmd/Ctrl + K: Open block palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlersRef.current.onOpenPalette?.();
        return;
      }

      // Cmd/Ctrl + E: Execute strategy
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handlersRef.current.onExecute?.();
        return;
      }

      // Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handlersRef.current.onSave?.();
        return;
      }

      // Cmd/Ctrl + O: Load/Open
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handlersRef.current.onLoad?.();
        return;
      }

      // Cmd/Ctrl + Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlersRef.current.onUndo?.();
        return;
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y: Redo
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handlersRef.current.onRedo?.();
        return;
      }

      // Cmd/Ctrl + A: Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isInputActive) {
        e.preventDefault();
        handlersRef.current.onSelectAll?.();
        return;
      }

      // Cmd/Ctrl + D: Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isInputActive) {
        e.preventDefault();
        handlersRef.current.onDuplicate?.();
        return;
      }

      // Cmd/Ctrl + G: Auto-layout (Grid/Graph arrange)
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !isInputActive) {
        e.preventDefault();
        handlersRef.current.onAutoLayout?.();
        return;
      }

      // Cmd/Ctrl + Plus: Zoom in
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handlersRef.current.onZoomIn?.();
        return;
      }

      // Cmd/Ctrl + Minus: Zoom out
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        handlersRef.current.onZoomOut?.();
        return;
      }

      // Cmd/Ctrl + 0: Reset zoom
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handlersRef.current.onZoomReset?.();
        return;
      }

      // Cmd/Ctrl + 1: Fit view
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        handlersRef.current.onFitView?.();
        return;
      }

      // Skip for input fields from here
      if (isInputActive) return;

      // Escape: Close panels/deselect
      if (e.key === 'Escape') {
        handlersRef.current.onEscape?.();
        return;
      }

      // Delete/Backspace: Delete selected block
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handlersRef.current.onDeleteBlock?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array - handlers accessed via ref
};

/**
 * Hook for displaying keyboard shortcuts in UI
 */
export function useShortcutDisplay() {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const modKey = isMac ? '⌘' : 'Ctrl';

  return {
    modKey,
    shortcuts: {
      openPalette: `${modKey}K`,
      execute: `${modKey}E`,
      save: `${modKey}S`,
      load: `${modKey}O`,
      undo: `${modKey}Z`,
      redo: isMac ? `${modKey}⇧Z` : `${modKey}Y`,
      selectAll: `${modKey}A`,
      duplicate: `${modKey}D`,
      autoLayout: `${modKey}G`,
      zoomIn: `${modKey}+`,
      zoomOut: `${modKey}-`,
      zoomReset: `${modKey}0`,
      fitView: `${modKey}1`,
      delete: '⌫',
      escape: 'Esc',
    },
  };
}
