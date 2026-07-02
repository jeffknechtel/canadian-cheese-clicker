import type { SliceCreator } from '../../types';
import type { PersistenceSlice } from './types';
import { saveGame, loadGame, calculateOfflineProgress } from '../../../systems/saveSystem';
import { createInitialProductionState } from '../production/resetFactory';
import { createEmptyCombatState } from '../combat/resetFactory';
import { createInitialCraftingState } from '../crafting/resetFactory';
import { createInitialPrestigeState } from '../prestige/resetFactory';
import { createInitialChallengeState } from '../challenge/resetFactory';
import { createInitialHeroState } from '../heroes/resetFactory';
import { createInitialAchievementState } from '../achievements/resetFactory';
import { createInitialEventState } from '../events/resetFactory';
import { createInitialUnlockState } from '../unlock/resetFactory';
import { useSettingsStore } from '../../settingsStore';

// Module-level flag to prevent save during import
let isImportingFlag = false;

export function setImportingFlag(value: boolean) {
  isImportingFlag = value;
}

export function isImporting() {
  return isImportingFlag;
}

export const createPersistenceSlice: SliceCreator<PersistenceSlice> = (set, get) => ({
  // State
  lastSaved: Date.now(),
  lastSimulated: Date.now(),
  gameStarted: Date.now(),

  // Actions
  save: () => {
    // Don't save during import - the imported file would be overwritten
    if (isImportingFlag) return;

    const state = get();
    saveGame(state);
    set({ lastSaved: Date.now() });
  },

  load: () => {
    const savedState = loadGame();

    if (!savedState) {
      // No save exists - check events and initialize challenge for fresh game
      get().checkEventActivation();
      get().initializeChallenge();
      return null;
    }

    // Merge saved state first so recalculateCps has correct inputs
    set({
      ...savedState,
      lastSaved: Date.now(),
    });

    // Check events FIRST - this may add/remove activeEvents based on current date
    // The subscriber will recalc CPS when events change
    get().checkEventActivation();

    // Initialize or rollover weekly challenge
    get().initializeChallenge();

    // Recalculate CPS with correct event state
    // (also handles case where checkEventActivation didn't change anything)
    get().recalculateCps();
    get().recalculateClickValue();

    // Use lastSimulated (when game actually ran) not lastSaved (when autosave ran)
    // This fixes offline progress loss when tab is hidden → closed (autosave runs but game loop pauses)
    const { curdPerSecond } = get();
    const offlineProgressCapHours = useSettingsStore.getState().game.offlineProgressCap;
    const lastActiveTime = savedState.lastSimulated ?? savedState.lastSaved;
    const offlineProgress = calculateOfflineProgress(curdPerSecond, lastActiveTime, offlineProgressCapHours);

    // Apply offline earnings
    set((s) => ({
      curds: s.curds.plus(offlineProgress.curdsEarned),
      totalCurdsEarned: s.totalCurdsEarned.plus(offlineProgress.curdsEarned),
    }));

    return offlineProgress;
  },

  reset: () => {
    set({
      // Production state - DELEGATED to factory
      ...createInitialProductionState(),
      ehCount: 0,
      lastMilestone: 0,

      // Hero state - DELEGATED to factory
      ...createInitialHeroState(),

      // Combat state - DELEGATED to factory
      combat: createEmptyCombatState(),
      zoneProgress: {},

      // Prestige state - DELEGATED to factory
      prestige: createInitialPrestigeState(),

      // Crafting state - DELEGATED to factory
      crafting: createInitialCraftingState(),

      // Event state - DELEGATED to factory
      ...createInitialEventState(),

      // Achievement state - DELEGATED to factory
      ...createInitialAchievementState(),

      // Synergy state - permanent, NOT reset
      synergy: get().synergy,

      // Challenge state - DELEGATED to factory
      challenge: createInitialChallengeState(),

      // Progressive unlock state - DELEGATED to factory
      ...createInitialUnlockState(),

      // Persistence state
      lastSaved: Date.now(),
      lastSimulated: Date.now(),
      gameStarted: Date.now(),
    });
    // Initialize challenge after reset
    get().initializeChallenge();
  },

  applyOfflineProgress: (hiddenDurationMs: number) => {
    const state = get();
    const { curdPerSecond } = state;
    const offlineProgressCapHours = useSettingsStore.getState().game.offlineProgressCap;

    const hiddenSeconds = hiddenDurationMs / 1000;
    const capSeconds = offlineProgressCapHours * 60 * 60;
    const elapsedSeconds = Math.min(hiddenSeconds, capSeconds);

    // Only award if hidden for more than 1 minute (matches calculateOfflineProgress threshold)
    if (elapsedSeconds < 60) return null;

    const curdsEarned = curdPerSecond.mul(elapsedSeconds);

    // Don't award if zero CPS
    if (curdsEarned.isZero()) return null;

    set((s) => ({
      curds: s.curds.plus(curdsEarned),
      totalCurdsEarned: s.totalCurdsEarned.plus(curdsEarned),
      currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
      lastSimulated: Date.now(),
    }));

    return { curdsEarned, secondsAway: elapsedSeconds };
  },
});
