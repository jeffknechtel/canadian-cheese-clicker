import type { SliceCreator } from '../../types';
import type { HeroSlice } from './types';
import {
  calculateXpPerSecond,
  calculateHeroStats,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
} from '../../../systems/productionEngine';
import { heroRegistry, equipmentRegistry, Party, publish } from '../../../domain';
import { HEROES, getXpForLevel, HERO_MAX_LEVEL } from '../../../data/heroes';
import {
  trackHeroRecruit,
  trackHeroLevelUp,
} from '../../../systems/analyticsService';
import type { FormationPosition, HeroState, HeroStats } from '../../../types/game';

export const createHeroSlice: SliceCreator<HeroSlice> = (set, get) => ({
  // State
  heroes: {},
  party: {
    frontLeft: null,
    frontRight: null,
    backLeft: null,
    backRight: null,
  },
  equipmentInventory: [],

  // Actions
  recruitHero: (heroId: string) => {
    const state = get();
    const heroDef = heroRegistry.get(heroId);

    if (!heroDef) return false;
    if (state.heroes[heroId]) return false;
    if (state.curds.lt(heroDef.recruitCost)) return false;

    const newHeroState: HeroState = {
      id: heroId,
      level: 1,
      xp: 0,
      xpToNextLevel: getXpForLevel(1),
      equipment: {},
    };

    set({
      curds: state.curds.minus(heroDef.recruitCost),
      heroes: { ...state.heroes, [heroId]: newHeroState },
    });

    publish({ type: 'CpsInputsChanged' });

    const totalRecruited = Object.keys(get().heroes).length;
    trackHeroRecruit(heroId, totalRecruited);

    // Check for hero recruitment achievements
    get().checkAchievements();

    return true;
  },

  canAffordHero: (heroId: string) => {
    const { curds, heroes } = get();
    const heroDef = heroRegistry.get(heroId);

    if (!heroDef) return false;
    if (heroes[heroId]) return false;
    return curds.gte(heroDef.recruitCost);
  },

  isHeroRecruited: (heroId: string) => {
    return get().heroes[heroId] !== undefined;
  },

  getHeroState: (heroId: string) => {
    return get().heroes[heroId];
  },

  getAvailableHeroes: () => {
    const { heroes } = get();
    return HEROES.filter((h) => !heroes[h.id]);
  },

  getRecruitedHeroes: () => {
    const { heroes } = get();
    return HEROES.filter((h) => heroes[h.id] !== undefined);
  },

  assignToParty: (heroId: string, position: FormationPosition) => {
    const state = get();

    const party = Party.from(state.party, state.heroes);
    const updated = party.assignHero(heroId, position);

    if (!updated) {
      return false;
    }

    set({ party: updated.toFormation() });
    publish({ type: 'CpsInputsChanged' });

    return true;
  },

  removeFromParty: (position: FormationPosition) => {
    const state = get();

    const party = Party.from(state.party, state.heroes);
    const updated = party.removeHero(position);

    set({ party: updated.toFormation() });
    publish({ type: 'CpsInputsChanged' });
  },

  swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => {
    const state = get();

    const party = Party.from(state.party, state.heroes);
    const updated = party.swap(pos1, pos2);

    set({ party: updated.toFormation() });
    publish({ type: 'CpsInputsChanged' });
  },

  getPartyHeroes: () => {
    const { party } = get();
    const positions: FormationPosition[] = ['frontLeft', 'frontRight', 'backLeft', 'backRight'];
    return positions.map((pos) => {
      const heroId = party[pos];
      return heroId ? heroRegistry.get(heroId) ?? null : null;
    });
  },

  buyEquipment: (equipmentId: string) => {
    const state = get();
    const equipment = equipmentRegistry.get(equipmentId);

    if (!equipment) return false;
    if (state.equipmentInventory.includes(equipmentId)) return false;
    if (state.curds.lt(equipment.cost)) return false;

    set({
      curds: state.curds.minus(equipment.cost),
      equipmentInventory: [...state.equipmentInventory, equipmentId],
    });

    return true;
  },

  canAffordEquipment: (equipmentId: string) => {
    const { curds, equipmentInventory } = get();
    const equipment = equipmentRegistry.get(equipmentId);

    if (!equipment) return false;
    if (equipmentInventory.includes(equipmentId)) return false;
    return curds.gte(equipment.cost);
  },

  equipItem: (heroId: string, equipmentId: string) => {
    const state = get();
    const heroState = state.heroes[heroId];
    const equipment = equipmentRegistry.get(equipmentId);

    if (!heroState) return false;
    if (!equipment) return false;
    if (!state.equipmentInventory.includes(equipmentId)) return false;

    for (const [otherId, otherHero] of Object.entries(state.heroes)) {
      if (otherId !== heroId && Object.values(otherHero.equipment).includes(equipmentId)) {
        return false;
      }
    }

    const newHeroState: HeroState = {
      ...state.heroes[heroId],
      equipment: {
        ...state.heroes[heroId].equipment,
        [equipment.slot]: equipmentId,
      },
    };

    set({
      heroes: { ...state.heroes, [heroId]: newHeroState },
    });

    publish({ type: 'CpsInputsChanged' });

    return true;
  },

  unequipItem: (heroId: string, slot) => {
    const state = get();
    const heroState = state.heroes[heroId];

    if (!heroState) return;
    if (!heroState.equipment[slot]) return;

    const newEquipment = { ...state.heroes[heroId].equipment };
    delete newEquipment[slot];

    const newHeroState: HeroState = {
      ...state.heroes[heroId],
      equipment: newEquipment,
    };

    set({
      heroes: { ...state.heroes, [heroId]: newHeroState },
    });

    publish({ type: 'CpsInputsChanged' });
  },

  getHeroEquipment: (heroId: string) => {
    const heroState = get().heroes[heroId];
    if (!heroState) return [];

    const equipment = [];
    for (const equipmentId of Object.values(heroState.equipment)) {
      if (equipmentId) {
        const eq = equipmentRegistry.get(equipmentId);
        if (eq) equipment.push(eq);
      }
    }
    return equipment;
  },

  grantXp: (heroId: string, amount: number) => {
    const state = get();
    const heroState = state.heroes[heroId];

    if (!heroState) return;
    if (heroState.level >= HERO_MAX_LEVEL) return;

    const levelUps: Array<{ level: number }> = [];

    let xp = heroState.xp + amount;
    let level = heroState.level;
    let xpToNextLevel = heroState.xpToNextLevel;

    while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
      xp -= xpToNextLevel;
      level += 1;
      xpToNextLevel = getXpForLevel(level);
      levelUps.push({ level });
    }

    if (level >= HERO_MAX_LEVEL) {
      xp = 0;
      xpToNextLevel = 0;
    }

    const newHero: HeroState = {
      ...heroState,
      xp,
      level,
      xpToNextLevel,
    };

    set({
      heroes: { ...state.heroes, [heroId]: newHero },
    });

    publish({ type: 'CpsInputsChanged' });

    if (levelUps.length > 0) {
      const heroDef = heroRegistry.get(heroId);
      for (const { level: lvl } of levelUps) {
        if (heroDef) {
          publish({ type: 'HeroLeveledUp', heroId, hero: heroDef, newLevel: lvl });
        }
        trackHeroLevelUp(heroId, lvl);
      }
    }
  },

  tickHeroXp: (deltaMs: number) => {
    const state = get();

    const party = Party.from(state.party, state.heroes);
    const partyHeroIds = party.getActiveHeroIds();

    if (partyHeroIds.length === 0) return;

    const xpPerSecond = calculateXpPerSecond(state.curdPerSecond);
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const prestigeMultipliers = state.getPrestigeMultipliers();
    const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * prestigeMultipliers.xp * deltaMs) / 1000;

    const xpPerHero = xpGained / partyHeroIds.length;

    // Batch all hero XP updates into a single state change
    const heroUpdates: Record<string, HeroState> = {};
    const levelUps: Array<{ heroId: string; level: number }> = [];

    for (const heroId of partyHeroIds) {
      const heroState = state.heroes[heroId];
      if (!heroState || heroState.level >= HERO_MAX_LEVEL) continue;

      let xp = heroState.xp + xpPerHero;
      let level = heroState.level;
      let xpToNextLevel = heroState.xpToNextLevel;

      while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
        xp -= xpToNextLevel;
        level += 1;
        xpToNextLevel = getXpForLevel(level);
        levelUps.push({ heroId, level });
      }

      if (level >= HERO_MAX_LEVEL) {
        xp = 0;
        xpToNextLevel = 0;
      }

      heroUpdates[heroId] = { ...heroState, xp, level, xpToNextLevel };
    }

    // Single state update for all heroes
    if (Object.keys(heroUpdates).length > 0) {
      set({ heroes: { ...state.heroes, ...heroUpdates } });
    }

    // Single CPS recalc if any level-ups occurred
    if (levelUps.length > 0) {
      publish({ type: 'CpsInputsChanged' });
      for (const { heroId, level } of levelUps) {
        const heroDef = heroRegistry.get(heroId);
        if (heroDef) {
          publish({ type: 'HeroLeveledUp', heroId, hero: heroDef, newLevel: level });
        }
        trackHeroLevelUp(heroId, level);
      }
    }
  },

  getHeroMultiplier: () => {
    const state = get();
    const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
    const synergyFormationBonus = state.getSynergyFormationBonus();
    const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes, synergyFormationBonus);
    return heroMultiplier * formationMultiplier;
  },

  getPartyStats: () => {
    const state = get();
    const stats: Record<string, HeroStats> = {};

    const party = Party.from(state.party, state.heroes);
    const partyHeroIds = party.getActiveHeroIds();

    // Get active heroBuff totals from cheese
    const heroBuffTotals = state.getActiveHeroBuffTotals();

    for (const heroId of partyHeroIds) {
      const heroState = state.heroes[heroId];
      if (heroState) {
        const baseStats = calculateHeroStats(heroId, heroState);
        // Apply cheese heroBuffs as flat adds (party-wide)
        stats[heroId] = {
          hp: baseStats.hp + (heroBuffTotals.hp ?? 0),
          attack: baseStats.attack + (heroBuffTotals.attack ?? 0),
          defense: baseStats.defense + (heroBuffTotals.defense ?? 0),
          speed: baseStats.speed + (heroBuffTotals.speed ?? 0),
          cheeseAffinity: baseStats.cheeseAffinity + (heroBuffTotals.cheeseAffinity ?? 0),
        };
      }
    }

    return stats;
  },

  getPrestigeHeroReset: () => ({
    heroes: {},
    party: {
      frontLeft: null,
      frontRight: null,
      backLeft: null,
      backRight: null,
    },
    equipmentInventory: [],
  }),

  grantEquipment: (equipmentId: string) => {
    const { equipmentInventory } = get();
    if (!equipmentInventory.includes(equipmentId)) {
      set({
        equipmentInventory: [...equipmentInventory, equipmentId],
      });
    }
  },
});
