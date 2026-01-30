import Decimal from 'decimal.js';
import type { EnemyDefinition, BossDefinition, DamageType } from '../types/game';

/**
 * Regular enemies organized by zone theme
 *
 * Enemy types from research doc:
 * - Mold Sprite (Fungal) - Caves
 * - Processed Cheese Slime (Artificial) - Factories
 * - Cheese Grater Golem (Mechanical) - Industrial
 * - Lactose Intolerant Imp (Demon) - Everywhere
 * - Wax Wraith (Undead) - Aging Cellars
 *
 * Balance targets:
 * - Stage 1 beatable with 1 level-1 hero
 * - Stage 10 requires full party of level 10+ heroes
 * - Boss requires level 15+ party with good equipment
 */

// ===== Regular Enemies =====

export const ENEMIES: EnemyDefinition[] = [
  // Fungal enemies (Caves)
  {
    id: 'mold_sprite',
    name: 'Mold Sprite',
    type: 'fungal',
    description: 'A tiny spirit born from aged cheese mold. Surprisingly aggressive for something so fuzzy.',
    icon: '🍄',
    stats: {
      hp: 40,
      attack: 8,
      defense: 5,
      speed: 12,
      cheeseAffinity: 5,
    },
    weakness: 'fire',
    skills: [
      {
        id: 'spore_puff',
        name: 'Spore Puff',
        damage: 1.0,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'mold_essence', chance: 0.3 },
      { itemId: 'common_cheese_charm', chance: 0.05 },
    ],
    xpReward: 10,
    curdReward: new Decimal(50),
  },
  {
    id: 'spore_cloud',
    name: 'Spore Cloud',
    type: 'fungal',
    description: 'A floating mass of malevolent mold spores. Smells worse than it looks.',
    icon: '☁️',
    stats: {
      hp: 30,
      attack: 12,
      defense: 3,
      speed: 8,
      cheeseAffinity: 8,
    },
    weakness: 'fire',
    skills: [
      {
        id: 'toxic_cloud',
        name: 'Toxic Cloud',
        damage: 0.8,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 5,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'mold_essence', chance: 0.4 },
      { itemId: 'spore_sample', chance: 0.2 },
    ],
    xpReward: 15,
    curdReward: new Decimal(75),
  },
  {
    id: 'fungal_giant',
    name: 'Fungal Giant',
    type: 'fungal',
    description: 'A towering mushroom creature that guards the deepest cheese caves.',
    icon: '🍄',
    stats: {
      hp: 120,
      attack: 15,
      defense: 12,
      speed: 5,
      cheeseAffinity: 12,
    },
    weakness: 'fire',
    resistance: 'nature',
    skills: [
      {
        id: 'slam',
        name: 'Mushroom Slam',
        damage: 1.5,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'regenerate',
        name: 'Regenerate',
        damage: 0,
        cooldown: 5,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'heal_over_time',
          value: 10,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'mold_essence', chance: 0.6, minQuantity: 2, maxQuantity: 4 },
      { itemId: 'fungal_armor_shard', chance: 0.1 },
    ],
    xpReward: 40,
    curdReward: new Decimal(200),
  },

  // Artificial enemies (Factories)
  {
    id: 'processed_slime',
    name: 'Processed Cheese Slime',
    type: 'artificial',
    description: 'An abomination born from factory runoff. Neither cheese nor creature, but somehow both.',
    icon: '🧀',
    stats: {
      hp: 50,
      attack: 10,
      defense: 8,
      speed: 6,
      cheeseAffinity: 0,
    },
    weakness: 'nature',
    skills: [
      {
        id: 'goop_splash',
        name: 'Goop Splash',
        damage: 1.0,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'processed_goop', chance: 0.4 },
      { itemId: 'synthetic_culture', chance: 0.1 },
    ],
    xpReward: 12,
    curdReward: new Decimal(60),
  },
  {
    id: 'velveeta_blob',
    name: 'Velveeta Blob',
    type: 'artificial',
    description: 'A larger, angrier cousin of the processed slime. Surprisingly resilient.',
    icon: '🟡',
    stats: {
      hp: 80,
      attack: 12,
      defense: 15,
      speed: 4,
      cheeseAffinity: 0,
    },
    weakness: 'nature',
    resistance: 'physical',
    skills: [
      {
        id: 'engulf',
        name: 'Engulf',
        damage: 1.2,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -5,
          duration: 2,
        },
      },
    ],
    drops: [
      { itemId: 'processed_goop', chance: 0.5, minQuantity: 1, maxQuantity: 3 },
      { itemId: 'blob_core', chance: 0.15 },
    ],
    xpReward: 25,
    curdReward: new Decimal(120),
  },

  // Mechanical enemies (Industrial)
  {
    id: 'grater_golem',
    name: 'Cheese Grater Golem',
    type: 'mechanical',
    description: 'A kitchen utensil animated by spite. Those edges are sharper than they look.',
    icon: '🤖',
    stats: {
      hp: 70,
      attack: 18,
      defense: 20,
      speed: 7,
      cheeseAffinity: 0,
    },
    weakness: 'lightning',
    resistance: 'physical',
    skills: [
      {
        id: 'shred',
        name: 'Shred',
        damage: 1.3,
        cooldown: 1,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.4 },
      { itemId: 'sharp_edge', chance: 0.2 },
    ],
    xpReward: 20,
    curdReward: new Decimal(100),
  },
  {
    id: 'slicer_drone',
    name: 'Slicer Drone',
    type: 'mechanical',
    description: 'An automated cheese-cutting robot gone rogue. Still remarkably efficient.',
    icon: '🔪',
    stats: {
      hp: 45,
      attack: 22,
      defense: 10,
      speed: 15,
      cheeseAffinity: 0,
    },
    weakness: 'lightning',
    skills: [
      {
        id: 'precision_cut',
        name: 'Precision Cut',
        damage: 1.5,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'rapid_slice',
        name: 'Rapid Slice',
        damage: 0.6,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.3 },
      { itemId: 'servo_motor', chance: 0.15 },
    ],
    xpReward: 22,
    curdReward: new Decimal(110),
  },
  {
    id: 'factory_overseer',
    name: 'Factory Overseer',
    type: 'mechanical',
    description: 'The management AI of an abandoned cheese factory. Still trying to meet quotas.',
    icon: '⚙️',
    stats: {
      hp: 150,
      attack: 16,
      defense: 25,
      speed: 10,
      cheeseAffinity: 0,
    },
    weakness: 'lightning',
    resistance: 'ice',
    skills: [
      {
        id: 'production_boost',
        name: 'Production Boost',
        damage: 0,
        cooldown: 6,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'attack',
          value: 10,
          duration: 4,
        },
      },
      {
        id: 'quality_control',
        name: 'Quality Control',
        damage: 1.4,
        cooldown: 3,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.6, minQuantity: 2, maxQuantity: 5 },
      { itemId: 'control_chip', chance: 0.1 },
    ],
    xpReward: 50,
    curdReward: new Decimal(250),
  },

  // Demon enemies (Everywhere)
  {
    id: 'lactose_imp',
    name: 'Lactose Intolerant Imp',
    type: 'demon',
    description: "A minor demon cursed to be forever near cheese it cannot consume. Very grumpy about it.",
    icon: '👿',
    stats: {
      hp: 55,
      attack: 14,
      defense: 8,
      speed: 14,
      cheeseAffinity: -10,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'envious_strike',
        name: 'Envious Strike',
        damage: 1.2,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'digestive_curse',
        name: 'Digestive Curse',
        damage: 0.5,
        cooldown: 4,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'defense',
          value: -8,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'demon_essence', chance: 0.25 },
      { itemId: 'cursed_curd', chance: 0.1 },
    ],
    xpReward: 18,
    curdReward: new Decimal(90),
  },
  {
    id: 'dairy_devil',
    name: 'Dairy Devil',
    type: 'demon',
    description: 'A mid-tier demon who has made it their mission to destroy all cheese. Take it personally.',
    icon: '😈',
    stats: {
      hp: 100,
      attack: 20,
      defense: 12,
      speed: 11,
      cheeseAffinity: -20,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'hellfire_splash',
        name: 'Hellfire Splash',
        damage: 1.0,
        cooldown: 2,
        targetType: 'all',
      },
      {
        id: 'demonic_rage',
        name: 'Demonic Rage',
        damage: 1.8,
        cooldown: 4,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'demon_essence', chance: 0.4, minQuantity: 1, maxQuantity: 2 },
      { itemId: 'infernal_cheese_mold', chance: 0.08 },
    ],
    xpReward: 35,
    curdReward: new Decimal(175),
  },

  // Undead enemies (Aging Cellars)
  {
    id: 'wax_wraith',
    name: 'Wax Wraith',
    type: 'undead',
    description: 'The spirit of cheese left to age too long. Seeks vengeance on the living.',
    icon: '👻',
    stats: {
      hp: 35,
      attack: 16,
      defense: 5,
      speed: 10,
      cheeseAffinity: 15,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'spectral_touch',
        name: 'Spectral Touch',
        damage: 1.1,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'ectoplasm', chance: 0.35 },
      { itemId: 'aged_wax', chance: 0.2 },
    ],
    xpReward: 14,
    curdReward: new Decimal(70),
  },
  {
    id: 'rind_revenant',
    name: 'Rind Revenant',
    type: 'undead',
    description: 'A cheese rind that has achieved sentience through sheer age. Surprisingly philosophical.',
    icon: '💀',
    stats: {
      hp: 60,
      attack: 12,
      defense: 18,
      speed: 6,
      cheeseAffinity: 25,
    },
    weakness: 'holy',
    resistance: 'physical',
    skills: [
      {
        id: 'hardened_strike',
        name: 'Hardened Strike',
        damage: 1.3,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'decay_aura',
        name: 'Decay Aura',
        damage: 0,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -5,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'ectoplasm', chance: 0.3 },
      { itemId: 'ancient_rind', chance: 0.15 },
    ],
    xpReward: 28,
    curdReward: new Decimal(140),
  },
  {
    id: 'fromage_phantom',
    name: 'Fromage Phantom',
    type: 'undead',
    description: 'The ghost of a legendary cheese that was never eaten. Eternally bitter.',
    icon: '👻',
    stats: {
      hp: 90,
      attack: 22,
      defense: 8,
      speed: 16,
      cheeseAffinity: 40,
    },
    weakness: 'holy',
    resistance: 'physical',
    skills: [
      {
        id: 'phantom_wail',
        name: 'Phantom Wail',
        damage: 0.8,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -4,
          duration: 2,
        },
      },
      {
        id: 'incorporeal_strike',
        name: 'Incorporeal Strike',
        damage: 1.6,
        cooldown: 2,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'ectoplasm', chance: 0.5, minQuantity: 2, maxQuantity: 3 },
      { itemId: 'phantom_essence', chance: 0.1 },
    ],
    xpReward: 45,
    curdReward: new Decimal(220),
  },

  // Beast enemies (Wilderness)
  {
    id: 'cheese_rat',
    name: 'Cheese Rat',
    type: 'beast',
    description: 'A rat that has eaten so much cheese it has gained unnatural powers. Still a pest.',
    icon: '🐀',
    stats: {
      hp: 25,
      attack: 8,
      defense: 4,
      speed: 18,
      cheeseAffinity: 10,
    },
    weakness: 'nature',
    skills: [
      {
        id: 'nibble',
        name: 'Nibble',
        damage: 0.8,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'rat_whisker', chance: 0.4 },
      { itemId: 'stolen_curd', chance: 0.3, minQuantity: 1, maxQuantity: 5 },
    ],
    xpReward: 8,
    curdReward: new Decimal(40),
  },
  {
    id: 'curd_wolf',
    name: 'Curd Wolf',
    type: 'beast',
    description: 'A wolf mutated by exposure to experimental cheese cultures. Hunts in packs.',
    icon: '🐺',
    stats: {
      hp: 75,
      attack: 20,
      defense: 10,
      speed: 14,
      cheeseAffinity: 8,
    },
    weakness: 'fire',
    skills: [
      {
        id: 'savage_bite',
        name: 'Savage Bite',
        damage: 1.4,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'howl',
        name: 'Pack Howl',
        damage: 0,
        cooldown: 5,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'attack',
          value: 8,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'wolf_fang', chance: 0.25 },
      { itemId: 'beast_hide', chance: 0.3 },
    ],
    xpReward: 30,
    curdReward: new Decimal(150),
  },

  // ===== Manitoba Enemies (Hockey/Winter) =====
  {
    id: 'zamboni_golem',
    name: 'Zamboni Golem',
    type: 'mechanical',
    description: 'An ice resurfacing machine that gained sentience. Leaves a trail of smooth ice wherever it goes.',
    icon: '🚜',
    stats: {
      hp: 180,
      attack: 22,
      defense: 35,
      speed: 4,
      cheeseAffinity: 0,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'ice_resurface',
        name: 'Ice Resurface',
        damage: 1.2,
        cooldown: 2,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -6,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'ice_shavings', chance: 0.4 },
      { itemId: 'machinery_parts', chance: 0.2 },
    ],
    xpReward: 55,
    curdReward: new Decimal(280),
  },
  {
    id: 'puck_poltergeist',
    name: 'Puck Poltergeist',
    type: 'undead',
    description: 'The ghost of a hockey puck that was never scored. Haunts arenas seeking the net.',
    icon: '🥅',
    stats: {
      hp: 65,
      attack: 28,
      defense: 8,
      speed: 20,
      cheeseAffinity: 5,
    },
    weakness: 'holy',
    resistance: 'physical',
    skills: [
      {
        id: 'slap_shot',
        name: 'Spectral Slap Shot',
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'ectoplasm', chance: 0.35 },
      { itemId: 'rubber_fragment', chance: 0.25 },
    ],
    xpReward: 48,
    curdReward: new Decimal(240),
  },
  {
    id: 'ice_resurfacer',
    name: 'Ice Resurfacer Spirit',
    type: 'undead',
    description: 'The restless spirit of a rink worker who never finished their shift.',
    icon: '❄️',
    stats: {
      hp: 95,
      attack: 18,
      defense: 20,
      speed: 10,
      cheeseAffinity: 8,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'freeze_spray',
        name: 'Freeze Spray',
        damage: 1.0,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -4,
          duration: 2,
        },
      },
    ],
    drops: [
      { itemId: 'frozen_essence', chance: 0.3 },
      { itemId: 'ice_crystal', chance: 0.2 },
    ],
    xpReward: 42,
    curdReward: new Decimal(210),
  },

  // ===== Nova Scotia Enemies (Maritime) =====
  {
    id: 'lobster_lurker',
    name: 'Lobster Lurker',
    type: 'beast',
    description: 'A massive lobster that has developed a taste for aged cheese. Those claws can crush bone.',
    icon: '🦞',
    stats: {
      hp: 140,
      attack: 30,
      defense: 28,
      speed: 8,
      cheeseAffinity: 15,
    },
    weakness: 'lightning',
    resistance: 'ice',
    skills: [
      {
        id: 'claw_crush',
        name: 'Claw Crush',
        damage: 1.6,
        cooldown: 2,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'lobster_claw', chance: 0.25 },
      { itemId: 'sea_shell', chance: 0.4 },
    ],
    xpReward: 52,
    curdReward: new Decimal(260),
  },
  {
    id: 'fog_phantom',
    name: 'Fog Phantom',
    type: 'undead',
    description: 'A ghostly figure that emerges from the Atlantic fog. Many sailors have never returned.',
    icon: '🌫️',
    stats: {
      hp: 70,
      attack: 24,
      defense: 5,
      speed: 16,
      cheeseAffinity: 20,
    },
    weakness: 'holy',
    resistance: 'physical',
    skills: [
      {
        id: 'fog_embrace',
        name: 'Fog Embrace',
        damage: 1.3,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -6,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'fog_essence', chance: 0.35 },
      { itemId: 'ectoplasm', chance: 0.3 },
    ],
    xpReward: 45,
    curdReward: new Decimal(225),
  },
  {
    id: 'barnacle_brute',
    name: 'Barnacle Brute',
    type: 'beast',
    description: 'A hulking creature covered in razor-sharp barnacles. Smells of the sea.',
    icon: '🐚',
    stats: {
      hp: 160,
      attack: 20,
      defense: 35,
      speed: 5,
      cheeseAffinity: 5,
    },
    weakness: 'fire',
    resistance: 'physical',
    skills: [
      {
        id: 'barnacle_bash',
        name: 'Barnacle Bash',
        damage: 1.4,
        cooldown: 1,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'barnacle_shell', chance: 0.4 },
      { itemId: 'sea_salt', chance: 0.35 },
    ],
    xpReward: 50,
    curdReward: new Decimal(250),
  },

  // ===== New Brunswick Enemies (Forest/Lumber) =====
  {
    id: 'chainsaw_sprite',
    name: 'Chainsaw Sprite',
    type: 'mechanical',
    description: 'A mischievous spirit that has possessed an abandoned chainsaw. The sound alone is terrifying.',
    icon: '🪚',
    stats: {
      hp: 85,
      attack: 35,
      defense: 12,
      speed: 14,
      cheeseAffinity: 0,
    },
    weakness: 'lightning',
    skills: [
      {
        id: 'saw_slash',
        name: 'Saw Slash',
        damage: 1.7,
        cooldown: 1,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.35 },
      { itemId: 'oil_can', chance: 0.2 },
    ],
    xpReward: 55,
    curdReward: new Decimal(275),
  },
  {
    id: 'lumber_wraith',
    name: 'Lumber Wraith',
    type: 'undead',
    description: 'The ghost of a lumberjack who met an unfortunate end. Still swings a spectral axe.',
    icon: '🪓',
    stats: {
      hp: 110,
      attack: 28,
      defense: 15,
      speed: 12,
      cheeseAffinity: 10,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'axe_swing',
        name: 'Spectral Axe Swing',
        damage: 1.5,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'timber_call',
        name: 'TIMBER!',
        damage: 1.2,
        cooldown: 4,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'ectoplasm', chance: 0.3 },
      { itemId: 'spectral_wood', chance: 0.25 },
    ],
    xpReward: 58,
    curdReward: new Decimal(290),
  },
  {
    id: 'sap_slime',
    name: 'Sap Slime',
    type: 'fungal',
    description: 'A gelatinous creature made of fermented tree sap. Sticky and surprisingly aggressive.',
    icon: '🍯',
    stats: {
      hp: 130,
      attack: 18,
      defense: 22,
      speed: 6,
      cheeseAffinity: 12,
    },
    weakness: 'fire',
    resistance: 'nature',
    skills: [
      {
        id: 'sticky_splash',
        name: 'Sticky Splash',
        damage: 1.0,
        cooldown: 2,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -8,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'maple_sap', chance: 0.45 },
      { itemId: 'slime_residue', chance: 0.3 },
    ],
    xpReward: 48,
    curdReward: new Decimal(240),
  },

  // ===== PEI Enemies (Pastoral/Gothic) =====
  {
    id: 'scarecrow_sentinel',
    name: 'Scarecrow Sentinel',
    type: 'undead',
    description: 'A scarecrow that has come to life to protect the potato fields. Its straw hides dark secrets.',
    icon: '🎃',
    stats: {
      hp: 120,
      attack: 25,
      defense: 20,
      speed: 10,
      cheeseAffinity: -5,
    },
    weakness: 'fire',
    resistance: 'physical',
    skills: [
      {
        id: 'straw_strike',
        name: 'Straw Strike',
        damage: 1.3,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'crow_summon',
        name: 'Call Crows',
        damage: 0.6,
        cooldown: 4,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'straw_bundle', chance: 0.4 },
      { itemId: 'crow_feather', chance: 0.3 },
    ],
    xpReward: 60,
    curdReward: new Decimal(300),
  },
  {
    id: 'potato_blight',
    name: 'Potato Blight',
    type: 'fungal',
    description: 'A living manifestation of crop disease. Destroys everything it touches.',
    icon: '🥔',
    stats: {
      hp: 100,
      attack: 22,
      defense: 15,
      speed: 8,
      cheeseAffinity: -15,
    },
    weakness: 'fire',
    resistance: 'nature',
    skills: [
      {
        id: 'blight_spread',
        name: 'Blight Spread',
        damage: 0.8,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 8,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'blight_spore', chance: 0.35 },
      { itemId: 'rotten_potato', chance: 0.45 },
    ],
    xpReward: 55,
    curdReward: new Decimal(275),
  },
  {
    id: 'red_soil_elemental',
    name: 'Red Soil Elemental',
    type: 'beast',
    description: "A creature formed from PEI's distinctive red clay. Surprisingly fast for something made of dirt.",
    icon: '🟤',
    stats: {
      hp: 150,
      attack: 26,
      defense: 30,
      speed: 9,
      cheeseAffinity: 8,
    },
    weakness: 'ice',
    resistance: 'lightning',
    skills: [
      {
        id: 'mud_slam',
        name: 'Mud Slam',
        damage: 1.5,
        cooldown: 2,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'red_clay', chance: 0.4 },
      { itemId: 'earth_essence', chance: 0.2 },
    ],
    xpReward: 62,
    curdReward: new Decimal(310),
  },

  // ===== Newfoundland Enemies (Viking/Arctic) =====
  {
    id: 'draugr_dairy_thief',
    name: 'Draugr Dairy Thief',
    type: 'undead',
    description: 'An undead Viking who still raids for cheese, even after a thousand years.',
    icon: '⚔️',
    stats: {
      hp: 160,
      attack: 32,
      defense: 25,
      speed: 11,
      cheeseAffinity: 25,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'viking_raid',
        name: 'Viking Raid',
        damage: 1.6,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'battle_cry',
        name: 'Battle Cry',
        damage: 0,
        cooldown: 5,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'attack',
          value: 12,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'viking_coin', chance: 0.25 },
      { itemId: 'ancient_bone', chance: 0.35 },
    ],
    xpReward: 72,
    curdReward: new Decimal(360),
  },
  {
    id: 'viking_cheese_raider',
    name: 'Viking Cheese Raider',
    type: 'demon',
    description: 'A demonic spirit that possesses Viking artifacts, driven by an insatiable hunger for dairy.',
    icon: '🛡️',
    stats: {
      hp: 140,
      attack: 35,
      defense: 18,
      speed: 13,
      cheeseAffinity: -30,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'shield_bash',
        name: 'Shield Bash',
        damage: 1.4,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'defense',
          value: -8,
          duration: 2,
        },
      },
    ],
    drops: [
      { itemId: 'demon_essence', chance: 0.3 },
      { itemId: 'cursed_shield', chance: 0.15 },
    ],
    xpReward: 70,
    curdReward: new Decimal(350),
  },
  {
    id: 'iceberg_imp',
    name: 'Iceberg Imp',
    type: 'demon',
    description: 'A small demon that rides icebergs, causing ships to sink. Mischievous and cold-hearted.',
    icon: '🧊',
    stats: {
      hp: 90,
      attack: 28,
      defense: 12,
      speed: 18,
      cheeseAffinity: -10,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'ice_shard',
        name: 'Ice Shard',
        damage: 1.3,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'freeze_ray',
        name: 'Freeze Ray',
        damage: 0.9,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -6,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'ice_crystal', chance: 0.4 },
      { itemId: 'demon_essence', chance: 0.2 },
    ],
    xpReward: 65,
    curdReward: new Decimal(325),
  },

  // ===== Yukon Enemies (Gold Rush/Frontier) =====
  {
    id: 'claim_jumper_ghost',
    name: 'Claim Jumper Ghost',
    type: 'undead',
    description: 'The ghost of a prospector who stole claims. Now doomed to wander the frozen mines.',
    icon: '⛏️',
    stats: {
      hp: 130,
      attack: 30,
      defense: 15,
      speed: 14,
      cheeseAffinity: 15,
    },
    weakness: 'holy',
    resistance: 'physical',
    skills: [
      {
        id: 'pickaxe_strike',
        name: 'Pickaxe Strike',
        damage: 1.5,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'gold_fever',
        name: 'Gold Fever',
        damage: 0,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'defense',
          value: -10,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'gold_dust', chance: 0.3 },
      { itemId: 'ectoplasm', chance: 0.35 },
    ],
    xpReward: 78,
    curdReward: new Decimal(390),
  },
  {
    id: 'gold_fever_demon',
    name: 'Gold Fever Demon',
    type: 'demon',
    description: 'A demon born from the greed of the gold rush. Corrupts all who seek easy riches.',
    icon: '💰',
    stats: {
      hp: 170,
      attack: 38,
      defense: 20,
      speed: 12,
      cheeseAffinity: -40,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'greed_strike',
        name: 'Greed Strike',
        damage: 1.7,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'corrupt_gold',
        name: 'Corrupt Gold',
        damage: 1.0,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -8,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'demon_essence', chance: 0.35 },
      { itemId: 'corrupted_gold', chance: 0.2 },
    ],
    xpReward: 85,
    curdReward: new Decimal(425),
  },
  {
    id: 'permafrost_parasite',
    name: 'Permafrost Parasite',
    type: 'fungal',
    description: 'An ancient organism released from melting permafrost. Hungry after millennia of dormancy.',
    icon: '🦠',
    stats: {
      hp: 110,
      attack: 25,
      defense: 25,
      speed: 7,
      cheeseAffinity: 5,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'parasitic_drain',
        name: 'Parasitic Drain',
        damage: 1.2,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'buff',
          stat: 'heal_over_time',
          value: 8,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'ancient_spore', chance: 0.35 },
      { itemId: 'frozen_sample', chance: 0.25 },
    ],
    xpReward: 75,
    curdReward: new Decimal(375),
  },

  // ===== NWT Enemies (Aurora/Tundra) =====
  {
    id: 'light_dancer',
    name: 'Light Dancer',
    type: 'demon',
    description: 'A demon that mimics the aurora borealis. Beautiful but deadly.',
    icon: '🌌',
    stats: {
      hp: 120,
      attack: 35,
      defense: 15,
      speed: 20,
      cheeseAffinity: 10,
    },
    weakness: 'dark',
    resistance: 'holy',
    skills: [
      {
        id: 'aurora_beam',
        name: 'Aurora Beam',
        damage: 1.4,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'light_show',
        name: 'Mesmerizing Light Show',
        damage: 0.8,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -10,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'aurora_essence', chance: 0.3 },
      { itemId: 'light_crystal', chance: 0.2 },
    ],
    xpReward: 90,
    curdReward: new Decimal(450),
  },
  {
    id: 'tundra_wolf',
    name: 'Tundra Wolf',
    type: 'beast',
    description: 'A massive arctic wolf adapted to the harshest conditions. Hunts in coordinated packs.',
    icon: '🐺',
    stats: {
      hp: 150,
      attack: 38,
      defense: 20,
      speed: 16,
      cheeseAffinity: 5,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'arctic_bite',
        name: 'Arctic Bite',
        damage: 1.6,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'pack_tactics',
        name: 'Pack Tactics',
        damage: 0,
        cooldown: 5,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'attack',
          value: 15,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'white_fur', chance: 0.35 },
      { itemId: 'wolf_fang', chance: 0.3 },
    ],
    xpReward: 88,
    curdReward: new Decimal(440),
  },
  {
    id: 'aurora_wisp',
    name: 'Aurora Wisp',
    type: 'demon',
    description: 'A small spirit born from the northern lights. Flickers between dimensions.',
    icon: '✨',
    stats: {
      hp: 80,
      attack: 30,
      defense: 8,
      speed: 25,
      cheeseAffinity: 15,
    },
    weakness: 'dark',
    resistance: 'holy',
    skills: [
      {
        id: 'dimensional_flicker',
        name: 'Dimensional Flicker',
        damage: 1.3,
        cooldown: 1,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'wisp_essence', chance: 0.4 },
      { itemId: 'aurora_fragment', chance: 0.25 },
    ],
    xpReward: 82,
    curdReward: new Decimal(410),
  },

  // ===== Nunavut Enemies (Inuit/Arctic) =====
  {
    id: 'ice_spirit',
    name: 'Ice Spirit',
    type: 'demon',
    description: 'An ancient spirit of the frozen north. Commands the very ice itself.',
    icon: '❄️',
    stats: {
      hp: 180,
      attack: 42,
      defense: 25,
      speed: 14,
      cheeseAffinity: 20,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'blizzard',
        name: 'Blizzard',
        damage: 1.0,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -12,
          duration: 4,
        },
      },
      {
        id: 'ice_lance',
        name: 'Ice Lance',
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'eternal_ice', chance: 0.25 },
      { itemId: 'spirit_essence', chance: 0.3 },
    ],
    xpReward: 100,
    curdReward: new Decimal(500),
  },
  {
    id: 'polar_bear_patriarch',
    name: 'Polar Bear Patriarch',
    type: 'beast',
    description: 'The king of the arctic predators. Massive, powerful, and extremely territorial.',
    icon: '🐻‍❄️',
    stats: {
      hp: 250,
      attack: 45,
      defense: 35,
      speed: 10,
      cheeseAffinity: 10,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'maul',
        name: 'Devastating Maul',
        damage: 2.0,
        cooldown: 3,
        targetType: 'single',
      },
      {
        id: 'roar',
        name: 'Territorial Roar',
        damage: 0,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -10,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'polar_fur', chance: 0.3 },
      { itemId: 'bear_claw', chance: 0.25 },
    ],
    xpReward: 110,
    curdReward: new Decimal(550),
  },
  {
    id: 'seal_hunter_shade',
    name: 'Seal Hunter Shade',
    type: 'undead',
    description: 'The spirit of an ancient hunter who never returned from the ice. Still stalks prey.',
    icon: '🎯',
    stats: {
      hp: 140,
      attack: 40,
      defense: 18,
      speed: 18,
      cheeseAffinity: 25,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'spirit_harpoon',
        name: 'Spirit Harpoon',
        damage: 1.7,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'hunters_patience',
        name: "Hunter's Patience",
        damage: 0,
        cooldown: 6,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'attack',
          value: 20,
          duration: 2,
        },
      },
    ],
    drops: [
      { itemId: 'ancient_harpoon', chance: 0.2 },
      { itemId: 'ectoplasm', chance: 0.4 },
    ],
    xpReward: 95,
    curdReward: new Decimal(475),
  },

  // ===== MYTHOLOGY QUESTLINE ENEMIES =====

  // ===== Thunderbird Saga Enemies (Sky/Cosmic) =====
  {
    id: 'sky_serpent',
    name: 'Sky Serpent',
    type: 'beast',
    description: 'A massive serpent that swims through the clouds. Ancient enemy of the Thunderbird.',
    icon: '🐉',
    stats: {
      hp: 200,
      attack: 45,
      defense: 28,
      speed: 16,
      cheeseAffinity: 15,
    },
    weakness: 'lightning',
    resistance: 'ice',
    skills: [
      {
        id: 'sky_coil',
        name: 'Sky Coil',
        damage: 1.6,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -8,
          duration: 3,
        },
      },
      {
        id: 'cloud_cover',
        name: 'Cloud Cover',
        damage: 0,
        cooldown: 5,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'defense',
          value: 15,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'sky_scale', chance: 0.3 },
      { itemId: 'cloud_essence', chance: 0.25 },
    ],
    xpReward: 105,
    curdReward: new Decimal(525),
  },
  {
    id: 'chaos_wisp',
    name: 'Chaos Wisp',
    type: 'demon',
    description: 'A fragment of primordial chaos given form. Erratic and unpredictable.',
    icon: '🌀',
    stats: {
      hp: 100,
      attack: 38,
      defense: 10,
      speed: 25,
      cheeseAffinity: -30,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'chaos_bolt',
        name: 'Chaos Bolt',
        damage: 1.4,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'entropy_field',
        name: 'Entropy Field',
        damage: 0.6,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -8,
          duration: 3,
        },
      },
    ],
    drops: [
      { itemId: 'chaos_shard', chance: 0.35 },
      { itemId: 'entropic_essence', chance: 0.2 },
    ],
    xpReward: 92,
    curdReward: new Decimal(460),
  },
  {
    id: 'storm_hawk',
    name: 'Storm Hawk',
    type: 'beast',
    description: 'A servant of the Thunderbird, corrupted by chaos. Lightning crackles in its wake.',
    icon: '🦅',
    stats: {
      hp: 150,
      attack: 42,
      defense: 18,
      speed: 22,
      cheeseAffinity: 10,
    },
    weakness: 'ice',
    resistance: 'lightning',
    skills: [
      {
        id: 'diving_strike',
        name: 'Diving Strike',
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'storm_screech',
        name: 'Storm Screech',
        damage: 0.8,
        cooldown: 4,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'storm_feather', chance: 0.3 },
      { itemId: 'lightning_essence', chance: 0.2 },
    ],
    xpReward: 98,
    curdReward: new Decimal(490),
  },
  {
    id: 'void_stalker',
    name: 'Void Stalker',
    type: 'demon',
    description: 'A creature from the space between worlds. Brought forth by the chaos forces.',
    icon: '👁️',
    stats: {
      hp: 180,
      attack: 48,
      defense: 22,
      speed: 18,
      cheeseAffinity: -40,
    },
    weakness: 'holy',
    resistance: 'physical',
    skills: [
      {
        id: 'void_touch',
        name: 'Void Touch',
        damage: 1.7,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'defense',
          value: -10,
          duration: 3,
        },
      },
      {
        id: 'dimensional_rift',
        name: 'Dimensional Rift',
        damage: 1.2,
        cooldown: 5,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'void_essence', chance: 0.25 },
      { itemId: 'dimensional_fragment', chance: 0.15 },
    ],
    xpReward: 110,
    curdReward: new Decimal(550),
  },

  // ===== Wendigo Warning Enemies (Horror/Hunger) =====
  {
    id: 'hunger_shade',
    name: 'Hunger Shade',
    type: 'undead',
    description: 'A spirit consumed by eternal hunger. Drains the life force of all it touches.',
    icon: '💀',
    stats: {
      hp: 160,
      attack: 50,
      defense: 15,
      speed: 16,
      cheeseAffinity: -50,
    },
    weakness: 'fire',
    resistance: 'dark',
    skills: [
      {
        id: 'draining_touch',
        name: 'Draining Touch',
        damage: 1.5,
        cooldown: 1,
        targetType: 'single',
        effect: {
          type: 'buff',
          stat: 'heal_over_time',
          value: 10,
          duration: 2,
        },
      },
      {
        id: 'hunger_curse',
        name: 'Mark of Hunger',
        damage: 0.5,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 12,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'hunger_essence', chance: 0.35 },
      { itemId: 'ectoplasm', chance: 0.4 },
    ],
    xpReward: 115,
    curdReward: new Decimal(575),
  },
  {
    id: 'frost_wretch',
    name: 'Frost Wretch',
    type: 'undead',
    description: 'A frozen corpse animated by Wendigo magic. Once a prospector lost to the cold.',
    icon: '🥶',
    stats: {
      hp: 190,
      attack: 42,
      defense: 30,
      speed: 10,
      cheeseAffinity: 5,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'frozen_grasp',
        name: 'Frozen Grasp',
        damage: 1.4,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -10,
          duration: 3,
        },
      },
      {
        id: 'bitter_cold',
        name: 'Bitter Cold',
        damage: 0.8,
        cooldown: 3,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'frozen_bone', chance: 0.4 },
      { itemId: 'permafrost_shard', chance: 0.25 },
    ],
    xpReward: 108,
    curdReward: new Decimal(540),
  },
  {
    id: 'greed_phantom',
    name: 'Greed Phantom',
    type: 'demon',
    description: 'A demon born from the greed of gold rush prospectors. Hoards what it steals.',
    icon: '👻',
    stats: {
      hp: 170,
      attack: 46,
      defense: 20,
      speed: 14,
      cheeseAffinity: -60,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'gold_fever_strike',
        name: 'Gold Fever Strike',
        damage: 1.6,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'avarice_aura',
        name: 'Aura of Avarice',
        damage: 0,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -12,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'cursed_gold', chance: 0.3 },
      { itemId: 'greed_essence', chance: 0.25 },
    ],
    xpReward: 112,
    curdReward: new Decimal(560),
  },

  // ===== La Chasse-Galerie Enemies (Flying Canoe/Folklore) =====
  {
    id: 'sky_voyageur',
    name: 'Sky Voyageur',
    type: 'undead',
    description: 'A ghostly lumberjack who made the flying canoe pact. Forever trapped between worlds.',
    icon: '🛶',
    stats: {
      hp: 130,
      attack: 35,
      defense: 18,
      speed: 20,
      cheeseAffinity: 20,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'paddle_strike',
        name: 'Spectral Paddle Strike',
        damage: 1.4,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'voyageur_song',
        name: 'Voyageur Song',
        damage: 0,
        cooldown: 5,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'speed',
          value: 8,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'spectral_paddle', chance: 0.25 },
      { itemId: 'voyageur_spirit', chance: 0.3 },
    ],
    xpReward: 75,
    curdReward: new Decimal(375),
  },
  {
    id: 'wind_spirit',
    name: 'Wind Spirit',
    type: 'demon',
    description: 'An elemental spirit of the night wind. Serves as guide and tormentor to the flying canoe.',
    icon: '🌬️',
    stats: {
      hp: 100,
      attack: 32,
      defense: 12,
      speed: 28,
      cheeseAffinity: 10,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'gust',
        name: 'Howling Gust',
        damage: 1.2,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'tailwind',
        name: 'Tailwind',
        damage: 0.7,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -6,
          duration: 2,
        },
      },
    ],
    drops: [
      { itemId: 'wind_essence', chance: 0.35 },
      { itemId: 'air_crystal', chance: 0.2 },
    ],
    xpReward: 68,
    curdReward: new Decimal(340),
  },
  {
    id: 'night_terror',
    name: 'Night Terror',
    type: 'demon',
    description: 'A creature of nightmare that hunts those who fly through the midnight sky.',
    icon: '🦇',
    stats: {
      hp: 140,
      attack: 40,
      defense: 15,
      speed: 22,
      cheeseAffinity: -20,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'terror_strike',
        name: 'Terror Strike',
        damage: 1.5,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -10,
          duration: 3,
        },
      },
      {
        id: 'nightmare_shroud',
        name: 'Nightmare Shroud',
        damage: 0.9,
        cooldown: 4,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'nightmare_shard', chance: 0.3 },
      { itemId: 'dark_essence', chance: 0.25 },
    ],
    xpReward: 80,
    curdReward: new Decimal(400),
  },
];

