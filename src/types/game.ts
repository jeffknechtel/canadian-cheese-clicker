import Decimal from 'decimal.js';

// ===== Prestige System Types =====

export interface PrestigeState {
  // First Prestige: Aging
  rennet: number;                          // Current Rennet currency
  totalRennet: number;                     // Lifetime Rennet earned (for tracking)
  agingResetCount: number;                 // Number of Aging resets performed
  agingUpgrades: string[];                 // Purchased Aging upgrade IDs

  // Second Prestige: Vintage
  vintageWheels: number;                   // Current Vintage Wheels
  totalVintageWheels: number;              // Lifetime Vintage Wheels created
  vintageResetCount: number;               // Number of Vintage resets performed
  vintageUnlocks: string[];                // Unlocked Vintage content IDs

  // Third Prestige: Legacy
  legacy: number;                          // Legacy points
  legacyBonuses: Record<Province, number>; // Province-specific bonuses
  legacyResetCount: number;                // Number of Legacy resets performed
}

export interface AgingUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;                            // Rennet cost
  effect: AgingUpgradeEffect;
  requirement?: AgingUpgradeRequirement;
  maxPurchases: number;                    // 1 for one-time, >1 for stackable
  icon: string;
}

export type AgingUpgradeEffect =
  | { type: 'clickBonus'; value: number }           // +X% click power
  | { type: 'generatorCostReduction'; value: number } // -X% generator costs
  | { type: 'productionBonus'; value: number }      // +X% all production
  | { type: 'generatorEfficiency'; value: number }  // +X% per generator type owned
  | { type: 'startingCurds'; value: number }        // Start with X curds after reset
  | { type: 'startingGenerators'; generatorId: string; value: number } // Start with X of generator
  | { type: 'xpBonus'; value: number }              // +X% hero XP gain
  | { type: 'combatBonus'; value: number };         // +X% combat rewards

export type AgingUpgradeRequirement =
  | { type: 'rennetSpent'; amount: number }         // Requires X Rennet spent
  | { type: 'agingResets'; count: number }          // Requires X Aging resets
  | { type: 'upgrade'; upgradeId: string };         // Requires another upgrade first

// Vintage tier types (framework for future expansion)
export interface VintageUnlock {
  id: string;
  name: string;
  description: string;
  cost: number;                            // Vintage Wheels cost
  effect: VintageUnlockEffect;
}

export type VintageUnlockEffect =
  | { type: 'legendaryGenerator'; generatorId: string } // Unlock legendary generators
  | { type: 'heroStatBonus'; value: number }            // Permanent hero stat bonus
  | { type: 'rennetMultiplier'; value: number };        // Multiplier to Rennet gains

// Legacy tier types (framework for future expansion)
export interface LegacyBonus {
  province: Province;
  level: number;
  effect: string;                          // Description of the bonus
  multiplier: number;                      // Effect strength
}

export interface GameState {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
  generators: Record<string, number>;
  upgrades: string[];
  achievements: string[]; // IDs of unlocked achievements
  ehCount: number; // Tracks Canadian phrase triggers for bonus
  lastMilestone: number; // Last milestone threshold triggered
  lastSaved: number;
  gameStarted: number;

  // Hero system
  heroes: Record<string, HeroState>; // Recruited heroes by ID
  party: PartyFormation;
  equipmentInventory: string[]; // Owned equipment IDs

  // Combat system
  combat: CombatState;
  zoneProgress: Record<string, ZoneProgress>;

  // Prestige system
  prestige: PrestigeState;

  // Crafting system
  crafting: CraftingState;

  // Event system
  activeEvents: string[]; // IDs of currently active events
}

export interface Generator {
  id: string;
  name: string;
  description: string;
  baseCost: Decimal;
  baseCps: Decimal;
  costMultiplier: number;
  icon?: string; // Emoji or icon identifier
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: Decimal;
  costCurrency: 'curds' | 'whey';
  effect: UpgradeEffect;
  requirement?: UpgradeRequirement;
}

export type UpgradeEffect =
  | { type: 'clickMultiplier'; value: number }
  | { type: 'generatorMultiplier'; generatorId: string; value: number }
  | { type: 'globalMultiplier'; value: number };

export interface UpgradeRequirement {
  type: 'generatorOwned';
  generatorId: string;
  count: number;
}

// ===== Achievement Types =====

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: 'production' | 'clicking' | 'collection' | 'canadian' | 'hidden';
  requirement: AchievementRequirement;
  reward?: AchievementReward;
}

