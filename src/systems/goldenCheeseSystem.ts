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
  GOLDEN_CHEESE_META_TIERS,
  GOLDEN_BUFF_DURATION_MULTIPLIER,
  GOLDEN_RUSH_CHANCE,
  type GoldenCheeseMetaPerk,
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

/** Get unlocked perks based on totalCollected */
export function getUnlockedPerks(totalCollected: number): Set<string> {
  const perks = new Set<string>();
  for (const tier of GOLDEN_CHEESE_META_TIERS) {
    if (totalCollected >= tier.collected) {
      perks.add(tier.perk);
    }
  }
  return perks;
}

/** Get next perk tier info */
export function getNextPerkTier(totalCollected: number): (typeof GOLDEN_CHEESE_META_TIERS)[number] | null {
  for (const tier of GOLDEN_CHEESE_META_TIERS) {
    if (totalCollected < tier.collected) {
      return tier;
    }
  }
  return null;
}

/** Returns a random delay between spawn window based on perks */
export function getRandomSpawnDelay(totalCollected: number = 0): number {
  const perks = getUnlockedPerks(totalCollected);

  let minDelay = MIN_SPAWN_DELAY_MS;
  let maxDelay = MAX_SPAWN_DELAY_MS;

  if (perks.has('spawnWindow2')) {
    // 2–7 minutes
    minDelay = 2 * 60 * 1000;
    maxDelay = 7 * 60 * 1000;
  } else if (perks.has('spawnWindow1')) {
    // 3–8 minutes (narrower window)
    minDelay = MIN_SPAWN_DELAY_MS;
    maxDelay = 8 * 60 * 1000;
  }

  return minDelay + Math.random() * (maxDelay - minDelay);
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
  durationMs: number,
  totalCollected: number = 0
): CheeseActiveBuff {
  const now = Date.now();
  const perks = getUnlockedPerks(totalCollected);

  // Apply buff duration multiplier if perk is unlocked
  const actualDuration = perks.has('buffDuration')
    ? Math.round(durationMs * GOLDEN_BUFF_DURATION_MULTIPLIER)
    : durationMs;

  return {
    id: `golden_${effect}_${now}`,
    effect: { type: effect, multiplier, duration: actualDuration },
    startTime: now,
    endTime: now + actualDuration,
    sourceCheeseId: 'golden_cheese',
  };
}

/** Apply the reward to the game state. Returns a description for notifications. */
export function applyReward(
  rewardType: GoldenCheeseRewardType,
  getState: () => GameStore
): { description: string; amount?: Decimal } {
  const state = getState();
  const totalCollected = state.goldenCheese.totalCollected;
  const perks = getUnlockedPerks(totalCollected);
  const durationSuffix = perks.has('buffDuration') ? ' (extended!)' : '';

  switch (rewardType) {
    case 'cheeseFrenzy': {
      const buff = createGoldenBuff('productionBoost', CHEESE_FRENZY_MULTIPLIER, CHEESE_FRENZY_DURATION_MS, totalCollected);
      state.addBuff(buff);
      const durationSecs = Math.round(buff.effect.duration / 1000);
      return { description: `Cheese Frenzy! ${CHEESE_FRENZY_MULTIPLIER}x CPS for ${durationSecs}s${durationSuffix}` };
    }

    case 'luckyCurds': {
      const amount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
      state.addCurds(amount);
      return { description: `Lucky Curds! +${amount.toFixed(0)} curds`, amount };
    }

    case 'clickStorm': {
      const buff = createGoldenBuff('clickBoost', CLICK_STORM_MULTIPLIER, CLICK_STORM_DURATION_MS, totalCollected);
      state.addBuff(buff);
      const durationSecs = Math.round(buff.effect.duration / 1000);
      return { description: `Click Storm! ${CLICK_STORM_MULTIPLIER}x clicks for ${durationSecs}s${durationSuffix}` };
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
      const buff = createGoldenBuff('xpBoost', HERO_RALLY_MULTIPLIER, HERO_RALLY_DURATION_MS, totalCollected);
      state.addBuff(buff);
      const durationSecs = Math.round(buff.effect.duration / 1000);
      return { description: `Hero Rally! ${HERO_RALLY_MULTIPLIER}x XP for ${durationSecs}s${durationSuffix}` };
    }

    case 'curdTsunami': {
      const buff = createGoldenBuff('productionBoost', CURD_TSUNAMI_MULTIPLIER, CURD_TSUNAMI_DURATION_MS, totalCollected);
      state.addBuff(buff);
      const durationSecs = Math.round(buff.effect.duration / 1000);
      return { description: `CURD TSUNAMI! ${CURD_TSUNAMI_MULTIPLIER}x CPS for ${durationSecs}s${durationSuffix}` };
    }
  }
}

/** Get human-readable reward description for notifications (derived from constants) */
export function getRewardDescription(rewardType: GoldenCheeseRewardType): string {
  const descriptions: Record<GoldenCheeseRewardType, string> = {
    cheeseFrenzy: `Cheese Frenzy! ${CHEESE_FRENZY_MULTIPLIER}x CPS for ${Math.round(CHEESE_FRENZY_DURATION_MS / 1000)}s`,
    luckyCurds: 'Lucky Curds!',
    clickStorm: `Click Storm! ${CLICK_STORM_MULTIPLIER}x clicks for ${Math.round(CLICK_STORM_DURATION_MS / 1000)}s`,
    rareIngredient: 'Rare Find!',
    heroRally: `Hero Rally! ${HERO_RALLY_MULTIPLIER}x XP for ${Math.round(HERO_RALLY_DURATION_MS / 1000)}s`,
    curdTsunami: `CURD TSUNAMI! ${CURD_TSUNAMI_MULTIPLIER}x CPS for ${Math.round(CURD_TSUNAMI_DURATION_MS / 1000)}s`,
  };
  return descriptions[rewardType];
}

/** Human-readable description of each lifetime-collection perk */
export function getPerkDescription(perk: GoldenCheeseMetaPerk): string {
  const descriptions: Record<GoldenCheeseMetaPerk, string> = {
    spawnWindow1: 'golden cheese spawns faster (3–8 min)',
    buffDuration: `golden buffs last ${Math.round((GOLDEN_BUFF_DURATION_MULTIPLIER - 1) * 100)}% longer`,
    spawnWindow2: 'golden cheese spawns much faster (2–7 min)',
    goldenRush: `${Math.round(GOLDEN_RUSH_CHANCE * 100)}% chance of a rapid golden rush spawn`,
  };
  return descriptions[perk];
}
