import { create } from 'zustand';
import type { GameStore } from './types';

import { createProductionSlice } from './slices/production/productionSlice';
import { createHeroSlice } from './slices/heroes/heroSlice';
import { createCombatSlice } from './slices/combat/combatSlice';
import { createCraftingSlice } from './slices/crafting/craftingSlice';
import { createPrestigeSlice } from './slices/prestige/prestigeSlice';
import { createAchievementSlice } from './slices/achievements/achievementSlice';
import { createEventSlice } from './slices/events/eventSlice';
import { createPersistenceSlice } from './slices/persistence/persistenceSlice';
import { createGoldenCheeseSlice } from './slices/goldenCheese';
import { createSynergySlice } from './slices/synergy';
import { createChallengeSlice } from './slices/challenge';
import { initProductionEventSubscriber } from './slices/production/eventSubscriber';
import { initHeroEventSubscriber } from './slices/heroes/eventSubscriber';

export const useGameStore = create<GameStore>()((...a) => ({
  ...createProductionSlice(...a),
  ...createHeroSlice(...a),
  ...createCombatSlice(...a),
  ...createCraftingSlice(...a),
  ...createPrestigeSlice(...a),
  ...createAchievementSlice(...a),
  ...createEventSlice(...a),
  ...createPersistenceSlice(...a),
  ...createGoldenCheeseSlice(...a),
  ...createSynergySlice(...a),
  ...createChallengeSlice(...a),
}));

// Initialize event subscribers
initProductionEventSubscriber();
initHeroEventSubscriber();

// Re-export types
export * from './types';

// Re-export callbacks for external use
