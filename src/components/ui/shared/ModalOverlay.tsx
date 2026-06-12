import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export function ModalOverlay({
  isOpen,
  onClose,
  children,
  className = '',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalOverlayProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-backdrop-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
