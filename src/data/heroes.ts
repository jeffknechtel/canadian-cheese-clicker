import Decimal from 'decimal.js';
import type { HeroDefinition, HeroAbilityDefinition, LimitBreakDefinition } from '../types/game';

// XP Curve Constants
export const HERO_XP_BASE = 100; // XP needed for level 2
export const HERO_XP_MULTIPLIER = 1.5; // Each level requires 1.5x more XP
export const HERO_MAX_LEVEL = 100;

/**
 * Calculate XP required to reach the next level from current level
 */
export function getXpForLevel(level: number): number {
  return Math.floor(HERO_XP_BASE * Math.pow(HERO_XP_MULTIPLIER, level - 1));
}

/**
 * The initial 8 Canadian heroes
 *
 * Cost progression: 100K, 1M, 10M, 100M, 1B, 10B, 100B, 1T
 * Each hero costs ~10x the previous, making later heroes accessible
 * as the player's CPS increases through the game.
 *
 * Balance targets:
 * - First hero: ~30 min of play (100K curds)
 * - Full roster: Late-game progression
 * - Total CPS bonus: 10-50% range (via cheese affinity + formation)
 */
export const HEROES: HeroDefinition[] = [
  // 1. Maple Knight (Tank, Ontario) - "Sorry Shield"
  {
    id: 'maple_knight',
    name: 'Maple Knight',
    title: 'The Polite Protector',
    class: 'tank',
    province: 'ontario',
    description:
      'A chivalrous defender from Ontario who apologizes profusely while blocking attacks. His maple leaf shield has never been breached.',
    specialAbility: {
      name: 'Sorry Shield',
      description:
        'Absorbs damage for the party while apologizing, reducing incoming damage by 50% for 5 seconds.',
    },
    baseStats: {
      hp: 150,
      attack: 12,
      defense: 25,
      speed: 8,
      cheeseAffinity: 15,
    },
    statGrowth: {
      hp: 15,
      attack: 1,
      defense: 3,
      speed: 0.5,
      cheeseAffinity: 1,
    },
    recruitCost: new Decimal(100_000), // 100K - achievable in ~30 min
    icon: '🛡️',
  },

  // 2. Poutine Mage (DPS, Quebec) - "Gravy Blast"
  {
    id: 'poutine_mage',
    name: 'Poutine Mage',
    title: 'Le Maître du Fromage',
    class: 'dps',
    province: 'quebec',
    description:
      "A mystical spellcaster from Quebec who channels the power of la belle province's most beloved dish. Speaks exclusively in franglais during battle.",
    specialAbility: {
      name: 'Gravy Blast',
      description:
        'Launches a torrent of hot gravy that deals AoE damage and slows all enemies by 30% for 4 seconds.',
    },
    baseStats: {
      hp: 80,
      attack: 28,
      defense: 10,
      speed: 12,
      cheeseAffinity: 20,
    },
    statGrowth: {
      hp: 8,
      attack: 3,
      defense: 1,
      speed: 1,
      cheeseAffinity: 1.2,
    },
    recruitCost: new Decimal(1_000_000), // 1M
    icon: '🍟',
  },

  // 3. Mountie Ranger (Support, Alberta) - "Always Get My Cheese"
  {
    id: 'mountie_ranger',
    name: 'Mountie Ranger',
    title: 'The Red Serge Seeker',
    class: 'support',
    province: 'alberta',
    description:
      'A tracking specialist from the Alberta prairies. Her keen senses and trusty horse can find cheese anywhere in the Dominion.',
    specialAbility: {
      name: 'Always Get My Cheese',
      description:
        'Marks enemies, increasing drop rates by 25% and critical hit chance by 15% for 6 seconds.',
    },
    baseStats: {
      hp: 100,
      attack: 18,
      defense: 15,
      speed: 14,
      cheeseAffinity: 18,
    },
    statGrowth: {
      hp: 10,
      attack: 2,
      defense: 1.5,
      speed: 1,
      cheeseAffinity: 1,
    },
    recruitCost: new Decimal(10_000_000), // 10M
    icon: '🐴',
  },

  // 4. Hockey Enforcer (DPS, Manitoba) - "Slapshot"
  {
    id: 'hockey_enforcer',
    name: 'Hockey Enforcer',
    title: 'The Frozen Fury',
    class: 'dps',
    province: 'manitoba',
    description:
      'A bruising power forward from Winnipeg who traded his skates for adventure. His slap shot has been clocked at over 100 mph.',
    specialAbility: {
      name: 'Slapshot',
      description:
        'Winds up and delivers a devastating single-target attack dealing 300% weapon damage with a chance to stun.',
    },
    baseStats: {
      hp: 110,
      attack: 32,
      defense: 12,
      speed: 10,
      cheeseAffinity: 12,
    },
    statGrowth: {
      hp: 11,
      attack: 3.5,
      defense: 1,
      speed: 0.8,
      cheeseAffinity: 0.8,
    },
    recruitCost: new Decimal(100_000_000), // 100M
    icon: '🏒',
  },

  // 5. Voyageur Bard (Support, Saskatchewan) - "Paddle Song"
  {
    id: 'voyageur_bard',
    name: 'Voyageur Bard',
    title: 'The River Minstrel',
    class: 'support',
    province: 'saskatchewan',
    description:
      'A traveling musician who sings the old songs of the fur trade era. His melodies carry across the endless prairies.',
    specialAbility: {
      name: 'Paddle Song',
      description:
        'Sings an inspiring paddling rhythm that increases party attack speed by 20% and regenerates 2% HP per second for 8 seconds.',
    },
    baseStats: {
      hp: 90,
      attack: 15,
      defense: 12,
      speed: 16,
      cheeseAffinity: 22,
    },
    statGrowth: {
      hp: 9,
      attack: 1.5,
      defense: 1,
      speed: 1.2,
      cheeseAffinity: 1.3,
    },
    recruitCost: new Decimal(1_000_000_000), // 1B
    icon: '🛶',
  },

  // 6. Toque Monk (Tank, Yukon) - "Cold Resistance"
  {
    id: 'toque_monk',
    name: 'Toque Monk',
    title: 'The Northern Ascetic',
    class: 'tank',
    province: 'yukon',
    description:
      'A hermit who meditated for decades in the Yukon wilderness, achieving enlightenment through extreme cold exposure. His toque is said to be blessed.',
    specialAbility: {
      name: 'Cold Resistance',
      description:
        'Enters a meditative state, becoming immune to freeze and slow effects while gaining 40% damage reduction for 5 seconds.',
    },
    baseStats: {
      hp: 140,
      attack: 10,
      defense: 28,
      speed: 6,
      cheeseAffinity: 16,
    },
    statGrowth: {
      hp: 14,
      attack: 0.8,
      defense: 3.2,
      speed: 0.4,
      cheeseAffinity: 0.9,
    },
    recruitCost: new Decimal(10_000_000_000), // 10B
    icon: '🧘',
  },

  // 7. West Coast Druid (Healer, BC) - "Cedar Healing"
  {
    id: 'west_coast_druid',
    name: 'West Coast Druid',
    title: 'The Rainforest Sage',
    class: 'healer',
    province: 'bc',
    description:
      "A nature-connected healer from BC's ancient rainforests. She communes with the old growth cedars and channels their restorative energy.",
    specialAbility: {
      name: 'Cedar Healing',
      description:
        'Summons the spirit of the great cedars to heal all party members for 30% of their max HP over 6 seconds.',
    },
    baseStats: {
      hp: 85,
      attack: 14,
      defense: 14,
      speed: 11,
      cheeseAffinity: 25,
    },
    statGrowth: {
      hp: 8.5,
      attack: 1.2,
      defense: 1.2,
      speed: 0.9,
      cheeseAffinity: 1.5,
    },
    recruitCost: new Decimal(100_000_000_000), // 100B
    icon: '🌲',
  },

  // 8. Maritime Fisher (DPS, Nova Scotia) - "Lobster Trap"
  {
    id: 'maritime_fisher',
    name: 'Maritime Fisher',
    title: 'The Atlantic Hunter',
    class: 'dps',
    province: 'nova_scotia',
    description:
      'A grizzled fisher from the Nova Scotia coast who traded lobster traps for monster hunting. His patience and trapping skills are legendary.',
    specialAbility: {
      name: 'Lobster Trap',
      description:
        'Sets a trap that snares an enemy, dealing damage over time (150% weapon damage over 8 seconds) and preventing movement.',
    },
    baseStats: {
      hp: 95,
      attack: 26,
      defense: 14,
      speed: 13,
      cheeseAffinity: 18,
    },
    statGrowth: {
      hp: 9.5,
      attack: 2.8,
      defense: 1.2,
      speed: 1,
      cheeseAffinity: 1,
    },
    recruitCost: new Decimal(1_000_000_000_000), // 1T
    icon: '🦞',
  },

  // ===== Phase 7.4: New Provincial Heroes (2nd hero per existing province) =====

  // 9. Toronto Techie (Support, Ontario) - "Cloud Computing"
  {
    id: 'toronto_techie',
    name: 'Toronto Techie',
    title: 'The Silicon Savant',
    class: 'support',
    province: 'ontario',
    description:
      'A startup founder from downtown Toronto who traded code for curds. Her algorithms optimize cheese production across the network.',
    specialAbility: {
      name: 'Cloud Computing',
      description:
        'Extends all active buff durations by 50% and increases party speed by 15% for 8 seconds.',
    },
    baseStats: {
      hp: 85,
      attack: 16,
      defense: 12,
      speed: 18,
      cheeseAffinity: 22,
    },
    statGrowth: {
      hp: 8.5,
      attack: 1.6,
      defense: 1.2,
      speed: 1.5,
      cheeseAffinity: 1.3,
    },
    recruitCost: new Decimal(5_000_000_000_000), // 5T
    icon: '💻',
  },

  // 10. Habitant Farmer (Tank, Quebec) - "Maple Fortress"
  {
    id: 'habitant_farmer',
    name: 'Habitant Farmer',
    title: 'Le Gardien des Champs',
    class: 'tank',
    province: 'quebec',
    description:
      'A stalwart farmer from rural Quebec whose family has worked the same land for generations. His connection to the soil makes him unmovable.',
    specialAbility: {
      name: 'Maple Fortress',
      description:
        'Roots himself in place, gaining 60% damage reduction and regenerating 3% HP per second for 6 seconds.',
    },
    baseStats: {
      hp: 160,
      attack: 10,
      defense: 28,
      speed: 6,
      cheeseAffinity: 18,
    },
    statGrowth: {
      hp: 16,
      attack: 0.9,
      defense: 3.2,
      speed: 0.4,
      cheeseAffinity: 1.1,
    },
    recruitCost: new Decimal(10_000_000_000_000), // 10T
    icon: '🍁',
  },

  // 11. Stampede Rider (DPS, Alberta) - "Bull Rush"
  {
    id: 'stampede_rider',
    name: 'Stampede Rider',
    title: 'The Calgary Champion',
    class: 'dps',
    province: 'alberta',
    description:
      'An eight-second champion rodeo rider from the Calgary Stampede. He brings the same wild energy to cheese hunting.',
    specialAbility: {
      name: 'Bull Rush',
      description:
        'Charges at an enemy dealing 250% damage and stunning them for 2 seconds. Gains 25% crit chance for 5 seconds.',
    },
    baseStats: {
      hp: 105,
      attack: 30,
      defense: 14,
      speed: 16,
      cheeseAffinity: 14,
    },
    statGrowth: {
      hp: 10.5,
      attack: 3.2,
      defense: 1.2,
      speed: 1.3,
      cheeseAffinity: 0.9,
    },
    recruitCost: new Decimal(25_000_000_000_000), // 25T
    icon: '🤠',
  },

  // 12. Curling Captain (Support, Manitoba) - "Perfect Draw"
  {
    id: 'curling_captain',
    name: 'Curling Captain',
    title: 'The Skip Supreme',
    class: 'support',
    province: 'manitoba',
    description:
      'A precision curling skip from Winnipeg who calculates every angle. Her strategic mind turns the battle into a controlled slide to victory.',
    specialAbility: {
      name: 'Perfect Draw',
      description:
        'Increases party accuracy by 30% and critical hit damage by 40% for 6 seconds. Also cleanses one debuff.',
    },
    baseStats: {
      hp: 92,
      attack: 14,
      defense: 15,
      speed: 14,
      cheeseAffinity: 24,
    },
    statGrowth: {
      hp: 9.2,
      attack: 1.4,
      defense: 1.4,
      speed: 1.1,
      cheeseAffinity: 1.4,
    },
    recruitCost: new Decimal(50_000_000_000_000), // 50T
    icon: '🥌',
  },

  // 13. Prairie Shaman (Healer, Saskatchewan) - "Wheat Blessing"
  {
    id: 'prairie_shaman',
    name: 'Prairie Shaman',
    title: 'The Golden Healer',
    class: 'healer',
    province: 'saskatchewan',
    description:
      'A spiritual healer who communes with the endless wheat fields. The prairie winds carry her blessings to all who need them.',
    specialAbility: {
      name: 'Wheat Blessing',
      description:
        'Heals all allies for 25% max HP and cleanses all debuffs. Also provides a 10% healing over time for 8 seconds.',
    },
    baseStats: {
      hp: 88,
      attack: 12,
      defense: 14,
      speed: 12,
      cheeseAffinity: 28,
    },
    statGrowth: {
      hp: 8.8,
      attack: 1.0,
      defense: 1.3,
      speed: 1.0,
      cheeseAffinity: 1.6,
    },
    recruitCost: new Decimal(100_000_000_000_000), // 100T
    icon: '🌾',
  },

  // 14. Sourdough Miner (DPS, Yukon) - "Gold Strike"
  {
    id: 'sourdough_miner',
    name: 'Sourdough Miner',
    title: 'The Klondike King',
    class: 'dps',
    province: 'yukon',
    description:
      'A grizzled prospector who survived the Klondike Gold Rush. His pickaxe strikes true, and his sourdough starter is over 100 years old.',
    specialAbility: {
      name: 'Gold Strike',
      description:
        'Strikes a critical blow dealing 350% damage with guaranteed crit. Has a 25% chance to drop bonus curds.',
    },
    baseStats: {
      hp: 100,
      attack: 34,
      defense: 12,
      speed: 10,
      cheeseAffinity: 16,
    },
    statGrowth: {
      hp: 10,
      attack: 3.6,
      defense: 1.0,
      speed: 0.8,
      cheeseAffinity: 1.0,
    },
    recruitCost: new Decimal(250_000_000_000_000), // 250T
    icon: '⛏️',
  },

  // 15. Sasquatch Seeker (Tank, BC) - "Cryptid Shield"
  {
    id: 'sasquatch_seeker',
    name: 'Sasquatch Seeker',
    title: 'The Cryptid Guardian',
    class: 'tank',
    province: 'bc',
    description:
      'A cryptozoologist who found the Sasquatch and became its protector. The forest giant taught her the ways of the ancient shields.',
    specialAbility: {
      name: 'Cryptid Shield',
      description:
        'Creates a mystical barrier that absorbs up to 40% of the party\'s max HP in damage for 5 seconds.',
    },
    baseStats: {
      hp: 165,
      attack: 11,
      defense: 30,
      speed: 7,
      cheeseAffinity: 14,
    },
    statGrowth: {
      hp: 16.5,
      attack: 0.9,
      defense: 3.4,
      speed: 0.5,
      cheeseAffinity: 0.9,
    },
    recruitCost: new Decimal(500_000_000_000_000), // 500T
    icon: '🦶',
  },

  // 16. Bluenose Sailor (DPS, Nova Scotia) - "Schooner Slash"
  {
    id: 'bluenose_sailor',
    name: 'Bluenose Sailor',
    title: 'The Racing Legend',
    class: 'dps',
    province: 'nova_scotia',
    description:
      'A descendant of the Bluenose crew who sails the fastest schooner in the Atlantic. His cutlass is as swift as the wind.',
    specialAbility: {
      name: 'Schooner Slash',
      description:
        'Delivers 4 rapid slashes each dealing 80% damage. Has increased chance to hit for bonus damage.',
    },
    baseStats: {
      hp: 98,
      attack: 28,
      defense: 13,
      speed: 18,
      cheeseAffinity: 16,
    },
    statGrowth: {
      hp: 9.8,
      attack: 3.0,
      defense: 1.1,
      speed: 1.4,
      cheeseAffinity: 1.0,
    },
    recruitCost: new Decimal(1_000_000_000_000_000), // 1 Quadrillion
    icon: '⛵',
  },

  // ===== New Provincial Heroes (new provinces - 2 each) =====

  // 17. Covered Bridge Guardian (Tank, New Brunswick) - "Haunted Bulwark"
  {
    id: 'covered_bridge_guardian',
    name: 'Covered Bridge Guardian',
    title: 'The Phantom Protector',
    class: 'tank',
    province: 'new_brunswick',
    description:
      'A spectral guardian who haunts the covered bridges of New Brunswick. He protects travelers from worse things in the night.',
    specialAbility: {
      name: 'Haunted Bulwark',
      description:
        'Becomes ethereal, gaining 50% evasion and 30% damage reduction for 5 seconds. Taunts all enemies.',
    },
    baseStats: {
      hp: 155,
      attack: 12,
      defense: 26,
      speed: 8,
      cheeseAffinity: 15,
    },
    statGrowth: {
      hp: 15.5,
      attack: 1.0,
      defense: 3.0,
      speed: 0.6,
      cheeseAffinity: 0.9,
    },
    recruitCost: new Decimal(2_500_000_000_000_000), // 2.5Q
    icon: '🌉',
  },

  // 18. Fundy Fisher (DPS, New Brunswick) - "Tidal Strike"
  {
    id: 'fundy_fisher',
    name: 'Fundy Fisher',
    title: 'The Tidal Master',
    class: 'dps',
    province: 'new_brunswick',
    description:
      'A fisher who harnesses the power of the Bay of Fundy\'s legendary tides. Her attacks ebb and flow with devastating force.',
    specialAbility: {
      name: 'Tidal Strike',
      description:
        'Unleashes a wave of tidal energy dealing 200% damage that increases to 300% if the target is debuffed.',
    },
    baseStats: {
      hp: 94,
      attack: 29,
      defense: 12,
      speed: 14,
      cheeseAffinity: 17,
    },
    statGrowth: {
      hp: 9.4,
      attack: 3.1,
      defense: 1.0,
      speed: 1.2,
      cheeseAffinity: 1.1,
    },
    recruitCost: new Decimal(5_000_000_000_000_000), // 5Q
    icon: '🌊',
  },

  // 19. Anne Shirley Spirit (Support, PEI) - "Kindred Inspiration"
  {
    id: 'anne_shirley_spirit',
    name: 'Anne Shirley Spirit',
    title: 'The Imagination Incarnate',
    class: 'support',
    province: 'pei',
    description:
      'The spirit of imagination itself, inspired by Avonlea\'s most famous dreamer. Her optimism is contagious and empowering.',
    specialAbility: {
      name: 'Kindred Inspiration',
      description:
        'Inspires all allies, increasing attack by 25% and healing for 15% max HP. Also grants immunity to fear.',
    },
    baseStats: {
      hp: 86,
      attack: 14,
      defense: 13,
      speed: 15,
      cheeseAffinity: 26,
    },
    statGrowth: {
      hp: 8.6,
      attack: 1.3,
      defense: 1.2,
      speed: 1.2,
      cheeseAffinity: 1.5,
    },
    recruitCost: new Decimal(10_000_000_000_000_000), // 10Q
    icon: '📚',
  },

  // 20. Potato King (Tank, PEI) - "Spud Shield"
  {
    id: 'potato_king',
    name: 'Potato King',
    title: 'The Tuber Titan',
    class: 'tank',
    province: 'pei',
    description:
      'The legendary ruler of PEI\'s potato fields. His starchy constitution makes him nearly impossible to move.',
    specialAbility: {
      name: 'Spud Shield',
      description:
        'Transforms into a massive potato, gaining 70% damage reduction but unable to move for 4 seconds. Reflects 20% damage.',
    },
    baseStats: {
      hp: 170,
      attack: 8,
      defense: 32,
      speed: 5,
      cheeseAffinity: 12,
    },
    statGrowth: {
      hp: 17,
      attack: 0.7,
      defense: 3.5,
      speed: 0.3,
      cheeseAffinity: 0.8,
    },
    recruitCost: new Decimal(25_000_000_000_000_000), // 25Q
    icon: '🥔',
  },

  // 21. Screech Captain (DPS, Newfoundland) - "Screech Storm"
  {
    id: 'screech_captain',
    name: 'Screech Captain',
    title: 'The Rum Runner',
    class: 'dps',
    province: 'newfoundland',
    description:
      'A legendary sea captain who survived countless storms fueled by screech rum. His battle cry can shatter icebergs.',
    specialAbility: {
      name: 'Screech Storm',
      description:
        'Lets out a mighty screech dealing 180% AoE damage and reducing enemy defense by 25% for 5 seconds.',
    },
    baseStats: {
      hp: 102,
      attack: 31,
      defense: 11,
      speed: 13,
      cheeseAffinity: 15,
    },
    statGrowth: {
      hp: 10.2,
      attack: 3.3,
      defense: 0.9,
      speed: 1.1,
      cheeseAffinity: 1.0,
    },
    recruitCost: new Decimal(50_000_000_000_000_000), // 50Q
    icon: '🍾',
  },

  // 22. Viking Descendant (Tank, Newfoundland) - "Valhalla's Resolve"
  {
    id: 'viking_descendant',
    name: 'Viking Descendant',
    title: 'The L\'Anse aux Meadows Heir',
    class: 'tank',
    province: 'newfoundland',
    description:
      'A descendant of the first Europeans to reach North America. The blood of Leif Erikson runs through his veins.',
    specialAbility: {
      name: "Valhalla's Resolve",
      description:
        'Channels ancestral fury. If HP drops below 30%, heals for 40% and gains berserker rage (+50% attack) for 6 seconds.',
    },
    baseStats: {
      hp: 158,
      attack: 14,
      defense: 27,
      speed: 9,
      cheeseAffinity: 13,
    },
    statGrowth: {
      hp: 15.8,
      attack: 1.2,
      defense: 3.1,
      speed: 0.7,
      cheeseAffinity: 0.8,
    },
    recruitCost: new Decimal(100_000_000_000_000_000), // 100Q
    icon: '🪓',
  },

  // 23. Aurora Watcher (Healer, NWT) - "Northern Lights Blessing"
  {
    id: 'aurora_watcher',
    name: 'Aurora Watcher',
    title: 'The Light Keeper',
    class: 'healer',
    province: 'nwt',
    description:
      'A mystic who spent decades watching the Northern Lights until they revealed their healing secrets. Her touch glows with auroral energy.',
    specialAbility: {
      name: 'Northern Lights Blessing',
      description:
        'Channels the aurora to heal all allies for 35% max HP and grants a shield equal to 15% max HP for 6 seconds.',
    },
    baseStats: {
      hp: 84,
      attack: 11,
      defense: 15,
      speed: 13,
      cheeseAffinity: 30,
    },
    statGrowth: {
      hp: 8.4,
      attack: 0.9,
      defense: 1.4,
      speed: 1.1,
      cheeseAffinity: 1.7,
    },
    recruitCost: new Decimal(250_000_000_000_000_000), // 250Q
    icon: '🌌',
  },

  // 24. Diamond Miner (DPS, NWT) - "Pressure Point"
  {
    id: 'diamond_miner',
    name: 'Diamond Miner',
    title: 'The Ice Road Roughneck',
    class: 'dps',
    province: 'nwt',
    description:
      'A miner from the Ekati diamond mine who worked in temperatures that would freeze steel. His strikes are as hard as diamonds.',
    specialAbility: {
      name: 'Pressure Point',
      description:
        'Strikes with diamond-hard precision dealing 280% damage. Ignores 50% of enemy defense.',
    },
    baseStats: {
      hp: 106,
      attack: 33,
      defense: 13,
      speed: 11,
      cheeseAffinity: 14,
    },
    statGrowth: {
      hp: 10.6,
      attack: 3.5,
      defense: 1.1,
      speed: 0.9,
      cheeseAffinity: 0.9,
    },
    recruitCost: new Decimal(500_000_000_000_000_000), // 500Q
    icon: '💎',
  },

  // 25. Inuit Hunter (DPS, Nunavut) - "Arctic Precision"
  {
    id: 'inuit_hunter',
    name: 'Inuit Hunter',
    title: 'The Qamutik Master',
    class: 'dps',
    province: 'nunavut',
    description:
      'A master hunter who tracks prey across the frozen tundra using skills passed down for thousands of years. No target escapes.',
    specialAbility: {
      name: 'Arctic Precision',
      description:
        'Throws a harpoon dealing 320% damage to a single target. If the target survives, they bleed for 100% damage over 6 seconds.',
    },
    baseStats: {
      hp: 99,
      attack: 35,
      defense: 12,
      speed: 15,
      cheeseAffinity: 16,
    },
    statGrowth: {
      hp: 9.9,
      attack: 3.7,
      defense: 1.0,
      speed: 1.2,
      cheeseAffinity: 1.0,
    },
    recruitCost: new Decimal(1_000_000_000_000_000_000), // 1 Quintillion
    icon: '🏹',
  },

  // 26. Sedna's Chosen (Healer, Nunavut) - "Ocean Mother's Embrace"
  {
    id: 'sednas_chosen',
    name: "Sedna's Chosen",
    title: 'The Sea Goddess Priestess',
    class: 'healer',
    province: 'nunavut',
    description:
      'A chosen vessel of Sedna, the Inuit goddess of the sea. She channels the deep ocean\'s power to protect and heal.',
    specialAbility: {
      name: "Ocean Mother's Embrace",
      description:
        'Calls upon Sedna to heal all allies for 40% max HP and resurrect any fallen party member at 25% HP.',
    },
    baseStats: {
      hp: 90,
      attack: 10,
      defense: 16,
      speed: 11,
      cheeseAffinity: 32,
    },
    statGrowth: {
      hp: 9.0,
      attack: 0.8,
      defense: 1.5,
      speed: 0.9,
      cheeseAffinity: 1.8,
    },
    recruitCost: new Decimal(2_500_000_000_000_000_000), // 2.5 Quintillion
    icon: '🌊',
  },

  // ===== Legendary Heroes (Achievement-Gated) =====

  // 27. The Great One (DPS, Ontario) - "99 Goals"
  {
    id: 'the_great_one',
    name: 'The Great One',
    title: 'Number 99',
    class: 'dps',
    province: 'ontario',
    description:
      'A hockey legend whose name echoes through eternity. He holds every record worth holding and makes the impossible look routine.',
    specialAbility: {
      name: '99 Goals',
      description:
        'Channels legendary prowess to deal 400% damage to all enemies. Guaranteed to crit. Cannot be blocked or dodged.',
    },
    baseStats: {
      hp: 120,
      attack: 40,
      defense: 15,
      speed: 20,
      cheeseAffinity: 25,
    },
    statGrowth: {
      hp: 12,
      attack: 4.0,
      defense: 1.3,
      speed: 1.5,
      cheeseAffinity: 1.4,
    },
    recruitCost: new Decimal('99e9'), // 99 billion (thematic!)
    icon: '🏆',
  },

  // 28. Marathon Spirit (Support, Ontario) - "Marathon of Hope"
  {
    id: 'marathon_spirit',
    name: 'Marathon Spirit',
    title: 'The Endless Runner',
    class: 'support',
    province: 'ontario',
    description:
      'An inspirational spirit who ran across the nation to bring hope. His determination inspires others to push beyond their limits.',
    specialAbility: {
      name: 'Marathon of Hope',
      description:
        'Inspires the entire party with unbreakable determination. Increases all stats by 20% and prevents death for 5 seconds.',
    },
    baseStats: {
      hp: 95,
      attack: 15,
      defense: 18,
      speed: 22,
      cheeseAffinity: 30,
    },
    statGrowth: {
      hp: 9.5,
      attack: 1.4,
      defense: 1.6,
      speed: 1.8,
      cheeseAffinity: 1.6,
    },
    recruitCost: new Decimal(5_000_000_000_000_000_000), // 5 Quintillion
    icon: '🏃',
  },

  // 29. Vimy Guardian (Tank, Quebec) - "Ridge of Sacrifice"
  {
    id: 'vimy_guardian',
    name: 'Vimy Guardian',
    title: 'The Ridge Defender',
    class: 'tank',
    province: 'quebec',
    description:
      'A spirit forged from the sacrifice at Vimy Ridge where Canada truly became a nation. He stands guard eternally.',
    specialAbility: {
      name: 'Ridge of Sacrifice',
      description:
        'Channels the spirits of the fallen, becoming invulnerable for 4 seconds and reflecting 50% of damage taken.',
    },
    baseStats: {
      hp: 180,
      attack: 12,
      defense: 35,
      speed: 8,
      cheeseAffinity: 20,
    },
    statGrowth: {
      hp: 18,
      attack: 1.0,
      defense: 3.8,
      speed: 0.6,
      cheeseAffinity: 1.2,
    },
    recruitCost: new Decimal(10_000_000_000_000_000_000), // 10 Quintillion
    icon: '⚔️',
  },

  // 30. Confederation Founder (Support, Ontario) - "United Dominion"
  {
    id: 'confederation_founder',
    name: 'Confederation Founder',
    title: 'Father of the Nation',
    class: 'support',
    province: 'ontario',
    description:
      'The collective spirit of Confederation who brought the provinces together in 1867. His unifying presence strengthens all bonds.',
    specialAbility: {
      name: 'United Dominion',
      description:
        'Unites the party, causing all abilities to have 30% reduced cooldown and sharing 15% of healing between all members for 8 seconds.',
    },
    baseStats: {
      hp: 100,
      attack: 14,
      defense: 20,
      speed: 14,
      cheeseAffinity: 35,
    },
    statGrowth: {
      hp: 10,
      attack: 1.2,
      defense: 1.8,
      speed: 1.2,
      cheeseAffinity: 1.9,
    },
    recruitCost: new Decimal(25_000_000_000_000_000_000), // 25 Quintillion
    icon: '🇨🇦',
  },
];

