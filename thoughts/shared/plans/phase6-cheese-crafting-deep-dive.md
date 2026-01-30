# Phase 6: Cheese Crafting Deep Dive - Implementation Plan

## Overview

Implement a comprehensive cheese-making crafting system that allows players to create various cheese types through a multi-step process involving ingredient selection, crafting initiation, real-time aging, and cheese collection. This system integrates with existing currencies (curds, whey), the prestige system (rennet unlocks), and provides meaningful bonuses for heroes and production.

## Current State Analysis

**Existing Systems to Integrate With:**
- **Currency System**: Curds (primary) and Whey (secondary) managed in `gameStore.ts`
- **Prestige System**: Rennet and Vintage Wheels already exist in `PrestigeState` - caves should unlock via rennet
- **Equipment System**: Pattern for equipment slots/inventory in `types/game.ts:211-220` and `data/equipment.ts`
- **Timer System**: `gameLoop.ts` uses `requestAnimationFrame` with delta time, already calls `tick()` and `tickHeroXp()`
- **Save System**: `saveSystem.ts` handles localStorage persistence with version migration

**Key Patterns to Follow:**
- Types defined in `src/types/game.ts`
- Data constants in `src/data/*.ts` with getter functions
- Store actions in `gameStore.ts` with affordability checks → purchase → recalculation pattern
- UI panels in `src/components/ui/` following GeneratorPanel/EquipmentModal patterns

## Desired End State

A complete cheese crafting system where players can:
1. Unlock ingredients and recipes through gameplay progression
2. Select milk type, cultures, and optional specialty items
3. Start cheese aging in available cave slots (real-time timers)
4. Optionally interact with aging cheese (wash rind, add flavors)
5. Collect finished cheese for curds, hero buffs, or collection achievements
6. Upgrade caves to increase capacity and quality bonuses

**Verification:**
- [ ] TypeScript compiles without errors: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Crafting UI displays in-game and responds to interactions
- [ ] Cheese ages in real-time and can be collected
- [ ] Save/load preserves crafting state including aging timers
- [ ] Prestige (Aging) reset does NOT reset caves or cheese collection

### Key Discoveries:

- Game loop in `gameLoop.ts:7-26` already calls multiple tick functions per frame
- Equipment uses `id: string` references, not full objects in state (`types/game.ts:208`)
- Prestige state persists through aging reset (`gameStore.ts` performAging preserves heroes, equipment, achievements)
- Save version is tracked (`saveSystem.ts`) - will need version bump for crafting state
- Decimal.js used for all currency values (`types/game.ts:73-75`)

## Assumptions Made

1. **Aging timers are real-time** - not accelerated by game speed or prestige bonuses initially
2. **Caves persist through Aging prestige** - similar to heroes/equipment, caves are a permanent unlock
3. **Cheese collection is NOT equipment** - cheeses are consumables/collectibles, not equippable items
4. **Milk types unlock progressively** - Cow available from start, others through progression
5. **Recipes unlock via achievements or rennet** - not through random drops
6. **Maximum 5 caves** as per research document - upgradeable capacity and quality

## What We're NOT Doing

- Cheese trading/selling to NPCs (Phase 7 content)
- Cheese sacrifice for prestige requirements (Vintage tier integration - future)
- Seasonal/event-specific cheeses (Phase 7 events)
- Cheese gifting to NPCs for affinity (Phase 7 content expansion)
- Visual 3D representation of aging caves (can be added in Polish phase)

## Implementation Approach

Build the system in 6 sub-phases, each with clear deliverables:
1. **Types & Data** - Define all TypeScript interfaces and static data
2. **Store State** - Add crafting state to Zustand store
3. **Crafting Logic** - Implement crafting engine with timers
4. **UI Components** - Build crafting panel interface
5. **Integration** - Connect to game loop, save system, prestige
6. **Polish** - Add notifications, achievements, balance tuning

---

## Phase 6.1: Types and Data Definitions

### Overview

