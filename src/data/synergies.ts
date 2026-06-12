import type { SynergyUpgrade } from '../types/game';

export const SYNERGIES: SynergyUpgrade[] = [
  {
    id: 'the_canadian_way',
    name: 'The Canadian Way',
    description: 'Every 100 Eh clicks grants +2% CPS (doubled from +1%)',
    cost: 10,
    effect: { type: 'ehMultiplierBonus', value: 0.01 },
    systemsConnected: ['Eh Counter', 'Production'],
    icon: '🇨🇦',
  },
  {
    id: 'battle_hardened_vats',
    name: 'Battle-Hardened Vats',
    description: 'Each combat zone cleared grants +5% to a random generator',
    cost: 20,
    effect: { type: 'zoneGeneratorBonus', value: 0.05 },
    systemsConnected: ['Combat', 'Production'],
    icon: '⚔️',
  },
  {
    id: 'cheese_fueled_warriors',
    name: 'Cheese-Fueled Warriors',
    description: 'Active cheese buffs grant +25% combat damage',
    cost: 30,
    effect: { type: 'buffCombatDamage', value: 0.25 },
    systemsConnected: ['Crafting', 'Combat'],
    icon: '🧀',
  },
  {
    id: 'fromage_affinity',
    name: 'Fromage Affinity',
    description: 'Party cheese affinity reduces crafting time (affinity/10 = % faster)',
    cost: 25,
    effect: { type: 'affinityCraftingSpeed', divisor: 10 },
    systemsConnected: ['Heroes', 'Crafting'],
    icon: '👨‍🍳',
  },
  {
    id: 'combat_harmony',
    name: 'Combat Harmony',
    description: 'Full party of 4 different classes grants +25% CPS (up from +10%)',
    cost: 40,
    effect: { type: 'fullPartyFormationBonus', value: 0.25 },
    systemsConnected: ['Heroes', 'Production'],
    icon: '🤝',
  },
];

export function getSynergyById(id: string): SynergyUpgrade | undefined {
  return SYNERGIES.find((s) => s.id === id);
}
