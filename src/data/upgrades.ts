import Decimal from 'decimal.js';
import type { Upgrade } from '../types/game';
import { GENERATORS } from './generators';

// ===== Per-Generator Tier 4/5/6 Upgrades (late-game ladder extension) =====

/**
 * Late tiers unlock at 100/150/200 owned with ×3/×4/×5 effects.
 * Cost ≈ 25× the generator's cumulative cost at the unlock count,
 * expressed as a factor of the generator's base cost
 * (cumulative(N) ≈ baseCost × (1.15^N − 1) / 0.15).
 */
const LATE_TIER_SPECS = [
  { tier: 4, count: 100, multiplier: 3, costFactor: 2e8 },
  { tier: 5, count: 150, multiplier: 4, costFactor: 2e11 },
  { tier: 6, count: 200, multiplier: 5, costFactor: 2.5e14 },
] as const;

/** Canadiana names per generator for tiers 4/5/6 (same voice as tiers 1-3) */
const LATE_TIER_NAMES: Record<string, [string, string, string]> = {
  milk_pail: ['Diamond-Polished Pails', 'Quantum Milk Pails', 'Pails of the Ancients'],
  cheese_vat: ['Titanium Vats', 'Self-Stirring Vats', 'Vats of Infinite Curd'],
  aging_rack: ['Heritage Oak Racks', 'Time-Dilated Racks', 'Racks of the Ages'],
  cheese_cave: ['Crystal Cave Chambers', 'Echoing Cave Depths', 'The Great Cheese Hollow'],
  fromager_apprentice: ['Journeyman Fromagers', 'Master Fromagers', 'Grand Fromager Council'],
  curling_stone: ['Granite Championship Stones', 'Olympic Gold Stones', 'The Brier Legends'],
  mountie_patrol: ['Mounted Cheese Division', 'RCMP Elite Squad', 'The Musical Ride Eternal'],
  voyageur_canoe: ['Grand Portage Fleet', 'Coureur des Bois Network', 'The Voyageur Armada'],
  hockey_churner: ['Overtime Churners', 'Playoff Beard Churners', 'Hall of Fame Churners'],
  beaver_dam: ['Mega-Dam Complex', 'Continental Dam Network', 'The Great Beaver Dynasty'],
  timmys_bar: ["24-Hour Timmy's", "Timmy's Nation-Wide", "Timmy's Interstellar"],
  maple_infuser: ['Amber Grade Infusers', 'Centennial Syrup Vaults', 'The Eternal Sugar Bush'],
  moose_mill: ['Bull Moose Battalion', 'Moose Herd Dynamo', 'The Moose Monarchy'],
  northern_lights: ['Solar Storm Curing', 'Magnetosphere Aging', 'The Aurora Crown'],
  thunderbird: ['Thunderbird Aerie', 'Sky Spirit Communion', 'The Thunderbird Pantheon'],
};

const MULTIPLIER_WORDS: Record<number, string> = {
  3: 'three times',
  4: 'four times',
  5: 'five times',
};

function createLateTierUpgrades(): Upgrade[] {
  return GENERATORS.flatMap((generator) =>
    LATE_TIER_SPECS.map((spec, tierIndex): Upgrade => ({
      id: `${generator.id}_tier${spec.tier}`,
      name: LATE_TIER_NAMES[generator.id]?.[tierIndex] ?? `${generator.name} Mastery ${spec.tier}`,
      description: `${generator.name}s are ${MULTIPLIER_WORDS[spec.multiplier]} as effective`,
      cost: generator.baseCost.mul(spec.costFactor),
      costCurrency: 'curds',
      effect: { type: 'generatorMultiplier', generatorId: generator.id, value: spec.multiplier },
      requirement: { type: 'generatorOwned', generatorId: generator.id, count: spec.count },
    }))
  );
}