Define all TypeScript types for the crafting system and create static data files for ingredients, recipes, and caves.

### Changes Required:

#### 1. Type Definitions

**File**: `src/types/game.ts`
**Changes**: Add crafting-related types after existing types (around line 436)

```typescript
// ===== Crafting System Types =====

export type MilkType = 'cow' | 'goat' | 'sheep' | 'buffalo' | 'moose' | 'donkey';
export type CultureType = 'basic' | 'regional' | 'artisan' | 'legendary';
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
}

export type IngredientUnlockRequirement =
  | { type: 'none' }
  | { type: 'prestige_rennet'; amount: number }
  | { type: 'achievement'; achievementId: string }
  | { type: 'province'; provinceId: Province }
  | { type: 'cave_level'; caveId: string; level: number };

export interface CheeseRecipe {
  id: string;
  name: string;
  description: string;
  category: CheeseCategory;
  province?: Province;  // For regional exclusives
  requiredIngredients: {
    milkType: MilkType[];  // Allowed milk types
    cultureType: CultureType[];  // Allowed culture types
    rennetType?: ('animal' | 'vegetable' | 'microbial')[];
    specialtyItems?: string[];  // Optional specialty ingredient IDs
  };
  agingDuration: number;  // Milliseconds (0 for fresh cheese)
  baseQuality: number;  // 1-100
  baseValue: Decimal;  // Curd value when sold
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
  id: string;  // Unique job ID
  recipeId: string;
  caveId: string;
  startTime: number;  // Unix timestamp
  endTime: number;  // Unix timestamp
  ingredients: {
    milkType: MilkType;
    cultureType: CultureType;
    rennetType: 'animal' | 'vegetable' | 'microbial';
    specialtyItems: string[];
  };
  qualityBonus: number;  // From cave + ingredients
  interactions: CraftingInteraction[];  // Rind washes, flavor additions during aging
}

export interface CraftingInteraction {
  type: 'rind_wash' | 'flavor_addition' | 'turn';
  timestamp: number;
  itemId?: string;
  qualityEffect: number;
}

export interface CraftedCheese {
  id: string;  // Unique instance ID
  recipeId: string;
  quality: number;  // 1-100, affects value and effect strength
  craftedAt: number;  // Unix timestamp
  ingredients: CraftingJob['ingredients'];
}

export interface AffinageCave {
  id: string;
  name: string;
  description: string;
  capacity: number;
  qualityBonus: number;  // Percentage bonus to cheese quality
  cost: number;  // Rennet cost to unlock
  unlockRequirement?: CaveUnlockRequirement;
  icon: string;
}

export type CaveUnlockRequirement =
  | { type: 'none' }
  | { type: 'prestige_rennet'; amount: number }
  | { type: 'prestige_vintage'; amount: number }
  | { type: 'cave_unlocked'; caveId: string };

export interface CraftingState {
  unlockedIngredients: string[];  // Ingredient IDs
  unlockedRecipes: string[];  // Recipe IDs
  unlockedCaves: string[];  // Cave IDs
  activeJobs: CraftingJob[];  // Currently aging cheeses
  cheeseInventory: CraftedCheese[];  // Collected cheeses
  cheeseCollection: Record<string, number>;  // Recipe ID -> times crafted (for achievements)
  activeBuffs: CheeseActiveBuff[];  // Currently active cheese effects
}

export interface CheeseActiveBuff {
  id: string;
  effect: CheeseEffect;
  startTime: number;
  endTime: number;
  sourceCheeseId: string;
}
```

#### 2. Ingredients Data

**File**: `src/data/ingredients.ts` (NEW FILE)
**Changes**: Create comprehensive ingredient definitions

Define 6 milk types, 4 culture types, 3 rennet types, and 8+ specialty items with costs and unlock requirements.

#### 3. Cheese Recipes Data

**File**: `src/data/cheeseRecipes.ts` (NEW FILE)
**Changes**: Create 25+ cheese recipes across all categories

