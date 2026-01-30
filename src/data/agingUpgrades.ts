import type { AgingUpgrade } from '../types/game';

export const AGING_UPGRADES: AgingUpgrade[] = [
  // Tier 1: Basic upgrades (cost 1-10 Rennet)
  {
    id: 'curd_catalyst',
    name: 'Curd Catalyst',
    description: '+5% click power per purchase',
    cost: 1,
    effect: { type: 'clickBonus', value: 0.05 },
    maxPurchases: 10,
    icon: '🧪',
  },
  {
    id: 'efficient_vats',
    name: 'Efficient Vats',
    description: '-10% generator costs',
    cost: 5,
    effect: { type: 'generatorCostReduction', value: 0.1 },
    maxPurchases: 5,
    icon: '⚗️',
  },
  {
    id: 'quality_culture',
    name: 'Quality Culture',
    description: '+10% all production per purchase',
    cost: 10,
    effect: { type: 'productionBonus', value: 0.1 },
    maxPurchases: 10,
    icon: '🦠',
  },

  // Tier 2: Advanced upgrades (cost 25-100 Rennet)
  {
    id: 'master_affineur',
    name: 'Master Affineur',
    description: '+1% production per generator type owned',
    cost: 50,
    effect: { type: 'generatorEfficiency', value: 0.01 },
    maxPurchases: 5,
    icon: '👨‍🍳',
    requirement: { type: 'rennetSpent', amount: 25 },
  },
  {
    id: 'cheese_sommelier',
    name: 'Cheese Sommelier',
    description: 'Unlock cheese pairing bonuses (+25% production)',
    cost: 100,
    effect: { type: 'productionBonus', value: 0.25 },
    maxPurchases: 1,
    icon: '🍷',
    requirement: { type: 'upgrade', upgradeId: 'master_affineur' },
  },
  {
    id: 'head_start',
    name: 'Head Start',
    description: 'Start with 1,000 curds after Aging',
    cost: 25,
    effect: { type: 'startingCurds', value: 1000 },
    maxPurchases: 10, // Stacks: 1k, 2k, 3k... 10k
    icon: '🏁',
  },
  {
    id: 'apprentice_network',
    name: 'Apprentice Network',
    description: 'Start with 5 Milk Pails after Aging',
    cost: 50,
    effect: { type: 'startingGenerators', generatorId: 'milk_pail', value: 5 },
    maxPurchases: 5,
    icon: '👥',
  },

  // Tier 3: Expert upgrades (cost 150-500 Rennet)
  {
    id: 'aging_wisdom',
    name: 'Aging Wisdom',
    description: '+25% hero XP gain',
    cost: 150,
    effect: { type: 'xpBonus', value: 0.25 },
    maxPurchases: 4,
    icon: '📚',
    requirement: { type: 'agingResets', count: 5 },
  },
  {
    id: 'battle_hardened_cheese',
    name: 'Battle-Hardened Cheese',
    description: '+20% combat rewards',
    cost: 200,
    effect: { type: 'combatBonus', value: 0.2 },
    maxPurchases: 5,
    icon: '⚔️',
    requirement: { type: 'agingResets', count: 10 },
  },
  {
    id: 'canadian_perseverance',
    name: 'Canadian Perseverance',
    description: '+50% all production, -25% Rennet on next reset',
    cost: 500,
    effect: { type: 'productionBonus', value: 0.5 },
    maxPurchases: 1,
    icon: '🍁',
    requirement: { type: 'rennetSpent', amount: 500 },
  },
];

export function getAgingUpgradeById(id: string): AgingUpgrade | undefined {
  return AGING_UPGRADES.find((u) => u.id === id);
}

export function getAgingUpgradePurchaseCount(
  agingUpgrades: string[],
  upgradeId: string
): number {
  return agingUpgrades.filter((id) => id === upgradeId).length;
}

export function canPurchaseAgingUpgrade(
  upgrade: AgingUpgrade,
  agingUpgrades: string[],
  rennet: number,
  agingResetCount: number,
  totalRennetSpent: number
): boolean {
  // Check if max purchases reached
  const currentPurchases = getAgingUpgradePurchaseCount(agingUpgrades, upgrade.id);
  if (currentPurchases >= upgrade.maxPurchases) return false;

  // Check cost
  if (rennet < upgrade.cost) return false;

  // Check requirement
  if (upgrade.requirement) {
    switch (upgrade.requirement.type) {
      case 'rennetSpent':
        if (totalRennetSpent < upgrade.requirement.amount) return false;
        break;
      case 'agingResets':
        if (agingResetCount < upgrade.requirement.count) return false;
        break;
      case 'upgrade':
        if (!agingUpgrades.includes(upgrade.requirement.upgradeId)) return false;
        break;
    }
  }

  return true;
}
