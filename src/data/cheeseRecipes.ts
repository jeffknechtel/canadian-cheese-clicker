import Decimal from 'decimal.js';
import type { CheeseRecipe, CheeseCategory } from '../types/game';

/**
 * Cheese Recipes Data for The Great Canadian Cheese Quest
 *
 * Recipes are organized by category:
 * - Fresh (5): Instant craft, no aging
 * - Soft (5): 2-8 minutes aging
 * - Semi-Hard (6): 15-30 minutes aging
 * - Hard (5): 1-4 hours aging
 * - Legendary (4): 8-24 hours aging
 *
 * Aging duration guidelines (real-time):
 * - Fresh: 0ms (instant)
 * - Soft: 2-8 minutes (120,000 - 480,000ms)
 * - Semi-Hard: 15-30 minutes (900,000 - 1,800,000ms)
 * - Hard: 1-4 hours (3,600,000 - 14,400,000ms)
 * - Legendary: 8-24 hours (28,800,000 - 86,400,000ms)
 *
 * Canadian flavor text throughout, eh!
 */

// Helper for millisecond conversions
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// ===== FRESH CHEESES (No aging) =====

export const FRESH_CHEESES: CheeseRecipe[] = [
  {
    id: 'fromage_frais',
    name: 'Fromage Frais',
    description: 'Light and tangy fresh cheese. A staple in French-Canadian kitchens.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow', 'goat'],
      cultureType: ['basic', 'regional'],
    },
    agingDuration: 0,
    baseQuality: 32,
    baseValue: new Decimal(600),
    icon: '🥄',
    unlockRequirement: { type: 'none' },
    effects: [
      { type: 'hero_buff', stat: 'speed', value: 5, duration: 90000 },
    ],
  },
  {
    id: 'mascarpone',
    name: 'Mascarpone',
    description: 'Italian cream cheese. Rich, smooth, and decadent for tiramisù.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow', 'buffalo'],
      cultureType: ['basic'],
    },
    agingDuration: 0,
    baseQuality: 42,
    baseValue: new Decimal(1200),
    icon: '🍰',
    unlockRequirement: { type: 'prestige_rennet', amount: 10 },
    effects: [
      { type: 'production_boost', multiplier: 1.08, duration: 90000 },
    ],
  },
  {
    id: 'burrata',
    name: 'Burrata',
    description: 'Mozzarella\'s luxurious cousin. Creamy center that oozes pure bliss.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow', 'buffalo'],
      cultureType: ['regional', 'artisan'],
    },
    agingDuration: 0,
    baseQuality: 50,
    baseValue: new Decimal(2000),
    icon: '🥚',
    unlockRequirement: { type: 'prestige_rennet', amount: 25 },
    effects: [
      { type: 'click_boost', multiplier: 1.12, duration: 120000 },
    ],
  },
  {
    id: 'cottage_cheese',
    name: 'Cottage Cheese',
    description: 'Creamy curds in whey. A breakfast staple across Canada.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow', 'goat'],
      cultureType: ['basic'],
    },
    agingDuration: 0,
    baseQuality: 30,
    baseValue: new Decimal(500),
    icon: '🥣',
    unlockRequirement: { type: 'none' },
    effects: [
      { type: 'production_boost', multiplier: 1.05, duration: 60000 },
    ],
  },
  {
    id: 'ricotta',
    name: 'Ricotta',
    description: 'Light and fluffy whey cheese. Great in lasagna, better in your heroes.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow', 'sheep', 'buffalo'],
      cultureType: ['basic', 'regional'],
    },
    agingDuration: 0,
    baseQuality: 35,
    baseValue: new Decimal(750),
    icon: '🧁',
    unlockRequirement: { type: 'none' },
    effects: [
      { type: 'hero_buff', stat: 'hp', value: 10, duration: 120000 },
    ],
  },
  {
    id: 'cream_cheese',
    name: 'Cream Cheese',
    description: 'Smooth and spreadable. The bagel\'s best friend.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic'],
    },
    agingDuration: 0,
    baseQuality: 40,
    baseValue: new Decimal(1000),
    icon: '🍶',
    unlockRequirement: { type: 'none' },
    effects: [
      { type: 'click_boost', multiplier: 1.1, duration: 60000 },
    ],
  },
  {
    id: 'quark',
    name: 'Quark',
    description: 'German-style fresh cheese. Popular with the prairie settlers.',
    category: 'fresh',
    requiredIngredients: {
      milkType: ['cow', 'goat'],
      cultureType: ['basic', 'regional'],
    },
    agingDuration: 0,
    baseQuality: 35,
    baseValue: new Decimal(800),
    icon: '🥛',
    unlockRequirement: { type: 'prestige_rennet', amount: 5 },
    effects: [
      { type: 'xp_boost', multiplier: 1.1, duration: 120000 },
    ],
  },
  {
    id: 'fresh_curds',
    name: 'Poutine Curds',
    description: 'Squeaky fresh! Perfect on fries with gravy. A true Canadian treasure.',
    category: 'fresh',
    province: 'quebec',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic'],
    },
    agingDuration: 0,
    baseQuality: 45,
    baseValue: new Decimal(1500),
    icon: '🍟',
    unlockRequirement: { type: 'none' },
    effects: [
      { type: 'production_boost', multiplier: 1.1, duration: 90000 },
    ],
  },
];

