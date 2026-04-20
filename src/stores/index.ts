import { create } from 'zustand';
import type { GameStore } from './types';

import { createProductionSlice } from './slices/production/productionSlice';
import { createHeroSlice, setHeroLevelUpCallback } from './slices/heroes/heroSlice';
import { createCombatSlice } from './slices/combat/combatSlice';
import { createCraftingSlice, setCraftingEventCallback } from './slices/crafting/craftingSlice';
import type { CraftingEvent } from './slices/crafting/craftingSlice';
import { createPrestigeSlice } from './slices/prestige/prestigeSlice';
import { createAchievementSlice, setAchievementUnlockCallback } from './slices/achievements/achievementSlice';
import { createEventSlice } from './slices/events/eventSlice';
import { createPersistenceSlice } from './slices/persistence/persistenceSlice';

export const useGameStore = create<GameStore>()((...a) => ({
  ...createProductionSlice(...a),
  ...createHeroSlice(...a),
  ...createCombatSlice(...a),
  ...createCraftingSlice(...a),
  ...createPrestigeSlice(...a),
  ...createAchievementSlice(...a),
  ...createEventSlice(...a),
  ...createPersistenceSlice(...a),
}));

// Re-export types
export * from './types';

// Re-export callbacks for external use
export { setAchievementUnlockCallback, setHeroLevelUpCallback, setCraftingEventCallback };
export type { CraftingEvent };
