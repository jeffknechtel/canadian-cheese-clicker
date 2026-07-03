import type { SliceCreator } from '../../types';
import type { GoldenCheeseSlice } from './types';
import {
  getRandomSpawnDelay,
  rollReward,
  applyReward,
  VISIBLE_DURATION_MS,
  getUnlockedPerks,
} from '../../../systems/goldenCheeseSystem';
import {
  GOLDEN_RUSH_CHANCE,
  GOLDEN_RUSH_DELAY_MS,
} from '../../../data/constants';

import type { GoldenCheeseRewardType } from '../../../types/game';

const createInitialGoldenCheeseState = (): {
  nextSpawnAt: number;
  isVisible: boolean;
  expiresAt: number;
  currentReward: GoldenCheeseRewardType | null;
  totalCollected: number;
} => ({
  nextSpawnAt: 0,
  isVisible: false,
  expiresAt: 0,
  currentReward: null,
  totalCollected: 0,
});

export const createGoldenCheeseSlice: SliceCreator<GoldenCheeseSlice> = (set, get) => ({
  goldenCheese: createInitialGoldenCheeseState(),

  scheduleNextGoldenCheese: (forceDelayMs?: number) => {
    const { totalCollected } = get().goldenCheese;
    const delay = forceDelayMs ?? getRandomSpawnDelay(totalCollected);
    set({
      goldenCheese: {
        ...get().goldenCheese,
        nextSpawnAt: Date.now() + delay,
      },
    });
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tickGoldenCheese: (_deltaMs: number) => {
    const now = Date.now();
    const gc = get().goldenCheese;

    // First tick: schedule if not yet scheduled
    if (gc.nextSpawnAt === 0 && !gc.isVisible) {
      get().scheduleNextGoldenCheese();
      return;
    }

    // Check if it's time to spawn
    if (!gc.isVisible && gc.nextSpawnAt > 0 && now >= gc.nextSpawnAt) {
      const reward = rollReward();
      set({
        goldenCheese: {
          ...gc,
          isVisible: true,
          expiresAt: now + VISIBLE_DURATION_MS,
          currentReward: reward,
          nextSpawnAt: 0,
        },
      });
      return;
    }

    // Check if visible golden cheese has expired
    if (gc.isVisible && now >= gc.expiresAt) {
      set({
        goldenCheese: {
          ...gc,
          isVisible: false,
          expiresAt: 0,
          currentReward: null,
        },
      });
      get().scheduleNextGoldenCheese();
    }
  },

  collectGoldenCheese: () => {
    const gc = get().goldenCheese;
    if (!gc.isVisible || !gc.currentReward) return null;

    const rewardType = gc.currentReward;
    applyReward(rewardType, get);

    const newTotalCollected = gc.totalCollected + 1;

    set({
      goldenCheese: {
        ...gc,
        isVisible: false,
        expiresAt: 0,
        currentReward: null,
        totalCollected: newTotalCollected,
      },
    });

    // Check for Golden Rush perk: 10% chance for quick respawn
    const perks = getUnlockedPerks(newTotalCollected);
    if (perks.has('goldenRush') && Math.random() < GOLDEN_RUSH_CHANCE) {
      const rushDelay = GOLDEN_RUSH_DELAY_MS.min + Math.random() * (GOLDEN_RUSH_DELAY_MS.max - GOLDEN_RUSH_DELAY_MS.min);
      get().scheduleNextGoldenCheese(rushDelay);
    } else {
      get().scheduleNextGoldenCheese();
    }

    return rewardType;
  },

  resetGoldenCheeseOnPrestige: () => {
    const totalCollected = get().goldenCheese.totalCollected;
    set({
      goldenCheese: {
        ...createInitialGoldenCheeseState(),
        totalCollected, // Preserve lifetime count
      },
    });
  },
});
