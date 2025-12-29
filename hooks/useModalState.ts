import { useCallback, useReducer } from 'react';

export type ModalType = 'backtest' | 'portfolio' | 'settings' | 'library' | 'optimization' | null;

interface ModalState {
  activeModal: ModalType;
}

type ModalAction =
  | { type: 'OPEN_MODAL'; modal: ModalType }
  | { type: 'CLOSE_MODAL' }
  | { type: 'TOGGLE_MODAL'; modal: ModalType };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { activeModal: action.modal };
    case 'CLOSE_MODAL':
      return { activeModal: null };
    case 'TOGGLE_MODAL':
      return { activeModal: state.activeModal === action.modal ? null : action.modal };
    default:
      return state;
  }
}

/**
 * Hook for managing modal state with a reducer
 * Consolidates all modal state into a single state machine
 */
export function useModalState() {
  const [state, dispatch] = useReducer(modalReducer, { activeModal: null });

  const openModal = useCallback((modal: ModalType) => {
    dispatch({ type: 'OPEN_MODAL', modal });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const toggleModal = useCallback((modal: ModalType) => {
    dispatch({ type: 'TOGGLE_MODAL', modal });
  }, []);

  return {
    activeModal: state.activeModal,
    openModal,
    closeModal,
    toggleModal,
    isBacktestOpen: state.activeModal === 'backtest',
    isPortfolioOpen: state.activeModal === 'portfolio',
    isSettingsOpen: state.activeModal === 'settings',
    isLibraryOpen: state.activeModal === 'library',
    isOptimizationOpen: state.activeModal === 'optimization',
  };
}
