import Decimal from 'decimal.js';
import type { Equipment } from '../types/game';

/**
 * Equipment Data for The Great Canadian Cheese Quest
 *
 * Equipment is organized by slot:
 * - Weapons: Boost Attack primarily
 * - Armor: Boost Defense and HP
 * - Accessories: Boost Speed and various stats
 * - Cheese Charms: Boost Cheese Affinity (affects CPS bonus)
 *
 * Each slot has 12 items across 3 rarities:
 * - Common (4 items): Cheap, small stat boosts
 * - Uncommon (4 items): Mid-tier, moderate stats
 * - Rare (4 items): Expensive, powerful stats
 *
 * Total: 48 equipment items
 */

// ===== WEAPONS (Attack focus) =====

export const WEAPONS: Equipment[] = [
  // Common Weapons
  {
    id: 'cheese_knife',
    name: 'Cheese Knife',
    description: 'A simple knife for cutting curds. Sharp enough for battle.',
    slot: 'weapon',
    rarity: 'common',
    stats: { attack: 5 },
    cost: new Decimal(50_000),
    icon: '🔪',
  },
  {
    id: 'curd_cutter',
    name: 'Curd Cutter',
    description: 'Wire frame tool that slices through enemies like soft cheese.',
    slot: 'weapon',
    rarity: 'common',
    stats: { attack: 8 },
    cost: new Decimal(150_000),
    icon: '🧵',
  },
  {
    id: 'milk_sword',
    name: 'Milk Sword',
    description: 'Forged from solidified milk proteins. Surprisingly deadly.',
    slot: 'weapon',
    rarity: 'common',
    stats: { attack: 12 },
    cost: new Decimal(400_000),
    icon: '⚔️',
  },
  {
    id: 'whey_staff',
    name: 'Whey Staff',
    description: 'A staff imbued with the essence of whey. Packs a punch.',
    slot: 'weapon',
    rarity: 'common',
    stats: { attack: 15, speed: 2 },
    cost: new Decimal(800_000),
    icon: '🪄',
  },

  // Uncommon Weapons
  {
    id: 'fromagers_blade',
    name: "Fromager's Blade",
    description: 'A master cheesemaker\'s prized cutting tool.',
    slot: 'weapon',
    rarity: 'uncommon',
    stats: { attack: 20 },
    cost: new Decimal(5_000_000),
    icon: '🗡️',
  },
  {
    id: 'cheddar_cleaver',
    name: 'Cheddar Cleaver',
    description: 'Heavy cleaver that has cut through countless wheels.',
    slot: 'weapon',
    rarity: 'uncommon',
    stats: { attack: 25, hp: 10 },
    cost: new Decimal(15_000_000),
    icon: '🪓',
  },
  {
    id: 'brie_bow',
    name: 'Brie Bow',
    description: 'Elegant bow that fires arrows of concentrated dairy.',
    slot: 'weapon',
    rarity: 'uncommon',
    stats: { attack: 22, speed: 5 },
    cost: new Decimal(40_000_000),
    icon: '🏹',
  },
  {
    id: 'gouda_gauntlet',
    name: 'Gouda Gauntlet',
    description: 'Punching glove infused with aged Gouda power.',
    slot: 'weapon',
    rarity: 'uncommon',
    stats: { attack: 28, defense: 5 },
    cost: new Decimal(100_000_000),
    icon: '🥊',
  },

  // Rare Weapons
  {
    id: 'legendary_curd_blade',
    name: 'Legendary Curd Blade',
    description:
      'The sword of the first Fromager. Glows with ancient dairy magic.',
    slot: 'weapon',
    rarity: 'rare',
    stats: { attack: 50 },
    cost: new Decimal(500_000_000),
    icon: '⚔️',
  },
  {
    id: 'oka_obliterator',
    name: 'Oka Obliterator',
    description: 'Named after the famous Quebec monastery cheese. Holy power.',
    slot: 'weapon',
    rarity: 'rare',
    stats: { attack: 55, cheeseAffinity: 10 },
    cost: new Decimal(2_000_000_000),
    icon: '🔱',
  },
  {
    id: 'parmesans_fury',
    name: "Parmesan's Fury",
    description: 'Hard as Parmesan, strikes with the force of a cheese wheel.',
    slot: 'weapon',
    rarity: 'rare',
    stats: { attack: 65, defense: 10 },
    cost: new Decimal(10_000_000_000),
    icon: '💫',
  },
  {
    id: 'roquefort_reaper',
    name: 'Roquefort Reaper',
    description: 'A scythe of blue cheese that brings moldy doom.',
    slot: 'weapon',
    rarity: 'rare',
    stats: { attack: 75, speed: 10, cheeseAffinity: 5 },
    cost: new Decimal(50_000_000_000),
    icon: '🌙',
  },
];

