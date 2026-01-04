/**
 * Touch gesture hooks for mobile interactions
 * Supports pinch-to-zoom, swipe, and long-press gestures
 */

import { useEffect, useRef, useState } from 'react';

interface TouchGestureCallbacks {
  onPinch?: (scale: number) => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}

interface TouchState {
  touches: Touch[];
  initialDistance: number | null;
  initialScale: number;
  longPressTimer: NodeJS.Timeout | null;
  lastTap: number;
}

const LONG_PRESS_DURATION = 500; // ms
const DOUBLE_TAP_DELAY = 300; // ms
const MIN_SWIPE_DISTANCE = 50; // px

/**
 * Hook for touch gestures on mobile devices
 */
export function useTouchGestures(callbacks: TouchGestureCallbacks, enabled = true) {
  const elementRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef<TouchState>({
    touches: [],
    initialDistance: null,
    initialScale: 1,
    longPressTimer: null,
    lastTap: 0,
  });

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    const getDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touches = Array.from(e.touches);
      stateRef.current.touches = touches;

      // Long press detection
      if (touches.length === 1 && callbacks.onLongPress) {
        stateRef.current.longPressTimer = setTimeout(() => {
          callbacks.onLongPress?.();
        }, LONG_PRESS_DURATION);
      }

      // Pinch detection
      if (touches.length === 2 && touches[0] && touches[1]) {
        stateRef.current.initialDistance = getDistance(touches[0], touches[1]);
        stateRef.current.initialScale = 1;
      }

      // Double tap detection
      if (touches.length === 1) {
        const now = Date.now();
        const timeSinceLastTap = now - stateRef.current.lastTap;
        if (timeSinceLastTap < DOUBLE_TAP_DELAY && callbacks.onDoubleTap) {
          callbacks.onDoubleTap();
          stateRef.current.lastTap = 0;
        } else {
          stateRef.current.lastTap = now;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touches = Array.from(e.touches);
      stateRef.current.touches = touches;

      // Cancel long press if moved
      if (stateRef.current.longPressTimer) {
        clearTimeout(stateRef.current.longPressTimer);
        stateRef.current.longPressTimer = null;
      }

      // Pinch zoom
      if (
        touches.length === 2 &&
        touches[0] &&
        touches[1] &&
        stateRef.current.initialDistance !== null &&
        callbacks.onPinch
      ) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scale = currentDistance / stateRef.current.initialDistance;
        callbacks.onPinch(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press
      if (stateRef.current.longPressTimer) {
        clearTimeout(stateRef.current.longPressTimer);
        stateRef.current.longPressTimer = null;
      }

      // Swipe detection
      if (
        stateRef.current.touches.length === 1 &&
        e.changedTouches.length === 1 &&
        callbacks.onSwipe
      ) {
        const startTouch = stateRef.current.touches[0];
        const endTouch = e.changedTouches[0];

        if (!startTouch || !endTouch) return;

        const dx = endTouch.clientX - startTouch.clientX;
        const dy = endTouch.clientY - startTouch.clientY;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > MIN_SWIPE_DISTANCE || absDy > MIN_SWIPE_DISTANCE) {
          if (absDx > absDy) {
            callbacks.onSwipe(dx > 0 ? 'right' : 'left');
          } else {
            callbacks.onSwipe(dy > 0 ? 'down' : 'up');
          }
        }
      }

      // Reset state
      if (e.touches.length === 0) {
        stateRef.current.touches = [];
        stateRef.current.initialDistance = null;
        stateRef.current.initialScale = 1;
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);

      if (stateRef.current.longPressTimer) {
        clearTimeout(stateRef.current.longPressTimer);
      }
    };
  }, [enabled, callbacks]);

  return elementRef;
}

/**
 * Hook for detecting mobile device
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook for responsive breakpoints
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}
