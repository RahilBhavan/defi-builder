import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdDuration = 1200; // ms
  const intervalRef = useRef<number | null>(null);

  const startHold = () => setIsHolding(true);
  const endHold = () => {
    setIsHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    if (isHolding) {
      const startTime = Date.now();
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onEnter();
        }
      }, 16); // ~60fps
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHolding, onEnter]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      className="fixed inset-0 bg-canvas text-ink flex flex-col items-center justify-center p-6 select-none"
    >
      {/* Corner Indicators */}
      <div className="fixed top-6 left-6 text-xs font-mono text-gray-600">[BETA]</div>
      <div className="fixed top-6 right-6 text-xs font-mono text-gray-600 flex items-center gap-2">
        <div className="w-2 h-2 bg-success-green"></div>
        SEPOLIA TESTNET
      </div>

      {/* Main Content */}
      <div className="text-center z-10">
        <h1 className="text-4xl md:text-6xl font-bold font-mono tracking-wider mb-4">
          DEFI BUILDER
        </h1>
        <p className="text-base md:text-lg font-sans text-gray-600 mb-12">
          Visual DeFi Logic Compiler
        </p>

        {/* Hold Button */}
        <div 
          className="relative w-60 h-14 md:w-64 md:h-16 mx-auto cursor-pointer"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
        >
          {/* Button Border/Background */}
          <div className="absolute inset-0 border-2 border-ink bg-transparent flex items-center justify-center overflow-hidden">
            {/* Progress Fill */}
            <div 
              className="absolute inset-y-0 left-0 bg-orange z-0 transition-none"
              style={{ width: `${progress}%` }}
            />
            
            {/* Text */}
            <span className={`relative z-10 font-mono font-bold text-sm uppercase transition-colors duration-200 ${progress > 50 ? 'text-white' : 'text-ink'}`}>
              Hold to Execute
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="fixed bottom-6 text-xs font-sans text-gray-400">
        Testnet only. Not financial advice.
      </div>
    </motion.div>
  );
};

export default LandingPage;