import Decimal from 'decimal.js';
import type { Ingredient, MilkType, CultureType, RennetType } from '../types/game';

/**
 * Ingredients Data for The Great Canadian Cheese Quest
 *
 * Ingredients are organized by type:
 * - Milk (6 types): Primary ingredient, determines base cheese character
 * - Culture (4 types): Starter cultures that develop flavor
 * - Rennet (3 types): Coagulation agents
 * - Specialty (8+ items): Optional additions for unique flavors
 *
 * Quality modifiers:
 * - Cow: 0 (baseline)
 * - Goat: +5
 * - Sheep: +10
 * - Buffalo: +15
 * - Moose: +20 (rare Canadian!)
 * - Donkey: +25 (legendary, expensive)
 */

// ===== MILK TYPES =====

export const MILKS: Ingredient[] = [
  {
    id: 'milk_cow',
    name: 'Cow Milk',
    description: 'Classic Holstein milk. The foundation of most cheeses, eh.',
    type: 'milk',
    cost: new Decimal(100),
    costCurrency: 'curds',
    icon: '🥛',
    qualityModifier: 0,
    milkType: 'cow',
  },
  {
    id: 'milk_goat',
    name: 'Goat Milk',
    description: 'Tangy and distinctive. Makes excellent chevre and feta.',
    type: 'milk',
    cost: new Decimal(500),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 10 },
    icon: '🐐',
    qualityModifier: 5,
    milkType: 'goat',
  },
  {
    id: 'milk_sheep',
    name: 'Sheep Milk',
    description: 'Rich and creamy. Perfect for aged cheeses like Manchego.',
    type: 'milk',
    cost: new Decimal(2000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 50 },
    icon: '🐑',
    qualityModifier: 10,
    milkType: 'sheep',
  },
  {
    id: 'milk_buffalo',
    name: 'Water Buffalo Milk',
    description: 'Creamy and sweet. The authentic choice for mozzarella.',
    type: 'milk',
    cost: new Decimal(10000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 200 },
    icon: '🦬',
    qualityModifier: 15,
    milkType: 'buffalo',
  },
  {
    id: 'milk_moose',
    name: 'Moose Milk',
    description: 'Extremely rare Canadian delicacy. Only the bravest dairy farmers attempt this.',
    type: 'milk',
    cost: new Decimal(100000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 500 },
    icon: '🫎',
    qualityModifier: 20,
    milkType: 'moose',
  },
  {
    id: 'milk_donkey',
    name: 'Donkey Milk',
    description: 'Legendary and precious. Used to make the world\'s most expensive cheese, Pule.',
    type: 'milk',
    cost: new Decimal(1000000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_vintage', amount: 1 },
    icon: '🫏',
    qualityModifier: 25,
    milkType: 'donkey',
  },
];

// ===== CULTURE TYPES =====

export const CULTURES: Ingredient[] = [
  {
    id: 'culture_basic',
    name: 'Basic Mesophilic Culture',
    description: 'Standard starter culture for most cheese varieties.',
    type: 'culture',
    cost: new Decimal(50),
    costCurrency: 'curds',
    icon: '🦠',
    qualityModifier: 0,
    cultureType: 'basic',
  },
  {
    id: 'culture_regional',
    name: 'Regional Thermophilic Culture',
    description: 'Heat-loving culture used for Swiss and Italian styles.',
    type: 'culture',
    cost: new Decimal(500),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 25 },
    icon: '🔬',
    qualityModifier: 5,
    cultureType: 'regional',
  },
  {
    id: 'culture_artisan',
    name: 'Artisan Heritage Culture',
    description: 'Passed down through generations of Quebec fromagers.',
    type: 'culture',
    cost: new Decimal(5000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 100 },
    icon: '🏺',
    qualityModifier: 10,
    cultureType: 'artisan',
  },
  {
    id: 'culture_legendary',
    name: 'Legendary Cave Culture',
    description: 'Ancient culture discovered in a sacred cheese cave. Grants extraordinary flavor.',
    type: 'culture',
    cost: new Decimal(50000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_vintage', amount: 1 },
    icon: '✨',
    qualityModifier: 20,
    cultureType: 'legendary',
  },
];

// ===== RENNET TYPES =====

export const RENNETS: Ingredient[] = [
  {
    id: 'rennet_animal',
    name: 'Traditional Animal Rennet',
    description: 'Classic calf rennet. The time-tested coagulant.',
    type: 'rennet',
    cost: new Decimal(75),
    costCurrency: 'curds',
    icon: '🧬',
    qualityModifier: 0,
    rennetType: 'animal',
  },
  {
    id: 'rennet_vegetable',
    name: 'Thistle Vegetable Rennet',
    description: 'Plant-based coagulant from cardoon thistle. Mild and earthy.',
    type: 'rennet',
    cost: new Decimal(200),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 15 },
    icon: '🌿',
    qualityModifier: 2,
    rennetType: 'vegetable',
  },
  {
    id: 'rennet_microbial',
    name: 'Precision Microbial Rennet',
    description: 'Lab-crafted for consistency. Modern cheesemaking technology.',
    type: 'rennet',
    cost: new Decimal(1000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 75 },
    icon: '🔮',
    qualityModifier: 5,
    rennetType: 'microbial',
  },
];

