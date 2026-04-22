interface ModalOverlayProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function ModalOverlay({ children, onClose, className = '' }: ModalOverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs ${className}`}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {children}
    </div>
  );
}
