import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Button } from '../ui/Button';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Action to perform before showing step
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DeFi Builder!',
    description: 'Build, test, and optimize DeFi strategies using a visual block-based interface.',
    position: 'center',
  },
  {
    id: 'blocks',
    title: 'Strategy Blocks',
    description: 'Drag blocks from the left panel to build your strategy. Each block represents a DeFi action.',
    target: '[data-onboarding="block-palette"]',
    position: 'right',
  },
  {
    id: 'spine',
    title: 'Strategy Spine',
    description: 'Your strategy flows from top to bottom. Connect blocks to create complex strategies.',
    target: '[data-onboarding="spine"]',
    position: 'center',
  },
  {
    id: 'validation',
    title: 'Real-time Validation',
    description: 'The system validates your strategy as you build. Fix any errors shown in red.',
    target: '[data-onboarding="validation"]',
    position: 'top',
  },
  {
    id: 'execute',
    title: 'Execute Strategy',
    description: 'Once validated, you can backtest, optimize, or execute your strategy on-chain.',
    target: '[data-onboarding="execute"]',
    position: 'top',
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

/**
 * Interactive onboarding tour component
 * Guides new users through the application
 */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onSkip }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage<boolean>(
    'defi-builder-onboarding-completed',
    false
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(!hasCompletedOnboarding);

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (!isVisible) return;

    // Scroll to target element if specified
    if (currentStepData?.target) {
      const element = document.querySelector(currentStepData.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight class
        element.classList.add('onboarding-highlight');
      }
    }

    return () => {
      // Remove highlight
      if (currentStepData?.target) {
        const element = document.querySelector(currentStepData.target);
        if (element) {
          element.classList.remove('onboarding-highlight');
        }
      }
    };
  }, [currentStep, isVisible, currentStepData]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setHasCompletedOnboarding(true);
    onSkip?.();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setHasCompletedOnboarding(true);
    onComplete?.();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={handleSkip}
            aria-hidden="true"
          />

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[9999] bg-white border-2 border-orange shadow-2xl p-6 max-w-sm"
            style={{
              ...(currentStepData.target
                ? (() => {
                    const element = document.querySelector(currentStepData.target || '');
                    if (element) {
                      const rect = element.getBoundingClientRect();
                      const position = currentStepData.position || 'bottom';
                      const offset = 20;

                      switch (position) {
                        case 'top':
                          return {
                            top: `${rect.top - 200}px`,
                            left: `${rect.left + rect.width / 2}px`,
                            transform: 'translateX(-50%)',
                          };
                        case 'bottom':
                          return {
                            top: `${rect.bottom + offset}px`,
                            left: `${rect.left + rect.width / 2}px`,
                            transform: 'translateX(-50%)',
                          };
                        case 'left':
                          return {
                            top: `${rect.top + rect.height / 2}px`,
                            left: `${rect.left - 250}px`,
                            transform: 'translateY(-50%)',
                          };
                        case 'right':
                          return {
                            top: `${rect.top + rect.height / 2}px`,
                            left: `${rect.right + offset}px`,
                            transform: 'translateY(-50%)',
                          };
                        default:
                          return {
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                          };
                      }
                    }
                  })()
                : {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }),
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-4">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 ${
                    index <= currentStep ? 'bg-orange' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <h3 id="onboarding-title" className="text-lg font-bold font-mono uppercase mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">{currentStepData.description}</p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-ink transition-colors font-mono uppercase"
              >
                Skip
              </button>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="secondary" size="sm" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={handleNext}>
                  {isLastStep ? (
                    <>
                      <Check size={16} className="mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight size={16} className="ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook to check if onboarding should be shown
 */
export function useOnboarding() {
  const [hasCompleted, setHasCompleted] = useLocalStorage<boolean>(
    'defi-builder-onboarding-completed',
    false
  );

  const startOnboarding = () => {
    setHasCompleted(false);
  };

  return {
    hasCompleted,
    startOnboarding,
  };
}

