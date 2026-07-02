import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { ChallengeSlice } from './types';
import type { ChallengeGoalType } from '../../../types/game';
import {
  getWeekStartTimestamp,
  getChallengeForWeek,
  getChallengeById,
} from '../../../data/challenges';
import { createInitialChallengeState } from './resetFactory';

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

    // Route rewards through proper slice actions to ensure side effects fire
    switch (reward.type) {
      case 'curds':
        store.addCurds(new Decimal(reward.amount));
        break;
      case 'rennet':
        store.grantRennet(reward.amount);
        break;
      case 'ingredient':
        store.unlockIngredient(reward.ingredientId);
        break;
      case 'equipment':
        store.grantEquipment(reward.equipmentId);
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