export type AchievementRequirement =
  | { type: 'totalCurds'; amount: Decimal }
  | { type: 'totalClicks'; count: number }
  | { type: 'generatorOwned'; generatorId: string; count: number }
  | { type: 'anyGeneratorOwned'; count: number } // Any single generator reaches this count
  | { type: 'allGeneratorsOwned'; count: number } // All generators have at least this count
  | { type: 'cps'; amount: Decimal }
  | { type: 'upgradesPurchased'; count: number }
  // Prestige requirements
  | { type: 'agingResets'; count: number }
  | { type: 'rennet'; amount: number }
  | { type: 'agingUpgradesPurchased'; count: number }
  | { type: 'vintageResets'; count: number }
  | { type: 'legacyResets'; count: number }
  // Crafting requirements
  | { type: 'cheese_crafted_total'; count: number }
  | { type: 'cheese_types_crafted'; count: number }
  | { type: 'caves_owned'; count: number }
  | { type: 'cheese_quality'; quality: number }
  | { type: 'cheese_inventory_size'; count: number }
  | { type: 'legendary_cheese_crafted' }
  // Phase 7.8: Zone and hero achievements
  | { type: 'zoneCompleted'; zoneId: string }
  | { type: 'zonesCompleted'; zones: string[] }
  | { type: 'allProvincialZonesCompleted' }
  | { type: 'allMythologyZonesCompleted' }
  | { type: 'bossDefeated'; bossId: string }
  | { type: 'bossesDefeated'; count: number }
  | { type: 'heroesRecruited'; count: number }
  | { type: 'legendaryHeroesRecruited'; count: number }
  | { type: 'provincesRepresented'; count: number };

export interface AchievementReward {
  type: 'globalMultiplier' | 'clickMultiplier';
  value: number;
}

// ===== Hero System Types =====

export type HeroClass = 'tank' | 'dps' | 'support' | 'healer';
export type Province =
  | 'ontario'
  | 'quebec'
  | 'alberta'
  | 'manitoba'
  | 'saskatchewan'
  | 'yukon'
  | 'bc'
  | 'nova_scotia'
  | 'new_brunswick'
  | 'pei'
  | 'newfoundland'
  | 'nwt'
  | 'nunavut';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'cheese_charm';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare';

export interface HeroStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  cheeseAffinity: number; // Affects CPS bonus
}

export interface HeroDefinition {
  id: string;
  name: string;
  title: string; // e.g., "The Polite Protector"
  class: HeroClass;
  province: Province;
  description: string;
  specialAbility: {
    name: string;
    description: string;
  };
  baseStats: HeroStats;
  statGrowth: HeroStats; // Stats gained per level
  recruitCost: Decimal;
  icon: string;
}

export interface HeroState {
  id: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  equipment: Partial<Record<EquipmentSlot, string>>; // Equipment IDs
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  stats: Partial<HeroStats>;
  cost: Decimal;
  icon: string;
}

export interface PartyFormation {
  frontLeft: string | null; // Hero ID or null
  frontRight: string | null;
  backLeft: string | null;
  backRight: string | null;
}

// Formation position type for iteration
export type FormationPosition =
  | 'frontLeft'
  | 'frontRight'
  | 'backLeft'
  | 'backRight';

// ===== Combat System Types =====

export interface CombatState {
  isInCombat: boolean;
  currentZone: string | null;
  currentStage: number;
  enemies: CombatEnemy[];
  heroStates: Record<string, HeroCombatState>;
  combatLog: CombatLogEntry[];
  combatSpeed: 1 | 2 | 4;
  limitBreakGauge: number; // 0-100
  battleResult: 'ongoing' | 'victory' | 'defeat' | null;
}

export interface HeroCombatState {
  heroId: string;
  currentHp: number;
  maxHp: number;
  atbGauge: number; // 0-100
  isAlive: boolean;
  statusEffects: StatusEffect[];
  skillCooldowns: Record<string, number>; // Skill ID -> remaining ticks
}

export interface CombatEnemy {
  id: string;
  instanceId: string; // Unique per battle instance
  currentHp: number;
  maxHp: number;
  atbGauge: number;
  isAlive: boolean;
  statusEffects: StatusEffect[];
  skillCooldowns: Record<string, number>;
  // Boss-specific fields
  isBoss?: boolean;
  currentPhase?: number;
  phaseTriggered?: Record<number, boolean>; // Track which phases have been triggered
}

export interface StatusEffect {
  id: string;
  type: 'buff' | 'debuff';
  stat: keyof HeroStats | 'damage_over_time' | 'heal_over_time';
  value: number;
  duration: number; // Remaining ticks
  source: string; // Hero or enemy ID that applied this
}

export interface CombatLogEntry {
  timestamp: number;
  type: 'attack' | 'skill' | 'damage' | 'heal' | 'status' | 'defeat' | 'victory' | 'phase_change';
  source: string;
  target: string;
  value?: number;
  message: string;
}