// ===== SPECIALTY ITEMS =====

export const SPECIALTY_ITEMS: Ingredient[] = [
  {
    id: 'specialty_maple_syrup',
    name: 'Quebec Maple Syrup',
    description: 'Grade A amber. Adds a sweet Canadian twist to any cheese.',
    type: 'specialty',
    cost: new Decimal(1000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'province', provinceId: 'quebec' },
    icon: '🍁',
    qualityModifier: 3,
  },
  {
    id: 'specialty_herbs',
    name: 'Prairie Herb Blend',
    description: 'Wild herbs from the Alberta prairies. Savory and aromatic.',
    type: 'specialty',
    cost: new Decimal(800),
    costCurrency: 'curds',
    unlockRequirement: { type: 'province', provinceId: 'alberta' },
    icon: '🌾',
    qualityModifier: 2,
  },
  {
    id: 'specialty_truffle',
    name: 'Canadian Black Truffle',
    description: 'Rare truffle from BC forests. Earthy luxury.',
    type: 'specialty',
    cost: new Decimal(25000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 300 },
    icon: '🍄',
    qualityModifier: 8,
  },
  {
    id: 'specialty_smoked_salt',
    name: 'Pacific Smoked Salt',
    description: 'Sea salt smoked over BC cedar. Deep umami notes.',
    type: 'specialty',
    cost: new Decimal(1500),
    costCurrency: 'curds',
    unlockRequirement: { type: 'province', provinceId: 'bc' },
    icon: '🧂',
    qualityModifier: 4,
  },
  {
    id: 'specialty_peppercorn',
    name: 'Quebec Green Peppercorn',
    description: 'Fresh peppercorns in brine. Spicy and bright.',
    type: 'specialty',
    cost: new Decimal(600),
    costCurrency: 'curds',
    icon: '🫑',
    qualityModifier: 2,
  },
  {
    id: 'specialty_cranberry',
    name: 'Nova Scotia Cranberries',
    description: 'Dried cranberries from the Maritimes. Tart and fruity.',
    type: 'specialty',
    cost: new Decimal(900),
    costCurrency: 'curds',
    unlockRequirement: { type: 'province', provinceId: 'nova_scotia' },
    icon: '🍒',
    qualityModifier: 3,
  },
  {
    id: 'specialty_honey',
    name: 'Manitoba Wildflower Honey',
    description: 'Golden honey from prairie wildflowers. Sweet complexity.',
    type: 'specialty',
    cost: new Decimal(1200),
    costCurrency: 'curds',
    unlockRequirement: { type: 'province', provinceId: 'manitoba' },
    icon: '🍯',
    qualityModifier: 3,
  },
  {
    id: 'specialty_ash',
    name: 'Maple Wood Ash',
    description: 'Fine ash for coating cheese rinds. Traditional technique.',
    type: 'specialty',
    cost: new Decimal(400),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 50 },
    icon: '⚫',
    qualityModifier: 2,
  },
  {
    id: 'specialty_blue_mold',
    name: 'Penicillium Roqueforti',
    description: 'The blue cheese mold. Creates distinctive veining.',
    type: 'specialty',
    cost: new Decimal(3000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 150 },
    icon: '🔵',
    qualityModifier: 5,
  },
  {
    id: 'specialty_white_mold',
    name: 'Penicillium Candidum',
    description: 'White surface mold for bloomy rinds. Creamy transformation.',
    type: 'specialty',
    cost: new Decimal(2000),
    costCurrency: 'curds',
    unlockRequirement: { type: 'prestige_rennet', amount: 100 },
    icon: '⚪',
    qualityModifier: 4,
  },
];

// ===== Combined Ingredients List =====

export const INGREDIENTS: Ingredient[] = [
  ...MILKS,
  ...CULTURES,
  ...RENNETS,
  ...SPECIALTY_ITEMS,
];

/**
 * Get an ingredient by its ID
 */
export function getIngredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find((i) => i.id === id);
}

/**
 * Get all ingredients of a specific type
 */
export function getIngredientsByType(type: Ingredient['type']): Ingredient[] {
  return INGREDIENTS.filter((i) => i.type === type);
}

/**
 * Get a milk ingredient by milk type
 */
export function getMilkByType(milkType: MilkType): Ingredient | undefined {
  return MILKS.find((m) => m.milkType === milkType);
}

/**
 * Get a culture ingredient by culture type
 */
export function getCultureByType(cultureType: CultureType): Ingredient | undefined {
  return CULTURES.find((c) => c.cultureType === cultureType);
}

/**
 * Get a rennet ingredient by rennet type
 */
export function getRennetByType(rennetType: RennetType): Ingredient | undefined {
  return RENNETS.find((r) => r.rennetType === rennetType);
}

/**
 * Get all specialty items
 */
export function getSpecialtyItems(): Ingredient[] {
  return SPECIALTY_ITEMS;
}

/**
 * Get quality modifier for an ingredient
 */
export function getQualityModifier(ingredientId: string): number {
  const ingredient = getIngredientById(ingredientId);
  return ingredient?.qualityModifier ?? 0;
}
