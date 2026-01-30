import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for trapping focus within a modal or dialog
 * Ensures keyboard navigation stays within the modal while it's open
 *
 * @param isOpen - Whether the modal is open
 * @param onClose - Optional callback to close modal on Escape key
 * @returns ref to attach to the modal container
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isOpen: boolean,
  onClose?: () => void
) {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    );
  }, []);

  // Handle tab key for focus trapping
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Close on Escape
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        onClose();
        return;
      }

      // Only trap focus on Tab
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> focus last element
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> focus first element
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    },
    [isOpen, onClose, getFocusableElements]
  );

  // Set up focus trap when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let animationFrameId: number | undefined;

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Add keydown listener
    document.addEventListener('keydown', handleKeyDown);

    // Focus the first focusable element (or the container itself)
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Small delay to ensure DOM is ready
      animationFrameId = requestAnimationFrame(() => {
        focusableElements[0].focus();
      });
    } else if (containerRef.current) {
      // If no focusable elements, focus the container itself
      containerRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isOpen, handleKeyDown, getFocusableElements]);

  // Restore focus when modal closes
  useEffect(() => {
    if (isOpen) return;

    // Restore focus to the element that was focused before the modal opened
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  return containerRef;
}

/**
 * Hook for managing focus return when a component unmounts
 * Use this for components that need to return focus but don't need full focus trapping
 */
export function useFocusReturn() {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    return () => {
      // Restore focus on unmount
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, []);
}
