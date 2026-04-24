import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { PersistenceSlice } from './types';
import { saveGame, loadGame, calculateOfflineProgress } from '../../../systems/saveSystem';
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
    if (!savedState) return null;

    const offlineProgress = calculateOfflineProgress(
      savedState.curdPerSecond,
      savedState.lastSaved
    );

    set({
      ...savedState,
      curds: savedState.curds.plus(offlineProgress.curdsEarned),
      totalCurdsEarned: savedState.totalCurdsEarned.plus(offlineProgress.curdsEarned),
      lastSaved: Date.now(),
    });

    // Check for seasonal event auto-activation after loading
    get().checkEventActivation();

    return offlineProgress;
  },

  reset: () => {
    set({
      // Production state
      curds: new Decimal(0),
      whey: new Decimal(0),
      totalCurdsEarned: new Decimal(0),
      totalClicks: 0,
      curdPerClick: new Decimal(1),
      curdPerSecond: new Decimal(0),
      generators: {},
      upgrades: [],
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

      // Combat state
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

      // Crafting state
      crafting: createInitialCraftingState(),

      // Event state
      activeEvents: [],

      // Achievement state
      achievements: [],

      // Persistence state
      lastSaved: Date.now(),
      gameStarted: Date.now(),
    });
  },
});