// ===== Boss Enemies =====

export const BOSSES: BossDefinition[] = [
  // Ontario Boss
  {
    id: 'bland_baron',
    name: 'The Bland Baron',
    type: 'boss',
    description: 'The tyrannical ruler of processed cheese, determined to strip all flavor from Canada. His blandness is legendary.',
    icon: '🤴',
    stats: {
      hp: 500,
      attack: 25,
      defense: 30,
      speed: 8,
      cheeseAffinity: -50,
    },
    weakness: 'nature',
    resistance: 'dark',
    skills: [
      {
        id: 'bland_wave',
        name: 'Bland Wave',
        damage: 0.8,
        cooldown: 2,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'cheeseAffinity',
          value: -10,
          duration: 4,
        },
      },
      {
        id: 'processed_punch',
        name: 'Processed Punch',
        damage: 1.5,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'remove_flavor',
        name: 'Remove Flavor',
        damage: 0,
        cooldown: 6,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -8,
          duration: 5,
        },
      },
    ],
    drops: [
      { itemId: 'baron_crown_shard', chance: 0.2 },
      { itemId: 'processed_heart', chance: 1.0 },
      { itemId: 'rare_cheese_charm', chance: 0.15 },
    ],
    xpReward: 200,
    curdReward: new Decimal(2000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Bland Baron sneers, 'Your cheese culture ends here, eh!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 10, speed: 3 },
        newSkills: [
          {
            id: 'mass_production',
            name: 'Mass Production',
            damage: 0.5,
            cooldown: 3,
            targetType: 'all',
          },
        ],
        onEnterMessage: "The Baron's factory machinery whirs to life! 'Time to industrialize!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 20, defense: 15, speed: 5 },
        onEnterMessage: "The Baron absorbs nearby processed cheese! 'I AM THE FACTORY!'",
      },
    ],
    specialMechanics: ['Removes all flavor buffs at 50% HP', 'Summons Processed Slimes every 30 seconds'],
  },

  // Quebec Boss
  {
    id: 'fromage_fantome',
    name: 'Le Fromage Fantome',
    type: 'boss',
    description: "A ghostly French-Canadian fromager who guards Quebec's cheese secrets. Speaks only in rhyming French.",
    icon: '👻',
    stats: {
      hp: 650,
      attack: 30,
      defense: 20,
      speed: 12,
      cheeseAffinity: 60,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'spectral_brie',
        name: 'Spectral Brie',
        damage: 1.2,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'poutine_curse',
        name: 'Poutine Curse',
        damage: 0.6,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -6,
          duration: 4,
        },
      },
      {
        id: 'joual_incantation',
        name: 'Joual Incantation',
        damage: 1.8,
        cooldown: 4,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'phantom_oka', chance: 0.25 },
      { itemId: 'ghostly_rennet', chance: 1.0 },
      { itemId: 'quebec_artifact', chance: 0.1 },
    ],
    xpReward: 300,
    curdReward: new Decimal(4000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "Le Fantome appears! 'Bienvenue, mes amis... to your doom, tabarnak!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 75,
        statModifiers: { attack: 8, speed: 4 },
        onEnterMessage: "The ghost's form solidifies! 'You think you can defeat Quebecois cheese culture?!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 50,
        statModifiers: { attack: 15, defense: 10 },
        newSkills: [
          {
            id: 'french_only_phase',
            name: 'Parler Francais!',
            damage: 2.0,
            cooldown: 5,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'attack',
              value: -12,
              duration: 3,
            },
          },
        ],
        onEnterMessage: "'ICI, ON PARLE FRANCAIS!' The phantom becomes enraged!",
      },
      {
        phaseNumber: 4,
        hpThreshold: 25,
        statModifiers: { attack: 25, defense: 15, speed: 8 },
        onEnterMessage: "Le Fromage Fantome becomes desperate! 'Je me souviens... of DESTRUCTION!'",
      },
    ],
    specialMechanics: ['French-only damage phase at 50% HP', 'Heals when Quebec heroes are in party'],
  },

  // Alberta Boss
  {
    id: 'oil_slick_sally',
    name: 'Oil Slick Sally',
    type: 'boss',
    description: 'An oil tycoon who believes cheese should be replaced with petroleum products. Surprisingly slippery.',
    icon: '🛢️',
    stats: {
      hp: 600,
      attack: 28,
      defense: 25,
      speed: 10,
      cheeseAffinity: -30,
    },
    weakness: 'fire',
    resistance: 'physical',
    skills: [
      {
        id: 'oil_splash',
        name: 'Oil Splash',
        damage: 1.0,
        cooldown: 2,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -8,
          duration: 3,
        },
      },
      {
        id: 'pipeline_slam',
        name: 'Pipeline Slam',
        damage: 1.6,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'drill_strike',
        name: 'Drill Strike',
        damage: 2.0,
        cooldown: 5,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'oil_barrel', chance: 0.3 },
      { itemId: 'slick_boots', chance: 0.15 },
      { itemId: 'alberta_beef_jerky', chance: 1.0 },
    ],
    xpReward: 280,
    curdReward: new Decimal(3500),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "Sally emerges from an oil puddle! 'Time to drill some sense into ya!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 12, defense: 10 },
        newSkills: [
          {
            id: 'oil_puddle',
            name: 'Create Oil Puddle',
            damage: 0,
            cooldown: 4,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'speed',
              value: -15,
              duration: 5,
            },
          },
        ],
        onEnterMessage: "Sally's oil spreads across the arena! 'This here's MY territory!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 20, defense: 15, speed: -5 },
        onEnterMessage: "Sally transforms into a walking oil derrick! 'DRILL, BABY, DRILL!'",
      },
    ],
    specialMechanics: ['Oil puddles reduce all hero speed', 'Fire attacks do 2x damage but spread oil fire'],
  },

  // Saskatchewan Boss
  {
    id: 'wheat_witch',
    name: 'Wheat Witch',
    type: 'boss',
    description: "A sorceress who believes wheat should reign supreme over all dairy. Commands an army of grain.",
    icon: '🧙‍♀️',
    stats: {
      hp: 450,
      attack: 35,
      defense: 15,
      speed: 14,
      cheeseAffinity: -20,
    },
    weakness: 'fire',
    resistance: 'nature',
    skills: [
      {
        id: 'wheat_storm',
        name: 'Wheat Storm',
        damage: 0.7,
        cooldown: 2,
        targetType: 'all',
      },
      {
        id: 'gluten_bolt',
        name: 'Gluten Bolt',
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'summon_grain',
        name: 'Summon Grain Minions',
        damage: 0,
        cooldown: 8,
        targetType: 'self',
      },
    ],
    drops: [
      { itemId: 'enchanted_wheat', chance: 0.4 },
      { itemId: 'witch_hat', chance: 0.1 },
      { itemId: 'prairie_dust', chance: 1.0 },
    ],
    xpReward: 250,
    curdReward: new Decimal(3000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Wheat Witch cackles! 'Cheese? In MY province of endless wheat?!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 50,
        statModifiers: { attack: 15, speed: 6 },
        newSkills: [
          {
            id: 'grain_swarm',
            name: 'Grain Swarm',
            damage: 1.2,
            cooldown: 3,
            targetType: 'all',
          },
        ],
        onEnterMessage: "Grain minions rise from the prairie! 'MY CHILDREN, ATTACK!'",
      },
    ],
    specialMechanics: ['Summons grain minion swarm every phase', 'Grain minions explode on death'],
  },

  // BC Boss
  {
    id: 'pacific_rim_crab',
    name: 'Pacific Rim Crab',
    type: 'boss',
    description: 'A giant Dungeness crab empowered by the ocean spirits. Believes seafood should replace cheese.',
    icon: '🦀',
    stats: {
      hp: 700,
      attack: 32,
      defense: 40,
      speed: 6,
      cheeseAffinity: -40,
    },
    weakness: 'lightning',
    resistance: 'ice',
    skills: [
      {
        id: 'claw_crush',
        name: 'Claw Crush',
        damage: 2.0,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'bubble_beam',
        name: 'Bubble Beam',
        damage: 0.8,
        cooldown: 1,
        targetType: 'all',
      },
      {
        id: 'shell_guard',
        name: 'Shell Guard',
        damage: 0,
        cooldown: 6,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'defense',
          value: 30,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'crab_shell', chance: 0.35 },
      { itemId: 'pacific_pearl', chance: 0.15 },
      { itemId: 'bc_salmon', chance: 1.0 },
    ],
    xpReward: 350,
    curdReward: new Decimal(5000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Pacific Rim Crab emerges! 'SEAFOOD SUPREMACY!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { defense: 20 },
        newSkills: [
          {
            id: 'tidal_wave',
            name: 'Tidal Wave',
            damage: 1.5,
            cooldown: 4,
            targetType: 'all',
          },
        ],
        onEnterMessage: "The crab's shell hardens! 'You'll never crack THIS defense!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 20, defense: -10, speed: 8 },
        onEnterMessage: "The crab sheds its shell! 'FULL OFFENSE MODE, BUD!'",
      },
    ],
    specialMechanics: ['High defense shell must be broken first', 'Shell regenerates at 33% HP', 'Vulnerable after shell break'],
  },

  // Manitoba Boss
  {
    id: 'frozen_goalie',
    name: 'The Frozen Goalie',
    type: 'boss',
    description: 'A legendary hockey goalie who froze to death defending his net. Still making saves from beyond the grave.',
    icon: '🥅',
    stats: {
      hp: 900,
      attack: 35,
      defense: 50,
      speed: 12,
      cheeseAffinity: 15,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'puck_deflection',
        name: 'Puck Deflection',
        damage: 0,
        cooldown: 3,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'defense',
          value: 25,
          duration: 3,
        },
      },
      {
        id: 'slap_shot_return',
        name: 'Slap Shot Return',
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'ice_patch',
        name: 'Create Ice Patch',
        damage: 0.6,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -10,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'goalie_mask_shard', chance: 0.25 },
      { itemId: 'frozen_puck', chance: 1.0 },
      { itemId: 'rare_ice_crystal', chance: 0.15 },
    ],
    xpReward: 450,
    curdReward: new Decimal(8000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Frozen Goalie rises from the ice! 'NO CHEESE GETS PAST ME, EH!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { defense: 20, speed: 4 },
        newSkills: [
          {
            id: 'butterfly_save',
            name: 'Butterfly Save',
            damage: 0,
            cooldown: 5,
            targetType: 'self',
            effect: {
              type: 'buff',
              stat: 'defense',
              value: 40,
              duration: 2,
            },
          },
        ],
        onEnterMessage: "The Goalie drops into butterfly position! 'NOTHING GETS THROUGH!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 25, defense: 30, speed: 8 },
        onEnterMessage: "The arena freezes over completely! 'OVERTIME, SUDDEN DEATH!'",
      },
    ],
    specialMechanics: ['Deflects first attack each turn', 'Ice patches slow all heroes', 'Enters Save Mode at low HP'],
  },

  // Nova Scotia Boss
  {
    id: 'the_kraken',
    name: 'The Kraken',
    type: 'boss',
    description: 'A legendary sea monster that has developed a taste for aged maritime cheese. Emerged from the Fundy depths.',
    icon: '🦑',
    stats: {
      hp: 1000,
      attack: 40,
      defense: 35,
      speed: 8,
      cheeseAffinity: 30,
    },
    weakness: 'lightning',
    resistance: 'ice',
    skills: [
      {
        id: 'tentacle_slam',
        name: 'Tentacle Slam',
        damage: 1.6,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'ink_cloud',
        name: 'Ink Cloud',
        damage: 0.8,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -12,
          duration: 4,
        },
      },
      {
        id: 'drag_under',
        name: 'Drag Under',
        damage: 2.2,
        cooldown: 5,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'kraken_tentacle', chance: 0.2 },
      { itemId: 'deep_sea_pearl', chance: 1.0 },
      { itemId: 'ancient_anchor', chance: 0.15 },
    ],
    xpReward: 550,
    curdReward: new Decimal(12000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Kraken surfaces! 'YOUR CHEESE WILL FEED THE DEPTHS!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 75,
        statModifiers: { attack: 10, speed: 3 },
        newSkills: [
          {
            id: 'summon_tentacles',
            name: 'Summon Tentacles',
            damage: 0.5,
            cooldown: 3,
            targetType: 'all',
          },
        ],
        onEnterMessage: "More tentacles emerge from the water! 'THERE IS NO ESCAPE!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 50,
        statModifiers: { attack: 20, defense: 15 },
        onEnterMessage: "The Kraken's eyes glow with rage! 'I HAVE DEVOURED SHIPS!'",
      },
      {
        phaseNumber: 4,
        hpThreshold: 25,
        statModifiers: { attack: 35, defense: 20, speed: 5 },
        newSkills: [
          {
            id: 'tidal_crush',
            name: 'Tidal Crush',
            damage: 1.8,
            cooldown: 4,
            targetType: 'all',
          },
        ],
        onEnterMessage: "The Kraken summons a massive wave! 'THE SEA CLAIMS ALL!'",
      },
    ],
    specialMechanics: ['Summons tentacle minions every phase', 'Ink clouds reduce visibility', 'Can drag heroes underwater'],
  },

  // New Brunswick Boss
  {
    id: 'headless_lumberjack',
    name: 'The Headless Lumberjack',
    type: 'boss',
    description: 'A legendary lumberjack who lost his head in a logging accident. His axe still seeks revenge.',
    icon: '🪓',
    stats: {
      hp: 850,
      attack: 45,
      defense: 30,
      speed: 14,
      cheeseAffinity: 10,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'axe_throw',
        name: 'Phantom Axe Throw',
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'tree_summon',
        name: 'Summon Treant',
        damage: 0,
        cooldown: 6,
        targetType: 'self',
      },
      {
        id: 'timber_fall',
        name: 'TIMBER!',
        damage: 1.4,
        cooldown: 3,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'spectral_axe', chance: 0.2 },
      { itemId: 'phantom_plaid', chance: 1.0 },
      { itemId: 'ancient_wood', chance: 0.15 },
    ],
    xpReward: 500,
    curdReward: new Decimal(10000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Headless Lumberjack appears! His axe glows with ethereal light!",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 15, speed: 4 },
        newSkills: [
          {
            id: 'whirlwind_chop',
            name: 'Whirlwind Chop',
            damage: 1.2,
            cooldown: 3,
            targetType: 'all',
          },
        ],
        onEnterMessage: "The Lumberjack's axe begins to spin! 'I NEED NO HEAD TO FELL YOU!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 30, defense: 15, speed: 8 },
        onEnterMessage: "The forest itself seems to rise! 'THE WOODS ARE MY DOMAIN!'",
      },
    ],
    specialMechanics: ['Summons Treant allies', 'Thrown axes return for double damage', 'Forest provides healing'],
  },

  // PEI Boss
  {
    id: 'annes_dark_side',
    name: "Anne's Dark Side",
    type: 'boss',
    description: "A twisted manifestation of imagination gone wrong. Anne's darker thoughts given form.",
    icon: '👧',
    stats: {
      hp: 750,
      attack: 42,
      defense: 25,
      speed: 16,
      cheeseAffinity: 20,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'imagination_bolt',
        name: 'Imagination Bolt',
        damage: 1.6,
        cooldown: 1,
        targetType: 'single',
      },
      {
        id: 'create_illusion',
        name: 'Create Illusion',
        damage: 0,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -15,
          duration: 3,
        },
      },
      {
        id: 'nightmare_world',
        name: 'Nightmare World',
        damage: 1.0,
        cooldown: 4,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'imagination_fragment', chance: 0.25 },
      { itemId: 'red_braid', chance: 1.0 },
      { itemId: 'green_gable_shard', chance: 0.1 },
    ],
    xpReward: 480,
    curdReward: new Decimal(9500),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "A dark reflection of Anne appears! 'Imagination can create... or destroy!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 12, speed: 6 },
        newSkills: [
          {
            id: 'story_twist',
            name: 'Plot Twist',
            damage: 2.0,
            cooldown: 5,
            targetType: 'single',
          },
        ],
        onEnterMessage: "Reality warps! 'Every story needs a villain!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 25, defense: 10, speed: 10 },
        onEnterMessage: "The nightmare reaches its climax! 'THIS IS MY STORY NOW!'",
      },
    ],
    specialMechanics: ['Creates illusion copies', 'Illusions explode when destroyed', 'Reality distortion affects targeting'],
  },

  // Newfoundland Boss
  {
    id: 'iceberg_leviathan',
    name: 'Iceberg Leviathan',
    type: 'boss',
    description: 'An ancient creature frozen within an iceberg for millennia. The ice IS the monster.',
    icon: '🏔️',
    stats: {
      hp: 1200,
      attack: 38,
      defense: 55,
      speed: 5,
      cheeseAffinity: -20,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'glacial_slam',
        name: 'Glacial Slam',
        damage: 2.0,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'cold_aura',
        name: 'Freezing Aura',
        damage: 0.4,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'speed',
          value: -12,
          duration: 4,
        },
      },
      {
        id: 'iceberg_rain',
        name: 'Iceberg Rain',
        damage: 1.2,
        cooldown: 4,
        targetType: 'all',
      },
    ],
    drops: [
      { itemId: 'leviathan_core', chance: 0.2 },
      { itemId: 'ancient_ice', chance: 1.0 },
      { itemId: 'viking_treasure', chance: 0.15 },
    ],
    xpReward: 650,
    curdReward: new Decimal(18000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The iceberg splits open! 'I HAVE WAITED... SO LONG...'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 75,
        statModifiers: { defense: 15, attack: 8 },
        onEnterMessage: "Ice crystals form a protective shell! 'THE COLD PRESERVES ALL!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 50,
        statModifiers: { attack: 20, defense: 25 },
        newSkills: [
          {
            id: 'flash_freeze',
            name: 'Flash Freeze',
            damage: 1.5,
            cooldown: 4,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'speed',
              value: -20,
              duration: 2,
            },
          },
        ],
        onEnterMessage: "The temperature plummets! 'FREEZE WITH ME FOREVER!'",
      },
      {
        phaseNumber: 4,
        hpThreshold: 25,
        statModifiers: { attack: 35, defense: 35, speed: 3 },
        onEnterMessage: "The Leviathan's core is exposed! 'I... WILL... NOT... MELT!'",
      },
    ],
    specialMechanics: ['Regenerates HP in ice phase', 'Cold DoT affects all heroes', 'Summons iceberg minions'],
  },

  // Yukon Boss
  {
    id: 'the_wendigo',
    name: 'The Wendigo',
    type: 'boss',
    description: 'A creature of Algonquian legend, born from extreme hunger and isolation. An embodiment of insatiable greed.',
    icon: '👹',
    stats: {
      hp: 950,
      attack: 55,
      defense: 25,
      speed: 18,
      cheeseAffinity: -50,
    },
    weakness: 'fire',
    resistance: 'dark',
    skills: [
      {
        id: 'ravenous_bite',
        name: 'Ravenous Bite',
        damage: 2.2,
        cooldown: 2,
        targetType: 'single',
      },
      {
        id: 'fear_aura',
        name: 'Aura of Fear',
        damage: 0,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -15,
          duration: 4,
        },
      },
      {
        id: 'hunger_curse',
        name: 'Hunger Curse',
        damage: 0.8,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 15,
          duration: 5,
        },
      },
    ],
    drops: [
      { itemId: 'wendigo_antler', chance: 0.2 },
      { itemId: 'hunger_essence', chance: 1.0 },
      { itemId: 'cursed_gold_nugget', chance: 0.15 },
    ],
    xpReward: 700,
    curdReward: new Decimal(22000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "A horrifying screech echoes! 'I HUNGER... I ALWAYS HUNGER!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 20, speed: 5 },
        newSkills: [
          {
            id: 'consume',
            name: 'Consume',
            damage: 2.5,
            cooldown: 6,
            targetType: 'single',
          },
        ],
        onEnterMessage: "The Wendigo's hunger intensifies! 'MORE... I NEED MORE!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 40, speed: 10, defense: -10 },
        onEnterMessage: "Driven mad by hunger! 'EVERYTHING WILL BE CONSUMED!'",
      },
    ],
    specialMechanics: ['Fear mechanic reduces hero damage', 'Hunger debuff drains HP', 'Gains power from defeated heroes'],
  },

  // NWT Boss
  {
    id: 'aurora_serpent',
    name: 'Aurora Serpent',
    type: 'boss',
    description: 'A mystical serpent that dwells within the northern lights. Each color grants different powers.',
    icon: '🐍',
    stats: {
      hp: 1100,
      attack: 45,
      defense: 35,
      speed: 15,
      cheeseAffinity: 25,
    },
    weakness: 'dark',
    resistance: 'holy',
    skills: [
      {
        id: 'aurora_breath',
        name: 'Aurora Breath',
        damage: 1.4,
        cooldown: 2,
        targetType: 'all',
      },
      {
        id: 'color_shift',
        name: 'Color Shift',
        damage: 0,
        cooldown: 4,
        targetType: 'self',
        effect: {
          type: 'buff',
          stat: 'speed',
          value: 10,
          duration: 3,
        },
      },
      {
        id: 'light_coil',
        name: 'Light Coil',
        damage: 1.8,
        cooldown: 3,
        targetType: 'single',
      },
    ],
    drops: [
      { itemId: 'aurora_scale', chance: 0.2 },
      { itemId: 'northern_light_essence', chance: 1.0 },
      { itemId: 'diamond_shard', chance: 0.15 },
    ],
    xpReward: 750,
    curdReward: new Decimal(28000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The Aurora Serpent descends! 'BEHOLD THE LIGHT ETERNAL!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 75,
        statModifiers: { attack: 12, defense: 10 },
        newSkills: [
          {
            id: 'green_phase',
            name: 'Emerald Aurora',
            damage: 1.2,
            cooldown: 3,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'defense',
              value: -10,
              duration: 3,
            },
          },
        ],
        onEnterMessage: "The serpent glows GREEN! Poison seeps into the air!",
      },
      {
        phaseNumber: 3,
        hpThreshold: 50,
        statModifiers: { attack: 25, speed: 8 },
        newSkills: [
          {
            id: 'red_phase',
            name: 'Crimson Aurora',
            damage: 2.0,
            cooldown: 4,
            targetType: 'single',
          },
        ],
        onEnterMessage: "The serpent shifts to RED! Raw power surges!",
      },
      {
        phaseNumber: 4,
        hpThreshold: 25,
        statModifiers: { attack: 40, defense: 20, speed: 12 },
        newSkills: [
          {
            id: 'rainbow_finale',
            name: 'Rainbow Cataclysm',
            damage: 1.6,
            cooldown: 5,
            targetType: 'all',
          },
        ],
        onEnterMessage: "ALL COLORS MERGE! 'WITNESS THE FULL SPECTRUM!'",
      },
    ],
    specialMechanics: ['Color-based phase immunity', 'Each phase has different elemental weakness', 'Rainbow phase removes all immunities'],
  },

  // Nunavut Boss - Final Boss
  {
    id: 'sedna',
    name: 'Sedna, Goddess of the Sea',
    type: 'boss',
    description: 'The Inuit goddess of the sea and marine animals. She guards the ultimate cheese at the top of the world.',
    icon: '🧜‍♀️',
    stats: {
      hp: 1500,
      attack: 50,
      defense: 40,
      speed: 12,
      cheeseAffinity: 50,
    },
    weakness: 'fire',
    resistance: 'ice',
    skills: [
      {
        id: 'ocean_wrath',
        name: 'Ocean Wrath',
        damage: 1.6,
        cooldown: 2,
        targetType: 'all',
      },
      {
        id: 'summon_sea_beast',
        name: 'Call of the Deep',
        damage: 0,
        cooldown: 6,
        targetType: 'self',
      },
      {
        id: 'drowning_grip',
        name: 'Drowning Grip',
        damage: 2.5,
        cooldown: 4,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 20,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'sedna_blessing', chance: 0.25 },
      { itemId: 'goddess_tear', chance: 1.0 },
      { itemId: 'ice_crown_shard', chance: 0.1 },
    ],
    xpReward: 1000,
    curdReward: new Decimal(50000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "Sedna rises from the frozen waters! 'YOU DARE SEEK THE ULTIMATE CHEESE?'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 80,
        statModifiers: { attack: 10, defense: 10 },
        newSkills: [
          {
            id: 'seal_army',
            name: 'Summon Seal Army',
            damage: 0.8,
            cooldown: 4,
            targetType: 'all',
          },
        ],
        onEnterMessage: "The sea creatures answer her call! 'MY CHILDREN, DEFEND ME!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 60,
        statModifiers: { attack: 20, defense: 15, speed: 4 },
        onEnterMessage: "Sedna's fury grows! 'THE SEA REMEMBERS EVERY SLIGHT!'",
      },
      {
        phaseNumber: 4,
        hpThreshold: 40,
        statModifiers: { attack: 35, defense: 20 },
        newSkills: [
          {
            id: 'tsunami',
            name: 'Arctic Tsunami',
            damage: 2.0,
            cooldown: 5,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'speed',
              value: -15,
              duration: 3,
            },
          },
        ],
        onEnterMessage: "The waters rise! 'DROWN IN MY DOMAIN!'",
      },
      {
        phaseNumber: 5,
        hpThreshold: 20,
        statModifiers: { attack: 50, defense: 25, speed: 8 },
        onEnterMessage: "Sedna reveals her true form! 'I AM THE FROZEN CROWN! I AM ETERNAL!'",
      },
    ],
    specialMechanics: ['Summons sea creature allies each phase', 'Drowning mechanic stacks DoT', '5 phases - longest fight', 'Final boss - grants ultimate reward'],
  },

  // ===== MYTHOLOGY QUESTLINE BOSSES =====

  // Thunderbird Saga Final Boss
  {
    id: 'chaos_incarnate',
    name: 'Chaos Incarnate',
    type: 'boss',
    description: 'The primordial force of chaos given form. An entity that seeks to unravel the fabric of reality itself. Only the Thunderbird\'s blessing can stand against it.',
    icon: '🌌',
    stats: {
      hp: 2000,
      attack: 60,
      defense: 45,
      speed: 14,
      cheeseAffinity: -100,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'chaos_wave',
        name: 'Chaos Wave',
        damage: 1.8,
        cooldown: 2,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -12,
          duration: 3,
        },
      },
      {
        id: 'entropy_beam',
        name: 'Entropy Beam',
        damage: 2.5,
        cooldown: 3,
        targetType: 'single',
      },
      {
        id: 'reality_tear',
        name: 'Reality Tear',
        damage: 1.4,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'defense',
          value: -15,
          duration: 4,
        },
      },
    ],
    drops: [
      { itemId: 'chaos_heart', chance: 0.3 },
      { itemId: 'primordial_essence', chance: 1.0 },
      { itemId: 'thunderbird_feather', chance: 0.2 },
    ],
    xpReward: 1500,
    curdReward: new Decimal(100000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "Reality warps and tears! CHAOS INCARNATE manifests! 'ORDER IS AN ILLUSION!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 80,
        statModifiers: { attack: 15, speed: 4 },
        newSkills: [
          {
            id: 'summon_void',
            name: 'Summon Void Stalkers',
            damage: 0,
            cooldown: 6,
            targetType: 'self',
          },
        ],
        onEnterMessage: "Portals to the void open! 'MY SERVANTS SHALL DEVOUR YOUR WORLD!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 60,
        statModifiers: { attack: 25, defense: 15 },
        newSkills: [
          {
            id: 'dimensional_collapse',
            name: 'Dimensional Collapse',
            damage: 2.0,
            cooldown: 5,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'speed',
              value: -12,
              duration: 3,
            },
          },
        ],
        onEnterMessage: "Space itself begins to fold! 'REALITY BENDS TO MY WILL!'",
      },
      {
        phaseNumber: 4,
        hpThreshold: 40,
        statModifiers: { attack: 40, defense: 20, speed: 6 },
        onEnterMessage: "Chaos energy surges! 'THE THUNDERBIRD CANNOT SAVE YOU!'",
      },
      {
        phaseNumber: 5,
        hpThreshold: 20,
        statModifiers: { attack: 60, defense: 25, speed: 10 },
        newSkills: [
          {
            id: 'annihilation',
            name: 'Annihilation',
            damage: 3.0,
            cooldown: 6,
            targetType: 'all',
          },
        ],
        onEnterMessage: "CHAOS INCARNATE reveals its true form! 'I AM THE END OF ALL THINGS!'",
      },
    ],
    specialMechanics: ['Summons Void Stalkers each phase', 'Reality distortion randomizes targeting', 'Chaos energy builds over time', 'Thunderbird heroes deal bonus damage'],
  },

  // Wendigo Warning Final Boss
  {
    id: 'wendigo_prime',
    name: 'Wendigo Prime',
    type: 'boss',
    description: 'The original Wendigo, the first human to succumb to the hunger. An ancient evil that embodies insatiable greed and consuming darkness.',
    icon: '👹',
    stats: {
      hp: 1800,
      attack: 65,
      defense: 30,
      speed: 20,
      cheeseAffinity: -100,
    },
    weakness: 'fire',
    resistance: 'dark',
    skills: [
      {
        id: 'consuming_bite',
        name: 'Consuming Bite',
        damage: 2.4,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'buff',
          stat: 'heal_over_time',
          value: 15,
          duration: 3,
        },
      },
      {
        id: 'terror_howl',
        name: 'Howl of Terror',
        damage: 0,
        cooldown: 4,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'attack',
          value: -20,
          duration: 4,
        },
      },
      {
        id: 'eternal_hunger',
        name: 'Eternal Hunger',
        damage: 1.0,
        cooldown: 3,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 20,
          duration: 5,
        },
      },
    ],
    drops: [
      { itemId: 'wendigo_heart', chance: 0.25 },
      { itemId: 'primal_hunger_essence', chance: 1.0 },
      { itemId: 'anti_greed_charm', chance: 0.15 },
    ],
    xpReward: 1200,
    curdReward: new Decimal(80000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "The primordial hunger awakens! 'I WAS THE FIRST... I WILL BE THE LAST!'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 20, speed: 6 },
        newSkills: [
          {
            id: 'feast',
            name: 'Feast',
            damage: 3.0,
            cooldown: 6,
            targetType: 'single',
            effect: {
              type: 'buff',
              stat: 'attack',
              value: 15,
              duration: 4,
            },
          },
        ],
        onEnterMessage: "The Wendigo's hunger intensifies! 'YOUR FLESH WILL SUSTAIN ME!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 40,
        statModifiers: { attack: 35, speed: 10 },
        newSkills: [
          {
            id: 'hunger_epidemic',
            name: 'Hunger Epidemic',
            damage: 0.6,
            cooldown: 4,
            targetType: 'all',
            effect: {
              type: 'debuff',
              stat: 'damage_over_time',
              value: 30,
              duration: 6,
            },
          },
        ],
        onEnterMessage: "Madness takes hold! 'THE HUNGER SPREADS TO ALL!'",
      },
      {
        phaseNumber: 4,
        hpThreshold: 15,
        statModifiers: { attack: 55, speed: 15, defense: -15 },
        onEnterMessage: "Wendigo Prime becomes frenzied! 'I WILL CONSUME EVERYTHING!'",
      },
    ],
    specialMechanics: ['Fear mechanic reduces hero damage by 25%', 'Hunger debuff stacks and drains HP rapidly', 'Gains attack power from defeating heroes', 'Fire damage breaks fear effect'],
  },

  // La Chasse-Galerie Final Boss
  {
    id: 'devil_of_the_deal',
    name: 'Le Diable - Devil of the Deal',
    type: 'boss',
    description: 'The Devil himself who grants the flying canoe its power. He has come to collect the souls of those who made the pact. A trickster who offers bargains with terrible prices.',
    icon: '😈',
    stats: {
      hp: 1400,
      attack: 55,
      defense: 35,
      speed: 18,
      cheeseAffinity: -80,
    },
    weakness: 'holy',
    resistance: 'dark',
    skills: [
      {
        id: 'devils_bargain',
        name: "Devil's Bargain",
        damage: 1.8,
        cooldown: 2,
        targetType: 'single',
        effect: {
          type: 'debuff',
          stat: 'defense',
          value: -12,
          duration: 4,
        },
      },
      {
        id: 'soul_snare',
        name: 'Soul Snare',
        damage: 2.2,
        cooldown: 3,
        targetType: 'single',
      },
      {
        id: 'infernal_contract',
        name: 'Infernal Contract',
        damage: 0.5,
        cooldown: 5,
        targetType: 'all',
        effect: {
          type: 'debuff',
          stat: 'damage_over_time',
          value: 15,
          duration: 5,
        },
      },
    ],
    drops: [
      { itemId: 'devil_contract', chance: 0.2 },
      { itemId: 'flying_canoe_curd', chance: 1.0 },
      { itemId: 'midnight_rider_badge', chance: 0.15 },
    ],
    xpReward: 900,
    curdReward: new Decimal(55000),
    phases: [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        onEnterMessage: "Le Diable appears in smoke and flame! 'AH, MES AMIS! TIME TO PAY YOUR DEBT, NON?'",
      },
      {
        phaseNumber: 2,
        hpThreshold: 66,
        statModifiers: { attack: 15, speed: 5 },
        newSkills: [
          {
            id: 'hellfire_rain',
            name: 'Hellfire Rain',
            damage: 1.2,
            cooldown: 4,
            targetType: 'all',
          },
        ],
        onEnterMessage: "The Devil laughs! 'YOU THOUGHT YOU COULD ESCAPE? HON HON HON!'",
      },
      {
        phaseNumber: 3,
        hpThreshold: 33,
        statModifiers: { attack: 30, defense: 15, speed: 8 },
        newSkills: [
          {
            id: 'soul_harvest',
            name: 'Soul Harvest',
            damage: 2.5,
            cooldown: 5,
            targetType: 'single',
            effect: {
              type: 'buff',
              stat: 'attack',
              value: 20,
              duration: 3,
            },
          },
        ],
        onEnterMessage: "Le Diable reveals his true power! 'VOTRE ÂME EST À MOI!'",
      },
    ],
    specialMechanics: ['Bargain mechanic offers risky trades', 'Soul Snare can instant-KO low HP heroes', 'Quebec heroes have resistance to his charm', 'Defeated before dawn or all souls are forfeit'],
  },
];

