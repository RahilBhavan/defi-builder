import { motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdDuration = 1200; // ms
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const { address, isConnected, connect } = useWallet();
  const { isAuthenticated, login, isLoading: isAuthLoading } = useAuth();

  const startHold = (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to avoid any browser behavior
    e?.preventDefault();

    // If not connected, try to connect but don't start holding yet
    if (!isConnected) {
      connect();
      return;
    }

    // Start holding - authentication is optional for now
    // If not authenticated, try to login in the background
    if (!isAuthenticated && address) {
      login();
    }

    // Start the hold timer
    setIsHolding(true);
    startTimeRef.current = Date.now();
  };

  const endHold = (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to avoid any browser behavior
    e?.preventDefault();

    setIsHolding(false);
    setProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
  };

  useEffect(() => {
    // Allow holding to work even without authentication for development
    // In production, you might want to require authentication
    const canProceed = isHolding && isConnected && startTimeRef.current;

    // Only progress if holding and connected (authentication optional for now)
    if (canProceed) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = window.setInterval(() => {
        if (!startTimeRef.current) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
        setProgress(newProgress);

        if (newProgress >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsHolding(false);
          setProgress(0);
          startTimeRef.current = null;
          onEnter();
        }
      }, 16); // ~60fps
    } else {
      // Stop progress if not holding, not authenticated, or not connected
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isHolding) {
        startTimeRef.current = null;
        setProgress(0);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHolding, isAuthenticated, isConnected, onEnter]);

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
          className="relative w-60 h-14 md:w-64 md:h-16 mx-auto cursor-pointer select-none"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onTouchCancel={endHold}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startHold();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              endHold();
            }
          }}
        >
          {/* Button Border/Background */}
          <div className="absolute inset-0 border-2 border-ink bg-transparent flex items-center justify-center overflow-hidden">
            {/* Progress Fill */}
            <div
              className="absolute inset-y-0 left-0 bg-orange z-0 transition-none"
              style={{ width: `${progress}%` }}
            />

            {/* Text */}
            <span
              className={`relative z-10 font-mono font-bold text-sm uppercase transition-colors duration-200 ${progress > 50 ? 'text-white' : 'text-ink'}`}
            >
              {!isConnected
                ? 'Connect Wallet'
                : isAuthLoading
                  ? 'Logging in...'
                  : 'Hold to Execute'}
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