export const UPGRADES: Upgrade[] = [
  // ===== Click Upgrades =====
  {
    id: 'reinforced_fingers',
    name: 'Reinforced Fingers',
    description: 'Double your clicking power',
    cost: new Decimal(100),
    costCurrency: 'curds',
    effect: { type: 'clickMultiplier', value: 2 },
  },
  {
    id: 'carpal_tunnel_prevention',
    name: 'Carpal Tunnel Prevention',
    description: 'Proper ergonomics, 5x click power',
    cost: new Decimal(5000),
    costCurrency: 'curds',
    effect: { type: 'clickMultiplier', value: 5 },
  },
  {
    id: 'bionic_hand',
    name: 'Bionic Hand',
    description: '10x click power with cybernetic enhancement',
    cost: new Decimal(50000),
    costCurrency: 'curds',
    effect: { type: 'clickMultiplier', value: 10 },
  },

  // ===== Active Hands (Click + CPS%) Upgrades =====
  {
    id: 'maple_dipped_fingers',
    name: 'Maple-Dipped Fingers',
    description: 'Each click also earns 1% of your CPS',
    cost: new Decimal(1e6),
    costCurrency: 'curds',
    effect: { type: 'clickCpsPercent', value: 0.01 },
  },
  {
    id: 'double_double_grip',
    name: 'Double-Double Grip',
    description: 'Each click also earns 2% of your CPS',
    cost: new Decimal(1e9),
    costCurrency: 'curds',
    effect: { type: 'clickCpsPercent', value: 0.02 },
  },
  {
    id: 'toque_of_focus',
    name: 'Toque of Focus',
    description: 'Each click also earns 3% of your CPS',
    cost: new Decimal(1e12),
    costCurrency: 'curds',
    effect: { type: 'clickCpsPercent', value: 0.03 },
  },
  {
    id: 'zamboni_smooth_clicks',
    name: 'Zamboni-Smooth Clicks',
    description: 'Each click also earns 4% of your CPS',
    cost: new Decimal(1e15),
    costCurrency: 'curds',
    effect: { type: 'clickCpsPercent', value: 0.04 },
  },
  {
    id: 'hands_of_the_maple_spirit',
    name: 'Hands of the Maple Spirit',
    description: 'Each click also earns 5% of your CPS',
    cost: new Decimal(1e18),
    costCurrency: 'curds',
    effect: { type: 'clickCpsPercent', value: 0.05 },
  },

  // ===== Critical Click Upgrades =====
  {
    id: 'sharp_cheddar_reflexes',
    name: 'Sharp Cheddar Reflexes',
    description: '+5% critical hit chance',
    cost: new Decimal(5e7),
    costCurrency: 'curds',
    effect: { type: 'critChance', value: 0.05 },
  },
  {
    id: 'lucky_loonie',
    name: 'Lucky Loonie',
    description: '+10% critical hit chance',
    cost: new Decimal(5e10),
    costCurrency: 'curds',
    effect: { type: 'critChance', value: 0.10 },
  },
  {
    id: 'critical_curd_theory',
    name: 'Critical Curd Theory',
    description: 'Critical hits deal +1x bonus damage',
    cost: new Decimal(5e13),
    costCurrency: 'curds',
    effect: { type: 'critMultiplier', value: 1 },
  },
  {
    id: 'beavers_fury',
    name: "Beaver's Fury",
    description: 'Critical hits deal +2x bonus damage',
    cost: new Decimal(5e16),
    costCurrency: 'curds',
    effect: { type: 'critMultiplier', value: 2 },
  },

  // ===== Milk Pail Upgrades =====
  {
    id: 'bigger_pails',
    name: 'Bigger Pails',
    description: 'Milk Pails are twice as effective',
    cost: new Decimal(1000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'milk_pail', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'milk_pail', count: 10 },
  },
  {
    id: 'stainless_pails',
    name: 'Stainless Steel Pails',
    description: 'Milk Pails are twice as effective',
    cost: new Decimal(10000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'milk_pail', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'milk_pail', count: 25 },
  },
  {
    id: 'automated_pails',
    name: 'Automated Pail System',
    description: 'Milk Pails are twice as effective',
    cost: new Decimal(100000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'milk_pail', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'milk_pail', count: 50 },
  },

  // ===== Cheese Vat Upgrades =====
  {
    id: 'insulated_vats',
    name: 'Insulated Vats',
    description: 'Cheese Vats are twice as effective',
    cost: new Decimal(5000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_vat', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_vat', count: 10 },
  },
  {
    id: 'copper_vats',
    name: 'Copper-Lined Vats',
    description: 'Cheese Vats are twice as effective',
    cost: new Decimal(50000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_vat', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_vat', count: 25 },
  },
  {
    id: 'precision_vats',
    name: 'Precision Temperature Vats',
    description: 'Cheese Vats are twice as effective',
    cost: new Decimal(500000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_vat', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_vat', count: 50 },
  },

  // ===== Aging Rack Upgrades =====
  {
    id: 'cedar_racks',
    name: 'Cedar Wood Racks',
    description: 'Aging Racks are twice as effective',
    cost: new Decimal(55000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'aging_rack', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'aging_rack', count: 10 },
  },
  {
    id: 'climate_racks',
    name: 'Climate-Controlled Racks',
    description: 'Aging Racks are twice as effective',
    cost: new Decimal(550000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'aging_rack', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'aging_rack', count: 25 },
  },
  {
    id: 'rotating_racks',
    name: 'Auto-Rotating Racks',
    description: 'Aging Racks are twice as effective',
    cost: new Decimal(5500000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'aging_rack', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'aging_rack', count: 50 },
  },

  // ===== Cheese Cave Upgrades =====
  {
    id: 'expanded_caves',
    name: 'Expanded Cave Network',
    description: 'Cheese Caves are twice as effective',
    cost: new Decimal(600000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_cave', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_cave', count: 10 },
  },
  {
    id: 'ventilated_caves',
    name: 'Ventilated Cave System',
    description: 'Cheese Caves are twice as effective',
    cost: new Decimal(6000000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_cave', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_cave', count: 25 },
  },
  {
    id: 'mystical_caves',
    name: 'Mystical Cave Blessing',
    description: 'Cheese Caves are twice as effective',
    cost: new Decimal(60000000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_cave', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_cave', count: 50 },
  },

  // ===== Fromager Apprentice Upgrades =====
  {
    id: 'fromager_training',
    name: 'Advanced Training',
    description: 'Fromager Apprentices are twice as effective',
    cost: new Decimal(6500000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'fromager_apprentice', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'fromager_apprentice', count: 10 },
  },
  {
    id: 'fromager_certification',
    name: 'Fromager Certification',
    description: 'Fromager Apprentices are twice as effective',
    cost: new Decimal(65000000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'fromager_apprentice', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'fromager_apprentice', count: 25 },
  },
  {
    id: 'fromager_mastery',
    name: 'Master Fromager Guild',
    description: 'Fromager Apprentices are twice as effective',
    cost: new Decimal(650000000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'fromager_apprentice', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'fromager_apprentice', count: 50 },
  },

  // ===== Cheese Curling Stone Upgrades =====
  {
    id: 'polished_stones',
    name: 'Polished Stones',
    description: 'Cheese Curling Stones are twice as effective',
    cost: new Decimal(70_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'curling_stone', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'curling_stone', count: 10 },
  },
  {
    id: 'championship_brooms',
    name: 'Championship Brooms',
    description: 'Cheese Curling Stones are twice as effective',
    cost: new Decimal(700_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'curling_stone', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'curling_stone', count: 25 },
  },
  {
    id: 'olympic_training',
    name: 'Olympic Training',
    description: 'Cheese Curling Stones are twice as effective',
    cost: new Decimal(7_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'curling_stone', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'curling_stone', count: 50 },
  },

  // ===== Mountie Milk Patrol Upgrades =====
  {
    id: 'stetson_upgrade',
    name: 'Official Stetson Hats',
    description: 'Mountie Milk Patrols are twice as effective',
    cost: new Decimal(1_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'mountie_patrol', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'mountie_patrol', count: 10 },
  },
  {
    id: 'red_serge_uniforms',
    name: 'Red Serge Uniforms',
    description: 'Mountie Milk Patrols are twice as effective',
    cost: new Decimal(10_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'mountie_patrol', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'mountie_patrol', count: 25 },
  },
  {
    id: 'musical_ride',
    name: 'Musical Ride Formation',
    description: 'Mountie Milk Patrols are twice as effective',
    cost: new Decimal(100_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'mountie_patrol', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'mountie_patrol', count: 50 },
  },

  // ===== Voyageur Canoe Dairy Upgrades =====
  {
    id: 'birch_bark_canoes',
    name: 'Birch Bark Canoes',
    description: 'Voyageur Canoe Dairies are twice as effective',
    cost: new Decimal(16_500_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'voyageur_canoe', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'voyageur_canoe', count: 10 },
  },
  {
    id: 'fur_trade_routes',
    name: 'Fur Trade Routes',
    description: 'Voyageur Canoe Dairies are twice as effective',
    cost: new Decimal(165_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'voyageur_canoe', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'voyageur_canoe', count: 25 },
  },
  {
    id: 'portage_masters',
    name: 'Portage Masters',
    description: 'Voyageur Canoe Dairies are twice as effective',
    cost: new Decimal(1_650_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'voyageur_canoe', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'voyageur_canoe', count: 50 },
  },

  // ===== Hockey Stick Churner Upgrades =====
  {
    id: 'composite_sticks',
    name: 'Composite Sticks',
    description: 'Hockey Stick Churners are twice as effective',
    cost: new Decimal(255_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'hockey_churner', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'hockey_churner', count: 10 },
  },
  {
    id: 'nhl_endorsement',
    name: 'NHL Endorsement',
    description: 'Hockey Stick Churners are twice as effective',
    cost: new Decimal(2_550_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'hockey_churner', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'hockey_churner', count: 25 },
  },
  {
    id: 'stanley_cup_blessing',
    name: 'Stanley Cup Blessing',
    description: 'Hockey Stick Churners are twice as effective',
    cost: new Decimal(25_500_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'hockey_churner', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'hockey_churner', count: 50 },
  },

  // ===== Beaver Dam Creamery Upgrades =====
  {
    id: 'hardwood_dams',
    name: 'Hardwood Dams',
    description: 'Beaver Dam Creameries are twice as effective',
    cost: new Decimal(3_750_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'beaver_dam', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'beaver_dam', count: 10 },
  },
  {
    id: 'beaver_lodges',
    name: 'Beaver Lodge Network',
    description: 'Beaver Dam Creameries are twice as effective',
    cost: new Decimal(37_500_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'beaver_dam', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'beaver_dam', count: 25 },
  },
  {
    id: 'national_animal_pride',
    name: 'National Animal Pride',
    description: 'Beaver Dam Creameries are twice as effective',
    cost: new Decimal(375_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'beaver_dam', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'beaver_dam', count: 50 },
  },

  // ===== Timmy's Cheese Bar Upgrades =====
  {
    id: 'drive_thru_lanes',
    name: 'Drive-Thru Lanes',
    description: "Timmy's Cheese Bars are twice as effective",
    cost: new Decimal(50_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'timmys_bar', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'timmys_bar', count: 10 },
  },
  {
    id: 'roll_up_the_rim',
    name: 'Roll Up The Rim',
    description: "Timmy's Cheese Bars are twice as effective",
    cost: new Decimal(500_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'timmys_bar', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'timmys_bar', count: 25 },
  },
  {
    id: 'always_fresh',
    name: 'Always Fresh',
    description: "Timmy's Cheese Bars are twice as effective",
    cost: new Decimal(5_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'timmys_bar', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'timmys_bar', count: 50 },
  },

  // ===== Maple Syrup Infuser Upgrades =====
  {
    id: 'sugar_shack',
    name: 'Sugar Shack Setup',
    description: 'Maple Syrup Infusers are twice as effective',
    cost: new Decimal(700_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'maple_infuser', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'maple_infuser', count: 10 },
  },
  {
    id: 'quebec_maple_reserve',
    name: 'Quebec Maple Reserve',
    description: 'Maple Syrup Infusers are twice as effective',
    cost: new Decimal(7_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'maple_infuser', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'maple_infuser', count: 25 },
  },
  {
    id: 'grade_a_dark',
    name: 'Grade A Dark',
    description: 'Maple Syrup Infusers are twice as effective',
    cost: new Decimal(70_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'maple_infuser', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'maple_infuser', count: 50 },
  },

  // ===== Moose-Powered Mill Upgrades =====
  {
    id: 'trained_moose',
    name: 'Trained Moose',
    description: 'Moose-Powered Mills are twice as effective',
    cost: new Decimal(8_500_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'moose_mill', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'moose_mill', count: 10 },
  },
  {
    id: 'moose_migration_routes',
    name: 'Moose Migration Routes',
    description: 'Moose-Powered Mills are twice as effective',
    cost: new Decimal(85_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'moose_mill', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'moose_mill', count: 25 },
  },
  {
    id: 'moose_whisperer',
    name: 'Moose Whisperer',
    description: 'Moose-Powered Mills are twice as effective',
    cost: new Decimal(850_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'moose_mill', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'moose_mill', count: 50 },
  },

  // ===== Northern Lights Curing Upgrades =====
  {
    id: 'aurora_viewing',
    name: 'Aurora Viewing Platforms',
    description: 'Northern Lights Curings are twice as effective',
    cost: new Decimal(105_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'northern_lights', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'northern_lights', count: 10 },
  },
  {
    id: 'solar_wind_capture',
    name: 'Solar Wind Capture',
    description: 'Northern Lights Curings are twice as effective',
    cost: new Decimal(1_050_000_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'northern_lights', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'northern_lights', count: 25 },
  },
  {
    id: 'polar_night_mastery',
    name: 'Polar Night Mastery',
    description: 'Northern Lights Curings are twice as effective',
    cost: new Decimal('10500000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'northern_lights', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'northern_lights', count: 50 },
  },

  // ===== Thunderbird Blessing Upgrades =====
  {
    id: 'totem_poles',
    name: 'Sacred Totem Poles',
    description: 'Thunderbird Blessings are twice as effective',
    cost: new Decimal('1300000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'thunderbird', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'thunderbird', count: 10 },
  },
  {
    id: 'first_nations_wisdom',
    name: 'First Nations Wisdom',
    description: 'Thunderbird Blessings are twice as effective',
    cost: new Decimal('13000000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'thunderbird', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'thunderbird', count: 25 },
  },
  {
    id: 'mythical_convergence',
    name: 'Mythical Convergence',
    description: 'Thunderbird Blessings are twice as effective',
    cost: new Decimal('130000000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'thunderbird', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'thunderbird', count: 50 },
  },

  // ===== Global Upgrades =====
  {
    id: 'canadian_spirit',
    name: 'Canadian Spirit',
    description: 'All production increased by 10%',
    cost: new Decimal(10000000),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 1.1 },
  },
  {
    id: 'maple_blessing',
    name: 'Maple Blessing',
    description: 'All production increased by 25%',
    cost: new Decimal(100000000),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 1.25 },
  },
  {
    id: 'true_north_strong',
    name: 'True North Strong',
    description: 'All production increased by 50%',
    cost: new Decimal(1_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 1.5 },
  },
  {
    id: 'national_cheese_day',
    name: 'National Cheese Day',
    description: 'All production doubled!',
    cost: new Decimal(100_000_000_000_000),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 2 },
  },
  {
    id: 'heritage_minute',
    name: 'Heritage Minute',
    description: 'Triple all production - a part of our heritage',
    cost: new Decimal('10000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 3 },
  },

  // ===== Whey of Power (Whey-Cost Upgrades - Per-Run Sink) =====
  {
    id: 'whey_of_the_warrior',
    name: 'Whey of the Warrior',
    description: '1.5x all production (resets on Aging)',
    cost: new Decimal(25),
    costCurrency: 'whey',
    effect: { type: 'globalMultiplier', value: 1.5 },
  },
  {
    id: 'curds_and_whey_protein',
    name: 'Curds & Whey Protein',
    description: '5x click power (resets on Aging)',
    cost: new Decimal(60),
    costCurrency: 'whey',
    effect: { type: 'clickMultiplier', value: 5 },
  },
  {
    id: 'whey_beyond_curds',
    name: 'Whey Beyond Curds',
    description: '2x all production (resets on Aging)',
    cost: new Decimal(150),
    costCurrency: 'whey',
    effect: { type: 'globalMultiplier', value: 2 },
  },
  {
    id: 'liquid_gold_reserves',
    name: 'Liquid Gold Reserves',
    description: '2.5x all production (resets on Aging)',
    cost: new Decimal(400),
    costCurrency: 'whey',
    effect: { type: 'globalMultiplier', value: 2.5 },
  },
  {
    id: 'whey_of_the_north',
    name: 'Whey of the North',
    description: '3x all production (resets on Aging)',
    cost: new Decimal(1000),
    costCurrency: 'whey',
    effect: { type: 'globalMultiplier', value: 3 },
  },

  // ===== Late-Game Global Upgrades =====
  {
    id: 'great_canadian_shield',
    name: 'Great Canadian Shield',
    description: '3x all production - protected by ancient rock',
    cost: new Decimal('1000000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 3 },
  },
  {
    id: 'aurora_borealis_blessing',
    name: 'Aurora Borealis Blessing',
    description: '4x all production - blessed by the northern lights',
    cost: new Decimal('100000000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 4 },
  },
  {
    id: 'laurentian_legacy',
    name: 'Laurentian Legacy',
    description: '5x all production - from the oldest mountains',
    cost: new Decimal('10000000000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 5 },
  },
  {
    id: 'polaris_of_the_north',
    name: 'Polaris of the North',
    description: '6x all production - guided by the North Star',
    cost: new Decimal('1000000000000000000000000'),
    costCurrency: 'curds',
    effect: { type: 'globalMultiplier', value: 6 },
  },

  // ===== Per-Generator Tier 4/5/6 (generated; gated at 100/150/200 owned) =====
  ...createLateTierUpgrades(),
];
