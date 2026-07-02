import Decimal from 'decimal.js';
import type { GoldenCheeseReward, GoldenCheeseRewardType, CheeseActiveBuff } from '../types/game';
import type { GameStore } from '../stores/types';
import { SPECIALTY_ITEMS } from '../data/ingredients';
import {
  MIN_SPAWN_DELAY_MS,
  MAX_SPAWN_DELAY_MS,
  VISIBLE_DURATION_MS,
  CHEESE_FRENZY_DURATION_MS,
  CLICK_STORM_DURATION_MS,
  HERO_RALLY_DURATION_MS,
  CURD_TSUNAMI_DURATION_MS,
  CHEESE_FRENZY_MULTIPLIER,
  CLICK_STORM_MULTIPLIER,
  HERO_RALLY_MULTIPLIER,
  CURD_TSUNAMI_MULTIPLIER,
  LUCKY_CURDS_MINUTES,
} from '../data/constants';

// Balance constants live in data/constants.ts (Golden Cheese section);
// re-export the ones existing modules import from here.
export { MIN_SPAWN_DELAY_MS, MAX_SPAWN_DELAY_MS, VISIBLE_DURATION_MS };

// Reward weights (sum = 100 for easy probability reading)
const REWARD_TABLE: GoldenCheeseReward[] = [
  { type: 'cheeseFrenzy', weight: 40 },
  { type: 'luckyCurds', weight: 25 },
  { type: 'clickStorm', weight: 15 },
  { type: 'rareIngredient', weight: 10 },
  { type: 'heroRally', weight: 7 },
  { type: 'curdTsunami', weight: 3 },
];

const TOTAL_WEIGHT = REWARD_TABLE.reduce((sum, r) => sum + r.weight, 0);

/** Returns a random delay between MIN and MAX spawn delay */
export function getRandomSpawnDelay(): number {
  return MIN_SPAWN_DELAY_MS + Math.random() * (MAX_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS);
}

/** Weighted random selection from REWARD_TABLE */
export function rollReward(): GoldenCheeseRewardType {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const reward of REWARD_TABLE) {
    roll -= reward.weight;
    if (roll <= 0) return reward.type;
  }
  return REWARD_TABLE[0].type; // Fallback
}

/** Create a golden cheese buff */
function createGoldenBuff(
  effect: 'productionBoost' | 'clickBoost' | 'xpBoost',
  multiplier: number,
  durationMs: number
): CheeseActiveBuff {
  const now = Date.now();
  return {
    id: `golden_${effect}_${now}`,
    effect: { type: effect, multiplier, duration: durationMs },
    startTime: now,
    endTime: now + durationMs,
    sourceCheeseId: 'golden_cheese',
  };
}

/** Apply the reward to the game state. Returns a description for notifications. */
export function applyReward(
  rewardType: GoldenCheeseRewardType,
  getState: () => GameStore
): { description: string; amount?: Decimal } {
  const state = getState();

  switch (rewardType) {
    case 'cheeseFrenzy': {
      const buff = createGoldenBuff('productionBoost', CHEESE_FRENZY_MULTIPLIER, CHEESE_FRENZY_DURATION_MS);
      state.addBuff(buff);
      return { description: `Cheese Frenzy! ${CHEESE_FRENZY_MULTIPLIER}x CPS for 77s` };
    }

    case 'luckyCurds': {
      const amount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
      state.addCurds(amount);
      return { description: `Lucky Curds! +${amount.toFixed(0)} curds`, amount };
    }

    case 'clickStorm': {
      const buff = createGoldenBuff('clickBoost', CLICK_STORM_MULTIPLIER, CLICK_STORM_DURATION_MS);
      state.addBuff(buff);
      return { description: `Click Storm! ${CLICK_STORM_MULTIPLIER}x clicks for 13s` };
    }

    case 'rareIngredient': {
      // Grant a random specialty ingredient
      const unlockedIds = state.crafting.unlockedIngredients;
      const available = SPECIALTY_ITEMS.filter((i) => !unlockedIds.includes(i.id));

      if (available.length > 0) {
        const ingredient = available[Math.floor(Math.random() * available.length)];
        state.unlockIngredient(ingredient.id);
        return { description: `Rare Find! Unlocked ${ingredient.name}` };
      }

      // Fallback: all ingredients unlocked, give curds instead
      const fallbackAmount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
      state.addCurds(fallbackAmount);
      return { description: `Lucky Curds! +${fallbackAmount.toFixed(0)} curds`, amount: fallbackAmount };
    }

    case 'heroRally': {
      const buff = createGoldenBuff('xpBoost', HERO_RALLY_MULTIPLIER, HERO_RALLY_DURATION_MS);
      state.addBuff(buff);
      return { description: `Hero Rally! ${HERO_RALLY_MULTIPLIER}x XP for 60s` };
    }

    case 'curdTsunami': {
      const buff = createGoldenBuff('productionBoost', CURD_TSUNAMI_MULTIPLIER, CURD_TSUNAMI_DURATION_MS);
      state.addBuff(buff);
      return { description: `CURD TSUNAMI! ${CURD_TSUNAMI_MULTIPLIER}x CPS for 7s` };
    }
  }
}

/** Get human-readable reward description for notifications */
export function getRewardDescription(rewardType: GoldenCheeseRewardType): string {
  const descriptions: Record<GoldenCheeseRewardType, string> = {
    cheeseFrenzy: 'Cheese Frenzy! 7x CPS for 77s',
    luckyCurds: 'Lucky Curds!',
    clickStorm: 'Click Storm! 77x clicks for 13s',
    rareIngredient: 'Rare Find!',
    heroRally: 'Hero Rally! 5x XP for 60s',
    curdTsunami: 'CURD TSUNAMI! 777x CPS for 7s',
  };
  return descriptions[rewardType];
}