/**
 * Get a hero definition by its ID
 */
export function getHeroById(id: string): HeroDefinition | undefined {
  return HEROES.find((h) => h.id === id);
}

/**
 * Get all hero definitions sorted by recruit cost (ascending)
 */
export function getHeroesByCost(): HeroDefinition[] {
  return [...HEROES].sort((a, b) => a.recruitCost.comparedTo(b.recruitCost));
}

/**
 * Hero-specific catchphrases for recruitment and level-up events
 * Each hero has unique Canadian-flavored dialogue
 */
export const HERO_CATCHPHRASES: Record<string, { recruit: string[]; levelUp: string[] }> = {
  maple_knight: {
    recruit: [
      "Sorry for the wait, eh! Ready to protect!",
      "My shield is maple-strong, bud!",
      "I'll guard your curds with my life, sorry if I'm too polite!",
    ],
    levelUp: [
      "Getting stronger, sorry if that sounds braggy!",
      "Another level! My shield grows mightier, eh!",
      "Sorry, can't help but get better!",
    ],
  },
  poutine_mage: {
    recruit: [
      "Bienvenue! Let's make some fromage magic, tabarnak!",
      "Mon ami, together we conquer with gravy power!",
      "La poutine power is yours now, eh!",
    ],
    levelUp: [
      "Sacré bleu! More gravy power!",
      "Ma magie grows stronger, mon ami!",
      "Another level! C'est magnifique!",
    ],
  },
  mountie_ranger: {
    recruit: [
      "I always get my cheese, and now I'll get yours too!",
      "Reporting for curd duty, partner!",
      "These prairies won't patrol themselves!",
    ],
    levelUp: [
      "The Red Serge grows stronger!",
      "Another notch on my maple leaf badge!",
      "My tracking skills sharpen further!",
    ],
  },
  hockey_enforcer: {
    recruit: [
      "Time to drop the gloves for cheese!",
      "Beauty! Let's wheel, snipe, and celly!",
      "Bar down, top cheese! Let's go, boys!",
    ],
    levelUp: [
      "Clappin' bombs, scorin' levels!",
      "Ferda! Another level up!",
      "Getting danglier every level!",
    ],
  },
  voyageur_bard: {
    recruit: [
      "♪ Alouette, gentille alouette... and cheese! ♪",
      "My paddle and my voice are at your service!",
      "Let the river songs of curd begin!",
    ],
    levelUp: [
      "My melodies grow more powerful!",
      "♪ Another verse to my saga! ♪",
      "The prairie wind carries my stronger song!",
    ],
  },
  toque_monk: {
    recruit: [
      "Inner peace... and outer cheese.",
      "The cold has prepared me for this moment.",
      "My toque is blessed. My curds are pure.",
    ],
    levelUp: [
      "Enlightenment grows, like aged cheddar.",
      "Another step on the path of cheese wisdom.",
      "The northern spirits approve.",
    ],
  },
  west_coast_druid: {
    recruit: [
      "The cedars have spoken. I am here.",
      "Nature's healing flows through me now!",
      "The rainforest blesses our cheese quest!",
    ],
    levelUp: [
      "The ancient trees grant more power!",
      "My connection to nature deepens!",
      "Cedar spirits empower me further!",
    ],
  },
  maritime_fisher: {
    recruit: [
      "Time to haul in the big cheese!",
      "My traps are set, my patience is ready!",
      "From the Atlantic shores to your party!",
    ],
    levelUp: [
      "Another good catch... of experience!",
      "The sea makes me stronger!",
      "Me nets grow tighter, me aim grows truer!",
    ],
  },

  // ===== Phase 7.4: New Hero Catchphrases =====

  toronto_techie: {
    recruit: [
      "Disrupting the cheese industry one algorithm at a time!",
      "My startup just pivoted to curd optimization!",
      "Let's scale this cheese operation to the cloud!",
    ],
    levelUp: [
      "Achievement unlocked!",
      "Another successful sprint complete!",
      "My code is compiling... stronger!",
    ],
  },

  habitant_farmer: {
    recruit: [
      "La terre ne ment jamais, mon ami!",
      "My family has made cheese here for generations!",
      "The soil of Quebec flows through my veins!",
    ],
    levelUp: [
      "Like the maple, I grow stronger each season!",
      "Another harvest of strength!",
      "The land provides, and I protect!",
    ],
  },

  stampede_rider: {
    recruit: [
      "Yahoo! Time to rodeo these cheese monsters!",
      "Eight seconds? I'll give you eight thousand!",
      "Calgary's finest, ready to ride!",
    ],
    levelUp: [
      "Yeehaw! Feeling stronger than a brahma bull!",
      "Another championship under my belt!",
      "Can't buck this bronco now!",
    ],
  },

  curling_captain: {
    recruit: [
      "Hurry hard! Time to sweep the competition!",
      "My broom and I are at your service!",
      "Let's slide our way to victory!",
    ],
    levelUp: [
      "Right on the button!",
      "That's a perfect end!",
      "My precision grows sharper, like ice!",
    ],
  },

  prairie_shaman: {
    recruit: [
      "The wheat whispers your name...",
      "I bring the blessing of endless fields!",
      "Nature's healing is yours to command!",
    ],
    levelUp: [
      "The prairie spirits grow stronger within me!",
      "Another seed of power planted!",
      "The golden waves answer my call!",
    ],
  },

  sourdough_miner: {
    recruit: [
      "There's gold in them thar curds!",
      "My pickaxe is ready, and my sourdough is rising!",
      "Klondike tough, that's me!",
    ],
    levelUp: [
      "Struck another vein of power!",
      "My claim just got richer!",
      "Been mining strength since '98!",
    ],
  },

  sasquatch_seeker: {
    recruit: [
      "The Sasquatch taught me the ways of protection!",
      "From the deepest forests, I emerge!",
      "Big foot, bigger shield!",
    ],
    levelUp: [
      "Growing as mighty as my cryptid friend!",
      "The forest spirits strengthen my resolve!",
      "Even the Sasquatch would be impressed!",
    ],
  },

  bluenose_sailor: {
    recruit: [
      "Fastest blade on the Atlantic!",
      "The Bluenose never lost a race, and neither will I!",
      "Wind in my sails and cheese in my heart!",
    ],
    levelUp: [
      "Cutting through levels like waves!",
      "Another knot of speed!",
      "Racing to the top!",
    ],
  },

  covered_bridge_guardian: {
    recruit: [
      "I guard the crossings between worlds...",
      "The bridges remember, and so do I.",
      "Pass safely under my protection.",
    ],
    levelUp: [
      "My ethereal form grows more powerful!",
      "The spirits of the bridges empower me!",
      "Between worlds, I grow stronger!",
    ],
  },

  fundy_fisher: {
    recruit: [
      "The tides of Fundy flow through me!",
      "Fifty feet of tide, fifty tons of power!",
      "The Bay answers my call!",
    ],
    levelUp: [
      "Rising like the highest tide!",
      "My power ebbs and flows... mostly flows!",
      "Tidal forces growing stronger!",
    ],
  },

  anne_shirley_spirit: {
    recruit: [
      "Oh, this is going to be a most splendid adventure!",
      "Kindred spirits, unite!",
      "Imagination is the greatest power of all!",
    ],
    levelUp: [
      "Another chapter in my adventure!",
      "Scope for imagination grows ever wider!",
      "Gilbert would be so impressed!",
    ],
  },

  potato_king: {
    recruit: [
      "Bow before the tuber throne!",
      "Starchy and proud!",
      "PEI's mightiest defender has arrived!",
    ],
    levelUp: [
      "Growing more robust like a russet!",
      "My roots dig deeper!",
      "Spud-tacular progress!",
    ],
  },

  screech_captain: {
    recruit: [
      "Is you a Screecher? You is now, b'y!",
      "Time to kiss the cod and join the fight!",
      "From the Rock to your party!",
    ],
    levelUp: [
      "Another round of screech-powered strength!",
      "Me powers are growin', sure!",
      "Screechin' loud and proud!",
    ],
  },

  viking_descendant: {
    recruit: [
      "The blood of Leif Erikson flows through me!",
      "Vinland shall rise again!",
      "My ancestors guide my axe!",
    ],
    levelUp: [
      "Valhalla prepares a place for me!",
      "Stronger than the North Atlantic storms!",
      "My saga grows more legendary!",
    ],
  },

  aurora_watcher: {
    recruit: [
      "The lights have shown me the way to you.",
      "I bring the colors of the northern sky!",
      "Healing flows like dancing lights!",
    ],
    levelUp: [
      "The aurora burns brighter within me!",
      "More colors, more power!",
      "The lights dance stronger!",
    ],
  },

  diamond_miner: {
    recruit: [
      "Forged in permafrost, hard as diamonds!",
      "The ice roads led me here!",
      "Pressure makes diamonds, and champions!",
    ],
    levelUp: [
      "Getting harder with every level!",
      "Another carat of power!",
      "Cutting through anything now!",
    ],
  },

  inuit_hunter: {
    recruit: [
      "The land provides for those who respect it.",
      "Patience and precision, that's my way.",
      "Thousands of years of wisdom guide my strike!",
    ],
    levelUp: [
      "The spirits of the hunt approve!",
      "Sharper than arctic wind!",
      "My ancestors smile upon this growth!",
    ],
  },

  sednas_chosen: {
    recruit: [
      "The sea mother has chosen you to receive her blessing!",
      "From the depths, healing rises!",
      "Sedna's power flows through me!",
    ],
    levelUp: [
      "The ocean's depths reveal more power!",
      "Sedna's blessing grows stronger!",
      "The sea creatures celebrate my growth!",
    ],
  },

  the_great_one: {
    recruit: [
      "You miss 100% of the cheese you don't take!",
      "The Great One has arrived!",
      "Time to set some new records!",
    ],
    levelUp: [
      "Another record broken!",
      "Greatness has no ceiling!",
      "99 problems, but leveling ain't one!",
    ],
  },

  marathon_spirit: {
    recruit: [
      "I believe in miracles.",
      "Running for hope, fighting for cheese!",
      "The marathon continues!",
    ],
    levelUp: [
      "One more mile of hope!",
      "Never giving up!",
      "Dreams don't have finish lines!",
    ],
  },

  vimy_guardian: {
    recruit: [
      "We shall not forget. We shall not fail.",
      "The ridge stands eternal, and so do I.",
      "For those who gave everything!",
    ],
    levelUp: [
      "Sacrifice breeds strength!",
      "The fallen empower me!",
      "Standing guard, forever stronger!",
    ],
  },

  confederation_founder: {
    recruit: [
      "A Mari Usque Ad Mare - From Sea to Sea!",
      "United we stand, divided we fall!",
      "1867 was just the beginning!",
    ],
    levelUp: [
      "The Dominion grows stronger!",
      "Unity is our greatest power!",
      "Building a stronger nation, one level at a time!",
    ],
  },
};