// ===== SOFT CHEESES (2-8 minutes aging) =====

export const SOFT_CHEESES: CheeseRecipe[] = [
  {
    id: 'reblochon',
    name: 'Reblochon',
    description: 'French Alpine treasure. Washed rind with nutty, earthy notes.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal'],
    },
    agingDuration: 5 * MINUTE,
    baseQuality: 55,
    baseValue: new Decimal(7000),
    icon: '🏔️',
    unlockRequirement: { type: 'prestige_rennet', amount: 40 },
    effects: [
      { type: 'hero_buff', stat: 'defense', value: 18, duration: 180000 },
    ],
  },
  {
    id: 'taleggio',
    name: 'Taleggio',
    description: 'Italian washed rind. Pungent aroma, fruity taste.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 6 * MINUTE,
    baseQuality: 58,
    baseValue: new Decimal(7500),
    icon: '🧱',
    unlockRequirement: { type: 'prestige_rennet', amount: 45 },
    effects: [
      { type: 'production_boost', multiplier: 1.12, duration: 180000 },
    ],
  },
  {
    id: 'epoisses',
    name: 'Époisses',
    description: 'The legendary stinky cheese. Marc de Bourgogne washed, intensely flavorful.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 8 * MINUTE,
    baseQuality: 65,
    baseValue: new Decimal(10000),
    icon: '💨',
    unlockRequirement: { type: 'prestige_rennet', amount: 60 },
    effects: [
      { type: 'hero_buff', stat: 'attack', value: 20, duration: 240000 },
    ],
  },
  {
    id: 'le_riopelle',
    name: 'Le Riopelle de l\'Isle',
    description: 'Quebec\'s pride. Triple cream brie with bloomy rind from Île-aux-Grues.',
    category: 'soft',
    province: 'quebec',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan'],
      specialtyItems: ['specialty_white_mold'],
    },
    agingDuration: 7 * MINUTE,
    baseQuality: 62,
    baseValue: new Decimal(9000),
    icon: '🏝️',
    unlockRequirement: { type: 'province_complete', provinceId: 'quebec' },
    effects: [
      { type: 'click_boost', multiplier: 1.18, duration: 200000 },
    ],
  },
  {
    id: 'peau_rouge',
    name: 'Peau Rouge',
    description: 'New Brunswick\'s washed rind wonder. Earthy and complex.',
    category: 'soft',
    province: 'new_brunswick',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 6 * MINUTE,
    baseQuality: 56,
    baseValue: new Decimal(7200),
    icon: '🔴',
    unlockRequirement: { type: 'province_complete', provinceId: 'new_brunswick' },
    effects: [
      { type: 'xp_boost', multiplier: 1.15, duration: 180000 },
    ],
  },
  {
    id: 'saltspring_island',
    name: 'Salt Spring Island Cheese',
    description: 'BC\'s artisan goat cheese. Fresh and tangy from the Gulf Islands.',
    category: 'soft',
    province: 'bc',
    requiredIngredients: {
      milkType: ['goat'],
      cultureType: ['artisan'],
    },
    agingDuration: 4 * MINUTE,
    baseQuality: 52,
    baseValue: new Decimal(6500),
    icon: '🏝️',
    unlockRequirement: { type: 'province_complete', provinceId: 'bc' },
    effects: [
      { type: 'hero_buff', stat: 'speed', value: 12, duration: 180000 },
    ],
  },
  {
    id: 'brie',
    name: 'Brie',
    description: 'Bloomy rind beauty. Creamy center that oozes with deliciousness.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic', 'regional'],
      specialtyItems: ['specialty_white_mold'],
    },
    agingDuration: 3 * MINUTE,
    baseQuality: 50,
    baseValue: new Decimal(5000),
    icon: '🧀',
    unlockRequirement: { type: 'prestige_rennet', amount: 20 },
    effects: [
      { type: 'hero_buff', stat: 'defense', value: 15, duration: 180000 },
    ],
  },
  {
    id: 'camembert',
    name: 'Camembert',
    description: 'Brie\'s earthy cousin. Stronger personality, deeper flavor.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      specialtyItems: ['specialty_white_mold'],
    },
    agingDuration: 4 * MINUTE,
    baseQuality: 55,
    baseValue: new Decimal(6500),
    icon: '🌕',
    unlockRequirement: { type: 'prestige_rennet', amount: 35 },
    effects: [
      { type: 'hero_buff', stat: 'attack', value: 12, duration: 180000 },
    ],
  },
  {
    id: 'oka',
    name: 'Oka',
    description: 'The original Canadian artisan cheese. Monks make it, eh! Washed rind wonder.',
    category: 'soft',
    province: 'quebec',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 5 * MINUTE,
    baseQuality: 60,
    baseValue: new Decimal(8000),
    icon: '🏛️',
    unlockRequirement: { type: 'province_complete', provinceId: 'quebec' },
    effects: [
      { type: 'production_boost', multiplier: 1.15, duration: 180000 },
    ],
  },
  {
    id: 'feta',
    name: 'Feta',
    description: 'Brined and crumbly. Greek tradition meets Canadian craft.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['sheep', 'goat'],
      cultureType: ['basic', 'regional'],
      rennetType: ['animal', 'vegetable'],
    },
    agingDuration: 6 * MINUTE,
    baseQuality: 50,
    baseValue: new Decimal(5500),
    icon: '🥗',
    unlockRequirement: { type: 'prestige_rennet', amount: 30 },
    effects: [
      { type: 'click_boost', multiplier: 1.15, duration: 120000 },
    ],
  },
  {
    id: 'chevre',
    name: 'Chevre',
    description: 'Pure goat cheese. Tangy, creamy, and distinctly caprine.',
    category: 'soft',
    requiredIngredients: {
      milkType: ['goat'],
      cultureType: ['basic', 'regional'],
    },
    agingDuration: 2 * MINUTE,
    baseQuality: 45,
    baseValue: new Decimal(4000),
    icon: '🐐',
    unlockRequirement: { type: 'prestige_rennet', amount: 15 },
    effects: [
      { type: 'hero_buff', stat: 'speed', value: 8, duration: 150000 },
    ],
  },
];

