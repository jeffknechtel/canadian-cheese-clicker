import { useEffect, useState, useCallback } from 'react';
import type { DialogueTrigger } from '../../data/canadianDialogue';
import { setDialogueCallback } from '../../systems/dialogueSystem';

interface ToastItem {
  id: string;
  text: string;
  trigger: DialogueTrigger;
  timestamp: number;
}

const TOAST_DURATION_MS = 4000;
const MAX_TOASTS = 3;

interface DialogueToastItemProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function DialogueToastItem({ item, onDismiss }: DialogueToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, TOAST_DURATION_MS - 300);

    const removeTimer = setTimeout(() => {
      onDismiss(item.id);
    }, TOAST_DURATION_MS);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onDismiss]);

  // Get trigger-specific styling
  const getTriggerStyle = () => {
    switch (item.trigger) {
      case 'achievement':
        return 'border-cheddar-400 from-cheddar-100 to-cheddar-50';
      case 'milestone':
        return 'border-maple-400 from-maple-100 to-maple-50';
      case 'purchase':
        return 'border-green-400 from-green-100 to-green-50';
      default:
        return 'border-cream from-cream to-white';
    }
  };

  // Get trigger-specific icon
  const getIcon = () => {
    switch (item.trigger) {
      case 'achievement':
        return '🏆';
      case 'milestone':
        return '🍁';
      case 'purchase':
        return '💰';
      default:
        return '🧀';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border-2
        bg-gradient-to-r ${getTriggerStyle()} backdrop-blur
        transform transition-all duration-300 cursor-pointer
        ${isExiting ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}
      `}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(item.id), 300);
      }}
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0">{getIcon()}</span>

      {/* Speech bubble style text */}
      <p className="text-rind font-medium text-sm flex-1">{item.text}</p>
    </div>
  );
}

export function DialogueToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((text: string, trigger: DialogueTrigger) => {
    const newToast: ToastItem = {
      id: `dialogue-${Date.now()}-${Math.random()}`,
      text,
      trigger,
      timestamp: Date.now(),
    };

    setToasts((prev) => {
      // Limit to MAX_TOASTS, removing oldest if needed
      const updated = [...prev, newToast];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(-MAX_TOASTS);
      }
      return updated;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register the callback with the dialogue system
  useEffect(() => {
    setDialogueCallback(addToast);

    return () => {
      setDialogueCallback(null);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <DialogueToastItem item={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
