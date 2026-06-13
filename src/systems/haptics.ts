type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 30],
  error: [50, 50, 50, 50, 50],
};

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function vibrate(pattern: HapticPattern): void {
  if (!hapticsEnabled) return;
  if (!('vibrate' in navigator)) return;

  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Silently fail if vibration blocked
  }
}

export function vibrateClick(): void {
  vibrate('light');
}

export function vibrateCrit(): void {
  vibrate('medium');
}

export function vibrateLimitBreak(): void {
  vibrate('heavy');
}

export function vibrateSuccess(): void {
  vibrate('success');
}

export function vibrateError(): void {
  vibrate('error');
}