/**
 * Get a random recruitment catchphrase for a hero
 */
export function getHeroRecruitPhrase(heroId: string): string {
  const phrases = HERO_CATCHPHRASES[heroId]?.recruit;
  if (!phrases || phrases.length === 0) {
    return "Welcome to the team, eh!";
  }
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Get a random level-up catchphrase for a hero
 */
export function getHeroLevelUpPhrase(heroId: string, level: number): string {
  const phrases = HERO_CATCHPHRASES[heroId]?.levelUp;
  if (!phrases || phrases.length === 0) {
    return `Level ${level}! Beauty, eh!`;
  }
  return `Level ${level}! ${phrases[Math.floor(Math.random() * phrases.length)]}`;
}

// ===== Hero Abilities =====

/**
 * Special abilities for each hero
 * Each hero has a unique ability matching their character design
 */
export const HERO_ABILITIES: Record<string, HeroAbilityDefinition> = {
  // Maple Knight - "Sorry Shield": Absorb damage, taunt enemies
  maple_knight: {
    id: 'sorry_shield',
    name: 'Sorry Shield',
    description: 'Absorbs damage for the party while apologizing. Reduces incoming damage by 50% and taunts enemies for 5 seconds.',
    cooldown: 8,
    targetType: 'self',
    effects: [
      { type: 'buff', stat: 'damage_reduction', value: 50, duration: 5 },
      { type: 'taunt', duration: 5 },
    ],
  },

  // Poutine Mage - "Gravy Blast": AoE damage + slow effect
  poutine_mage: {
    id: 'gravy_blast',
    name: 'Gravy Blast',
    description: 'Launches a torrent of hot gravy dealing AoE damage and slowing all enemies by 30% for 4 seconds.',
    cooldown: 6,
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 1.5 },
      { type: 'debuff', stat: 'speed', value: -30, duration: 4 },
    ],
  },

  // Mountie Ranger - "Always Get My Cheese": Increase drop rates + crit
  mountie_ranger: {
    id: 'always_get_my_cheese',
    name: 'Always Get My Cheese',
    description: 'Marks enemies, increasing drop rates by 25% and critical hit chance by 15% for 6 seconds.',
    cooldown: 10,
    targetType: 'all_enemies',
    effects: [
      { type: 'drop_rate_bonus', value: 25, duration: 6 },
      { type: 'buff', stat: 'attack', value: 15, duration: 6 }, // Represented as attack bonus for crit
    ],
  },

  // Hockey Enforcer - "Slapshot": High single-target damage with stun
  hockey_enforcer: {
    id: 'slapshot',
    name: 'Slapshot',
    description: 'Winds up and delivers a devastating single-target attack dealing 300% weapon damage with a chance to stun.',
    cooldown: 5,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 3.0 },
      { type: 'debuff', stat: 'speed', value: -100, duration: 2 }, // Stun effect (speed to 0)
    ],
  },

  // Voyageur Bard - "Paddle Song": Party attack/speed buff
  voyageur_bard: {
    id: 'paddle_song',
    name: 'Paddle Song',
    description: 'Sings an inspiring paddling rhythm that increases party attack by 20% and speed by 20% for 8 seconds.',
    cooldown: 12,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'attack', value: 20, duration: 8 },
      { type: 'buff', stat: 'speed', value: 20, duration: 8 },
    ],
  },

  // Toque Monk - "Cold Resistance": Party freeze immunity + defense
  toque_monk: {
    id: 'cold_resistance',
    name: 'Cold Resistance',
    description: 'Enters a meditative state, becoming immune to freeze and slow effects while gaining 40% damage reduction for 5 seconds.',
    cooldown: 10,
    targetType: 'all_allies',
    effects: [
      { type: 'immunity', immunityType: 'freeze', duration: 5 },
      { type: 'immunity', immunityType: 'slow', duration: 5 },
      { type: 'buff', stat: 'defense', value: 40, duration: 5 },
    ],
  },

  // West Coast Druid - "Cedar Healing": Party HP regeneration
  west_coast_druid: {
    id: 'cedar_healing',
    name: 'Cedar Healing',
    description: 'Summons the spirit of the great cedars to heal all party members for 30% of their max HP over 6 seconds.',
    cooldown: 14,
    targetType: 'all_allies',
    effects: [
      { type: 'heal', amount: 30, isPercentage: true },
    ],
  },

  // Maritime Fisher - "Lobster Trap": DoT effect on target
  maritime_fisher: {
    id: 'lobster_trap',
    name: 'Lobster Trap',
    description: 'Sets a trap that snares an enemy, dealing damage over time (150% weapon damage over 8 seconds) and preventing movement.',
    cooldown: 8,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 0.5 }, // Initial hit
      { type: 'debuff', stat: 'damage_over_time', value: 12, duration: 8 }, // DoT over 8 seconds
      { type: 'debuff', stat: 'speed', value: -50, duration: 8 }, // Movement reduction
    ],
  },

  // ===== Phase 7.4: New Hero Abilities =====

  // Toronto Techie - "Cloud Computing": Buff extension + speed
  toronto_techie: {
    id: 'cloud_computing',
    name: 'Cloud Computing',
    description: 'Extends all active buff durations by 50% and increases party speed by 15% for 8 seconds.',
    cooldown: 12,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'speed', value: 15, duration: 8 },
    ],
  },

  // Habitant Farmer - "Maple Fortress": Defense + regen
  habitant_farmer: {
    id: 'maple_fortress',
    name: 'Maple Fortress',
    description: 'Roots himself in place, gaining 60% damage reduction and regenerating 3% HP per second for 6 seconds.',
    cooldown: 10,
    targetType: 'self',
    effects: [
      { type: 'buff', stat: 'damage_reduction', value: 60, duration: 6 },
      { type: 'buff', stat: 'defense', value: 30, duration: 6 },
    ],
  },

  // Stampede Rider - "Bull Rush": Charge attack
  stampede_rider: {
    id: 'bull_rush',
    name: 'Bull Rush',
    description: 'Charges at an enemy dealing 250% damage and stunning them for 2 seconds. Gains 25% crit chance for 5 seconds.',
    cooldown: 6,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 2.5 },
      { type: 'debuff', stat: 'speed', value: -100, duration: 2 }, // Stun
      { type: 'buff', stat: 'attack', value: 25, duration: 5 },
    ],
  },

  // Curling Captain - "Perfect Draw": Precision buffs
  curling_captain: {
    id: 'perfect_draw',
    name: 'Perfect Draw',
    description: 'Increases party accuracy by 30% and critical hit damage by 40% for 6 seconds. Also cleanses one debuff.',
    cooldown: 10,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'attack', value: 30, duration: 6 },
      { type: 'cleanse' },
    ],
  },

  // Prairie Shaman - "Wheat Blessing": HoT + cleanse
  prairie_shaman: {
    id: 'wheat_blessing',
    name: 'Wheat Blessing',
    description: 'Heals all allies for 25% max HP and cleanses all debuffs. Also provides a 10% healing over time for 8 seconds.',
    cooldown: 14,
    targetType: 'all_allies',
    effects: [
      { type: 'heal', amount: 25, isPercentage: true },
      { type: 'cleanse' },
    ],
  },

  // Sourdough Miner - "Gold Strike": Crit damage
  sourdough_miner: {
    id: 'gold_strike',
    name: 'Gold Strike',
    description: 'Strikes a critical blow dealing 350% damage with guaranteed crit. Has a 25% chance to drop bonus curds.',
    cooldown: 7,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 3.5 },
      { type: 'drop_rate_bonus', value: 25, duration: 1 },
    ],
  },

  // Sasquatch Seeker - "Cryptid Shield": Damage absorption
  sasquatch_seeker: {
    id: 'cryptid_shield',
    name: 'Cryptid Shield',
    description: "Creates a mystical barrier that absorbs up to 40% of the party's max HP in damage for 5 seconds.",
    cooldown: 12,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'defense', value: 40, duration: 5 },
    ],
  },

  // Bluenose Sailor - "Schooner Slash": Multi-hit
  bluenose_sailor: {
    id: 'schooner_slash',
    name: 'Schooner Slash',
    description: 'Delivers 4 rapid slashes each dealing 80% damage. Has increased chance to hit for bonus damage.',
    cooldown: 6,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 0.8 },
      { type: 'damage', multiplier: 0.8 },
      { type: 'damage', multiplier: 0.8 },
      { type: 'damage', multiplier: 0.8 },
    ],
  },

  // Covered Bridge Guardian - "Haunted Bulwark": Evasion + taunt
  covered_bridge_guardian: {
    id: 'haunted_bulwark',
    name: 'Haunted Bulwark',
    description: 'Becomes ethereal, gaining 50% evasion and 30% damage reduction for 5 seconds. Taunts all enemies.',
    cooldown: 10,
    targetType: 'self',
    effects: [
      { type: 'buff', stat: 'speed', value: 50, duration: 5 },
      { type: 'buff', stat: 'damage_reduction', value: 30, duration: 5 },
      { type: 'taunt', duration: 5 },
    ],
  },

  // Fundy Fisher - "Tidal Strike": Conditional damage
  fundy_fisher: {
    id: 'tidal_strike',
    name: 'Tidal Strike',
    description: 'Unleashes a wave of tidal energy dealing 200% damage that increases to 300% if the target is debuffed.',
    cooldown: 7,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 2.5 }, // Average between 2.0 and 3.0
    ],
  },

  // Anne Shirley Spirit - "Kindred Inspiration": Attack buff + heal
  anne_shirley_spirit: {
    id: 'kindred_inspiration',
    name: 'Kindred Inspiration',
    description: 'Inspires all allies, increasing attack by 25% and healing for 15% max HP. Also grants immunity to fear.',
    cooldown: 11,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'attack', value: 25, duration: 8 },
      { type: 'heal', amount: 15, isPercentage: true },
      { type: 'immunity', immunityType: 'all_debuffs', duration: 4 },
    ],
  },

  // Potato King - "Spud Shield": Massive defense + reflect
  potato_king: {
    id: 'spud_shield',
    name: 'Spud Shield',
    description: 'Transforms into a massive potato, gaining 70% damage reduction but unable to move for 4 seconds. Reflects 20% damage.',
    cooldown: 12,
    targetType: 'self',
    effects: [
      { type: 'buff', stat: 'damage_reduction', value: 70, duration: 4 },
      { type: 'debuff', stat: 'speed', value: -100, duration: 4 }, // Self-root
    ],
  },

  // Screech Captain - "Screech Storm": AoE damage + defense debuff
  screech_captain: {
    id: 'screech_storm',
    name: 'Screech Storm',
    description: 'Lets out a mighty screech dealing 180% AoE damage and reducing enemy defense by 25% for 5 seconds.',
    cooldown: 8,
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 1.8 },
      { type: 'debuff', stat: 'defense', value: -25, duration: 5 },
    ],
  },

  // Viking Descendant - "Valhalla's Resolve": Last stand mechanic
  viking_descendant: {
    id: 'valhallas_resolve',
    name: "Valhalla's Resolve",
    description: 'Channels ancestral fury. If HP drops below 30%, heals for 40% and gains berserker rage (+50% attack) for 6 seconds.',
    cooldown: 15,
    targetType: 'self',
    effects: [
      { type: 'heal', amount: 40, isPercentage: true },
      { type: 'buff', stat: 'attack', value: 50, duration: 6 },
    ],
  },

  // Aurora Watcher - "Northern Lights Blessing": Heal + shield
  aurora_watcher: {
    id: 'northern_lights_blessing',
    name: 'Northern Lights Blessing',
    description: 'Channels the aurora to heal all allies for 35% max HP and grants a shield equal to 15% max HP for 6 seconds.',
    cooldown: 14,
    targetType: 'all_allies',
    effects: [
      { type: 'heal', amount: 35, isPercentage: true },
      { type: 'buff', stat: 'defense', value: 15, duration: 6 },
    ],
  },

  // Diamond Miner - "Pressure Point": Armor penetration
  diamond_miner: {
    id: 'pressure_point',
    name: 'Pressure Point',
    description: 'Strikes with diamond-hard precision dealing 280% damage. Ignores 50% of enemy defense.',
    cooldown: 6,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 2.8 },
      { type: 'debuff', stat: 'defense', value: -50, duration: 3 },
    ],
  },

  // Inuit Hunter - "Arctic Precision": Bleed DoT
  inuit_hunter: {
    id: 'arctic_precision',
    name: 'Arctic Precision',
    description: 'Throws a harpoon dealing 320% damage to a single target. If the target survives, they bleed for 100% damage over 6 seconds.',
    cooldown: 8,
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 3.2 },
      { type: 'debuff', stat: 'damage_over_time', value: 16, duration: 6 },
    ],
  },

  // Sedna's Chosen - "Ocean Mother's Embrace": Massive heal + resurrect
  sednas_chosen: {
    id: 'ocean_mothers_embrace',
    name: "Ocean Mother's Embrace",
    description: "Calls upon Sedna to heal all allies for 40% max HP and resurrect any fallen party member at 25% HP.",
    cooldown: 18,
    targetType: 'all_allies',
    effects: [
      { type: 'heal', amount: 40, isPercentage: true },
    ],
  },

  // The Great One - "99 Goals": Ultimate DPS
  the_great_one: {
    id: '99_goals',
    name: '99 Goals',
    description: 'Channels legendary prowess to deal 400% damage to all enemies. Guaranteed to crit. Cannot be blocked or dodged.',
    cooldown: 10,
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 4.0 },
    ],
  },

  // Marathon Spirit - "Marathon of Hope": Party-wide buff + death prevention
  marathon_spirit: {
    id: 'marathon_of_hope',
    name: 'Marathon of Hope',
    description: 'Inspires the entire party with unbreakable determination. Increases all stats by 20% and prevents death for 5 seconds.',
    cooldown: 16,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'attack', value: 20, duration: 5 },
      { type: 'buff', stat: 'defense', value: 20, duration: 5 },
      { type: 'buff', stat: 'speed', value: 20, duration: 5 },
      { type: 'immunity', immunityType: 'all_debuffs', duration: 5 },
    ],
  },

  // Vimy Guardian - "Ridge of Sacrifice": Invulnerability + reflect
  vimy_guardian: {
    id: 'ridge_of_sacrifice',
    name: 'Ridge of Sacrifice',
    description: 'Channels the spirits of the fallen, becoming invulnerable for 4 seconds and reflecting 50% of damage taken.',
    cooldown: 14,
    targetType: 'self',
    effects: [
      { type: 'buff', stat: 'damage_reduction', value: 100, duration: 4 },
      { type: 'taunt', duration: 4 },
    ],
  },

  // Confederation Founder - "United Dominion": Cooldown reduction + healing share
  confederation_founder: {
    id: 'united_dominion',
    name: 'United Dominion',
    description: 'Unites the party, causing all abilities to have 30% reduced cooldown and sharing 15% of healing between all members for 8 seconds.',
    cooldown: 15,
    targetType: 'all_allies',
    effects: [
      { type: 'buff', stat: 'speed', value: 30, duration: 8 },
      { type: 'buff', stat: 'cheeseAffinity', value: 30, duration: 8 },
    ],
  },
};