// ===== Enemy Definitions =====

export type EnemyType = 'fungal' | 'artificial' | 'mechanical' | 'demon' | 'undead' | 'beast' | 'boss';
export type DamageType = 'physical' | 'fire' | 'ice' | 'lightning' | 'nature' | 'holy' | 'dark';

export interface EnemyDefinition {
  id: string;
  name: string;
  type: EnemyType;
  stats: HeroStats;
  weakness?: DamageType;
  resistance?: DamageType;
  skills: EnemySkill[];
  drops: EnemyDrop[];
  xpReward: number;
  curdReward: Decimal;
  icon: string;
  description: string;
}

export interface EnemySkill {
  id: string;
  name: string;
  damage: number; // Multiplier of base attack
  cooldown: number; // Ticks between uses
  effect?: Omit<StatusEffect, 'id' | 'source'>; // Status effect to apply
  targetType: 'single' | 'all' | 'self';
}

export interface EnemyDrop {
  itemId: string;
  chance: number; // 0-1
  minQuantity?: number;
  maxQuantity?: number;
}

// ===== Boss Definitions =====

export interface BossDefinition extends EnemyDefinition {
  type: 'boss';
  phases: BossPhase[];
  specialMechanics: string[];
}

export interface BossPhase {
  phaseNumber: number;
  hpThreshold: number; // Percentage of max HP to trigger (e.g., 66 for 66%)
  statModifiers: Partial<HeroStats>; // Additive stat changes
  newSkills?: EnemySkill[]; // Skills added in this phase
  onEnterMessage: string;
}

// ===== Zone Definitions =====

export interface ZoneDefinition {
  id: string;
  name: string;
  province: Province;
  description: string;
  stages: StageDefinition[];
  bossStage: BossStageDefinition;
  unlockRequirement: ZoneUnlockRequirement;
  backgroundImage?: string;
  recommendedLevel: number;
}

export interface StageDefinition {
  stageNumber: number;
  enemies: string[]; // Enemy IDs
  enemyLevelModifier: number; // Multiplier for enemy stats (e.g., 1.1 for 10% stronger)
}

export interface BossStageDefinition {
  bossId: string;
  stageNumber: number;
}

export type ZoneUnlockRequirement =
  | { type: 'none' } // First zone, always unlocked
  | { type: 'zone_complete'; zoneId: string }
  | { type: 'curds'; amount: Decimal }
  | { type: 'achievement'; achievementId: string };

// ===== Zone Progress =====

export interface ZoneProgress {
  zoneId: string;
  highestStageCleared: number;
  bossDefeated: boolean;
  timesCompleted: number;
  bestClearTime?: number; // Milliseconds
}

// ===== Combat Rewards =====

export interface CombatRewards {
  curds: Decimal;
  whey: Decimal;
  xp: Record<string, number>; // Hero ID -> XP gained
  drops: CombatDrop[];
}

export interface CombatDrop {
  itemId: string;
  quantity: number;
  itemType: 'equipment' | 'material' | 'consumable';
}

// ===== Hero Ability Types =====

export type AbilityTargetType = 'self' | 'single_ally' | 'all_allies' | 'single_enemy' | 'all_enemies';

export interface HeroAbilityDefinition {
  id: string;
  name: string;
  description: string;
  cooldown: number; // Turns (actions) before usable again
  manaCost?: number; // Future: if mana system added
  targetType: AbilityTargetType;
  effects: AbilityEffect[];
}

export type AbilityEffect =
  | { type: 'damage'; multiplier: number; damageType?: DamageType }
  | { type: 'heal'; amount: number; isPercentage: boolean }
  | { type: 'buff'; stat: keyof HeroStats | 'damage_reduction'; value: number; duration: number }
  | { type: 'debuff'; stat: keyof HeroStats | 'damage_over_time'; value: number; duration: number }
  | { type: 'taunt'; duration: number }
  | { type: 'cleanse' } // Remove debuffs
  | { type: 'immunity'; immunityType: 'freeze' | 'slow' | 'all_debuffs'; duration: number }
  | { type: 'drop_rate_bonus'; value: number; duration: number };

// ===== Limit Break Types =====

export interface LimitBreakDefinition {
  id: string;
  name: string;
  description: string;
  heroId: string; // Only specific heroes have limit breaks
  targetType: AbilityTargetType;
  effects: AbilityEffect[];
  animation?: string; // For future visual effects
}

// ===== Crafting System Types =====

export type MilkType = 'cow' | 'goat' | 'sheep' | 'buffalo' | 'moose' | 'donkey';
export type CultureType = 'basic' | 'regional' | 'artisan' | 'legendary';
export type RennetType = 'animal' | 'vegetable' | 'microbial';
export type CheeseCategory = 'fresh' | 'soft' | 'semi_hard' | 'hard' | 'legendary';