// ===== ARMOR (Defense and HP focus) =====

export const ARMOR: Equipment[] = [
  // Common Armor
  {
    id: 'cheese_cloth_robe',
    name: 'Cheese Cloth Robe',
    description: 'Lightweight robe woven from finest cheese cloth.',
    slot: 'armor',
    rarity: 'common',
    stats: { defense: 5, hp: 10 },
    cost: new Decimal(50_000),
    icon: '👘',
  },
  {
    id: 'wax_vest',
    name: 'Wax Vest',
    description: 'Coated in protective cheese wax. Repels attacks.',
    slot: 'armor',
    rarity: 'common',
    stats: { defense: 8, hp: 15 },
    cost: new Decimal(150_000),
    icon: '🦺',
  },
  {
    id: 'rind_armor',
    name: 'Rind Armor',
    description: 'Hardened cheese rind beaten into protective plates.',
    slot: 'armor',
    rarity: 'common',
    stats: { defense: 12, hp: 20 },
    cost: new Decimal(400_000),
    icon: '🛡️',
  },
  {
    id: 'curd_coat',
    name: 'Curd Coat',
    description: 'Flexible coat made from compressed fresh curds.',
    slot: 'armor',
    rarity: 'common',
    stats: { defense: 10, hp: 30 },
    cost: new Decimal(800_000),
    icon: '🧥',
  },

  // Uncommon Armor
  {
    id: 'aged_cheddar_mail',
    name: 'Aged Cheddar Mail',
    description: 'Chain mail forged from year-old cheddar. Rock solid.',
    slot: 'armor',
    rarity: 'uncommon',
    stats: { defense: 20, hp: 40 },
    cost: new Decimal(5_000_000),
    icon: '⛓️',
  },
  {
    id: 'swiss_shield_plate',
    name: 'Swiss Shield Plate',
    description: 'Full of holes, but somehow more protective.',
    slot: 'armor',
    rarity: 'uncommon',
    stats: { defense: 25, hp: 35, speed: 3 },
    cost: new Decimal(15_000_000),
    icon: '🧀',
  },
  {
    id: 'camembert_cuirass',
    name: 'Camembert Cuirass',
    description: 'Soft on the outside, surprisingly tough protection.',
    slot: 'armor',
    rarity: 'uncommon',
    stats: { defense: 22, hp: 50 },
    cost: new Decimal(40_000_000),
    icon: '🥋',
  },
  {
    id: 'provolone_plate',
    name: 'Provolone Plate',
    description: 'Smoked armor with a distinctive protective aura.',
    slot: 'armor',
    rarity: 'uncommon',
    stats: { defense: 28, hp: 45, cheeseAffinity: 3 },
    cost: new Decimal(100_000_000),
    icon: '🎽',
  },

  // Rare Armor
  {
    id: 'legendary_rind_plate',
    name: 'Legendary Rind Plate',
    description: 'Armor of the ancient Cheese Knights. Nearly impenetrable.',
    slot: 'armor',
    rarity: 'rare',
    stats: { defense: 50, hp: 80 },
    cost: new Decimal(500_000_000),
    icon: '🏰',
  },
  {
    id: 'stilton_fortress',
    name: 'Stilton Fortress',
    description: 'Blue-veined armor that grows stronger with age.',
    slot: 'armor',
    rarity: 'rare',
    stats: { defense: 55, hp: 100, cheeseAffinity: 8 },
    cost: new Decimal(2_000_000_000),
    icon: '🏯',
  },
  {
    id: 'gruyere_guardian',
    name: 'Gruyere Guardian',
    description: 'Swiss precision engineering in armor form.',
    slot: 'armor',
    rarity: 'rare',
    stats: { defense: 60, hp: 90, speed: 8 },
    cost: new Decimal(10_000_000_000),
    icon: '🛡️',
  },
  {
    id: 'manchego_monarch',
    name: 'Manchego Monarch',
    description: 'Royal Spanish cheese armor fit for a king.',
    slot: 'armor',
    rarity: 'rare',
    stats: { defense: 70, hp: 120, attack: 15 },
    cost: new Decimal(50_000_000_000),
    icon: '👑',
  },
];

// ===== ACCESSORIES (Speed and variety) =====

