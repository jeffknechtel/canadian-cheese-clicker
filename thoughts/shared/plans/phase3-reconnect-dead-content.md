# Phase 3: Reconnect Dead & Phantom Content Implementation Plan

## Overview

Phase 3 addresses the mountain of already-built content that is currently unreachable due to data mismatches, missing callers, and phantom IDs. This is one of the highest-payoff phases because the content already exists — we're just wiring it up. The phase covers ~10 broken achievements, 2 challenge rewards, 6 seasonal exclusive items, 14 province-locked recipes, cave/recipe/ingredient unlock UI, golden cheese fallback, and combat drops.

## Current State Analysis

The game has extensive content that players can never access:

1. **Achievements (D-2)**: 6 wrong zone IDs in `PROVINCIAL_ZONES` + broken boss matcher using string includes that never matches
2. **Challenge Rewards (D-3)**: `truffle` → `specialty_truffle`, `explorers_compass` → `cheesemakers_compass`
3. **Seasonal Events (D-1)**: 6 phantom IDs (`maple-firework-curd`, `festival-poutine-supreme`, `ice-sculpture-aged`, `canada-day-cape`, `stanley-cup-replica`, `winterlude-toque`) that pollute saves
4. **Province Recipes (K-2)**: `province_complete` checks `zoneProgress[provinceId]` but map is keyed by zone IDs
5. **Crafting Progression (K-1)**: `unlockCave` has zero callers; `unlockRecipe` only called with phantom IDs; `RecipeCard` hardcodes `specialtyItems: []`
6. **Golden Cheese (P-7)**: `rareIngredient` ignores `unlockIngredient()` return value, shows false success
7. **Combat Drops (D-4)**: Drops rolled and displayed but never granted; aging combat bonus never applied; event drops bonus never consumed

## Desired End State

- **Zero phantom IDs** validated by a dev-time test that asserts all referenced IDs exist in their registries
- Every achievement unlockable through actual gameplay
- Challenge rewards grant the correct items
- Seasonal events work correctly (either with real content or phantom references removed)
- All 48 recipes reachable through play (province completion, prestige, etc.)
- All 5 caves purchasable via UI with rennet
- Specialty ingredients selectable in crafting UI
- Golden cheese `rareIngredient` falls back gracefully
- Combat drops granted as specialty ingredients; aging bonus and event bonuses applied

## What We're NOT Doing