// ===== SEMI-HARD CHEESES (15-30 minutes aging) =====

export const SEMI_HARD_CHEESES: CheeseRecipe[] = [
  {
    id: 'emmental',
    name: 'Emmental',
    description: 'Swiss classic with the famous holes. Nutty and slightly sweet.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal'],
    },
    agingDuration: 25 * MINUTE,
    baseQuality: 60,
    baseValue: new Decimal(20000),
    icon: '🧀',
    unlockRequirement: { type: 'prestige_rennet', amount: 60 },
    effects: [
      { type: 'hero_buff', stat: 'hp', value: 30, duration: 300000 },
    ],
  },
  {
    id: 'fontina',
    name: 'Fontina',
    description: 'Italian Alpine cheese. Earthy, nutty, and perfect for fondue.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 22 * MINUTE,
    baseQuality: 58,
    baseValue: new Decimal(17500),
    icon: '⛰️',
    unlockRequirement: { type: 'prestige_rennet', amount: 55 },
    effects: [
      { type: 'xp_boost', multiplier: 1.22, duration: 300000 },
    ],
  },
  {
    id: 'raclette',
    name: 'Raclette',
    description: 'Born to be melted. Scrape this beauty over potatoes and pickles.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal'],
    },
    agingDuration: 28 * MINUTE,
    baseQuality: 62,
    baseValue: new Decimal(22000),
    icon: '🫕',
    unlockRequirement: { type: 'prestige_rennet', amount: 65 },
    effects: [
      { type: 'production_boost', multiplier: 1.25, duration: 300000 },
    ],
  },
  {
    id: 'sylvan_star_gouda',
    name: 'Sylvan Star Gouda',
    description: 'Alberta\'s award-winning gouda. Smooth, nutty, with caramel notes.',
    category: 'semi_hard',
    province: 'alberta',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 30 * MINUTE,
    baseQuality: 65,
    baseValue: new Decimal(25000),
    icon: '⭐',
    unlockRequirement: { type: 'province_complete', provinceId: 'alberta' },
    effects: [
      { type: 'hero_buff', stat: 'defense', value: 25, duration: 360000 },
    ],
  },
  {
    id: 'prairie_breeze',
    name: 'Prairie Breeze',
    description: 'Saskatchewan\'s cheddar-style artisan cheese. Sharp and wheaty.',
    category: 'semi_hard',
    province: 'saskatchewan',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 25 * MINUTE,
    baseQuality: 58,
    baseValue: new Decimal(18000),
    icon: '🌾',
    unlockRequirement: { type: 'province_complete', provinceId: 'saskatchewan' },
    effects: [
      { type: 'click_boost', multiplier: 1.22, duration: 300000 },
    ],
  },
  {
    id: 'bothwell_smoked',
    name: 'Bothwell Smoked Cheddar',
    description: 'Manitoba\'s smoked masterpiece. Rich hickory notes and creamy texture.',
    category: 'semi_hard',
    province: 'manitoba',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 20 * MINUTE,
    baseQuality: 55,
    baseValue: new Decimal(16000),
    icon: '🔥',
    unlockRequirement: { type: 'province_complete', provinceId: 'manitoba' },
    effects: [
      { type: 'hero_buff', stat: 'attack', value: 18, duration: 300000 },
    ],
  },
  {
    id: 'cheddar',
    name: 'Canadian Cheddar',
    description: 'Sharp and proud. Ontario\'s claim to cheese fame.',
    category: 'semi_hard',
    province: 'ontario',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic', 'regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 15 * MINUTE,
    baseQuality: 55,
    baseValue: new Decimal(15000),
    icon: '🧀',
    unlockRequirement: { type: 'prestige_rennet', amount: 40 },
    effects: [
      { type: 'production_boost', multiplier: 1.2, duration: 300000 },
    ],
  },
  {
    id: 'gouda',
    name: 'Gouda',
    description: 'Dutch heritage, Canadian made. Sweet and nutty.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 20 * MINUTE,
    baseQuality: 58,
    baseValue: new Decimal(18000),
    icon: '🔶',
    unlockRequirement: { type: 'prestige_rennet', amount: 50 },
    effects: [
      { type: 'hero_buff', stat: 'defense', value: 20, duration: 300000 },
    ],
  },
  {
    id: 'havarti',
    name: 'Havarti',
    description: 'Danish smoothness. Buttery and perfect for sandwiches.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic', 'regional'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 18 * MINUTE,
    baseQuality: 52,
    baseValue: new Decimal(14000),
    icon: '🟡',
    unlockRequirement: { type: 'prestige_rennet', amount: 45 },
    effects: [
      { type: 'xp_boost', multiplier: 1.2, duration: 300000 },
    ],
  },
  {
    id: 'colby',
    name: 'Colby',
    description: 'American classic adopted by Canada. Mild and marbled.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 15 * MINUTE,
    baseQuality: 48,
    baseValue: new Decimal(12000),
    icon: '🟠',
    unlockRequirement: { type: 'prestige_rennet', amount: 35 },
    effects: [
      { type: 'click_boost', multiplier: 1.2, duration: 240000 },
    ],
  },
  {
    id: 'monterey_jack',
    name: 'Monterey Jack',
    description: 'California dreaming in Canadian caves. Mild and melty.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['basic', 'regional'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 16 * MINUTE,
    baseQuality: 50,
    baseValue: new Decimal(13000),
    icon: '🫕',
    unlockRequirement: { type: 'prestige_rennet', amount: 38 },
    effects: [
      { type: 'hero_buff', stat: 'hp', value: 25, duration: 300000 },
    ],
  },
  {
    id: 'edam',
    name: 'Edam',
    description: 'The red wax wonder. Mild and slightly salty.',
    category: 'semi_hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 22 * MINUTE,
    baseQuality: 54,
    baseValue: new Decimal(16000),
    icon: '🔴',
    unlockRequirement: { type: 'prestige_rennet', amount: 55 },
    effects: [
      { type: 'production_boost', multiplier: 1.18, duration: 300000 },
    ],
  },
];

