import type { SliceCreator } from '../../types';
import type { SynergySlice, SynergyState } from './types';
import type { SynergyId } from '../../../types/game';
import { getSynergyById } from '../../../data/synergies';
import { publish, generatorRegistry, heroRegistry } from '../../../domain';
import {
  SYNERGY_EH_BONUS_ADDITION,
  SYNERGY_ZONE_GENERATOR_BONUS,
  SYNERGY_BUFF_COMBAT_DAMAGE,
  SYNERGY_AFFINITY_CRAFTING_DIVISOR,
  SYNERGY_FULL_PARTY_FORMATION_BONUS,
} from '../../../data/constants';
import { calculateHeroStats } from '../../../systems/productionEngine';

const initialSynergyState: SynergyState = {
  purchased: [],
  zoneGeneratorBonuses: {},
};

export const createSynergySlice: SliceCreator<SynergySlice> = (set, get) => ({
  synergy: initialSynergyState,

  purchaseSynergy: (id: SynergyId) => {
    const state = get();
    const synergy = getSynergyById(id);

    if (!synergy) return false;
    if (!state.canPurchaseSynergy(id)) return false;

    set({
      whey: state.whey.minus(synergy.cost),
      synergy: {
        ...state.synergy,
        purchased: [...state.synergy.purchased, id],
      },
    });

    publish({ type: 'CpsInputsChanged' });
    publish({ type: 'SynergyPurchased', synergyId: id });

    return true;
  },

  canPurchaseSynergy: (id: SynergyId) => {
    const state = get();
    const synergy = getSynergyById(id);

    if (!synergy) return false;
    if (state.synergy.purchased.includes(id)) return false;
    if (state.whey.lt(synergy.cost)) return false;

    return true;
  },

  hasSynergy: (id: SynergyId) => {
    return get().synergy.purchased.includes(id);
  },

  getSynergyEhBonus: () => {
    if (!get().hasSynergy('the_canadian_way')) return 0;
    return SYNERGY_EH_BONUS_ADDITION;
  },

  getSynergyZoneGeneratorMultipliers: () => {
    const state = get();
    if (!state.hasSynergy('battle_hardened_vats')) return {};

    const multipliers: Record<string, number> = {};

    for (const generatorId of Object.values(state.synergy.zoneGeneratorBonuses)) {
      multipliers[generatorId] =
        (multipliers[generatorId] ?? 1) * (1 + SYNERGY_ZONE_GENERATOR_BONUS);
    }

    return multipliers;
  },

  getSynergyBuffCombatDamageBonus: () => {
    const state = get();
    if (!state.hasSynergy('cheese_fueled_warriors')) return 0;

    const now = Date.now();
    const hasActiveBuff = state.crafting.activeBuffs.some((buff) => now < buff.endTime);

    return hasActiveBuff ? SYNERGY_BUFF_COMBAT_DAMAGE : 0;
  },

  getSynergyCraftingSpeedMultiplier: () => {
    const state = get();
    if (!state.hasSynergy('fromage_affinity')) return 1;

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null);

    if (partyHeroIds.length === 0) return 1;

    let totalAffinity = 0;
    for (const heroId of partyHeroIds) {
      const heroState = state.heroes[heroId];
      if (heroState) {
        const stats = calculateHeroStats(heroId, heroState);
        totalAffinity += stats.cheeseAffinity;
      }
    }

    const avgAffinity = totalAffinity / partyHeroIds.length;
    const speedBonus = avgAffinity / SYNERGY_AFFINITY_CRAFTING_DIVISOR / 100;

    return Math.max(0.5, 1 - speedBonus);
  },

  getSynergyFormationBonus: () => {
    const state = get();
    if (!state.hasSynergy('combat_harmony')) return null;

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null);

    if (partyHeroIds.length !== 4) return null;

    const classes = new Set<string>();
    for (const heroId of partyHeroIds) {
      const hero = heroRegistry.get(heroId);
      if (hero) {
        classes.add(hero.class);
      }
    }

    if (classes.size === 4) {
      return SYNERGY_FULL_PARTY_FORMATION_BONUS;
    }

    return null;
  },

  assignZoneGeneratorBonus: (zoneId: string) => {
    const state = get();
    if (!state.hasSynergy('battle_hardened_vats')) return;
    if (state.synergy.zoneGeneratorBonuses[zoneId]) return;

    const generators = generatorRegistry.getAll();
    const randomIndex = Math.floor(Math.random() * generators.length);
    const generatorId = generators[randomIndex].id;

    set({
      synergy: {
        ...state.synergy,
        zoneGeneratorBonuses: {
          ...state.synergy.zoneGeneratorBonuses,
          [zoneId]: generatorId,
        },
      },
    });

    publish({ type: 'CpsInputsChanged' });
  },

  getPrestigeSynergyReset: () => {
    return {};
  },
});

export { initialSynergyState };
