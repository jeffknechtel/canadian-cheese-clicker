import type { SliceCreator } from '../../types';
import type { CombatSlice } from './types';
import { createEmptyCombatState, createPrestigeCombatState } from './resetFactory';
import {
  initializeCombat,
  tickCombat,
  calculateCombatRewards,
  isBossStage,
  executeHeroAbility,
  executeHeroLimitBreak,
  canUseAbility,
  canUseLimitBreak,
} from '../../../systems/combatEngine';
import {
  trackCombatStart,
  trackCombatEnd,
} from '../../../systems/analyticsService';
import {
  startCombatMusic,
  endCombatMusic,
  playVictoryFanfare,
  playDefeatJingle,
  playAbilitySound,
  playLimitBreakSound,
} from '../../../systems/audioSystem';

export const createCombatSlice: SliceCreator<CombatSlice> = (set, get) => ({
  // State - use factory for initial
  combat: createEmptyCombatState(),
  zoneProgress: {},

  // Exported for prestige slice to call
  getPrestigeCombatReset: () => createPrestigeCombatState(),

  startCombat: (zoneId: string, stageNumber: number) => {
    const state = get();

    if (state.combat.isInCombat) return false;

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    if (partyHeroIds.length === 0) return false;

    const combatState = initializeCombat(zoneId, stageNumber, state.heroes, state.party);
    if (!combatState) return false;

    set({ combat: combatState });

    const isBoss = isBossStage(zoneId, stageNumber);
    trackCombatStart(zoneId, stageNumber, isBoss);
    startCombatMusic(isBoss);

    return true;
  },

  tickCombat: (deltaMs: number) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') return;

    const partyStats = state.getPartyStats();
    const result = tickCombat(state.combat, deltaMs, partyStats);

    if (Object.keys(result.stateUpdates).length > 0 || result.newLogEntries.length > 0) {
      set({
        combat: {
          ...state.combat,
          ...result.stateUpdates,
          combatLog: [...state.combat.combatLog, ...result.newLogEntries].slice(-100),
        },
      });
    }
  },

  endCombat: (result: 'victory' | 'defeat' | 'flee') => {
    const state = get();
    if (!state.combat.isInCombat) return;

    if (result === 'victory') {
      const zoneId = state.combat.currentZone;
      const stageNumber = state.combat.currentStage;

      if (zoneId) {
        const currentProgress = state.zoneProgress[zoneId] || {
          zoneId,
          highestStageCleared: 0,
          bossDefeated: false,
          timesCompleted: 0,
        };

        const isBoss = isBossStage(zoneId, stageNumber);
        const newProgress = {
          ...currentProgress,
          highestStageCleared: Math.max(currentProgress.highestStageCleared, stageNumber),
          bossDefeated: currentProgress.bossDefeated || isBoss,
          timesCompleted: isBoss ? currentProgress.timesCompleted + 1 : currentProgress.timesCompleted,
        };

        set({
          zoneProgress: {
            ...state.zoneProgress,
            [zoneId]: newProgress,
          },
        });
      }
    }

    const zoneIdForTracking = state.combat.currentZone;
    const stageNumberForTracking = state.combat.currentStage;
    if (zoneIdForTracking) {
      const firstLogEntry = state.combat.combatLog[0];
      const durationMs = firstLogEntry ? Date.now() - firstLogEntry.timestamp : 0;
      trackCombatEnd(zoneIdForTracking, stageNumberForTracking, result, durationMs);
    }

    if (result === 'victory') {
      playVictoryFanfare();
    } else if (result === 'defeat' || result === 'flee') {
      playDefeatJingle();
    }
    endCombatMusic(result === 'victory');

    set({
      combat: {
        ...state.combat,
        battleResult: result === 'flee' ? 'defeat' : result,
      },
    });
  },

  setCombatSpeed: (speed: 1 | 2 | 4) => {
    set((s) => ({
      combat: {
        ...s.combat,
        combatSpeed: speed,
      },
    }));
  },

  useHeroSkill: (heroId: string, _skillId: string, targetId?: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = state.getPartyStats();
    const result = executeHeroAbility(state.combat, heroId, partyStats, targetId);

    if (!result.success) {
      return false;
    }

    playAbilitySound();

    const updatedCombat = {
      ...state.combat,
      ...result.stateUpdates,
      combatLog: [...state.combat.combatLog, ...result.logEntries].slice(-100),
    };

    if (result.stateUpdates.enemies?.every((e: { isAlive: boolean }) => !e.isAlive)) {
      updatedCombat.battleResult = 'victory';
    }

    set({ combat: updatedCombat });

    return true;
  },

  useLimitBreak: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = state.getPartyStats();
    const result = executeHeroLimitBreak(state.combat, heroId, partyStats);

    if (!result.success) {
      return false;
    }

    playLimitBreakSound();

    const updatedCombat = {
      ...state.combat,
      ...result.stateUpdates,
      combatLog: [...state.combat.combatLog, ...result.logEntries].slice(-100),
    };

    if (result.stateUpdates.enemies?.every((e: { isAlive: boolean }) => !e.isAlive)) {
      updatedCombat.battleResult = 'victory';
    }

    set({ combat: updatedCombat });

    return true;
  },

  canUseHeroSkill: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return { canUse: false, reason: 'Not in active combat' };
    }
    const heroState = state.combat.heroStates[heroId];
    if (!heroState) {
      return { canUse: false, reason: 'Hero not in combat' };
    }
    return canUseAbility(heroState, heroId);
  },

  canUseLimitBreakAction: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return { canUse: false, reason: 'Not in active combat' };
    }
    return canUseLimitBreak(state.combat, heroId);
  },

  claimCombatRewards: () => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'victory') {
      return null;
    }

    const zoneId = state.combat.currentZone;
    const stageNumber = state.combat.currentStage;
    const isBoss = zoneId ? isBossStage(zoneId, stageNumber) : false;

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    const rewards = calculateCombatRewards(state.combat.enemies, partyHeroIds, isBoss);

    // Cross-slice: add curds and whey
    state.addCurds(rewards.curds);
    set((s) => ({
      whey: s.whey.plus(rewards.whey),
      totalCurdsEarned: s.totalCurdsEarned.plus(rewards.curds),
    }));

    // Cross-slice: grant XP to heroes
    for (const [heroId, xpAmount] of Object.entries(rewards.xp)) {
      get().grantXp(heroId, xpAmount);
    }

    // Reset to empty combat state
    set({ combat: createEmptyCombatState() });

    return rewards;
  },

  getZoneProgress: (zoneId: string) => {
    return get().zoneProgress[zoneId];
  },
});