// ===== HARD CHEESES (1-4 hours aging) =====

export const HARD_CHEESES: CheeseRecipe[] = [
  {
    id: 'comte',
    name: 'Comté',
    description: 'French mountain king. Fruity, nutty, with complex depth.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 2.5 * HOUR,
    baseQuality: 74,
    baseValue: new Decimal(130000),
    icon: '🏔️',
    unlockRequirement: { type: 'prestige_rennet', amount: 180 },
    effects: [
      { type: 'production_boost', multiplier: 1.28, duration: 600000 },
      { type: 'xp_boost', multiplier: 1.2, duration: 600000 },
    ],
  },
  {
    id: 'beaufort',
    name: 'Beaufort',
    description: 'Prince of Gruyères. Alpine pastures in every bite.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 3 * HOUR,
    baseQuality: 76,
    baseValue: new Decimal(140000),
    icon: '👑',
    unlockRequirement: { type: 'prestige_rennet', amount: 190 },
    effects: [
      { type: 'hero_buff', stat: 'hp', value: 35, duration: 600000 },
      { type: 'hero_buff', stat: 'defense', value: 25, duration: 600000 },
    ],
  },
  {
    id: 'sbrinz',
    name: 'Sbrinz',
    description: 'Swiss ancient treasure. Crystalline, intense, parmesan\'s alpine cousin.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 4 * HOUR,
    baseQuality: 78,
    baseValue: new Decimal(160000),
    icon: '💎',
    unlockRequirement: { type: 'prestige_rennet', amount: 210 },
    effects: [
      { type: 'click_boost', multiplier: 1.35, duration: 600000 },
    ],
  },
  {
    id: 'black_diamond_reserve',
    name: 'Black Diamond Reserve',
    description: 'Ontario\'s pride. Extra sharp, crystalline cheddar aged to perfection.',
    category: 'hard',
    province: 'ontario',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 2 * HOUR,
    baseQuality: 72,
    baseValue: new Decimal(110000),
    icon: '🖤',
    unlockRequirement: { type: 'province_complete', provinceId: 'ontario' },
    effects: [
      { type: 'production_boost', multiplier: 1.25, duration: 600000 },
    ],
  },
  {
    id: 'avonlea_clothbound',
    name: 'Avonlea Clothbound Cheddar',
    description: 'PEI\'s artisan treasure. Cave-aged, bandage-wrapped, Anne-approved.',
    category: 'hard',
    province: 'pei',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 4 * HOUR,
    baseQuality: 80,
    baseValue: new Decimal(180000),
    icon: '📖',
    unlockRequirement: { type: 'province_complete', provinceId: 'pei' },
    effects: [
      { type: 'hero_buff', stat: 'cheeseAffinity', value: 20, duration: 720000 },
    ],
  },
  {
    id: 'five_brothers',
    name: 'Five Brothers Aged Cheese',
    description: 'Newfoundland\'s heritage. Firm, tangy, with Atlantic character.',
    category: 'hard',
    province: 'newfoundland',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 2.5 * HOUR,
    baseQuality: 70,
    baseValue: new Decimal(95000),
    icon: '🤝',
    unlockRequirement: { type: 'province_complete', provinceId: 'newfoundland' },
    effects: [
      { type: 'hero_buff', stat: 'attack', value: 28, duration: 600000 },
    ],
  },
  {
    id: 'parmesan',
    name: 'Parmesan',
    description: 'The king of cheese. Crystalline, umami, magnificent.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal'],
    },
    agingDuration: 2 * HOUR,
    baseQuality: 70,
    baseValue: new Decimal(100000),
    icon: '👑',
    unlockRequirement: { type: 'prestige_rennet', amount: 150 },
    effects: [
      { type: 'production_boost', multiplier: 1.3, duration: 600000 },
      { type: 'hero_buff', stat: 'attack', value: 25, duration: 600000 },
    ],
  },
  {
    id: 'aged_gouda',
    name: 'Aged Gouda',
    description: 'Years in the making. Caramel notes and crunchy crystals.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 3 * HOUR,
    baseQuality: 75,
    baseValue: new Decimal(150000),
    icon: '🥇',
    unlockRequirement: { type: 'prestige_rennet', amount: 200 },
    effects: [
      { type: 'xp_boost', multiplier: 1.35, duration: 600000 },
    ],
  },
  {
    id: 'gruyere',
    name: 'Gruyere',
    description: 'Swiss perfection. Nutty, sweet, and fondue-ready.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal'],
    },
    agingDuration: 2.5 * HOUR,
    baseQuality: 72,
    baseValue: new Decimal(120000),
    icon: '🏔️',
    unlockRequirement: { type: 'prestige_rennet', amount: 175 },
    effects: [
      { type: 'hero_buff', stat: 'defense', value: 30, duration: 600000 },
    ],
  },
  {
    id: 'manchego',
    name: 'Manchego',
    description: 'Spanish sheep\'s milk masterpiece. Firm and tangy.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['sheep'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal', 'vegetable'],
    },
    agingDuration: 1.5 * HOUR,
    baseQuality: 68,
    baseValue: new Decimal(90000),
    icon: '🐑',
    unlockRequirement: { type: 'prestige_rennet', amount: 125 },
    effects: [
      { type: 'click_boost', multiplier: 1.3, duration: 480000 },
    ],
  },
  {
    id: 'pecorino',
    name: 'Pecorino Romano',
    description: 'Ancient Roman recipe. Sharp and salty.',
    category: 'hard',
    requiredIngredients: {
      milkType: ['sheep'],
      cultureType: ['regional', 'artisan'],
      rennetType: ['animal'],
    },
    agingDuration: 2 * HOUR,
    baseQuality: 70,
    baseValue: new Decimal(95000),
    icon: '🏛️',
    unlockRequirement: { type: 'prestige_rennet', amount: 140 },
    effects: [
      { type: 'hero_buff', stat: 'cheeseAffinity', value: 15, duration: 600000 },
    ],
  },
];