/**
 * Get ability definition for a hero
 */
export function getHeroAbility(heroId: string): HeroAbilityDefinition | undefined {
  return HERO_ABILITIES[heroId];
}

// ===== Limit Breaks =====

/**
 * Limit break abilities - powerful finishers that require a full limit gauge
 * Only certain heroes have limit breaks (tanks and DPS primarily)
 */
export const LIMIT_BREAKS: LimitBreakDefinition[] = [
  // Maple Knight - "Coast to Coast Charge": Invincible rush, hits all enemies
  {
    id: 'coast_to_coast_charge',
    name: 'Coast to Coast Charge',
    description: 'An invincible rush from coast to coast! Becomes immune to damage briefly and hits all enemies for massive damage.',
    heroId: 'maple_knight',
    targetType: 'all_enemies',
    effects: [
      { type: 'immunity', immunityType: 'all_debuffs', duration: 3 },
      { type: 'damage', multiplier: 4.0 },
    ],
    animation: 'charge',
  },

  // Poutine Mage - "Festival of Flavor": Massive AoE + party full heal
  {
    id: 'festival_of_flavor',
    name: 'Festival of Flavor',
    description: 'Unleashes the full power of Quebec cuisine! Deals massive AoE damage to all enemies and fully heals the entire party.',
    heroId: 'poutine_mage',
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 5.0 },
      { type: 'heal', amount: 100, isPercentage: true }, // Full heal applied to party separately
    ],
    animation: 'explosion',
  },

  // Hockey Enforcer - "Gordie Howe Hat Trick": 3 consecutive max-damage attacks
  {
    id: 'gordie_howe_hat_trick',
    name: 'Gordie Howe Hat Trick',
    description: 'A goal, an assist, and a fight! Delivers 3 consecutive devastating attacks to a single target for massive damage.',
    heroId: 'hockey_enforcer',
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 2.5 },
      { type: 'damage', multiplier: 2.5 },
      { type: 'damage', multiplier: 2.5 },
    ],
    animation: 'triple_hit',
  },

  // ===== Phase 7.4: New Hero Limit Breaks =====

  // Stampede Rider - "Calgary Stampede": Rampage through all enemies
  {
    id: 'calgary_stampede',
    name: 'Calgary Stampede',
    description: 'Summons a thundering herd of wild horses that trample all enemies for devastating damage!',
    heroId: 'stampede_rider',
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 4.5 },
      { type: 'debuff', stat: 'speed', value: -50, duration: 4 },
    ],
    animation: 'stampede',
  },

  // Sourdough Miner - "Mother Lode": Massive single target + bonus rewards
  {
    id: 'mother_lode',
    name: 'Mother Lode',
    description: 'Strikes the legendary mother lode, dealing massive damage and guaranteeing rare drops!',
    heroId: 'sourdough_miner',
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 6.0 },
      { type: 'drop_rate_bonus', value: 100, duration: 1 },
    ],
    animation: 'gold_explosion',
  },

  // Bluenose Sailor - "Atlantic Hurricane": Devastating naval assault
  {
    id: 'atlantic_hurricane',
    name: 'Atlantic Hurricane',
    description: 'Calls upon the fury of the Atlantic, unleashing a hurricane of slashes and waves!',
    heroId: 'bluenose_sailor',
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 1.5 },
      { type: 'damage', multiplier: 1.5 },
      { type: 'damage', multiplier: 1.5 },
      { type: 'damage', multiplier: 1.5 },
    ],
    animation: 'hurricane',
  },

  // Fundy Fisher - "Tidal Wave": Massive AoE water damage
  {
    id: 'tidal_wave',
    name: 'Tidal Wave',
    description: 'Summons the full force of the Bay of Fundy tides, crashing down on all enemies!',
    heroId: 'fundy_fisher',
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 5.0 },
      { type: 'debuff', stat: 'speed', value: -75, duration: 5 },
    ],
    animation: 'tidal_wave',
  },

  // Screech Captain - "Kiss the Cod": Traditional initiation power
  {
    id: 'kiss_the_cod',
    name: 'Kiss the Cod',
    description: 'Performs the sacred Screecher initiation, dealing massive damage and gaining powerful buffs!',
    heroId: 'screech_captain',
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 4.0 },
      { type: 'buff', stat: 'attack', value: 50, duration: 6 },
    ],
    animation: 'cod_ritual',
  },

  // Viking Descendant - "Berserker Rage": Full berserker transformation
  {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    description: 'Channels the fury of Viking ancestors, becoming an unstoppable berserker!',
    heroId: 'viking_descendant',
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 5.5 },
      { type: 'buff', stat: 'attack', value: 75, duration: 8 },
      { type: 'heal', amount: 50, isPercentage: true },
    ],
    animation: 'berserker',
  },

  // Diamond Miner - "Diamond Cutter": Armor-shredding ultimate
  {
    id: 'diamond_cutter',
    name: 'Diamond Cutter',
    description: 'Strikes with the force of continental pressure, cutting through all defenses!',
    heroId: 'diamond_miner',
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 6.5 },
      { type: 'debuff', stat: 'defense', value: -100, duration: 4 },
    ],
    animation: 'diamond_strike',
  },

  // Inuit Hunter - "Spirit of the Hunt": Legendary hunting prowess
  {
    id: 'spirit_of_the_hunt',
    name: 'Spirit of the Hunt',
    description: 'Channels generations of hunting wisdom, becoming one with the arctic predators!',
    heroId: 'inuit_hunter',
    targetType: 'single_enemy',
    effects: [
      { type: 'damage', multiplier: 7.0 },
      { type: 'debuff', stat: 'damage_over_time', value: 30, duration: 8 },
    ],
    animation: 'spirit_hunt',
  },

  // The Great One - "The Goal": The legendary play
  {
    id: 'the_goal',
    name: 'The Goal',
    description: 'Recreates the most legendary goal ever scored, dealing reality-breaking damage!',
    heroId: 'the_great_one',
    targetType: 'all_enemies',
    effects: [
      { type: 'damage', multiplier: 9.9 }, // 99 reference!
      { type: 'buff', stat: 'attack', value: 99, duration: 9 },
    ],
    animation: 'legendary_goal',
  },

  // Vimy Guardian - "Never Forgotten": Ultimate sacrifice and protection
  {
    id: 'never_forgotten',
    name: 'Never Forgotten',
    description: 'The spirits of Vimy rise to protect the party, becoming completely invulnerable!',
    heroId: 'vimy_guardian',
    targetType: 'all_allies',
    effects: [
      { type: 'immunity', immunityType: 'all_debuffs', duration: 6 },
      { type: 'heal', amount: 100, isPercentage: true },
      { type: 'buff', stat: 'defense', value: 100, duration: 6 },
    ],
    animation: 'vimy_spirits',
  },
];

/**
 * Get limit break definition for a hero
 */
export function getHeroLimitBreak(heroId: string): LimitBreakDefinition | undefined {
  return LIMIT_BREAKS.find((lb) => lb.heroId === heroId);
}

/**
 * Check if a hero has a limit break
 */
export function heroHasLimitBreak(heroId: string): boolean {
  return LIMIT_BREAKS.some((lb) => lb.heroId === heroId);
}
