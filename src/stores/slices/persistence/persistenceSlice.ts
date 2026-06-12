import type { SliceCreator } from '../../types';
import type { PersistenceSlice } from './types';
import { saveGame, loadGame, calculateOfflineProgress } from '../../../systems/saveSystem';
import { createInitialProductionState } from '../production/resetFactory';
import { createEmptyCombatState } from '../combat/resetFactory';
import { createInitialCraftingState } from '../crafting/resetFactory';

export const createPersistenceSlice: SliceCreator<PersistenceSlice> = (set, get) => ({
  // State
  lastSaved: Date.now(),
  gameStarted: Date.now(),

  // Actions
  save: () => {
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

    // Recalculate CPS with proper inputs (generators, upgrades, prestige, heroes, etc.)
    get().recalculateCps();
    get().recalculateClickValue();

    // NOW check events AFTER loading saved state - will update activeEvents based on current date
    get().checkEventActivation();
    // Initialize or rollover weekly challenge
    get().initializeChallenge();

    // Now calculate offline progress with the correct CPS
    const { curdPerSecond } = get();
    const offlineProgress = calculateOfflineProgress(curdPerSecond, savedState.lastSaved);

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

      // Hero state
      heroes: {},
      party: {
        frontLeft: null,
        frontRight: null,
        backLeft: null,
        backRight: null,
      },
      equipmentInventory: [],

      // Combat state - DELEGATED to factory
      combat: createEmptyCombatState(),
      zoneProgress: {},

      // Prestige state
      prestige: {
        rennet: 0,
        totalRennet: 0,
        agingResetCount: 0,
        agingUpgrades: [],
        vintageWheels: 0,
        totalVintageWheels: 0,
        vintageResetCount: 0,
        vintageUnlocks: [],
        legacy: 0,
        legacyBonuses: {
          ontario: 0,
          quebec: 0,
          alberta: 0,
          manitoba: 0,
          saskatchewan: 0,
          yukon: 0,
          bc: 0,
          nova_scotia: 0,
          new_brunswick: 0,
          pei: 0,
          newfoundland: 0,
          nwt: 0,
          nunavut: 0,
        },
        legacyResetCount: 0,
      },

      // Crafting state - DELEGATED to factory
      crafting: createInitialCraftingState(),

      // Event state
      activeEvents: [],

      // Achievement state
      achievements: [],

      // Synergy state - permanent, NOT reset
      synergy: get().synergy,

      // Challenge state - reset to trigger re-initialization
      challenge: {
        activeChallengeId: null,
        weekStartTimestamp: 0,
        progress: 0,
        completed: false,
        claimed: false,
      },

      // Persistence state
      lastSaved: Date.now(),
      gameStarted: Date.now(),
    });
    // Initialize challenge after reset
    get().initializeChallenge();
  },
});
