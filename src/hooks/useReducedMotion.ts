import { useSettingsStore } from '../stores/settingsStore';

export function useReducedMotion(): boolean {
  return useSettingsStore((state) => state.accessibility.reducedMotion);
}
