import { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useSettingsStore } from '../../../stores/settingsStore';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** Z-index utility per the documented hierarchy in index.css (z-50 → z-100). */
  zIndexClass?: string;
  /** When false, backdrop click and Escape do nothing — close via explicit buttons only. */
  dismissible?: boolean;
  backdropClass?: string;
}

const EXIT_ANIMATION_MS = 150;

export function ModalOverlay({
  isOpen,
  onClose,
  children,
  className = '',
  ariaLabelledBy,
  ariaDescribedBy,
  zIndexClass = 'z-50',
  dismissible = true,
  backdropClass = 'bg-black/50 backdrop-blur-sm',
}: ModalOverlayProps) {
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);
  const [isExiting, setIsExiting] = useState(false);
  const wasOpenRef = useRef(isOpen);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // Detect close transition: wasOpen=true → isOpen=false
    if (wasOpen && !isOpen && !reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Exit animation requires setState; timer callback clears it after animation
      setIsExiting(true);
      exitTimerRef.current = setTimeout(() => {
        setIsExiting(false);
      }, EXIT_ANIMATION_MS);
    } else if (isOpen && isExiting) {
      // Cancel any in-progress exit if modal reopens
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setIsExiting(false);
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [isOpen, reducedMotion, isExiting]);

  const shouldRender = isOpen || isExiting;

  const modalRef = useFocusTrap<HTMLDivElement>(shouldRender && !isExiting, dismissible ? onClose : undefined);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 ${backdropClass} ${
        isExiting ? 'animate-fade-out' : 'animate-backdrop-in'
      }`}
      onClick={(e) => dismissible && e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`relative ${isExiting ? 'animate-modal-out' : 'animate-modal-in'} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
