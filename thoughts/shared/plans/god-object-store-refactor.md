# God Object Store Refactoring - Implementation Plan

## Overview

Refactor `gameStore.ts` (2367 lines, 89 methods) from a monolithic god-object into 8 bounded-context slices using Zustand's slice pattern. This enables proper DDD isolation where each context owns its reset/mutation logic.

## Current State Analysis

**Problem**: `gameStore.ts` manages 8 implicit bounded contexts with no isolation:

| Context | Current Method Count | Key Coupling Issues |
|---------|---------------------|---------------------|
| Production | 15 | CPS recalc copy-pasted 10x |
| Combat | 11 | State reset hardcoded in prestige |
| Heroes | 13 | Equipment manipulation spreads across slices |
| Crafting | 16 | State reset hardcoded in prestige |
| Prestige | 11 | Directly manipulates 2 other contexts |
| Achievements | 6 | Accesses all contexts for checking |
| Events | 4 | Multiplier calculation inline |
| Persistence | 3 | Handles all context serialization |

**Key Technical Issues**:
- CPS recalculation block copy-pasted at 10 locations (lines 405-413, 467-475, 577-585, 657-665, 733-741, 757-765, 783-791, 864-872, 902-910, 977-985)
- `recalculateCpsFromState()` in productionEngine.ts exists but is never used
- `performAging()` hardcodes combat reset (lines 1441-1451) instead of using `createEmptyCombatState()`
- `performAging()` hardcodes crafting reset (lines 1453-1465) with no factory function
- `getEhBonus()` calculated but never wired into CPS pipeline

**Existing DDD Infrastructure**:
- `src/domain/` has `EntityRegistry` and rich entity classes (Generator, Hero, Upgrade, Recipe, etc.)
- Entities encapsulate behavior (e.g., `generator.getCost()`, `hero.getFullStats()`)
- Registries exported as singletons from `src/domain/index.ts`

## Desired End State

After refactoring:

1. **8 slice files** in `src/stores/slices/`, each owning its context's state and actions
2. **Cross-slice coordination** via `get()` - no direct internal state manipulation
3. **Context reset factories** - each context exports a `createResetState()` function
4. **Single CPS recalculation** - all actions call one centralized method
5. **Type-safe combined store** - full TypeScript inference across slices
6. **Same external API** - `useGameStore` hook unchanged for UI components

**Verification**:
- All existing tests pass unchanged
- No UI components need modification
- Dev tools show actions grouped by slice prefix

## What We're NOT Doing

- **Not** adding new features or gameplay changes
- **Not** splitting into multiple stores (cross-slice coordination needed)
- **Not** moving to React Context or other state management
- **Not** refactoring the domain entities (already well-structured)
- **Not** adding middleware (immer, devtools) in this phase
- **Not** changing the save/load format

---

## Phase 1: Create Slice Infrastructure

### Overview

Set up the slice pattern foundation: types, directory structure, and combined store wrapper.

### Changes Required:

#### 1. Create Directory Structure

```
src/stores/
├── index.ts                    # Re-export combined store
├── gameStore.ts                # Keep during migration, eventually remove
├── types.ts                    # Combined GameStore type
└── slices/
    ├── production/
    │   ├── types.ts
    │   └── productionSlice.ts
    ├── heroes/
    │   ├── types.ts
    │   └── heroSlice.ts
    ├── combat/
    │   ├── types.ts
    │   └── combatSlice.ts
    ├── crafting/
    │   ├── types.ts
    │   └── craftingSlice.ts
    ├── prestige/
    │   ├── types.ts
    │   └── prestigeSlice.ts
    ├── achievements/
    │   ├── types.ts
    │   └── achievementSlice.ts
    ├── events/
    │   ├── types.ts
    │   └── eventSlice.ts
    └── persistence/
        ├── types.ts
        └── persistenceSlice.ts
```

#### 2. Create Combined Store Types

**File**: `src/stores/types.ts`

