import React from 'react';
import { motion } from 'framer-motion';

interface ExecuteButtonProps {
  isValid: boolean;
  isExecuting: boolean;
  onClick: () => void;
}

export const ExecuteButton: React.FC<ExecuteButtonProps> = ({
  isValid,
  isExecuting,
  onClick,
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={!isValid || isExecuting}
      animate={isValid && !isExecuting ? { opacity: [1, 0.9, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 w-60 h-14 bg-orange text-white font-mono text-sm font-bold uppercase disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-orange/90 transition-colors z-40 flex items-center justify-center gap-2 shadow-lg"
      aria-label={isExecuting ? 'Executing strategy' : 'Execute strategy'}
      aria-busy={isExecuting}
    >
      {isExecuting ? (
        <>
          <span className="animate-spin inline-block">⟳</span>
          EXECUTING...
        </>
      ) : (
        <>
          <span className="text-xs">▶</span> EXECUTE STRATEGY
        </>
      )}
    </motion.button>
  );
};
