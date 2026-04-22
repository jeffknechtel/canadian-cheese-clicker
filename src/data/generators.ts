import Decimal from 'decimal.js';
import type { Generator } from '../types/game';
import { GENERATOR_COST_MULTIPLIER } from './constants';

export const GENERATORS: Generator[] = [
  // Phase 1: Basic Generators (1-5)
  {
    id: 'milk_pail',
    name: 'Milk Pail',
    description: 'A humble pail for collecting fresh milk',
    baseCost: new Decimal(15),
    baseCps: new Decimal(1),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🪣',
  },
  {
    id: 'cheese_vat',
    name: 'Cheese Vat',
    description: 'A proper vat for curdling milk',
    baseCost: new Decimal(100),
    baseCps: new Decimal(8),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🫕',
  },
  {
    id: 'aging_rack',
    name: 'Aging Rack',
    description: 'Wooden racks for aging your curds',
    baseCost: new Decimal(1100),
    baseCps: new Decimal(47),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🪵',
  },
  {
    id: 'cheese_cave',
    name: 'Cheese Cave',
    description: 'A cool cave perfect for aging cheese',
    baseCost: new Decimal(12000),
    baseCps: new Decimal(260),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🏔️',
  },
  {
    id: 'fromager_apprentice',
    name: 'Fromager Apprentice',
    description: 'A budding cheese master learning the craft',
    baseCost: new Decimal(130000),
    baseCps: new Decimal(1400),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '👨‍🍳',
  },
  // Phase 2: Canadian-Themed Generators (6-15)
  {
    id: 'curling_stone',
    name: 'Cheese Curling Stone',
    description: "Sweeping curds to victory, eh!",
    baseCost: new Decimal(1_400_000),
    baseCps: new Decimal(7_800),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🥌',
  },
  {
    id: 'mountie_patrol',
    name: 'Mountie Milk Patrol',
    description: 'They always get their cheese',
    baseCost: new Decimal(20_000_000),
    baseCps: new Decimal(44_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🐴',
  },
  {
    id: 'voyageur_canoe',
    name: 'Voyageur Canoe Dairy',
    description: 'Paddling curds across the nation',
    baseCost: new Decimal(330_000_000),
    baseCps: new Decimal(260_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🛶',
  },
  {
    id: 'hockey_churner',
    name: 'Hockey Stick Churner',
    description: 'Slapshot curd production',
    baseCost: new Decimal(5_100_000_000),
    baseCps: new Decimal(1_600_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🏒',
  },
  {
    id: 'beaver_dam',
    name: 'Beaver Dam Creamery',
    description: "Nature's most industrious cheesemakers",
    baseCost: new Decimal(75_000_000_000),
    baseCps: new Decimal(10_000_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🦫',
  },
  {
    id: 'timmys_bar',
    name: "Timmy's Cheese Bar",
    description: 'Double-double the cheese production',
    baseCost: new Decimal(1_000_000_000_000),
    baseCps: new Decimal(65_000_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '☕',
  },
  {
    id: 'maple_infuser',
    name: 'Maple Syrup Infuser',
    description: 'Sweet Canadian fusion',
    baseCost: new Decimal(14_000_000_000_000),
    baseCps: new Decimal(430_000_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🍁',
  },
  {
    id: 'moose_mill',
    name: 'Moose-Powered Mill',
    description: 'Majestic moose power',
    baseCost: new Decimal(170_000_000_000_000),
    baseCps: new Decimal(2_900_000_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🫎',
  },
  {
    id: 'northern_lights',
    name: 'Northern Lights Curing',
    description: 'Aurora-blessed cheese aging',
    baseCost: new Decimal(2_100_000_000_000_000),
    baseCps: new Decimal(21_000_000_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🌌',
  },
  {
    id: 'thunderbird',
    name: 'Thunderbird Blessing',
    description: 'Mythical cheese mastery',
    baseCost: new Decimal(26_000_000_000_000_000),
    baseCps: new Decimal(150_000_000_000),
    costMultiplier: GENERATOR_COST_MULTIPLIER,
    icon: '🦅',
  },
];

/**
 * @deprecated Use generatorRegistry.get() from '../domain' instead
 */
export function getGeneratorById(id: string): Generator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