- **Fresh (5)**: Cottage Cheese, Ricotta, Cream Cheese, Quark, Fresh Curds
- **Soft (5)**: Brie, Camembert, Oka, Feta, Chevre
- **Semi-Hard (6)**: Cheddar, Gouda, Havarti, Colby, Monterey Jack, Edam
- **Hard (5)**: Parmesan, Aged Gouda, Gruyere, Manchego, Pecorino
- **Legendary (4)**: 5-Year Vintage Cheddar, Moose Cheese, Pule, Dragon's Breath Blue

#### 4. Caves Data

**File**: `src/data/caves.ts` (NEW FILE)
**Changes**: Define 5 affinage caves with progressive unlocks

| Cave | Capacity | Quality Bonus | Rennet Cost |
|------|----------|---------------|-------------|
| Basic Cellar | 5 | 0% | 0 (start) |
| Temperature Cave | 10 | +10% | 100 |
| Humidity Cave | 15 | +20% | 500 |
| Alpine Cave | 25 | +35% | 1000 (1 Vintage) |
| Master's Vault | 50 | +50% | 5000 (5 Vintage) |

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `npx tsc -b`
- [x] Linting passes: `pnpm lint`
- [x] No circular imports

#### Manual Verification:

- [x] All types are importable from `types/game.ts`
- [x] Data files export expected arrays and getter functions

---

## Phase 6.2: Store State and Actions

### Overview

Add crafting state to the Zustand store and implement core actions for crafting operations.

### Changes Required:

#### 1. Update GameState Interface

**File**: `src/types/game.ts`
**Changes**: Add crafting field to GameState interface (around line 98)

```typescript
export interface GameState {
  // ... existing fields ...

  // Crafting system
  crafting: CraftingState;
}
```

#### 2. Initial Crafting State

**File**: `src/stores/gameStore.ts`
**Changes**: Add initial crafting state to `initialState` object

```typescript
const initialState: GameState = {
  // ... existing fields ...

  crafting: {
    unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
    unlockedRecipes: ['cottage_cheese', 'ricotta', 'cream_cheese'],
    unlockedCaves: ['basic_cellar'],
    activeJobs: [],
    cheeseInventory: [],
    cheeseCollection: {},
    activeBuffs: [],
  },
};
```

#### 3. Store Interface Extension

**File**: `src/stores/gameStore.ts`
**Changes**: Add crafting actions to GameStore interface

```typescript
interface GameStore extends GameState {
  // ... existing actions ...

  // Crafting actions
  unlockIngredient: (ingredientId: string) => boolean;
  unlockRecipe: (recipeId: string) => boolean;
  unlockCave: (caveId: string) => boolean;
  canAffordCave: (caveId: string) => boolean;

  startCrafting: (recipeId: string, caveId: string, ingredients: CraftingJob['ingredients']) => boolean;
  canStartCrafting: (recipeId: string, caveId: string) => { canStart: boolean; reason?: string };
  getCaveAvailableSlots: (caveId: string) => number;

  tickCrafting: (deltaMs: number) => void;
  collectCheese: (jobId: string) => CraftedCheese | null;

  consumeCheese: (cheeseId: string) => boolean;
  sellCheese: (cheeseId: string) => Decimal;

  addInteraction: (jobId: string, interaction: Omit<CraftingInteraction, 'timestamp'>) => boolean;

  tickBuffs: (deltaMs: number) => void;
  getActiveBuffMultipliers: () => { production: number; click: number; xp: number };

  // Crafting getters
  getUnlockedRecipes: () => CheeseRecipe[];
  getUnlockedCaves: () => AffinageCave[];
  getActiveJobs: () => CraftingJob[];
  getCheeseInventory: () => CraftedCheese[];
  getJobProgress: (jobId: string) => number;  // 0-100
}
```

#### 4. Implement Crafting Actions

**File**: `src/stores/gameStore.ts`
**Changes**: Implement all crafting actions following existing patterns

