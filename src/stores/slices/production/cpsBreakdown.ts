import Decimal from 'decimal.js';
import {
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeGeneratorEfficiency,
} from '../../../systems/productionEngine';
import { GENERATORS } from '../../../data/generators';
import type { GameStore } from '../../types';

export interface CpsBreakdownItem {
  label: string;
  value: Decimal;
  multiplier?: number;
  percentage?: number;
  category: 'generator' | 'multiplier';
}

export interface CpsBreakdown {
  items: CpsBreakdownItem[];
  total: Decimal;
  baseGeneratorCps: Decimal;
}

export function computeCpsBreakdown(state: GameStore): CpsBreakdown {
  const items: CpsBreakdownItem[] = [];

  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  const synergyZoneMultipliers = state.getSynergyZoneGeneratorMultipliers();
  for (const [generatorId, multiplier] of Object.entries(synergyZoneMultipliers)) {
    generatorMultipliers[generatorId] = (generatorMultipliers[generatorId] ?? 1) * multiplier;
  }

  let baseGeneratorCps = new Decimal(0);

  for (const generator of GENERATORS) {
    const owned = state.generators[generator.id] ?? 0;
    if (owned > 0) {
      const genMultiplier = generatorMultipliers[generator.id] ?? 1;
      const contribution = generator.baseCps.times(owned).times(genMultiplier);
      baseGeneratorCps = baseGeneratorCps.plus(contribution);
      items.push({
        label: `${generator.name} (×${owned})`,
        value: contribution,
        category: 'generator',
      });
    }
  }

  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
  const synergyFormationBonus = state.getSynergyFormationBonus();
  const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes, synergyFormationBonus);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();
  const eventMultipliers = state.getEventMultipliers();
  const buffMultipliers = state.getActiveBuffMultipliers();

  const efficiencyPerGenerator = calculatePrestigeGeneratorEfficiency(state.prestige);
  const totalGenerators = Object.values(state.generators).reduce((sum, count) => sum + count, 0);
  const efficiencyMultiplier = 1 + efficiencyPerGenerator * totalGenerators;

  if (upgradeGlobalMultiplier > 1) {
    items.push({ label: 'Upgrade Bonus', multiplier: upgradeGlobalMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (achievementGlobalMultiplier > 1) {
    items.push({ label: 'Achievement Bonus', multiplier: achievementGlobalMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (heroMultiplier > 1) {
    items.push({ label: 'Hero Affinity', multiplier: heroMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (formationMultiplier > 1) {
    items.push({ label: 'Formation Bonus', multiplier: formationMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (prestigeMultiplier > 1) {
    items.push({ label: 'Prestige Bonus', multiplier: prestigeMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (ehMultiplier > 1) {
    items.push({ label: 'Eh! Bonus', multiplier: ehMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (eventMultipliers.production > 1) {
    items.push({ label: 'Event Bonus', multiplier: eventMultipliers.production, value: new Decimal(0), category: 'multiplier' });
  }
  if (buffMultipliers.production > 1) {
    items.push({ label: 'Cheese Buff', multiplier: buffMultipliers.production, value: new Decimal(0), category: 'multiplier' });
  }
  if (efficiencyMultiplier > 1) {
    items.push({ label: 'Generator Efficiency', multiplier: efficiencyMultiplier, value: new Decimal(0), category: 'multiplier' });
  }

  const total = state.curdPerSecond;

  for (const item of items) {
    if (item.category === 'generator' && !baseGeneratorCps.isZero()) {
      item.percentage = item.value.div(baseGeneratorCps).times(100).toNumber();
    }
  }

  return { items, total, baseGeneratorCps };
}
