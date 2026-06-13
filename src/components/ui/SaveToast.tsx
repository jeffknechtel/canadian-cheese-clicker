import { useState, useEffect, useCallback } from 'react';
import { setSaveToastCallback, type SaveToast } from '../../systems/saveToast';

export function SaveToastContainer() {
  const [toasts, setToasts] = useState<SaveToast[]>([]);

  const addToast = useCallback((toast: SaveToast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3000);
  }, []);

  useEffect(() => {
    setSaveToastCallback(addToast);
    return () => setSaveToastCallback(null);
  }, [addToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-up ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-timber-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