// ===== LEGENDARY CHEESES (8-24 hours aging) =====

export const LEGENDARY_CHEESES: CheeseRecipe[] = [
  {
    id: 'yukon_gold',
    name: 'Yukon Gold Cheddar',
    description: 'Legendary northern cheddar. Cold-aged in permafrost caves with gold dust finishing.',
    category: 'legendary',
    province: 'yukon',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 12 * HOUR,
    baseQuality: 88,
    baseValue: new Decimal(1500000),
    icon: '🥇',
    unlockRequirement: { type: 'province_complete', provinceId: 'yukon' },
    effects: [
      { type: 'production_boost', multiplier: 1.6, duration: 1800000 },
      { type: 'click_boost', multiplier: 1.5, duration: 1800000 },
    ],
  },
  {
    id: 'arctic_char_cheese',
    name: 'Arctic Char Cheese',
    description: 'NWT\'s aurora-blessed creation. Aged under the northern lights with local herbs.',
    category: 'legendary',
    province: 'nwt',
    requiredIngredients: {
      milkType: ['cow', 'goat'],
      cultureType: ['legendary'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 16 * HOUR,
    baseQuality: 91,
    baseValue: new Decimal(2800000),
    icon: '🌌',
    unlockRequirement: { type: 'province_complete', provinceId: 'nwt' },
    effects: [
      { type: 'xp_boost', multiplier: 1.8, duration: 2400000 },
      { type: 'hero_buff', stat: 'speed', value: 30, duration: 2400000 },
    ],
  },
  {
    id: 'ice_cave_aged',
    name: 'Ice Cave Aged',
    description: 'Nunavut\'s ultimate cheese. Aged in ancient glacial caves at the roof of Canada.',
    category: 'legendary',
    province: 'nunavut',
    requiredIngredients: {
      milkType: ['cow', 'moose'],
      cultureType: ['legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 24 * HOUR,
    baseQuality: 98,
    baseValue: new Decimal(8000000),
    icon: '🏔️',
    unlockRequirement: { type: 'province_complete', provinceId: 'nunavut' },
    effects: [
      { type: 'production_boost', multiplier: 2.5, duration: 3600000 },
      { type: 'hero_buff', stat: 'attack', value: 100, duration: 3600000 },
      { type: 'hero_buff', stat: 'defense', value: 50, duration: 3600000 },
    ],
  },
  {
    id: 'vintage_cheddar',
    name: '5-Year Vintage Cheddar',
    description: 'Five years of patience. Crumbly, intense, transcendent.',
    category: 'legendary',
    province: 'ontario',
    requiredIngredients: {
      milkType: ['cow'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 12 * HOUR,
    baseQuality: 85,
    baseValue: new Decimal(1000000),
    icon: '🏆',
    unlockRequirement: { type: 'prestige_vintage', amount: 1 },
    effects: [
      { type: 'production_boost', multiplier: 1.5, duration: 1200000 },
      { type: 'hero_buff', stat: 'attack', value: 40, duration: 1200000 },
    ],
  },
  {
    id: 'moose_cheese',
    name: 'Moose Cheese',
    description: 'Extremely rare Canadian delicacy. Only produced by the most dedicated fromagers.',
    category: 'legendary',
    province: 'yukon',
    requiredIngredients: {
      milkType: ['moose'],
      cultureType: ['legendary'],
      rennetType: ['animal', 'microbial'],
    },
    agingDuration: 8 * HOUR,
    baseQuality: 90,
    baseValue: new Decimal(2500000),
    icon: '🫎',
    unlockRequirement: { type: 'prestige_vintage', amount: 3 },
    effects: [
      { type: 'xp_boost', multiplier: 2.0, duration: 1800000 },
      { type: 'hero_buff', stat: 'hp', value: 100, duration: 1800000 },
    ],
  },
  {
    id: 'pule',
    name: 'Pule',
    description: 'The world\'s most expensive cheese. Donkey milk magic.',
    category: 'legendary',
    requiredIngredients: {
      milkType: ['donkey'],
      cultureType: ['legendary'],
      rennetType: ['animal'],
    },
    agingDuration: 16 * HOUR,
    baseQuality: 95,
    baseValue: new Decimal(5000000),
    icon: '💎',
    unlockRequirement: { type: 'prestige_vintage', amount: 5 },
    effects: [
      { type: 'production_boost', multiplier: 2.0, duration: 3600000 },
      { type: 'click_boost', multiplier: 2.0, duration: 3600000 },
    ],
  },
  {
    id: 'dragons_breath_blue',
    name: 'Dragon\'s Breath Blue',
    description: 'From Nova Scotia. Spicier than a Maritimer\'s temper. Washed in local hot sauce.',
    category: 'legendary',
    province: 'nova_scotia',
    requiredIngredients: {
      milkType: ['cow', 'sheep'],
      cultureType: ['artisan', 'legendary'],
      rennetType: ['animal'],
      specialtyItems: ['specialty_blue_mold'],
    },
    agingDuration: 24 * HOUR,
    baseQuality: 92,
    baseValue: new Decimal(3500000),
    icon: '🐉',
    unlockRequirement: { type: 'province_complete', provinceId: 'nova_scotia' },
    effects: [
      { type: 'hero_buff', stat: 'attack', value: 75, duration: 2400000 },
      { type: 'hero_buff', stat: 'speed', value: 25, duration: 2400000 },
    ],
  },
];

// ===== Combined Recipes List =====

export const CHEESE_RECIPES: CheeseRecipe[] = [
  ...FRESH_CHEESES,
  ...SOFT_CHEESES,
  ...SEMI_HARD_CHEESES,
  ...HARD_CHEESES,
  ...LEGENDARY_CHEESES,
];

/**
 * Get a cheese recipe by its ID
 */
export function getRecipeById(id: string): CheeseRecipe | undefined {
  return CHEESE_RECIPES.find((r) => r.id === id);
}

/**
 * Get all recipes of a specific category
 */
export function getRecipesByCategory(category: CheeseCategory): CheeseRecipe[] {
  return CHEESE_RECIPES.filter((r) => r.category === category);
}

/**
 * Get all recipes for a specific province
 */
export function getRecipesByProvince(province: CheeseRecipe['province']): CheeseRecipe[] {
  return CHEESE_RECIPES.filter((r) => r.province === province);
}

/**
 * Get all recipes that can use a specific milk type
 */
export function getRecipesByMilkType(milkType: string): CheeseRecipe[] {
  return CHEESE_RECIPES.filter((r) =>
    r.requiredIngredients.milkType.includes(milkType as CheeseRecipe['requiredIngredients']['milkType'][number])
  );
}

/**
 * Get recipes sorted by aging duration (ascending)
 */
export function getRecipesByAgingTime(): CheeseRecipe[] {
  return [...CHEESE_RECIPES].sort((a, b) => a.agingDuration - b.agingDuration);
}

/**
 * Get recipes sorted by base value (ascending)
 */
export function getRecipesByValue(): CheeseRecipe[] {
  return [...CHEESE_RECIPES].sort((a, b) => a.baseValue.comparedTo(b.baseValue));
}

/**
 * Format aging duration for display
 */
export function formatAgingDuration(durationMs: number): string {
  if (durationMs === 0) return 'Instant';

  const hours = Math.floor(durationMs / HOUR);
  const minutes = Math.floor((durationMs % HOUR) / MINUTE);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}
