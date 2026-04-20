import type { OfflineProgress } from '../../../systems/saveSystem';

export interface PersistenceSliceState {
  lastSaved: number;
  gameStarted: number;
}

export interface PersistenceSliceActions {
  save: () => void;
  load: () => OfflineProgress | null;
  reset: () => void;
}

export type PersistenceSlice = PersistenceSliceState & PersistenceSliceActions;
