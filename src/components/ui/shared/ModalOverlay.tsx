import { useFocusTrap } from '../../../hooks/useFocusTrap';

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
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, dismissible ? onClose : undefined);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 ${backdropClass} animate-backdrop-in`}
      onClick={(e) => dismissible && e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`relative animate-modal-in ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
