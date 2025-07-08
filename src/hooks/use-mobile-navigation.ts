'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  threshold?: number;
  velocity?: number;
  preventDefaultTouchmoveEvent?: boolean;
  deltaX?: number;
  deltaY?: number;
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGestures(
  handlers: SwipeHandlers,
  options: SwipeGestureOptions = {}
) {
  const {
    threshold = 50,
    velocity = 0.3,
    preventDefaultTouchmoveEvent = false,
    deltaX = 0.5,
    deltaY = 0.5,
  } = options;

  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      e.preventDefault();
    }
  }, [preventDefaultTouchmoveEvent]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    const deltaXValue = touchStart.current.x - touchEnd.current.x;
    const deltaYValue = touchStart.current.y - touchEnd.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;
    
    const velocityX = Math.abs(deltaXValue) / deltaTime;
    const velocityY = Math.abs(deltaYValue) / deltaTime;

    // Check if swipe meets threshold and velocity requirements
    if (Math.abs(deltaXValue) > threshold && velocityX > velocity) {
      if (Math.abs(deltaXValue) > Math.abs(deltaYValue) * deltaX) {
        if (deltaXValue > 0) {
          handlers.onSwipeLeft?.();
        } else {
          handlers.onSwipeRight?.();
        }
      }
    }

    if (Math.abs(deltaYValue) > threshold && velocityY > velocity) {
      if (Math.abs(deltaYValue) > Math.abs(deltaXValue) * deltaY) {
        if (deltaYValue > 0) {
          handlers.onSwipeUp?.();
        } else {
          handlers.onSwipeDown?.();
        }
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [handlers, threshold, velocity, deltaX, deltaY]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

export function useMobileNavigation() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setOrientation(height > width ? 'portrait' : 'landscape');
      setViewportHeight(height);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    orientation,
    viewportHeight,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
}

interface PanelState {
  isOpen: boolean;
  isAnimating: boolean;
}

export function useCollapsiblePanel(initialState = false) {
  const [state, setState] = useState<PanelState>({
    isOpen: initialState,
    isAnimating: false,
  });

  const toggle = useCallback(() => {
    setState(prev => ({
      isOpen: !prev.isOpen,
      isAnimating: true,
    }));

    // Reset animation state after transition
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isAnimating: false,
      }));
    }, 300);
  }, []);

  const open = useCallback(() => {
    setState({
      isOpen: true,
      isAnimating: true,
    });

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isAnimating: false,
      }));
    }, 300);
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      isAnimating: true,
    });

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isAnimating: false,
      }));
    }, 300);
  }, []);

  return {
    isOpen: state.isOpen,
    isAnimating: state.isAnimating,
    toggle,
    open,
    close,
  };
}

export function useMobileKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      
      const heightDifference = windowHeight - viewportHeight;
      const threshold = 150; // Minimum height difference to consider keyboard open
      
      if (heightDifference > threshold) {
        setIsKeyboardOpen(true);
        setKeyboardHeight(heightDifference);
      } else {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return {
    isKeyboardOpen,
    keyboardHeight,
  };
}

export function useMobileSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
}