export interface Ingredient {
  id: string;
  name: string;
  description: string;
  type: 'milk' | 'culture' | 'rennet' | 'specialty';
  cost: Decimal;
  costCurrency: 'curds' | 'whey';
  unlockRequirement?: IngredientUnlockRequirement;
  icon: string;
  // Type-specific modifiers
  qualityModifier?: number; // For milks and cultures
  milkType?: MilkType; // For milk ingredients
  cultureType?: CultureType; // For culture ingredients
  rennetType?: RennetType; // For rennet ingredients
}

export type IngredientUnlockRequirement =
  | { type: 'none' }
  | { type: 'prestige_rennet'; amount: number }
  | { type: 'prestige_vintage'; amount: number }
  | { type: 'achievement'; achievementId: string }
  | { type: 'province'; provinceId: Province }
  | { type: 'cave_level'; caveId: string; level: number };

export interface CheeseRecipe {
  id: string;
  name: string;
  description: string;
  category: CheeseCategory;
  province?: Province; // For regional exclusives
  requiredIngredients: {
    milkType: MilkType[]; // Allowed milk types
    cultureType: CultureType[]; // Allowed culture types
    rennetType?: RennetType[]; // Allowed rennet types (optional for fresh cheese)
    specialtyItems?: string[]; // Optional specialty ingredient IDs
  };
  agingDuration: number; // Milliseconds (0 for fresh cheese)
  baseQuality: number; // 1-100
  baseValue: Decimal; // Curd value when sold
  effects?: CheeseEffect[];
  unlockRequirement?: RecipeUnlockRequirement;
  icon: string;
}

export type RecipeUnlockRequirement =
  | { type: 'none' }
  | { type: 'prestige_rennet'; amount: number }
  | { type: 'prestige_vintage'; amount: number }
  | { type: 'cheese_crafted'; recipeId: string; count: number }
  | { type: 'province_complete'; provinceId: Province };

export type CheeseEffect =
  | { type: 'hero_buff'; stat: keyof HeroStats; value: number; duration: number }
  | { type: 'production_boost'; multiplier: number; duration: number }
  | { type: 'click_boost'; multiplier: number; duration: number }
  | { type: 'xp_boost'; multiplier: number; duration: number };

export interface CraftingJob {
  id: string; // Unique job ID
  recipeId: string;
  caveId: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  ingredients: {
    milkType: MilkType;
    cultureType: CultureType;
    rennetType: RennetType;
    specialtyItems: string[];
  };
  qualityBonus: number; // From cave + ingredients
  interactions: CraftingInteraction[]; // Rind washes, flavor additions during aging
}

export interface CraftingInteraction {
  type: 'rind_wash' | 'flavor_addition' | 'turn';
  timestamp: number;
  itemId?: string;
  qualityEffect: number;
}

export interface CraftedCheese {
  id: string; // Unique instance ID
  recipeId: string;
  quality: number; // 1-100, affects value and effect strength
  craftedAt: number; // Unix timestamp
  ingredients: CraftingJob['ingredients'];
}

export interface AffinageCave {
  id: string;
  name: string;
  description: string;
  capacity: number;
  qualityBonus: number; // Percentage bonus to cheese quality
  cost: number; // Rennet cost to unlock
  unlockRequirement?: CaveUnlockRequirement;
  icon: string;
}

export type CaveUnlockRequirement =
  | { type: 'none' }
  | { type: 'prestige_rennet'; amount: number }
  | { type: 'prestige_vintage'; amount: number }
  | { type: 'cave_unlocked'; caveId: string };

export interface CraftingState {
  unlockedIngredients: string[]; // Ingredient IDs
  unlockedRecipes: string[]; // Recipe IDs
  unlockedCaves: string[]; // Cave IDs
  activeJobs: CraftingJob[]; // Currently aging cheeses
  cheeseInventory: CraftedCheese[]; // Collected cheeses
  cheeseCollection: Record<string, number>; // Recipe ID -> times crafted (for achievements)
  activeBuffs: CheeseActiveBuff[]; // Currently active cheese effects
}

export interface CheeseActiveBuff {
  id: string;
  effect: CheeseEffect;
  startTime: number;
  endTime: number;
  sourceCheeseId: string;
}

// ===== Event System Types =====

export type EventBonusType = 'production' | 'xp' | 'drops' | 'click';

export interface EventBonus {
  type: EventBonusType;
  multiplier: number;
  description: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  startDate?: Date; // undefined = manual activation
  endDate?: Date;
  isActive: boolean;
  bonuses: EventBonus[];
  exclusiveContent: {
    cheeses?: string[];
    equipment?: string[];
    enemies?: string[];
  };
}