Key implementation details:
- `startCrafting`: Check cave capacity, ingredient costs, create job with timestamps
- `tickCrafting`: Called from game loop, check for completed jobs
- `collectCheese`: Move from activeJobs to cheeseInventory, update collection stats
- `consumeCheese`: Apply buffs, remove from inventory
- `sellCheese`: Calculate value based on quality, add to curds

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] Store actions callable from dev tools
- [ ] State changes persist in store
- [ ] No runtime errors when calling actions

---

## Phase 6.3: Crafting Engine System

### Overview

Create a dedicated crafting engine module that handles crafting calculations, similar to `productionEngine.ts` and `combatEngine.ts`.

### Changes Required:

#### 1. Crafting Engine Module

**File**: `src/systems/craftingEngine.ts` (NEW FILE)
**Changes**: Implement crafting calculation functions

```typescript
// Key functions to implement:

export function calculateIngredientCost(
  ingredientId: string,
  quantity: number
): { curds: Decimal; whey: Decimal };

export function calculateCheeseQuality(
  recipe: CheeseRecipe,
  ingredients: CraftingJob['ingredients'],
  cave: AffinageCave,
  interactions: CraftingInteraction[]
): number;

export function calculateCheeseValue(
  recipe: CheeseRecipe,
  quality: number
): Decimal;

export function calculateAgingProgress(
  job: CraftingJob,
  currentTime: number
): number;  // 0-100

export function isJobComplete(
  job: CraftingJob,
  currentTime: number
): boolean;

export function canUnlockRecipe(
  recipe: CheeseRecipe,
  state: GameState
): boolean;

export function canUnlockCave(
  cave: AffinageCave,
  state: GameState
): boolean;

export function getAvailableRecipesForCave(
  caveId: string,
  state: GameState
): CheeseRecipe[];

export function calculateBuffEffect(
  effect: CheeseEffect,
  quality: number
): CheeseEffect;  // Quality-scaled effect
```

#### 2. Quality Calculation Details

Quality formula:
```
baseQuality = recipe.baseQuality
milkBonus = milkType.qualityModifier (cow: 0, goat: +5, sheep: +10, etc.)
cultureBonus = cultureType.qualityModifier (basic: 0, artisan: +10, legendary: +20)
caveBonus = cave.qualityBonus
interactionBonus = sum(interactions.qualityEffect)
finalQuality = clamp(baseQuality + milkBonus + cultureBonus + caveBonus + interactionBonus, 1, 100)
```

#### 3. Value Calculation Details

