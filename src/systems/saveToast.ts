type SaveToastType = 'success' | 'error' | 'autosave';

interface SaveToast {
  id: string;
  type: SaveToastType;
  message: string;
}

let toastCallback: ((toast: SaveToast) => void) | null = null;

export function setSaveToastCallback(cb: typeof toastCallback): void {
  toastCallback = cb;
}

export function showSaveToast(type: SaveToastType, message: string): void {
  if (toastCallback) {
    toastCallback({ id: crypto.randomUUID(), type, message });
  }
}

export type { SaveToast, SaveToastType };