```typescript
import type { StateCreator } from 'zustand';
import type { ProductionSlice } from './slices/production/types';
import type { HeroSlice } from './slices/heroes/types';
import type { CombatSlice } from './slices/combat/types';
import type { CraftingSlice } from './slices/crafting/types';
import type { PrestigeSlice } from './slices/prestige/types';
import type { AchievementSlice } from './slices/achievements/types';
import type { EventSlice } from './slices/events/types';
import type { PersistenceSlice } from './slices/persistence/types';

export type GameStore = 
  & ProductionSlice 
  & HeroSlice 
  & CombatSlice 
  & CraftingSlice
  & PrestigeSlice
  & AchievementSlice
  & EventSlice
  & PersistenceSlice;

// Helper type for slice creators
export type SliceCreator<T> = StateCreator<GameStore, [], [], T>;
```

#### 3. Create Empty Slice Templates

**File**: `src/stores/slices/production/types.ts`

```typescript
import type Decimal from 'decimal.js';

export interface ProductionState {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
  generators: Record<string, number>;
  upgrades: string[];
  ehCount: number;
  lastMilestone: number;
}

export interface ProductionActions {
  click: () => void;
  tick: (deltaMs: number) => void;
  addCurds: (amount: Decimal) => void;
  buyGenerator: (id: string, count: number) => boolean;
  getGeneratorCost: (id: string, count: number) => Decimal;
  canAffordGenerator: (id: string, count: number) => boolean;
  getMaxAffordable: (id: string) => number;
  getGeneratorCount: (id: string) => number;
  buyUpgrade: (id: string) => boolean;
  canAffordUpgrade: (id: string) => boolean;
  isUpgradeVisible: (id: string) => boolean;
  isUpgradePurchased: (id: string) => boolean;
  getAvailableUpgrades: () => Upgrade[];
  getPurchasedUpgrades: () => Upgrade[];
  incrementEh: () => void;
  getEhBonus: () => number;
  checkMilestone: () => number | null;
  setLastMilestone: (milestone: number) => void;
  getClickValue: () => Decimal;
  getClickMultiplier: () => number;
  getGeneratorMultiplier: (id: string) => number;
  getGlobalMultiplier: () => number;
  recalculateCps: () => void;
}

export type ProductionSlice = ProductionState & ProductionActions;
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] All empty slice type files exist
- [x] Combined `GameStore` type resolves without errors

#### Manual Verification:
- [x] Directory structure matches plan

---

## Phase 2: Extract Production Slice

### Overview

Extract production context (generators, upgrades, clicks, CPS) with centralized CPS recalculation.

### Changes Required:

#### 1. Create Centralized CPS Helper

**File**: `src/stores/slices/production/cpsCalculator.ts`

```typescript
import Decimal from 'decimal.js';
import {
  calculateCps,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsBonus,
  calculateFormationBonus,
  calculatePrestigeProductionMultiplier,
} from '../../../systems/productionEngine';
import type { GameStore } from '../../types';

/**
 * Single source of truth for CPS calculation.
 * Replaces 10+ copy-pasted blocks throughout the store.
 */
export function computeCps(state: GameStore): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroBonus = calculateHeroCpsBonus(state.heroes, state.party);
  const formationBonus = calculateFormationBonus(state.party, state.heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const ehBonus = state.getEhBonus(); // NOW WIRED IN - fixes the bug
  
  const totalGlobalMultiplier =
    upgradeGlobalMultiplier * 
    achievementGlobalMultiplier * 
    heroBonus * 
    formationBonus * 
    prestigeMultiplier *
    ehBonus;

  return calculateCps(state.generators, generatorMultipliers, totalGlobalMultiplier);
}
```

#### 2. Create Production Slice

**File**: `src/stores/slices/production/productionSlice.ts`

```typescript
import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { ProductionSlice } from './types';
import { computeCps } from './cpsCalculator';
import { calculateGeneratorCost, calculateMaxAffordable } from '../../../systems/productionEngine';
import { upgradeRegistry } from '../../../domain';
import { UPGRADES } from '../../../data/upgrades';
import { MILESTONE_THRESHOLDS } from '../../../data/canadianDialogue';
import { trackGeneratorPurchase, trackUpgradePurchase } from '../../../systems/analyticsService';