Value formula:
```
baseValue = recipe.baseValue
qualityMultiplier = 0.5 + (quality / 100) * 1.5  // Quality 1 = 0.5x, Quality 100 = 2x
finalValue = baseValue * qualityMultiplier
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [x] Quality calculations produce expected values
- [x] Aging progress tracks correctly with time

---

## Phase 6.4: UI Components

### Overview

Build the crafting UI panel and related components following existing UI patterns.

### Changes Required:

#### 1. Main Crafting Panel

**File**: `src/components/ui/CraftingPanel.tsx` (NEW FILE)
**Changes**: Create main crafting interface with tabs

Structure:
- Tab 1: **Recipes** - Browse and start crafting
- Tab 2: **Caves** - View aging progress, collect cheese
- Tab 3: **Inventory** - View/use/sell collected cheese
- Tab 4: **Collection** - Achievement-style checklist

#### 2. Recipe Selection Component

**File**: `src/components/ui/crafting/RecipeCard.tsx` (NEW FILE)
**Changes**: Display recipe with ingredients selector

- Recipe image/icon
- Name, description, category badge
- Ingredient dropdowns (milk, culture, rennet, specialty)
- Cost display
- Aging duration display
- Start Crafting button (disabled if can't afford or no slots)

#### 3. Cave Status Component

**File**: `src/components/ui/crafting/CaveCard.tsx` (NEW FILE)
**Changes**: Display cave with active jobs

- Cave name and capacity (X/Y slots used)
- Quality bonus indicator
- List of active aging jobs with progress bars
- Collect button for completed cheeses
- Interaction buttons for applicable cheeses (rind wash, etc.)

#### 4. Cheese Inventory Component

**File**: `src/components/ui/crafting/CheeseInventoryCard.tsx` (NEW FILE)
**Changes**: Display collected cheese

- Cheese icon and name
- Quality indicator (star rating or numeric)
- Effect preview
- Use button (apply buff)
- Sell button (convert to curds with value preview)

#### 5. Active Buffs Display

**File**: `src/components/ui/crafting/ActiveBuffsBar.tsx` (NEW FILE)
**Changes**: Show active cheese buffs in HUD

- Small icons for active buffs
- Tooltip with buff details
- Time remaining indicator

#### 6. Integration with Main UI

**File**: `src/components/ui/TabPanel.tsx` (or equivalent)
**Changes**: Add Crafting tab to main game UI

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] No React key warnings

#### Manual Verification:

- [ ] All tabs navigate correctly
- [ ] Recipe selection works with ingredient dropdowns
- [ ] Progress bars update in real-time
- [ ] Collect/Use/Sell buttons function correctly

---

## Phase 6.5: System Integration

### Overview

Connect crafting system to game loop, save system, and prestige system.

### Changes Required:

#### 1. Game Loop Integration

**File**: `src/systems/gameLoop.ts`
**Changes**: Add crafting tick to main loop

```typescript
function tick(currentTime: number) {
  // ... existing code ...

  // Crafting tick
  store.tickCrafting(cappedDelta);
  store.tickBuffs(cappedDelta);

  // ... existing code ...
}
```

#### 2. Save System Integration

**File**: `src/systems/saveSystem.ts`
**Changes**: Add crafting state to serialization

- Bump SAVE_VERSION
- Add `crafting` field to SerializedGameState
- Handle migration from previous version (initialize empty crafting state)
- Serialize/deserialize Decimal values for cheese values

#### 3. Offline Progress Integration

**File**: `src/systems/saveSystem.ts`
**Changes**: Calculate offline crafting progress

```typescript
export function calculateOfflineProgress(lastSaved: number): OfflineProgress {
  // ... existing calculation ...

  // Check for completed crafting jobs
  const completedJobs = state.crafting.activeJobs.filter(
    job => job.endTime <= now
  );

  return {
    // ... existing fields ...
    completedCheeses: completedJobs.length,
  };
}
```

#### 4. Prestige Integration

**File**: `src/stores/gameStore.ts`
**Changes**: Update performAging to preserve caves and collection

```typescript
performAging: () => {
  // ... existing reset logic ...

  // Preserve crafting progress (caves, collection)
  // Reset: active jobs (cancel), inventory (lose), active buffs (expire)
  // Keep: unlocked caves, cheese collection stats, unlocked recipes
}
```

#### 5. Production Multiplier Integration

**File**: `src/systems/productionEngine.ts`
**Changes**: Include cheese buff multipliers in CPS calculation

```typescript
export function calculateTotalProductionMultiplier(state: GameState): number {
  // ... existing multipliers ...

  const cheeseBuffMultiplier = calculateCheeseBuffProductionMultiplier(state.crafting.activeBuffs);

  return baseMultiplier * cheeseBuffMultiplier;
}
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] Saving and loading preserves crafting state
- [ ] Offline progress shows completed cheeses
- [ ] Prestige reset behaves correctly (keeps caves, resets jobs)
- [ ] Cheese buffs affect production/click values

---

## Phase 6.6: Polish and Balance

### Overview

Add notifications, achievements, balance tuning, and final polish.

### Changes Required:

#### 1. Crafting Notifications

**File**: `src/stores/gameStore.ts`
**Changes**: Add callback for crafting events

