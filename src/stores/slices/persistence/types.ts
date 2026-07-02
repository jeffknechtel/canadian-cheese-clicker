import type { OfflineProgress } from '../../../systems/saveSystem';

export interface PersistenceSliceState {
  lastSaved: number;
  lastSimulated: number; // When game logic last ticked (used for offline progress)
  gameStarted: number;
}

export interface PersistenceSliceActions {
  save: () => void;
  load: () => OfflineProgress | null;
  reset: () => void;
  applyOfflineProgress: (hiddenDurationMs: number) => OfflineProgress | null;
}

export type PersistenceSlice = PersistenceSliceState & PersistenceSliceActions;
