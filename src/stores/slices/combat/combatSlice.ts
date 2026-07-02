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
  playAttackSound,
  playEnemyDefeatSound,
  playHealSound,
  playBuffSound,
  playDebuffSound,
  setCurrentProvince,
  startProvinceAmbient,
  stopAmbientSounds,
} from '../../../systems/audioSystem';
import { getZoneById } from '../../../data/zones';
import {
  vibrateSuccess,
  vibrateLimitBreak,
  vibrateCrit,
} from '../../../systems/haptics';

function getGridPosition(target: 'hero' | 'enemy', slotIndex: number): { x: number; y: number } {
  if (target === 'hero') {
    return {
      x: 20 + (slotIndex % 2) * 5,
      y: 15 + slotIndex * 18,
    };
  } else {
    return {
      x: 75 + (slotIndex % 2) * 5,
      y: 20 + slotIndex * 12,
    };
  }
}

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

    // Start province ambient audio
    const zone = getZoneById(zoneId);
    if (zone) {
      setCurrentProvince(zone.province);
      startProvinceAmbient(zone.province);
    }

    return true;
  },

  tickCombat: (deltaMs: number) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') return;

    const partyStats = state.getPartyStats();
    const synergyDamageBonus = state.getSynergyBuffCombatDamageBonus();
    const heroDamageMultiplier = 1 + synergyDamageBonus;

    const battle = Battle.from(state.combat);
    const { battle: updated, logs, audioEvents, feedbackEvents } = battle.tick(deltaMs, partyStats, heroDamageMultiplier);

    for (const event of audioEvents) {
      switch (event.type) {
        case 'attack':
          playAttackSound(event.variant);
          break;
        case 'enemyDefeat':
          playEnemyDefeatSound();
          break;
        case 'heal':
          playHealSound();
          break;
        case 'buff':
          playBuffSound();
          break;
        case 'debuff':
          playDebuffSound();
          break;
      }
    }

    // Process feedback events
    for (const event of feedbackEvents) {
      switch (event.type) {
        case 'damage':
        case 'heal': {
          const { x, y } = getGridPosition(event.target, event.slotIndex);
          get().addDamageNumber({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            value: event.value,
            type: event.type === 'heal' ? 'heal' : event.damageType,
            x,
            y,
          });
          // Haptic feedback for crits
          if (event.type === 'damage' && event.damageType === 'crit') {
            vibrateCrit();
          }
          break;
        }
        case 'comboHit':
          get().incrementCombo();
          break;
        case 'comboBreak':
          get().resetCombo();
          break;
        case 'flash':
          get().triggerFlash(event.color);
          break;
        case 'shake':
          get().triggerShake(event.intensity);
          break;
      }
    }

    // Preserve the updated feedback state (processed above) instead of using stale toState()
    const currentFeedback = get().combat.feedback;

    set({
      combat: {
        ...updated.toState(),
        feedback: currentFeedback,
        combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
      },
    });
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
      vibrateSuccess();
    } else if (result === 'defeat' || result === 'flee') {
      playDefeatJingle();
    }
    endCombatMusic(result === 'victory');
    stopAmbientSounds();
    setCurrentProvince(null);

    if (result === 'victory') {
      // Victory: set battleResult, keep isInCombat true until rewards claimed
      set({
        combat: {
          ...state.combat,
          battleResult: 'victory',
        },
      });
    } else {
      // Defeat/flee: reset to empty state immediately
      // This prevents the infinite modal loop
      set({ combat: createEmptyCombatState() });
    }
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
    vibrateLimitBreak();

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

  // Feedback actions
  addDamageNumber: (damage) => {
    const state = get();
    set({
      combat: {
        ...state.combat,
        feedback: {
          ...state.combat.feedback,
          damageNumbers: [...state.combat.feedback.damageNumbers, damage].slice(-20),
        },
      },
    });
  },

  removeDamageNumber: (id) => {
    const state = get();
    set({
      combat: {
        ...state.combat,
        feedback: {
          ...state.combat.feedback,
          damageNumbers: state.combat.feedback.damageNumbers.filter((d) => d.id !== id),
        },
      },
    });
  },

  incrementCombo: () => {
    const state = get();
    const newCombo = state.combat.feedback.comboCount + 1;
    set({
      combat: {
        ...state.combat,
        feedback: {
          ...state.combat.feedback,
          comboCount: newCombo,
          maxCombo: Math.max(state.combat.feedback.maxCombo, newCombo),
        },
      },
    });
  },

  resetCombo: () => {
    const state = get();
    set({
      combat: {
        ...state.combat,
        feedback: {
          ...state.combat.feedback,
          comboCount: 0,
        },
      },
    });
  },

  triggerFlash: (color) => {
    const state = get();
    set({
      combat: {
        ...state.combat,
        feedback: {
          ...state.combat.feedback,
          isFlashing: true,
          flashColor: color,
        },
      },
    });
    setTimeout(() => {
      const current = get();
      set({
        combat: {
          ...current.combat,
          feedback: {
            ...current.combat.feedback,
            isFlashing: false,
            flashColor: null,
          },
        },
      });
    }, 150);
  },

  triggerShake: (intensity) => {
    const state = get();
    set({
      combat: {
        ...state.combat,
        feedback: {
          ...state.combat.feedback,
          shakeIntensity: intensity,
        },
      },
    });
    const duration = intensity === 'light' ? 150 : intensity === 'medium' ? 300 : 500;
    setTimeout(() => {
      const current = get();
      set({
        combat: {
          ...current.combat,
          feedback: {
            ...current.combat.feedback,
            shakeIntensity: null,
          },
        },
      });
    }, duration);
  },

  resetFeedback: () => {
    const state = get();
    set({
      combat: {
        ...state.combat,
        feedback: {
          damageNumbers: [],
          comboCount: 0,
          maxCombo: 0,
          isFlashing: false,
          flashColor: null,
          shakeIntensity: null,
        },
      },
    });
  },
});
