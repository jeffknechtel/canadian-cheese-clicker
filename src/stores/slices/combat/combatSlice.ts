import type { SliceCreator } from '../../types';
import type { CombatSlice } from './types';
import { createEmptyCombatState, createPrestigeCombatState } from './resetFactory';
import { publish } from '../../../domain/events';
import { COMBAT_LOG_MAX_ENTRIES } from '../../../data/constants';
import {
  initializeCombat,
  calculateCombatRewards,
  isBossStage,
  canUseAbility,
  canUseLimitBreak,
} from '../../../systems/combatEngine';
import { Battle } from '../../../domain/aggregates';
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

  // Exported for prestige slice to call - resets both combat state and zone progress
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
    const synergyDamageBonus = state.getSynergyBuffCombatDamageBonus();
    const heroDamageMultiplier = 1 + synergyDamageBonus;

    const battle = Battle.from(state.combat);
    const { battle: updated, logs } = battle.tick(deltaMs, partyStats, heroDamageMultiplier);

    if (logs.length > 0 || updated.result !== state.combat.battleResult) {
      set({
        combat: {
          ...updated.toState(),
          combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
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

      // Track defeated enemies for challenges
      const defeatedCount = state.combat.enemies.filter((e) => !e.isAlive).length;
      if (defeatedCount > 0) {
        get().incrementChallengeProgress('defeatEnemies', defeatedCount);
      }

      if (zoneId) {
        const currentProgress = state.zoneProgress[zoneId] || {
          zoneId,
          highestStageCleared: 0,
          bossDefeated: false,
          timesCompleted: 0,
        };

        const isBoss = isBossStage(zoneId, stageNumber);
        const isFirstBossDefeat = isBoss && !currentProgress.bossDefeated;

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

        // Track stage completion for challenges
        get().incrementChallengeProgress('completeZoneStage', 1);

        if (isFirstBossDefeat) {
          get().assignZoneGeneratorBonus(zoneId);
        }

        // Check for zone/boss achievements after updating progress
        get().checkAchievements();
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

  useHeroAbility: (heroId: string, _abilityId: string, targetId?: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = state.getPartyStats();
    const battle = Battle.from(state.combat);
    const { battle: updated, logs, success } = battle.useAbility(heroId, partyStats, targetId);

    if (!success) {
      return false;
    }

    playAbilitySound();

    set({
      combat: {
        ...updated.toState(),
        combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
      },
    });

    return true;
  },

  useLimitBreak: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = state.getPartyStats();
    const battle = Battle.from(state.combat);
    const { battle: updated, logs, success } = battle.useLimitBreak(heroId, partyStats);

    if (!success) {
      return false;
    }

    playLimitBreakSound();

    set({
      combat: {
        ...updated.toState(),
        combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
      },
    });

    return true;
  },

  canUseHeroAbility: (heroId: string) => {
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

    const rewards = calculateCombatRewards(state.combat.enemies, partyHeroIds, isBoss, state.combat.heroStates);

    // Publish event for cross-context handlers (production and heroes subscribe)
    publish({
      type: 'BattleWon',
      zoneId: state.combat.currentZone!,
      stageIndex: state.combat.currentStage,
      rewards,
    });

    // Reset to empty combat state (combat-owned)
    set({ combat: createEmptyCombatState() });

    return rewards;
  },

  getZoneProgress: (zoneId: string) => {
    return get().zoneProgress[zoneId];
  },
});