export const ACCESSORIES: Equipment[] = [
  // Common Accessories
  {
    id: 'milk_bucket_pendant',
    name: 'Milk Bucket Pendant',
    description: 'A tiny bucket charm that brings dairy luck.',
    slot: 'accessory',
    rarity: 'common',
    stats: { speed: 3, cheeseAffinity: 2 },
    cost: new Decimal(50_000),
    icon: '📿',
  },
  {
    id: 'curd_earrings',
    name: 'Curd Earrings',
    description: 'Dangling fresh curds that boost reflexes.',
    slot: 'accessory',
    rarity: 'common',
    stats: { speed: 5 },
    cost: new Decimal(150_000),
    icon: '💎',
  },
  {
    id: 'aging_timer',
    name: 'Aging Timer',
    description: 'Pocket watch that measures perfect cheese aging.',
    slot: 'accessory',
    rarity: 'common',
    stats: { speed: 4, attack: 3 },
    cost: new Decimal(400_000),
    icon: '⏱️',
  },
  {
    id: 'rennet_ring',
    name: 'Rennet Ring',
    description: 'Ring containing a drop of precious rennet.',
    slot: 'accessory',
    rarity: 'common',
    stats: { speed: 6, defense: 2 },
    cost: new Decimal(800_000),
    icon: '💍',
  },

  // Uncommon Accessories
  {
    id: 'fromage_belt',
    name: 'Fromage Belt',
    description: 'Championship belt of a cheese-eating contest winner.',
    slot: 'accessory',
    rarity: 'uncommon',
    stats: { speed: 10, hp: 20 },
    cost: new Decimal(5_000_000),
    icon: '🥇',
  },
  {
    id: 'dairy_crown',
    name: 'Dairy Crown',
    description: 'Tiara awarded to the Dairy Princess.',
    slot: 'accessory',
    rarity: 'uncommon',
    stats: { speed: 8, cheeseAffinity: 8 },
    cost: new Decimal(15_000_000),
    icon: '👸',
  },
  {
    id: 'milk_maid_gloves',
    name: "Milk Maid's Gloves",
    description: 'Soft gloves that enhance dexterity.',
    slot: 'accessory',
    rarity: 'uncommon',
    stats: { speed: 12, attack: 8 },
    cost: new Decimal(40_000_000),
    icon: '🧤',
  },
  {
    id: 'cheesemakers_compass',
    name: "Cheesemaker's Compass",
    description: 'Always points toward the finest dairy.',
    slot: 'accessory',
    rarity: 'uncommon',
    stats: { speed: 10, cheeseAffinity: 10 },
    cost: new Decimal(100_000_000),
    icon: '🧭',
  },

  // Rare Accessories
  {
    id: 'legendary_milk_boots',
    name: 'Legendary Milk Boots',
    description: 'Boots worn by the fastest dairy deliverer in history.',
    slot: 'accessory',
    rarity: 'rare',
    stats: { speed: 25, hp: 30 },
    cost: new Decimal(500_000_000),
    icon: '👢',
  },
  {
    id: 'wheel_of_fortune',
    name: 'Wheel of Fortune',
    description: 'A mystical cheese wheel that brings incredible luck.',
    slot: 'accessory',
    rarity: 'rare',
    stats: { speed: 20, cheeseAffinity: 15, attack: 10 },
    cost: new Decimal(2_000_000_000),
    icon: '🎡',
  },
  {
    id: 'aurora_cloak',
    name: 'Aurora Cloak',
    description: 'Woven from northern lights, grants ethereal speed.',
    slot: 'accessory',
    rarity: 'rare',
    stats: { speed: 30, defense: 15 },
    cost: new Decimal(10_000_000_000),
    icon: '🌈',
  },
  {
    id: 'maple_leaf_amulet',
    name: 'Maple Leaf Amulet',
    description: 'Sacred Canadian artifact. Blessed by the true north.',
    slot: 'accessory',
    rarity: 'rare',
    stats: { speed: 20, attack: 20, defense: 20, cheeseAffinity: 10 },
    cost: new Decimal(50_000_000_000),
    icon: '🍁',
  },
];

// ===== CHEESE CHARMS (Cheese Affinity focus) =====