// ===== Helper Functions =====

/**
 * Get an enemy definition by ID
 */
export function getEnemyById(id: string): EnemyDefinition | undefined {
  return ENEMIES.find((e) => e.id === id);
}

/**
 * Get a boss definition by ID
 */
export function getBossById(id: string): BossDefinition | undefined {
  return BOSSES.find((b) => b.id === id);
}

/**
 * Get enemies by type
 */
export function getEnemiesByType(type: EnemyDefinition['type']): EnemyDefinition[] {
  return ENEMIES.filter((e) => e.type === type);
}

/**
 * Get enemies weak to a specific damage type
 */
export function getEnemiesWeakTo(damageType: DamageType): EnemyDefinition[] {
  return ENEMIES.filter((e) => e.weakness === damageType);
}

/**
 * Scale enemy stats for a given stage
 */
export function scaleEnemyStats(
  enemy: EnemyDefinition,
  levelModifier: number
): EnemyDefinition {
  return {
    ...enemy,
    stats: {
      hp: Math.floor(enemy.stats.hp * levelModifier),
      attack: Math.floor(enemy.stats.attack * levelModifier),
      defense: Math.floor(enemy.stats.defense * levelModifier),
      speed: enemy.stats.speed, // Speed doesn't scale
      cheeseAffinity: enemy.stats.cheeseAffinity,
    },
    xpReward: Math.floor(enemy.xpReward * levelModifier),
    curdReward: enemy.curdReward.mul(levelModifier),
  };
}

/**
 * Scale boss stats for their phase
 */
export function scaleBossForPhase(
  boss: BossDefinition,
  phaseNumber: number
): BossDefinition {
  const phase = boss.phases.find((p) => p.phaseNumber === phaseNumber);
  if (!phase) return boss;

  return {
    ...boss,
    stats: {
      hp: boss.stats.hp,
      attack: boss.stats.attack + (phase.statModifiers.attack || 0),
      defense: boss.stats.defense + (phase.statModifiers.defense || 0),
      speed: boss.stats.speed + (phase.statModifiers.speed || 0),
      cheeseAffinity: boss.stats.cheeseAffinity + (phase.statModifiers.cheeseAffinity || 0),
    },
    skills: phase.newSkills ? [...boss.skills, ...phase.newSkills] : boss.skills,
  };
}