```typescript
type CraftingEventCallback = (event: CraftingEvent) => void;
let craftingEventCallback: CraftingEventCallback | null = null;

export function setCraftingEventCallback(callback: CraftingEventCallback | null): void {
  craftingEventCallback = callback;
}

type CraftingEvent =
  | { type: 'cheese_complete'; cheese: CraftedCheese }
  | { type: 'recipe_unlocked'; recipe: CheeseRecipe }
  | { type: 'cave_unlocked'; cave: AffinageCave }
  | { type: 'buff_activated'; buff: CheeseActiveBuff }
  | { type: 'buff_expired'; buff: CheeseActiveBuff };
```

#### 2. Crafting Achievements

**File**: `src/data/achievements.ts`
**Changes**: Add crafting-related achievements

- "First Curd Crafted" - Craft your first cheese
- "Fromager Apprentice" - Craft 10 different cheese types
- "Master Affineur" - Own all 5 caves
- "Cheese Sommelier" - Craft a legendary cheese
- "Patience is a Virtue" - Age a cheese for 24+ hours
- "Quality Control" - Craft a 100-quality cheese
- "Cheese Hoarder" - Have 50 cheeses in inventory

#### 3. Achievement Requirement Types

**File**: `src/types/game.ts`
**Changes**: Add crafting achievement requirements

```typescript
export type AchievementRequirement =
  // ... existing types ...
  | { type: 'cheese_crafted_total'; count: number }
  | { type: 'cheese_types_crafted'; count: number }
  | { type: 'caves_owned'; count: number }
  | { type: 'cheese_quality'; quality: number }
  | { type: 'cheese_inventory_size'; count: number };
```

#### 4. Balance Tuning

**File**: `src/data/cheeseRecipes.ts`
**Changes**: Tune aging durations and values

Aging duration guidelines:
- Fresh: 0 (instant)
- Soft: 2-8 minutes (real-time)
- Semi-Hard: 15-30 minutes
- Hard: 1-4 hours
- Legendary: 8-24 hours

Value guidelines:
- Fresh cheese value ~= 1 minute of CPS at time of unlock
- Each tier ~10x previous tier value
- Quality affects value 0.5x to 2x

#### 5. Canadian Flavor Text

**File**: `src/data/cheeseRecipes.ts`
**Changes**: Add Canadian humor to descriptions

- Oka: "The original Canadian artisan cheese. Monks make it, eh!"
- Poutine Curds: "Squeaky fresh! Perfect on fries with gravy."
- Dragon's Breath Blue: "From Nova Scotia. Spicier than a Maritimer's temper."

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] Notifications appear for crafting events
- [ ] Achievements unlock correctly
- [ ] Balance feels rewarding without being trivial
- [ ] Canadian humor is present and appropriate

---

## Testing Strategy

### Unit Testing

1. **Crafting Engine Tests** (`src/systems/__tests__/craftingEngine.test.ts`)
   - Quality calculation with various inputs
   - Value calculation accuracy
   - Progress tracking over time
   - Unlock requirement checks

2. **Store Action Tests** (`src/stores/__tests__/craftingActions.test.ts`)
   - Start crafting with valid/invalid inputs
   - Collect cheese at right time
   - Buff application and expiration
   - Prestige reset behavior

### Integration Testing

1. **Save/Load Round-Trip**
   - Start crafting, save, reload, verify state
   - Complete cheese, save, reload, verify inventory

2. **Offline Progress**
   - Start long-aging cheese, close tab, return, verify completion

### Manual Testing Checklist

- [ ] Fresh cheese crafts instantly
- [ ] Soft cheese ages for expected duration
- [ ] Quality bonus from caves applies correctly
- [ ] Selling cheese adds correct curds
- [ ] Using cheese applies buff
- [ ] Buff affects CPS/click values
- [ ] Prestige preserves caves but clears active jobs
- [ ] All achievements can be earned

---

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Existing equipment pattern: `src/data/equipment.ts`
- Existing type patterns: `src/types/game.ts`
- Game loop pattern: `src/systems/gameLoop.ts`
- Store pattern: `src/stores/gameStore.ts`
- Save system: `src/systems/saveSystem.ts`
