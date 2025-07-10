'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

interface UseModalBehaviorOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  preventCloseWhenLoading?: boolean;
  focusOnOpen?: boolean;
  restoreFocusOnClose?: boolean;
  trapFocus?: boolean;
}

interface UseModalBehaviorReturn {
  modalRef: React.RefObject<HTMLDivElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  isClosing: boolean;
  handleClose: () => void;
  handleOverlayClick: (event: React.MouseEvent) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

export function useModalBehavior({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  preventCloseWhenLoading = false,
  focusOnOpen = true,
  restoreFocusOnClose = true,
  trapFocus = true,
}: UseModalBehaviorOptions): UseModalBehaviorReturn {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Handle focus management
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    // Focus the modal or first focusable element when opened
    if (focusOnOpen) {
      const firstFocusable = modalElement.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modalElement.focus();
      }
    }

    // Restore focus when modal closes
    return () => {
      if (restoreFocusOnClose && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, focusOnOpen, restoreFocusOnClose]);

  // Handle focus trapping
  useEffect(() => {
    if (!isOpen || !trapFocus) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = modalElement.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      ) as NodeListOf<HTMLElement>;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen, trapFocus]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, closeOnEscape, isLoading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (preventCloseWhenLoading && isLoading) return;
    
    setIsClosing(true);
    
    // Add a small delay for closing animation
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  }, [onClose, preventCloseWhenLoading, isLoading]);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (!closeOnOutsideClick) return;
    
    if (event.target === overlayRef.current) {
      handleClose();
    }
  }, [closeOnOutsideClick, handleClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscape && !isLoading) {
      event.preventDefault();
      handleClose();
    }
  }, [closeOnEscape, handleClose, isLoading]);

  return {
    modalRef,
    overlayRef,
    isClosing,
    handleClose,
    handleOverlayClick,
    handleKeyDown,
  };
}

// Hook for managing loading states in modals
interface UseModalLoadingOptions {
  onLoadingChange?: (loading: boolean) => void;
}

export function useModalLoading({ onLoadingChange }: UseModalLoadingOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const startLoading = useCallback((message: string = 'Loading...') => {
    setIsLoading(true);
    setLoadingMessage(message);
    onLoadingChange?.(true);
  }, [onLoadingChange]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage('');
    onLoadingChange?.(false);
  }, [onLoadingChange]);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(message);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading,
    withLoading,
  };
}

// Hook for managing modal animations
export function useModalAnimation(isOpen: boolean) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // Remove from DOM after animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Match your CSS animation duration
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return {
    shouldRender,
    isAnimating,
    animationClasses: {
      overlay: `transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`,
      modal: `transition-all duration-200 ${
        isAnimating 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-4'
      }`,
    },
  };
}

// Hook for managing modal history (for nested modals)
export function useModalHistory() {
  const [modalStack, setModalStack] = useState<string[]>([]);

  const pushModal = useCallback((modalId: string) => {
    setModalStack(prev => [...prev, modalId]);
  }, []);

  const popModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
  }, []);

  const isTopModal = useCallback((modalId: string) => {
    return modalStack[modalStack.length - 1] === modalId;
  }, [modalStack]);

  const clearStack = useCallback(() => {
    setModalStack([]);
  }, []);

  return {
    modalStack,
    pushModal,
    popModal,
    isTopModal,
    clearStack,
    stackDepth: modalStack.length,
  };
}

// Utility functions for modal management
export const modalUtils = {
  // Get all focusable elements within a container
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
    return Array.from(container.querySelectorAll(selector));
  },

  // Check if an element is currently visible
  isElementVisible: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  // Get the next/previous focusable element
  getNextFocusableElement: (current: HTMLElement, container: HTMLElement, reverse = false): HTMLElement | null => {
    const focusableElements = modalUtils.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(current);
    
    if (currentIndex === -1) return focusableElements[0] || null;
    
    const nextIndex = reverse 
      ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
      : (currentIndex + 1) % focusableElements.length;
    
    return focusableElements[nextIndex] || null;
  },

  // Create a focus trap for a modal
  createFocusTrap: (container: HTMLElement) => {
    const focusableElements = modalUtils.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  },
};