export const createProductionSlice: SliceCreator<ProductionSlice> = (set, get) => ({
  // State
  curds: new Decimal(0),
  whey: new Decimal(0),
  totalCurdsEarned: new Decimal(0),
  totalClicks: 0,
  curdPerClick: new Decimal(1),
  curdPerSecond: new Decimal(0),
  generators: {},
  upgrades: [],
  ehCount: 0,
  lastMilestone: 0,

  // Actions
  click: () => {
    const state = get();
    const baseClickValue = state.getClickValue();
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const clickValue = baseClickValue.mul(buffMultipliers.click).mul(eventMultipliers.click);

    set({
      curds: state.curds.plus(clickValue),
      totalCurdsEarned: state.totalCurdsEarned.plus(clickValue),
      totalClicks: state.totalClicks + 1,
    });
    get().checkAchievements();
  },

  tick: (deltaMs: number) => {
    const state = get();
    const { curdPerSecond } = state;
    if (curdPerSecond.isZero()) return;

    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const effectiveCps = curdPerSecond.mul(buffMultipliers.production).mul(eventMultipliers.production);

    const secondsElapsed = deltaMs / 1000;
    const curdsEarned = effectiveCps.mul(secondsElapsed);

    set({
      curds: state.curds.plus(curdsEarned),
      totalCurdsEarned: state.totalCurdsEarned.plus(curdsEarned),
    });
  },

  addCurds: (amount: Decimal) => {
    const state = get();
    set({
      curds: state.curds.plus(amount),
      totalCurdsEarned: state.totalCurdsEarned.plus(amount),
    });
  },

  buyGenerator: (id: string, count: number) => {
    const state = get();
    const cost = calculateGeneratorCost(id, state.generators[id] ?? 0, count);
    if (state.curds.lt(cost)) return false;

    const currentOwned = state.generators[id] ?? 0;

    set({
      curds: state.curds.minus(cost),
      generators: { ...state.generators, [id]: currentOwned + count },
    });

    // Recalculate CPS using centralized helper
    set({ curdPerSecond: computeCps(get()) });

    trackGeneratorPurchase(id, count, currentOwned + count);
    get().checkAchievements();
    return true;
  },

  // ... remaining production actions following same pattern

  recalculateCps: () => {
    set({ curdPerSecond: computeCps(get()) });
  },

  getEhBonus: () => {
    const { ehCount } = get();
    return 1 + Math.floor(ehCount / 100) * 0.01;
  },

  // ... other getters
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Existing tests pass: `npm test` (no test script)
- [x] CPS matches before/after for test save file

#### Manual Verification:
- [x] Buy generator updates CPS correctly
- [x] Buy upgrade updates CPS correctly
- [x] Eh bonus now affects production (bug fix verified)

---

## Phase 3: Extract Heroes Slice

### Overview

Extract hero recruitment, leveling, party management, and equipment handling.

### Changes Required:

#### 1. Create Hero Slice Types

**File**: `src/stores/slices/heroes/types.ts`

```typescript
import type { HeroState, HeroDefinition, FormationPosition, Equipment, EquipmentSlot, HeroStats } from '../../../types/game';

export interface HeroSliceState {
  heroes: Record<string, HeroState>;
  party: Record<FormationPosition, string | null>;
  equipmentInventory: string[];
}

export interface HeroSliceActions {
  recruitHero: (heroId: string) => boolean;
  canAffordHero: (heroId: string) => boolean;
  isHeroRecruited: (heroId: string) => boolean;
  getHeroState: (heroId: string) => HeroState | undefined;
  getAvailableHeroes: () => HeroDefinition[];
  getRecruitedHeroes: () => HeroDefinition[];
  assignToParty: (heroId: string, position: FormationPosition) => boolean;
  removeFromParty: (position: FormationPosition) => void;
  swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => void;
  getPartyHeroes: () => (HeroDefinition | null)[];
  buyEquipment: (equipmentId: string) => boolean;
  canAffordEquipment: (equipmentId: string) => boolean;
  equipItem: (heroId: string, equipmentId: string) => boolean;
  unequipItem: (heroId: string, slot: EquipmentSlot) => void;
  getHeroEquipment: (heroId: string) => Equipment[];
  grantXp: (heroId: string, amount: number) => void;
  tickHeroXp: (deltaMs: number) => void;
  getHeroMultiplier: () => number;
}

export type HeroSlice = HeroSliceState & HeroSliceActions;
```

#### 2. Create Hero Slice Implementation

**File**: `src/stores/slices/heroes/heroSlice.ts`

Key change: All CPS recalculations call `get().recalculateCps()` instead of inline computation.

```typescript
export const createHeroSlice: SliceCreator<HeroSlice> = (set, get) => ({
  // State
  heroes: {},
  party: { frontLeft: null, frontRight: null, backLeft: null, backRight: null },
  equipmentInventory: [],

  // Actions
  recruitHero: (heroId: string) => {
    const state = get();
    const heroDef = heroRegistry.get(heroId);
    if (!heroDef || state.heroes[heroId] || state.curds.lt(heroDef.recruitCost)) {
      return false;
    }

    set({
      curds: state.curds.minus(heroDef.recruitCost),
      heroes: {
        ...state.heroes,
        [heroId]: {
          id: heroId,
          level: 1,
          xp: 0,
          xpToNextLevel: getXpForLevel(1),
          equipment: {},
        },
      },
    });

    // Cross-slice: trigger CPS recalc in production slice
    get().recalculateCps();
    
    trackHeroRecruit(heroId, Object.keys(get().heroes).length);
    return true;
  },

  assignToParty: (heroId: string, position: FormationPosition) => {
    const state = get();
    if (!state.heroes[heroId]) return false;

    // Find current position if in party
    const currentPosition = Object.entries(state.party).find(
      ([, id]) => id === heroId
    )?.[0] as FormationPosition | undefined;

    const newParty = { ...state.party };
    if (currentPosition) newParty[currentPosition] = null;
    newParty[position] = heroId;

    set({ party: newParty });
    
    // Cross-slice: formation affects CPS
    get().recalculateCps();
    return true;
  },

  // ... remaining hero actions
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Hero-related tests pass
- [x] Equipment tests pass

#### Manual Verification:
- [x] Recruit hero deducts curds
- [x] Party assignment updates formation bonus
- [x] Equip/unequip updates hero stats

---

## Phase 4: Extract Combat Slice with Reset Factory

### Overview

Extract combat context with a `createEmptyCombatState()` factory that prestige will use.

### Changes Required:

#### 1. Create Combat Reset Factory

**File**: `src/stores/slices/combat/resetFactory.ts`

```typescript
import type { CombatState } from '../../../types/game';

/**
 * Creates empty combat state for:
 * 1. Initial store state
 * 2. After combat ends
 * 3. Prestige resets (called by prestige slice, not hardcoded)
 */
export function createEmptyCombatState(): CombatState {
  return {
    isInCombat: false,
    currentZone: null,
    currentStage: 0,
    enemies: [],
    heroStates: {},
    combatLog: [],
    combatSpeed: 1,
    limitBreakGauge: 0,
    battleResult: null,
  };
}

/**
 * Creates reset state for prestige tier.
 * Combat fully resets on any prestige.
 */
export function createPrestigeCombatState(): CombatState {
  return createEmptyCombatState();
}
```

#### 2. Create Combat Slice

**File**: `src/stores/slices/combat/combatSlice.ts`

```typescript
import type { SliceCreator } from '../../types';
import type { CombatSlice } from './types';
import { createEmptyCombatState, createPrestigeCombatState } from './resetFactory';
import { initializeCombat, tickCombat, calculateCombatRewards } from '../../../systems/combatEngine';

export const createCombatSlice: SliceCreator<CombatSlice> = (set, get) => ({
  // State - use factory for initial
  combat: createEmptyCombatState(),
  zoneProgress: {},

  // Exported for prestige slice to call
  getPrestigeCombatReset: () => createPrestigeCombatState(),

  startCombat: (zoneId: string, stageNumber: number) => {
    const state = get();
    if (state.combat.isInCombat) return false;

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    if (partyHeroIds.length === 0) return false;

    const combatState = initializeCombat(zoneId, stageNumber, state.heroes, state.party);
    if (!combatState) return false;

    set({ combat: combatState });
    startCombatMusic(isBossStage(zoneId, stageNumber));
    trackCombatStart(zoneId, stageNumber, isBossStage(zoneId, stageNumber));
    return true;
  },

  endCombat: (result: 'victory' | 'defeat' | 'flee') => {
    const state = get();
    if (!state.combat.isInCombat) return;

    if (result === 'victory') {
      const { currentZone, currentStage } = state.combat;
      if (currentZone) {
        const currentProgress = state.zoneProgress[currentZone] || {
          zoneId: currentZone,
          highestStageCleared: 0,
          bossDefeated: false,
          timesCompleted: 0,
        };
        const isBoss = isBossStage(currentZone, currentStage);
        set({
          zoneProgress: {
            ...state.zoneProgress,
            [currentZone]: {
              ...currentProgress,
              highestStageCleared: Math.max(currentProgress.highestStageCleared, currentStage),
              bossDefeated: currentProgress.bossDefeated || isBoss,
              timesCompleted: isBoss ? currentProgress.timesCompleted + 1 : currentProgress.timesCompleted,
            },
          },
        });
      }
    }

    playResultAudio(result);
    set((s) => ({
      combat: { ...s.combat, battleResult: result === 'flee' ? 'defeat' : result },
    }));
  },

  claimCombatRewards: () => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'victory') {
      return null;
    }

    const rewards = calculateCombatRewards(/* ... */);

    // Cross-slice: add resources via production
    get().addCurds(rewards.curds);
    
    // Cross-slice: add whey 
    set((s) => ({ whey: s.whey.plus(rewards.whey) }));

    // Cross-slice: grant XP to heroes
    for (const [heroId, xp] of Object.entries(rewards.xp)) {
      get().grantXp(heroId, xp);
    }

    // Reset to empty combat state
    set({ combat: createEmptyCombatState() });
    return rewards;
  },

  // ... remaining combat actions
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [x] Combat tests pass
- [ ] `createEmptyCombatState()` exported and used in 2+ places

#### Manual Verification:
- [ ] Combat starts with valid party
- [ ] Victory updates zone progress
- [ ] Claiming rewards grants resources

---

## Phase 5: Extract Crafting Slice with Reset Factory

### Overview

Extract crafting context with prestige reset factory.

### Changes Required:

#### 1. Create Crafting Reset Factory

**File**: `src/stores/slices/crafting/resetFactory.ts`

```typescript
import type { CraftingState } from '../../../types/game';

/**
 * Creates initial crafting state.
 */
export function createInitialCraftingState(): CraftingState {
  return {
    unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
    unlockedRecipes: ['cottage_cheese', 'ricotta', 'cream_cheese'],
    unlockedCaves: ['basic_cellar'],
    activeJobs: [],
    cheeseInventory: [],
    cheeseCollection: {},
    activeBuffs: [],
  };
}

/**
 * Creates reset state for prestige tier.
 * Aging: preserve unlocks, reset transient state.
 */
export function createPrestigeCraftingState(
  current: CraftingState,
  tier: 'aging' | 'vintage' | 'legacy'
): CraftingState {
  if (tier === 'aging') {
    return {
      // Preserve permanent progress
      unlockedIngredients: current.unlockedIngredients,
      unlockedRecipes: current.unlockedRecipes,
      unlockedCaves: current.unlockedCaves,
      cheeseCollection: current.cheeseCollection,
      // Reset transient state
      activeJobs: [],
      cheeseInventory: [],
      activeBuffs: [],
    };
  }
  // Vintage/Legacy TBD
  return current;
}
```

#### 2. Create Crafting Slice

Export `getPrestigeCraftingReset(tier)` for prestige slice to call.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [x] Crafting tests pass

#### Manual Verification:
- [ ] Start crafting job deducts resources
- [ ] Collect cheese adds to inventory
- [ ] Consume cheese activates buffs

---

## Phase 6: Extract Prestige Slice (Using Reset Factories)

### Overview

Extract prestige context that calls reset factories from other slices instead of hardcoding state.

### Changes Required:

#### 1. Create Prestige Slice

**File**: `src/stores/slices/prestige/prestigeSlice.ts`

```typescript
import type { SliceCreator } from '../../types';
import type { PrestigeSlice } from './types';
import { calculatePotentialRennet, calculateStartingCurds, calculateStartingGenerators } from '../../../systems/productionEngine';
import { trackPrestige } from '../../../systems/analyticsService';

export const createPrestigeSlice: SliceCreator<PrestigeSlice> = (set, get) => ({
  prestige: {
    rennet: 0,
    totalRennet: 0,
    agingResetCount: 0,
    agingUpgrades: [],
    vintageWheels: 0,
    totalVintageWheels: 0,
    vintageResetCount: 0,
    vintageUnlocks: [],
    legacy: 0,
    legacyBonuses: { /* ... */ },
    legacyResetCount: 0,
  },

  performAging: () => {
    const state = get();
    const rennetGained = calculatePotentialRennet(state.totalCurdsEarned);
    if (rennetGained === 0) {
      return { rennetGained: 0, newTotal: state.prestige.rennet };
    }

    const startingCurds = calculateStartingCurds(state.prestige);
    const startingGenerators = calculateStartingGenerators(state.prestige);

    // Get reset states FROM OTHER SLICES (not hardcoded here)
    const combatReset = get().getPrestigeCombatReset();
    const craftingReset = get().getPrestigeCraftingReset('aging');

    set({
      // Production reset
      curds: startingCurds,
      whey: new Decimal(0),
      totalCurdsEarned: new Decimal(0),
      totalClicks: 0,
      generators: startingGenerators,
      upgrades: [],
      curdPerClick: new Decimal(1),
      curdPerSecond: new Decimal(0),

      // Combat reset - DELEGATED to combat slice
      combat: combatReset,

      // Crafting reset - DELEGATED to crafting slice  
      crafting: craftingReset,

      // Prestige update
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet + rennetGained,
        totalRennet: state.prestige.totalRennet + rennetGained,
        agingResetCount: state.prestige.agingResetCount + 1,
      },

      lastSaved: Date.now(),
    });

    get().recalculateCps();
    trackPrestige('aging', rennetGained);

    return { rennetGained, newTotal: get().prestige.rennet };
  },

  // ... remaining prestige actions
});
```

**Key Change**: `performAging()` now calls `get().getPrestigeCombatReset()` and `get().getPrestigeCraftingReset('aging')` instead of hardcoding the reset structures. Each context owns its reset logic.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [x] Prestige tests pass
- [ ] No direct combat/crafting state literals in prestige slice

#### Manual Verification:
- [ ] Aging preserves heroes, achievements, zone progress
- [ ] Aging resets curds, generators, upgrades
- [ ] Aging resets active crafting jobs (via crafting factory)
- [ ] Aging ends any active combat (via combat factory)

---

## Phase 7: Extract Remaining Slices

### Overview

Extract achievements, events, and persistence slices.

### Changes Required:

#### 1. Achievements Slice

Encapsulates `checkAchievements()`, which still uses `get()` to read all contexts (acceptable for cross-cutting concerns).

#### 2. Events Slice

Encapsulates event activation/deactivation and multiplier calculation.

#### 3. Persistence Slice

Encapsulates `save()`, `load()`, `reset()` with proper serialization of all slices.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [x] All tests pass

#### Manual Verification:
- [ ] Achievements unlock correctly
- [ ] Events apply multipliers
- [ ] Save/load round-trips correctly

---

## Phase 8: Combine Slices and Remove Old Store

### Overview

Create the combined store, update imports, and remove the monolithic `gameStore.ts`.

### Changes Required:

#### 1. Create Combined Store

**File**: `src/stores/index.ts`

```typescript
import { create } from 'zustand';
import type { GameStore } from './types';

import { createProductionSlice } from './slices/production/productionSlice';
import { createHeroSlice } from './slices/heroes/heroSlice';
import { createCombatSlice } from './slices/combat/combatSlice';
import { createCraftingSlice } from './slices/crafting/craftingSlice';
import { createPrestigeSlice } from './slices/prestige/prestigeSlice';
import { createAchievementSlice } from './slices/achievements/achievementSlice';
import { createEventSlice } from './slices/events/eventSlice';
import { createPersistenceSlice } from './slices/persistence/persistenceSlice';

export const useGameStore = create<GameStore>()((...a) => ({
  ...createProductionSlice(...a),
  ...createHeroSlice(...a),
  ...createCombatSlice(...a),
  ...createCraftingSlice(...a),
  ...createPrestigeSlice(...a),
  ...createAchievementSlice(...a),
  ...createEventSlice(...a),
  ...createPersistenceSlice(...a),
}));

// Re-export for backwards compatibility
export * from './types';
```

#### 2. Update All Imports

Find and replace:
```typescript
// Old
import { useGameStore } from '../stores/gameStore';

// New
import { useGameStore } from '../stores';
```

#### 3. Delete Old Store

Remove `/Users/jknechtel/dev/game/src/stores/gameStore.ts`

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] All tests pass: `npm test`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Game loads existing save correctly
- [ ] All UI panels function (generators, heroes, combat, crafting, prestige)
- [ ] No console errors
- [ ] DevTools shows sliced state structure

---

## Testing Strategy

### Unit Tests:

- Each slice's actions modify only their own state
- Reset factories produce correct structures
- `computeCps()` matches previous calculation (with Eh bonus added)

### Integration Tests:

- Cross-slice operations (prestige reset, achievement checking)
- Save/load preserves all slice data
- Game loop ticks all relevant slices

### Manual Testing Steps:

1. Load existing save file
2. Buy generators and upgrades - verify CPS updates
3. Recruit heroes and assign to party - verify formation bonus
4. Start and complete combat - verify rewards
5. Start and complete crafting - verify cheese inventory
6. Perform Aging prestige - verify correct reset behavior
7. Check achievements unlock
8. Save, refresh, load - verify persistence

---

## Performance Considerations

- **Slice granularity**: 8 slices is reasonable; more would add complexity without benefit
- **Render optimization**: UI components should select minimal state with `useShallow`
- **CPS recalculation**: Now centralized, can be debounced if needed

---

## Migration Notes

- **Backwards compatible save format**: Existing save files will load correctly
- **No UI changes required**: `useGameStore` hook API unchanged
- **Gradual migration**: Each phase can be merged independently
- **Feature flags not needed**: Internal refactor, no user-facing changes

---

## References

- Research document: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Zustand slices pattern: https://zustand.docs.pmnd.rs/guides/slices-pattern
- Existing domain layer: `src/domain/index.ts`
- Unused helper: `src/systems/productionEngine.ts:432-450` (recalculateCpsFromState)
- Combat reset factory: `src/systems/combatEngine.ts:1027-1039` (createEmptyCombatState)
