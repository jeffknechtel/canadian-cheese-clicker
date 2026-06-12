import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { ChallengeSlice } from './types';
import type { ChallengeGoalType } from '../../../types/game';
import {
  getWeekStartTimestamp,
  getChallengeForWeek,
  getChallengeById,
} from '../../../data/challenges';

const createInitialChallengeState = () => ({
  activeChallengeId: null as string | null,
  weekStartTimestamp: 0,
  progress: 0,
  completed: false,
  claimed: false,
});

export const createChallengeSlice: SliceCreator<ChallengeSlice> = (set, get) => ({
  challenge: createInitialChallengeState(),

  initializeChallenge: () => {
    const currentWeekStart = getWeekStartTimestamp();
    const existingState = get().challenge;

    if (existingState.weekStartTimestamp === currentWeekStart) {
      return;
    }

    const challenge = getChallengeForWeek(currentWeekStart);
    set({
      challenge: {
        activeChallengeId: challenge.id,
        weekStartTimestamp: currentWeekStart,
        progress: 0,
        completed: false,
        claimed: false,
      },
    });
  },

  incrementChallengeProgress: (goalType: ChallengeGoalType, amount: number = 1) => {
    const state = get().challenge;
    if (!state.activeChallengeId || state.completed) return;

    const challenge = getChallengeById(state.activeChallengeId);
    if (!challenge || challenge.goal.type !== goalType) return;

    const newProgress = state.progress + amount;
    const completed = newProgress >= challenge.goal.target;

    set({
      challenge: {
        ...state,
        progress: newProgress,
        completed,
      },
    });
  },

  claimChallengeReward: () => {
    const state = get().challenge;
    if (!state.activeChallengeId || !state.completed || state.claimed) {
      return false;
    }

    const challenge = getChallengeById(state.activeChallengeId);
    if (!challenge) return false;

    const store = get();
    const reward = challenge.reward;

    switch (reward.type) {
      case 'curds':
        store.addCurds(new Decimal(reward.amount));
        break;
      case 'rennet':
        set({
          prestige: {
            ...store.prestige,
            rennet: store.prestige.rennet + reward.amount,
            totalRennet: store.prestige.totalRennet + reward.amount,
          },
        });
        break;
      case 'ingredient':
        if (!store.crafting.unlockedIngredients.includes(reward.ingredientId)) {
          set({
            crafting: {
              ...store.crafting,
              unlockedIngredients: [...store.crafting.unlockedIngredients, reward.ingredientId],
            },
          });
        }
        break;
      case 'equipment':
        if (!store.equipmentInventory.includes(reward.equipmentId)) {
          set({
            equipmentInventory: [...store.equipmentInventory, reward.equipmentId],
          });
        }
        break;
    }

    set({
      challenge: {
        ...state,
        claimed: true,
      },
    });

    return true;
  },

  checkWeekRollover: () => {
    const currentWeekStart = getWeekStartTimestamp();
    const state = get().challenge;

    if (state.weekStartTimestamp !== currentWeekStart) {
      get().initializeChallenge();
    }
  },
});
