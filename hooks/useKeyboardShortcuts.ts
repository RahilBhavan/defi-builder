import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  onOpenPalette?: () => void;
  onExecute?: () => void;
  onEscape?: () => void;
  onDeleteBlock?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const handlersRef = useRef(handlers);
  
  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open block palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlersRef.current.onOpenPalette?.();
      }

      // Cmd/Ctrl + E: Execute
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handlersRef.current.onExecute?.();
      }

      // Escape: Close panels
      if (e.key === 'Escape') {
        handlersRef.current.onEscape?.();
      }

      // Delete/Backspace: Delete selected block
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not in an input field
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          handlersRef.current.onDeleteBlock?.();
        }
      }

      // Cmd/Ctrl + Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlersRef.current.onUndo?.();
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y: Redo
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handlersRef.current.onRedo?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array - handlers accessed via ref
};
