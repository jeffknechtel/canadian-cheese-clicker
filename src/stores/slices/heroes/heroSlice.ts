import type { SliceCreator } from '../../types';
import type { HeroSlice } from './types';
import { computeCps } from '../production/cpsCalculator';
import {
  calculateXpPerSecond,
  calculateHeroStats,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
} from '../../../systems/productionEngine';
import { heroRegistry, equipmentRegistry } from '../../../domain';
import { HEROES, getXpForLevel, HERO_MAX_LEVEL } from '../../../data/heroes';
import {
  trackHeroRecruit,
  trackHeroLevelUp,
} from '../../../systems/analyticsService';
import type { FormationPosition, HeroState, HeroStats, HeroDefinition } from '../../../types/game';

type HeroLevelUpCallback = (hero: HeroDefinition, newLevel: number) => void;
let heroLevelUpCallback: HeroLevelUpCallback | null = null;

export function setHeroLevelUpCallback(callback: HeroLevelUpCallback | null): void {
  heroLevelUpCallback = callback;
}

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

    set({ curdPerSecond: computeCps(get()) });

    const totalRecruited = Object.keys(get().heroes).length;
    trackHeroRecruit(heroId, totalRecruited);

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

    if (!state.heroes[heroId]) return false;

    const currentPosition = Object.entries(state.party).find(
      ([, id]) => id === heroId
    )?.[0] as FormationPosition | undefined;

    const newParty = { ...state.party };
    if (currentPosition) {
      newParty[currentPosition] = null;
    }
    newParty[position] = heroId;

    set({ party: newParty });
    set({ curdPerSecond: computeCps(get()) });

    return true;
  },

  removeFromParty: (position: FormationPosition) => {
    const state = get();
    const newParty = { ...state.party, [position]: null };

    set({ party: newParty });
    set({ curdPerSecond: computeCps(get()) });
  },

  swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => {
    const state = get();
    const newParty = {
      ...state.party,
      [pos1]: state.party[pos2],
      [pos2]: state.party[pos1],
    };

    set({ party: newParty });
    set({ curdPerSecond: computeCps(get()) });
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

    set({ curdPerSecond: computeCps(get()) });

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

    set({ curdPerSecond: computeCps(get()) });
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

    set({ curdPerSecond: computeCps(get()) });

    if (levelUps.length > 0) {
      const heroDef = heroRegistry.get(heroId);
      for (const { level: lvl } of levelUps) {
        if (heroDef && heroLevelUpCallback) {
          heroLevelUpCallback(heroDef, lvl);
        }
        trackHeroLevelUp(heroId, lvl);
      }
    }
  },

  tickHeroXp: (deltaMs: number) => {
    const state = get();
    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null);

    if (partyHeroIds.length === 0) return;

    const xpPerSecond = calculateXpPerSecond(state.curdPerSecond);
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * deltaMs) / 1000;

    const xpPerHero = xpGained / partyHeroIds.length;

    for (const heroId of partyHeroIds) {
      get().grantXp(heroId, xpPerHero);
    }
  },

  getHeroMultiplier: () => {
    const { heroes, party } = get();
    const heroMultiplier = calculateHeroCpsMultiplier(heroes, party);
    const formationMultiplier = calculateFormationMultiplier(party, heroes);
    return heroMultiplier * formationMultiplier;
  },

  getPartyStats: () => {
    const state = get();
    const stats: Record<string, HeroStats> = {};

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    for (const heroId of partyHeroIds) {
      const heroState = state.heroes[heroId];
      if (heroState) {
        stats[heroId] = calculateHeroStats(heroId, heroState);
      }
    }

    return stats;
  },
});