export const CHEESE_CHARMS: Equipment[] = [
  // Common Cheese Charms
  {
    id: 'fresh_curd_charm',
    name: 'Fresh Curd Charm',
    description: 'A charm containing a single fresh curd. Still squeaky.',
    slot: 'cheese_charm',
    rarity: 'common',
    stats: { cheeseAffinity: 5 },
    cost: new Decimal(50_000),
    icon: '🔮',
  },
  {
    id: 'cream_crystal',
    name: 'Cream Crystal',
    description: 'Crystallized cream that pulses with dairy energy.',
    slot: 'cheese_charm',
    rarity: 'common',
    stats: { cheeseAffinity: 7, hp: 5 },
    cost: new Decimal(150_000),
    icon: '💠',
  },
  {
    id: 'whey_whistle',
    name: 'Whey Whistle',
    description: 'A small whistle that calls forth cheese spirits.',
    slot: 'cheese_charm',
    rarity: 'common',
    stats: { cheeseAffinity: 8, speed: 2 },
    cost: new Decimal(400_000),
    icon: '🎵',
  },
  {
    id: 'milk_marble',
    name: 'Milk Marble',
    description: 'A perfectly spherical drop of enchanted milk.',
    slot: 'cheese_charm',
    rarity: 'common',
    stats: { cheeseAffinity: 10 },
    cost: new Decimal(800_000),
    icon: '⚪',
  },

  // Uncommon Cheese Charms
  {
    id: 'aged_cheddar_charm',
    name: 'Aged Cheddar Charm',
    description: 'Charm made from 5-year aged cheddar. Powerful.',
    slot: 'cheese_charm',
    rarity: 'uncommon',
    stats: { cheeseAffinity: 15 },
    cost: new Decimal(5_000_000),
    icon: '🧿',
  },
  {
    id: 'blue_vein_brooch',
    name: 'Blue Vein Brooch',
    description: 'A brooch with living blue cheese veins.',
    slot: 'cheese_charm',
    rarity: 'uncommon',
    stats: { cheeseAffinity: 18, attack: 5 },
    cost: new Decimal(15_000_000),
    icon: '📘',
  },
  {
    id: 'brie_blossom',
    name: 'Brie Blossom',
    description: 'A flower that blooms from ripened Brie.',
    slot: 'cheese_charm',
    rarity: 'uncommon',
    stats: { cheeseAffinity: 16, hp: 15, defense: 5 },
    cost: new Decimal(40_000_000),
    icon: '🌸',
  },
  {
    id: 'goat_cheese_gem',
    name: 'Goat Cheese Gem',
    description: 'A gem formed from ancient goat cheese. Tangy power.',
    slot: 'cheese_charm',
    rarity: 'uncommon',
    stats: { cheeseAffinity: 20, speed: 5 },
    cost: new Decimal(100_000_000),
    icon: '💎',
  },

  // Rare Cheese Charms
  {
    id: 'vintage_wheel_charm',
    name: 'Vintage Wheel Charm',
    description: 'Contains essence of a 100-year-old cheese wheel.',
    slot: 'cheese_charm',
    rarity: 'rare',
    stats: { cheeseAffinity: 30 },
    cost: new Decimal(500_000_000),
    icon: '🏵️',
  },
  {
    id: 'cave_aged_core',
    name: 'Cave Aged Core',
    description: 'The heart of a cheese aged in a sacred cave.',
    slot: 'cheese_charm',
    rarity: 'rare',
    stats: { cheeseAffinity: 35, defense: 15, hp: 25 },
    cost: new Decimal(2_000_000_000),
    icon: '🗿',
  },
  {
    id: 'golden_rennet',
    name: 'Golden Rennet',
    description: 'Legendary rennet said to create perfect cheese.',
    slot: 'cheese_charm',
    rarity: 'rare',
    stats: { cheeseAffinity: 40, attack: 15, speed: 10 },
    cost: new Decimal(10_000_000_000),
    icon: '✨',
  },
  {
    id: 'great_canadian_curd',
    name: 'Great Canadian Curd',
    description:
      'The mythical curd from which all Canadian cheese descends.',
    slot: 'cheese_charm',
    rarity: 'rare',
    stats: { cheeseAffinity: 50, hp: 50, attack: 10, defense: 10, speed: 10 },
    cost: new Decimal(50_000_000_000),
    icon: '🇨🇦',
  },
];

// ===== Combined Equipment List =====

export const EQUIPMENT: Equipment[] = [
  ...WEAPONS,
  ...ARMOR,
  ...ACCESSORIES,
  ...CHEESE_CHARMS,
];

/**
 * Get an equipment item by its ID
 */
export function getEquipmentById(id: string): Equipment | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

/**
 * Get all equipment for a specific slot
 */
export function getEquipmentBySlot(
  slot: Equipment['slot']
): Equipment[] {
  return EQUIPMENT.filter((e) => e.slot === slot);
}

/**
 * Get all equipment of a specific rarity
 */
export function getEquipmentByRarity(
  rarity: Equipment['rarity']
): Equipment[] {
  return EQUIPMENT.filter((e) => e.rarity === rarity);
}

/**
 * Get all equipment sorted by cost (ascending)
 */
export function getEquipmentByCost(): Equipment[] {
  return [...EQUIPMENT].sort((a, b) => a.cost.comparedTo(b.cost));
}