- Full materials inventory system (drops map to existing specialty ingredients)
- Creating the 6 seasonal exclusive items (we'll remove the phantom references and track as future content)
- Vintage/Legacy prestige shipping (that's Phase 6d)
- Branded ID types (that's Phase 4 DDD work)
- UI polish for new cave unlock panel (functional first)

---

## Phase 1: Achievement Fixes

### Overview

Fix the 6 wrong zone IDs in `PROVINCIAL_ZONES` and replace the broken boss matcher with a proper zone lookup.

### Changes Required:

#### 1. Fix PROVINCIAL_ZONES Array

**File**: `src/stores/slices/achievements/achievementSlice.ts`
**Lines**: 13-27

```typescript
// BEFORE (wrong IDs):
const PROVINCIAL_ZONES = [
  'ontario_cheese_trail',      // wrong
  'quebec_fromage_frontier',   // wrong
  'alberta_stampede_range',    // wrong
  'manitoba_prairie_curds',    // wrong
  'saskatchewan_wheat_wheels', // wrong
  'bc_pacific_creamery',       // wrong
  'nova_scotia_maritime',
  'new_brunswick_bridges',
  'pei_annes_island',
  'newfoundland_viking_shores',
  'yukon_gold_rush',
  'nwt_aurora_territories',
  'nunavut_frozen_crown',
];

// AFTER (correct IDs from zones.ts):
const PROVINCIAL_ZONES = [
  'ontario_cheese_caves',
  'quebec_fromagerie',
  'alberta_oil_fields',
  'manitoba_frozen_rinks',
  'saskatchewan_prairie',
  'bc_coastal_caves',
  'nova_scotia_maritime',
  'new_brunswick_bridges',
  'pei_annes_island',
  'newfoundland_viking_shores',
  'yukon_gold_rush',
  'nwt_aurora_territories',
  'nunavut_frozen_crown',
];
```

#### 2. Fix Boss Achievement Matcher

**File**: `src/stores/slices/achievements/achievementSlice.ts`
**Lines**: 145-153

Add import at top of file:
```typescript
import { ZONES } from '../../../data/zones';
```

Replace the broken matcher:
```typescript
// BEFORE (broken string includes):
case 'bossDefeated': {
  const bossId = requirement.bossId;
  for (const [zoneId, progress] of Object.entries(state.zoneProgress)) {
    if (progress.bossDefeated && zoneId.includes(bossId.replace('_boss', ''))) {
      return true;
    }
  }
  return false;
}

// AFTER (proper zone lookup):
case 'bossDefeated': {
  const bossId = requirement.bossId;
  const zone = ZONES.find((z) => z.bossStage?.bossId === bossId);
  if (!zone) return false;
  return state.zoneProgress[zone.id]?.bossDefeated === true;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Unit tests pass: `npm test`

#### Manual Verification:
- [ ] Defeat Manitoba boss → "Manitoba Champion" achievement unlocks
- [ ] Complete all 13 provincial zones → "All Provinces Conquered" achievement unlocks
- [ ] Boss achievements visible in achievements panel with correct progress

---

## Phase 2: Challenge Reward ID Fixes

### Overview

Fix the two phantom reward IDs in weekly challenges.

### Changes Required:

#### 1. Fix Challenge Reward IDs

**File**: `src/data/challenges.ts`

**Line 25** - Fix ingredient ID:
```typescript
// BEFORE:
reward: { type: 'ingredient', ingredientId: 'truffle' },

// AFTER:
reward: { type: 'ingredient', ingredientId: 'specialty_truffle' },
```

**Line 33** - Fix equipment ID:
```typescript
// BEFORE:
reward: { type: 'equipment', equipmentId: 'explorers_compass' },

// AFTER:
reward: { type: 'equipment', equipmentId: 'cheesemakers_compass' },
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Complete "Click Champion" challenge → specialty_truffle added to unlockedIngredients
- [ ] Complete "Zone Explorer" challenge → cheesemakers_compass added to equipmentInventory

---

## Phase 3: Seasonal Event Phantom ID Cleanup

### Overview

Remove the 6 phantom exclusive content IDs from events and add a migration to strip phantom IDs from existing saves. We'll track creation of the actual content as future work rather than blocking on it.

### Changes Required:

#### 1. Remove Phantom IDs from Events

**File**: `src/data/events.ts`

Remove or comment out the `exclusiveContent` for each event until the content is created:

**Lines 21-24** (Canada Day):
```typescript
// BEFORE:
exclusiveContent: {
  cheeses: ['maple-firework-curd'],
  equipment: ['canada-day-cape'],
},

// AFTER:
exclusiveContent: {
  cheeses: [],
  equipment: [],
},
```

**Lines 40-43** (Poutine Week):
```typescript
// BEFORE:
exclusiveContent: {
  cheeses: ['festival-poutine-supreme'],
},

// AFTER:
exclusiveContent: {
  cheeses: [],
  equipment: [],
},
```

**Lines 59-62** (Hockey Season):
```typescript
// BEFORE:
exclusiveContent: {
  equipment: ['stanley-cup-replica'],
},

// AFTER:
exclusiveContent: {
  cheeses: [],
  equipment: [],
},
```

**Lines 78-82** (Winterlude):
```typescript
// BEFORE:
exclusiveContent: {
  cheeses: ['ice-sculpture-aged'],
  equipment: ['winterlude-toque'],
},

// AFTER:
exclusiveContent: {
  cheeses: [],
  equipment: [],
},
```

#### 2. Add ID Validation to eventSlice

**File**: `src/stores/slices/events/eventSlice.ts`

Add imports at top:
```typescript
import { EQUIPMENT } from '../../../data/equipment';
import { recipeRegistry } from '../../../domain/registry/recipes';
```

Modify the equipment granting logic (around lines 85-93):
```typescript
// BEFORE:
if (event.exclusiveContent.equipment) {
  for (const equipmentId of event.exclusiveContent.equipment) {
    if (!get().equipmentInventory.includes(equipmentId)) {
      set((s) => ({
        equipmentInventory: [...s.equipmentInventory, equipmentId],
      }));
    }
  }
}

// AFTER:
if (event.exclusiveContent.equipment) {
  for (const equipmentId of event.exclusiveContent.equipment) {
    // Validate equipment exists before granting
    const equipmentExists = EQUIPMENT.some((e) => e.id === equipmentId);
    if (equipmentExists && !get().equipmentInventory.includes(equipmentId)) {
      set((s) => ({
        equipmentInventory: [...s.equipmentInventory, equipmentId],
      }));
    }
  }
}
```

Similarly for recipes (around lines 81-84):
```typescript
// AFTER:
if (event.exclusiveContent.cheeses) {
  for (const recipeId of event.exclusiveContent.cheeses) {
    // Validate recipe exists before unlocking
    if (recipeRegistry.get(recipeId)) {
      get().unlockRecipe(recipeId);
    }
  }
}
```

#### 3. Add Migration to Strip Phantom IDs

**File**: `src/systems/migrations.ts`

Add import at top:
```typescript
import { EQUIPMENT } from '../data/equipment';
import { CHEESE_RECIPES } from '../data/cheeseRecipes';
```

Update `CURRENT_VERSION` (line ~6):
```typescript
export const CURRENT_VERSION = 10;
```

Add new migration after the v8→v9 migration:
```typescript
{
  fromVersion: 9,
  toVersion: 10,
  migrate: (data) => {
    const validEquipmentIds = new Set(EQUIPMENT.map((e) => e.id));
    const validRecipeIds = new Set(CHEESE_RECIPES.map((r) => r.id));

    return {
      ...data,
      // Strip phantom equipment IDs
      equipmentInventory: (data.equipmentInventory ?? []).filter(
        (id: string) => validEquipmentIds.has(id)
      ),
      // Strip phantom recipe IDs if crafting state exists
      crafting: data.crafting
        ? {
            ...data.crafting,
            unlockedRecipes: (data.crafting.unlockedRecipes ?? []).filter(
              (id: string) => validRecipeIds.has(id)
            ),
          }
        : data.crafting,
    };
  },
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Unit tests pass: `npm test`

#### Manual Verification:
- [ ] Load a save with phantom equipment IDs → they are stripped
- [ ] Trigger Canada Day event (mock date) → no phantom IDs added to inventory
- [ ] Events still activate/deactivate correctly with multipliers working

---

## Phase 4: Province-Complete Recipe Unlock Fix

### Overview

Create a province-to-zone mapping and fix `checkUnlockRequirement` to use it. This unlocks 14 recipes that require province completion.

### Changes Required:

#### 1. Add Province-to-Zone Mapping

**File**: `src/data/zones.ts`

Add near the top of the file (after imports, before ZONES array):
```typescript
import { Province } from '../types/game';

export const PROVINCE_TO_ZONE: Record<Province, string> = {
  ontario: 'ontario_cheese_caves',
  quebec: 'quebec_fromagerie',
  alberta: 'alberta_oil_fields',
  saskatchewan: 'saskatchewan_prairie',
  bc: 'bc_coastal_caves',
  manitoba: 'manitoba_frozen_rinks',
  nova_scotia: 'nova_scotia_maritime',
  new_brunswick: 'new_brunswick_bridges',
  pei: 'pei_annes_island',
  newfoundland: 'newfoundland_viking_shores',
  yukon: 'yukon_gold_rush',
  nwt: 'nwt_aurora_territories',
  nunavut: 'nunavut_frozen_crown',
};
```

#### 2. Fix checkUnlockRequirement

**File**: `src/systems/craftingEngine.ts`

Add import:
```typescript
import { PROVINCE_TO_ZONE } from '../data/zones';
import { Province } from '../types/game';
```

Fix the province/province_complete case (around lines 75-77):
```typescript
// BEFORE:
case 'province':
case 'province_complete':
  return ctx.zoneProgress[req.provinceId]?.bossDefeated ?? false;

// AFTER:
case 'province':
case 'province_complete': {
  const zoneId = PROVINCE_TO_ZONE[req.provinceId as Province];
  if (!zoneId) return false;
  return ctx.zoneProgress[zoneId]?.bossDefeated ?? false;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Defeat Quebec boss → "Île-aux-Grues" recipe becomes craftable
- [ ] Defeat Alberta boss → "Gunn's Hill Artisan 5yr" recipe becomes craftable
- [ ] Check all 14 province-locked recipes are unlockable after their province boss is defeated

---

## Phase 5: Crafting Unlock UI

### Overview

Add UI for cave unlocking with rennet, and fix the specialtyItems TODO in RecipeCard.

### Changes Required:

#### 1. Add Cave Unlock UI to CraftingPanel

**File**: `src/components/ui/CraftingPanel.tsx`

In the CavesTab section (around lines 190-214), add a locked caves section:

```typescript
// Add import at top
import { CAVES } from '../../data/caves';

// Inside CavesTab component, add after the unlocked caves mapping:
const lockedCaves = CAVES.filter(
  (cave) => !crafting.unlockedCaves.includes(cave.id)
);

// In the render, after the existing caves map:
{lockedCaves.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-3">Available for Purchase</h3>
    <div className="grid gap-4">
      {lockedCaves.map((cave) => {
        const canAfford = prestige.rennet >= cave.unlockCost;
        return (
          <div
            key={cave.id}
            className="p-4 bg-surface-secondary rounded-lg border border-border"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{cave.name}</h4>
                <p className="text-sm text-muted">{cave.description}</p>
                <p className="text-sm mt-1">
                  Capacity: {cave.maxSlots} slots | Quality: +{cave.qualityBonus}%
                </p>
              </div>
              <button
                onClick={() => unlockCave(cave.id)}
                disabled={!canAfford}
                className={`px-4 py-2 rounded ${
                  canAfford
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🧀 {cave.unlockCost} Rennet
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

Also update the empty state message (line ~195):
```typescript
// BEFORE:
<p>Gain Rennet to unlock your first cave!</p>

// AFTER:
<p>Purchase caves below using Rennet!</p>
```

Get `unlockCave` and prestige from the store:
```typescript
const { unlockCave } = useGameStore();
const prestige = useGameStore((s) => s.prestige);
```

#### 2. Fix RecipeCard specialtyItems

**File**: `src/components/ui/crafting/RecipeCard.tsx`

This requires a more substantial change to allow specialty item selection. For Phase 3, we'll at least pass through the recipe's required specialty items instead of hardcoding empty:

Around line 70:
```typescript
// BEFORE:
specialtyItems: [], // TODO: Add specialty item selection

// AFTER:
specialtyItems: recipe.requiredIngredients?.specialtyItems ?? [],
```

Note: This auto-selects all required specialty items. A proper selector UI would be Phase 5/6 work.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Open Crafting → Caves tab → see locked caves with purchase buttons
- [ ] With sufficient rennet, click purchase → cave unlocks
- [ ] Without sufficient rennet, button is disabled
- [ ] Recipes requiring specialty items can be started (if items are unlocked)

---

## Phase 6: Golden Cheese rareIngredient Fix

### Overview

Fix the `rareIngredient` reward to check the return value of `unlockIngredient` and fall back gracefully.

### Changes Required:

#### 1. Fix rareIngredient Logic

**File**: `src/systems/goldenCheeseSystem.ts`

Replace the rareIngredient case (around lines 93-108):
```typescript
// BEFORE:
case 'rareIngredient': {
  const unlockedIds = state.crafting.unlockedIngredients;
  const available = SPECIALTY_ITEMS.filter((i) => !unlockedIds.includes(i.id));

  if (available.length > 0) {
    const ingredient = available[Math.floor(Math.random() * available.length)];
    state.unlockIngredient(ingredient.id);
    return { description: `Rare Find! Unlocked ${ingredient.name}` };
  }

  const fallbackAmount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
  state.addCurds(fallbackAmount);
  return { description: `Lucky Curds! +${fallbackAmount.toFixed(0)} curds`, amount: fallbackAmount };
}

// AFTER:
case 'rareIngredient': {
  const unlockedIds = state.crafting.unlockedIngredients;
  const available = SPECIALTY_ITEMS.filter((i) => !unlockedIds.includes(i.id));

  // Shuffle and try each ingredient until one succeeds
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  
  for (const ingredient of shuffled) {
    const success = state.unlockIngredient(ingredient.id);
    if (success) {
      return { description: `Rare Find! Unlocked ${ingredient.name}` };
    }
  }

  // All ingredients either already unlocked or requirements not met
  const fallbackAmount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
  state.addCurds(fallbackAmount);
  return { description: `Lucky Curds! +${fallbackAmount.toFixed(0)} curds`, amount: fallbackAmount };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Early game: click golden cheese → if ingredient requirements not met → get curds fallback
- [ ] With requirements met: click golden cheese → actually unlock an ingredient
- [ ] Never see "Rare Find!" without the ingredient actually being added

---

## Phase 7: Combat Rewards Implementation

### Overview

Grant combat drops as specialty ingredients, apply the aging combat bonus, and consume the event drops multiplier. This is the most substantial phase as it requires adding state for ingredient quantities.

### Changes Required:

#### 1. Add Ingredient Inventory to CraftingState

**File**: `src/types/game.ts`

Update CraftingState (around line 668):
```typescript
export interface CraftingState {
  ingredientInventory: Record<string, number>; // NEW: itemId -> quantity
  unlockedIngredients: string[];
  unlockedRecipes: string[];
  unlockedCaves: string[];
  activeJobs: CraftingJob[];
  cheeseInventory: CraftedCheese[];
  cheeseCollection: Record<string, number>;
  activeBuffs: CheeseActiveBuff[];
}
```

#### 2. Update Crafting Reset Factory

**File**: `src/stores/slices/crafting/resetFactory.ts`

Add the new field to the default state:
```typescript
export function createCraftingState(): CraftingState {
  return {
    ingredientInventory: {}, // NEW
    unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
    // ... rest unchanged
  };
}
```

#### 3. Add addIngredient Action

**File**: `src/stores/slices/crafting/craftingSlice.ts`

Add new action:
```typescript
addIngredient: (ingredientId: string, quantity: number) => {
  set((state) => ({
    crafting: {
      ...state.crafting,
      ingredientInventory: {
        ...state.crafting.ingredientInventory,
        [ingredientId]: (state.crafting.ingredientInventory[ingredientId] ?? 0) + quantity,
      },
    },
  }));
},
```

#### 4. Create Drop-to-Ingredient Mapping

**File**: `src/data/dropMapping.ts` (NEW FILE)

```typescript
// Maps combat drop itemIds to specialty ingredient IDs
// Drops that don't map are silently ignored (future expansion)
export const DROP_TO_INGREDIENT: Record<string, string> = {
  mold_essence: 'specialty_blue_mold',
  white_mold: 'specialty_white_mold',
  truffle_spore: 'specialty_truffle',
  maple_sap: 'specialty_maple_syrup',
  wild_herbs: 'specialty_herbs',
  smoked_salt: 'specialty_smoked_salt',
  peppercorn: 'specialty_peppercorn',
  cranberry: 'specialty_cranberry',
  honey: 'specialty_honey',
  ash: 'specialty_ash',
};
```

#### 5. Handle Drops in Event Subscriber

**File**: `src/stores/slices/production/eventSubscriber.ts`

Add import:
```typescript
import { DROP_TO_INGREDIENT } from '../../../data/dropMapping';
```

Update the BattleWon subscriber:
```typescript
const unsubBattleWon = subscribe('BattleWon', (event) => {
  const store = useGameStore.getState();
  store.addCurds(event.rewards.curds);
  useGameStore.setState((s) => ({
    whey: s.whey.plus(event.rewards.whey),
    currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
  }));
  
  // NEW: Grant drops as ingredients
  for (const drop of event.rewards.drops) {
    if (drop.itemType === 'material') {
      const ingredientId = DROP_TO_INGREDIENT[drop.itemId];
      if (ingredientId) {
        // Also unlock the ingredient if not already unlocked
        store.unlockIngredient(ingredientId);
        store.addIngredient(ingredientId, drop.quantity);
      }
    }
  }
});
```

#### 6. Apply Prestige Combat Bonus

**File**: `src/systems/combatEngine.ts`

Update `calculateCombatRewards` signature and implementation (around line 636):
```typescript
export function calculateCombatRewards(
  enemies: CombatEnemy[],
  partyHeroIds: string[],
  isBoss: boolean,
  heroStates?: Record<string, HeroCombatState>,
  prestigeCombatMultiplier: number = 1 // NEW parameter
): CombatRewards {
  // ... existing code ...
  
  // After boss multipliers are applied (around line 704-706):
  // Apply prestige combat bonus
  totalCurds = totalCurds.mul(prestigeCombatMultiplier);
  totalXp = Math.floor(totalXp * prestigeCombatMultiplier);
  // Note: drops quantity could also be scaled, but keeping it simpler for now
```

**File**: `src/stores/slices/combat/combatSlice.ts`

Update the call to `calculateCombatRewards` (around line 356):
```typescript
// BEFORE:
const rewards = calculateCombatRewards(
  updated.enemies,
  partyHeroIds,
  isBoss,
  updated.heroStates
);

// AFTER:
const prestigeMultipliers = get().getPrestigeMultipliers();
const rewards = calculateCombatRewards(
  updated.enemies,
  partyHeroIds,
  isBoss,
  updated.heroStates,
  prestigeMultipliers.combat
);
```

#### 7. Apply Event Drops Multiplier

**File**: `src/systems/combatEngine.ts`

Add import:
```typescript
import { calculateEventBonusMultiplier } from '../data/events';
```

Update `calculateCombatRewards` to accept activeEventIds and apply drops bonus:
```typescript
export function calculateCombatRewards(
  enemies: CombatEnemy[],
  partyHeroIds: string[],
  isBoss: boolean,
  heroStates?: Record<string, HeroCombatState>,
  prestigeCombatMultiplier: number = 1,
  activeEventIds: string[] = [] // NEW parameter
): CombatRewards {
  // ... existing drop rate bonus code ...
  
  // Apply event drops multiplier
  const eventDropMultiplier = calculateEventBonusMultiplier(activeEventIds, 'drops');
  const dropMultiplier = (1 + dropRateBonus / 100) * eventDropMultiplier;
  
  // Use dropMultiplier in the drop chance calculation
```

Update call site in combatSlice.ts:
```typescript
const activeEventIds = get().events.filter(e => e.isActive).map(e => e.id);
const rewards = calculateCombatRewards(
  updated.enemies,
  partyHeroIds,
  isBoss,
  updated.heroStates,
  prestigeMultipliers.combat,
  activeEventIds
);
```

#### 8. Update Migration for New State Field

**File**: `src/systems/migrations.ts`

The v9→v10 migration should also handle the new `ingredientInventory` field:
```typescript
{
  fromVersion: 9,
  toVersion: 10,
  migrate: (data) => {
    // ... existing phantom ID stripping ...
    
    return {
      ...data,
      equipmentInventory: /* existing */,
      crafting: data.crafting
        ? {
            ...data.crafting,
            unlockedRecipes: /* existing */,
            ingredientInventory: data.crafting.ingredientInventory ?? {}, // NEW
          }
        : data.crafting,
    };
  },
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Unit tests pass: `npm test`

#### Manual Verification:
- [ ] Win combat with drops → ingredients added to inventory
- [ ] Buy "Battle-Hardened Cheese" upgrade → combat rewards increase by 20%
- [ ] During Winterlude event → drop rates increased by 50%
- [ ] Combat results modal shows drops AND they're actually granted

---

## Phase 8: Dev-Time Validation Test

### Overview

Add a test that validates all ID references exist in their target registries. This prevents future phantom ID bugs.

### Changes Required:

#### 1. Create ID Validation Test

**File**: `src/__tests__/idValidation.test.ts` (NEW FILE)

```typescript
import { describe, it, expect } from 'vitest';
import { CHALLENGES } from '../data/challenges';
import { EVENTS } from '../data/events';
import { ACHIEVEMENTS } from '../data/achievements';
import { CHEESE_RECIPES } from '../data/cheeseRecipes';
import { EQUIPMENT } from '../data/equipment';
import { INGREDIENTS, SPECIALTY_ITEMS } from '../data/ingredients';
import { ZONES } from '../data/zones';

const recipeIds = new Set(CHEESE_RECIPES.map((r) => r.id));
const equipmentIds = new Set(EQUIPMENT.map((e) => e.id));
const ingredientIds = new Set([
  ...INGREDIENTS.map((i) => i.id),
  ...SPECIALTY_ITEMS.map((i) => i.id),
]);
const zoneIds = new Set(ZONES.map((z) => z.id));

describe('ID Validation', () => {
  describe('Challenge Rewards', () => {
    it('should reference valid ingredient IDs', () => {
      for (const challenge of CHALLENGES) {
        if (challenge.reward.type === 'ingredient') {
          expect(
            ingredientIds.has(challenge.reward.ingredientId),
            `Challenge "${challenge.id}" references invalid ingredient "${challenge.reward.ingredientId}"`
          ).toBe(true);
        }
      }
    });

    it('should reference valid equipment IDs', () => {
      for (const challenge of CHALLENGES) {
        if (challenge.reward.type === 'equipment') {
          expect(
            equipmentIds.has(challenge.reward.equipmentId),
            `Challenge "${challenge.id}" references invalid equipment "${challenge.reward.equipmentId}"`
          ).toBe(true);
        }
      }
    });
  });

  describe('Seasonal Events', () => {
    it('should reference valid recipe IDs in exclusiveContent', () => {
      for (const event of EVENTS) {
        for (const recipeId of event.exclusiveContent?.cheeses ?? []) {
          expect(
            recipeIds.has(recipeId),
            `Event "${event.id}" references invalid recipe "${recipeId}"`
          ).toBe(true);
        }
      }
    });

    it('should reference valid equipment IDs in exclusiveContent', () => {
      for (const event of EVENTS) {
        for (const eqId of event.exclusiveContent?.equipment ?? []) {
          expect(
            equipmentIds.has(eqId),
            `Event "${event.id}" references invalid equipment "${eqId}"`
          ).toBe(true);
        }
      }
    });
  });

  describe('Achievements', () => {
    it('should reference valid zone IDs', () => {
      for (const achievement of ACHIEVEMENTS) {
        if (achievement.requirement.type === 'zoneComplete') {
          expect(
            zoneIds.has(achievement.requirement.zoneId),
            `Achievement "${achievement.id}" references invalid zone "${achievement.requirement.zoneId}"`
          ).toBe(true);
        }
      }
    });

    it('should reference valid boss IDs that exist in zones', () => {
      const bossIds = new Set(
        ZONES.filter((z) => z.bossStage).map((z) => z.bossStage!.bossId)
      );
      
      for (const achievement of ACHIEVEMENTS) {
        if (achievement.requirement.type === 'bossDefeated') {
          expect(
            bossIds.has(achievement.requirement.bossId),
            `Achievement "${achievement.id}" references invalid boss "${achievement.requirement.bossId}"`
          ).toBe(true);
        }
      }
    });
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Test file compiles: `npm run typecheck`
- [ ] All ID validation tests pass: `npm test src/__tests__/idValidation.test.ts`

#### Manual Verification:
- [ ] Introduce a phantom ID intentionally → test fails
- [ ] Remove the phantom ID → test passes

---

## Testing Strategy

### Unit Tests:
- ID validation test (Phase 8)
- Achievement matcher test with mocked zone data
- Golden cheese fallback behavior test

### Integration Tests:
- Province completion → recipe unlock flow
- Combat victory → drops granted → ingredients in inventory
- Challenge completion → correct rewards granted

### Manual Testing Steps:
1. Fresh game: verify starter content (3 recipes, 1 cave, 3 ingredients)
2. Earn rennet → purchase additional caves from UI
3. Defeat zone bosses → verify province-locked recipes become craftable
4. Complete weekly challenges → verify correct rewards
5. Trigger seasonal events → verify no phantom IDs added
6. Load old save with phantom IDs → verify migration strips them
7. Win combat battles → verify drops are granted and visible in crafting
8. Purchase aging combat bonus → verify rewards increase

## Performance Considerations

- Province-to-zone lookup is O(1) via static map (no iteration)
- Drop-to-ingredient mapping is O(1)
- ID validation test runs at dev-time only, not in production

## Migration Notes

- v9 → v10 migration strips phantom IDs and adds `ingredientInventory` field
- Existing players won't lose any real content, only phantom data
- New ingredient inventory starts empty (existing drops were never granted anyway)

## References

- Research document: `thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md`
- Bugs addressed: D-1, D-2, D-3, D-4, K-1, K-2, P-7
- Related: Phase 4 (DDD consolidation) will add branded ID types to prevent these bugs at compile time
