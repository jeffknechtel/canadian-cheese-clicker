# Phase 5: Prestige System (Cheese Aging) Implementation Plan

## Overview

This plan implements the three-tier prestige system for "The Great Canadian Cheese Quest," themed as cheese aging. The prestige system provides meaningful reset incentives, allowing players to sacrifice progress for permanent bonuses and access to new content. The three tiers are:

1. **Aging** (First Prestige): Reset for "Rennet" currency, gain +1% global production per Rennet
2. **Vintage** (Second Prestige): Sacrifice Rennet for "Vintage Wheels" with powerful permanent effects
3. **Legacy** (Third Prestige): Establish permanent "Legacy" bonuses across Canada

The cheese aging theme makes prestige feel thematic ("aging your empire") rather than mechanical ("resetting").

## Current State Analysis

**What Exists:**
- Zustand game store with comprehensive state management in `src/stores/gameStore.ts` (1243 lines)
- Save system with versioned persistence in `src/systems/saveSystem.ts` (233 lines, version 4)
- Production engine with multiplier calculations in `src/systems/productionEngine.ts`
- Type definitions in `src/types/game.ts` (358 lines)
- Decimal.js for big number handling throughout
- `totalCurdsEarned` already tracked (used for prestige calculations)
- Achievement system providing multiplier bonuses as pattern to follow
- Offline progress calculation existing pattern
- Combat system with zone progress (pattern for tracking prestige-related progress)

**Key Files to Reference:**
- `src/types/game.ts:1-26` - GameState interface (needs prestige fields)
- `src/stores/gameStore.ts:147-183` - Initial state definition
- `src/stores/gameStore.ts:871-898` - recalculateCps pattern for adding prestige multipliers
- `src/systems/saveSystem.ts:22-47` - SerializedGameState (needs prestige fields)
- `src/systems/saveSystem.ts:49-136` - Serialization/deserialization patterns
- `src/data/upgrades.ts` - Pattern for defining purchasable upgrades

**Existing Patterns to Follow:**
- Achievement rewards provide global/click multipliers via `calculateAchievementGlobalMultiplier`
- Upgrades use `{ type: 'globalMultiplier', value: number }` effect pattern
- All multiplier calculations flow through `recalculateCps`
- State actions follow pattern: validate -> calculate -> set state -> trigger side effects

## Desired End State

A fully functional three-tier prestige system where:

1. **Aging (First Prestige)**:
   - Players can "age" (prestige) when they have accumulated enough lifetime curds
   - Reset curds, generators, upgrades; keep heroes, equipment, achievements
   - Gain Rennet based on formula: `floor(sqrt(totalCurdsEarned / 1e12))`
   - Rennet provides +1% global production bonus per unit
   - Unlock "Aging Upgrades" purchasable with Rennet

2. **Vintage (Second Prestige)**:
   - Unlocks after 100 total Aging resets
   - Sacrifice 100 Rennet to create 1 "Vintage Wheel"
   - Vintage Wheels unlock legendary content and provide permanent bonuses

3. **Legacy (Third Prestige)**:
   - Unlocks after 10 Vintage resets
   - Establish permanent province-based "Legacy" bonuses
   - Unlocks endgame challenge modes

**Verification:**
- `pnpm typecheck` passes
- `pnpm lint` passes
- Prestige panel displays current Rennet and potential gains
- "Age Empire" button triggers prestige with confirmation
- Rennet multiplier applies to all production
- Aging upgrades can be purchased and persist through resets
- Save/load correctly preserves prestige state

### Key Discoveries:

- `totalCurdsEarned` in `src/stores/gameStore.ts:5` tracks lifetime curds, perfect for prestige formula
- Global multiplier chain in `recalculateCps` (line 887-897) can be extended with prestige multiplier
- Save version is 4, will need to bump to 5 for prestige fields
- Achievement bonuses pattern (lines 374-423) provides template for prestige bonus application
- Offline progress at `src/systems/saveSystem.ts:178-194` needs prestige multiplier integration

## Assumptions Made

1. **Soft reset scope**: Aging resets curds, generators, and upgrades, but preserves heroes, hero levels, equipment, achievements, zone progress, and "eh" count
2. **Rennet is permanent**: Once earned, Rennet persists across all future Aging resets
3. **No prestige-specific heroes**: Prestige unlocks are primarily upgrades and multipliers, not new heroes
4. **Single prestige at a time**: Players cannot prestige multiple tiers simultaneously
5. **Minimum threshold**: Players must have at least 1 trillion (1e12) lifetime curds to gain any Rennet
6. **Aging upgrades reset**: Aging upgrades purchased with Rennet persist through Aging resets but reset on Vintage prestige
7. **Vintage/Legacy are late-game**: Implementing Vintage/Legacy as framework with minimal content initially

## What We're NOT Doing

- Complex prestige trees with multiple branches
- Prestige-specific heroes or hero classes
- Time-limited prestige bonuses
- Prestige leaderboards or competitive elements
- Automatic prestige ("ascension automation")
- Prestige-specific combat content (save for Phase 7)
- Detailed cheese crafting integration (Phase 6)
- "Challenge" run modifiers for prestige

## Implementation Approach

The prestige system will be built incrementally:
1. First, add type definitions and state structure
2. Implement the first prestige tier (Aging) completely
3. Add UI components for prestige interaction
4. Implement Vintage as a framework (can be expanded later)
5. Implement Legacy as a framework (can be expanded later)
6. Polish with confirmations, animations, and Canadian flavor

**Architecture:**
```
Modified Files:
├── src/types/game.ts            # Prestige type definitions
├── src/stores/gameStore.ts      # Prestige state and actions
├── src/systems/saveSystem.ts    # Prestige persistence (version 5)
├── src/systems/productionEngine.ts  # Prestige multiplier calculations

New Files:
├── src/data/agingUpgrades.ts    # Rennet-purchasable upgrades
├── src/components/ui/PrestigePanel.tsx     # Main prestige UI
├── src/components/ui/AgingConfirmModal.tsx # Prestige confirmation dialog
├── src/components/ui/RennetDisplay.tsx     # Prestige currency display
```

---

## Phase 5.1: Prestige Type Definitions & State Structure

### Overview

Define all TypeScript interfaces for the prestige system and add prestige state to GameState.

### Changes Required:

#### 1. Add Prestige Types

**File**: `src/types/game.ts`
**Changes**: Add prestige-related interfaces after line 26

```typescript
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
```

#### 2. Update GameState Interface

**File**: `src/types/game.ts`
**Changes**: Add prestige field to GameState interface (around line 24)

Add to GameState interface:
```typescript
// Prestige system
prestige: PrestigeState;
```

#### 3. Add Prestige State to Game Store

**File**: `src/stores/gameStore.ts`
**Changes**: Add prestige to initial state (around line 182)

Add to initialState:
```typescript
// Prestige system
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
  legacyBonuses: {
    ontario: 0,
    quebec: 0,
    alberta: 0,
    manitoba: 0,
    saskatchewan: 0,
    yukon: 0,
    bc: 0,
    nova_scotia: 0,
  },
  legacyResetCount: 0,
},
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] All prestige types properly defined
- [x] GameState includes prestige field
- [x] Initial state includes default prestige values

---

## Phase 5.2: Aging Upgrades Data Definition

### Overview

Create the Aging upgrades data file with all Rennet-purchasable upgrades from the research document.

### Changes Required:

#### 1. Create Aging Upgrades Data File

**File**: `src/data/agingUpgrades.ts` (new file)
**Changes**: Define all Aging upgrades

```typescript
import type { AgingUpgrade } from '../types/game';

export const AGING_UPGRADES: AgingUpgrade[] = [
  // Tier 1: Basic upgrades (cost 1-10 Rennet)
  {
    id: 'curd_catalyst',
    name: 'Curd Catalyst',
    description: '+5% click power per purchase',
    cost: 1,
    effect: { type: 'clickBonus', value: 0.05 },
    maxPurchases: 10,
    icon: '🧪',
  },
  {
    id: 'efficient_vats',
    name: 'Efficient Vats',
    description: '-10% generator costs',
    cost: 5,
    effect: { type: 'generatorCostReduction', value: 0.10 },
    maxPurchases: 5,
    icon: '⚗️',
  },
  {
    id: 'quality_culture',
    name: 'Quality Culture',
    description: '+10% all production per purchase',
    cost: 10,
    effect: { type: 'productionBonus', value: 0.10 },
    maxPurchases: 10,
    icon: '🦠',
  },

  // Tier 2: Advanced upgrades (cost 25-100 Rennet)
  {
    id: 'master_affineur',
    name: 'Master Affineur',
    description: '+1% production per generator type owned',
    cost: 50,
    effect: { type: 'generatorEfficiency', value: 0.01 },
    maxPurchases: 5,
    icon: '👨‍🍳',
    requirement: { type: 'rennetSpent', amount: 25 },
  },
  {
    id: 'cheese_sommelier',
    name: 'Cheese Sommelier',
    description: 'Unlock cheese pairing bonuses (+25% production)',
    cost: 100,
    effect: { type: 'productionBonus', value: 0.25 },
    maxPurchases: 1,
    icon: '🍷',
    requirement: { type: 'upgrade', upgradeId: 'master_affineur' },
  },
  {
    id: 'head_start',
    name: 'Head Start',
    description: 'Start with 1,000 curds after Aging',
    cost: 25,
    effect: { type: 'startingCurds', value: 1000 },
    maxPurchases: 10,  // Stacks: 1k, 2k, 3k... 10k
    icon: '🏁',
  },
  {
    id: 'apprentice_network',
    name: 'Apprentice Network',
    description: 'Start with 5 Milk Pails after Aging',
    cost: 50,
    effect: { type: 'startingGenerators', generatorId: 'milk_pail', value: 5 },
    maxPurchases: 5,
    icon: '👥',
  },

  // Tier 3: Expert upgrades (cost 150-500 Rennet)
  {
    id: 'aging_wisdom',
    name: 'Aging Wisdom',
    description: '+25% hero XP gain',
    cost: 150,
    effect: { type: 'xpBonus', value: 0.25 },
    maxPurchases: 4,
    icon: '📚',
    requirement: { type: 'agingResets', count: 5 },
  },
  {
    id: 'battle_hardened_cheese',
    name: 'Battle-Hardened Cheese',
    description: '+20% combat rewards',
    cost: 200,
    effect: { type: 'combatBonus', value: 0.20 },
    maxPurchases: 5,
    icon: '⚔️',
    requirement: { type: 'agingResets', count: 10 },
  },
  {
    id: 'canadian_perseverance',
    name: 'Canadian Perseverance',
    description: '+50% all production, -25% Rennet on next reset',
    cost: 500,
    effect: { type: 'productionBonus', value: 0.50 },
    maxPurchases: 1,
    icon: '🍁',
    requirement: { type: 'rennetSpent', amount: 500 },
  },
];

export function getAgingUpgradeById(id: string): AgingUpgrade | undefined {
  return AGING_UPGRADES.find((u) => u.id === id);
}

export function getAgingUpgradePurchaseCount(
  agingUpgrades: string[],
  upgradeId: string
): number {
  return agingUpgrades.filter((id) => id === upgradeId).length;
}

export function canPurchaseAgingUpgrade(
  upgrade: AgingUpgrade,
  agingUpgrades: string[],
  rennet: number,
  agingResetCount: number,
  totalRennetSpent: number
): boolean {
  // Check if max purchases reached
  const currentPurchases = getAgingUpgradePurchaseCount(agingUpgrades, upgrade.id);
  if (currentPurchases >= upgrade.maxPurchases) return false;

  // Check cost
  if (rennet < upgrade.cost) return false;

  // Check requirement
  if (upgrade.requirement) {
    switch (upgrade.requirement.type) {
      case 'rennetSpent':
        if (totalRennetSpent < upgrade.requirement.amount) return false;
        break;
      case 'agingResets':
        if (agingResetCount < upgrade.requirement.count) return false;
        break;
      case 'upgrade':
        if (!agingUpgrades.includes(upgrade.requirement.upgradeId)) return false;
        break;
    }
  }

  return true;
}
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] All 10 Aging upgrades defined with proper effects
- [x] Helper functions work correctly

---

## Phase 5.3: Prestige Calculation Engine

### Overview

Implement the prestige calculation functions in the production engine and add prestige multipliers to CPS calculation.

### Changes Required:

#### 1. Add Prestige Calculations to Production Engine

**File**: `src/systems/productionEngine.ts`
**Changes**: Add prestige-related calculation functions

```typescript
import { getAgingUpgradeById, getAgingUpgradePurchaseCount } from '../data/agingUpgrades';
import type { PrestigeState, AgingUpgradeEffect } from '../types/game';

// Calculate Rennet earned from current run
export function calculatePotentialRennet(totalCurdsEarned: Decimal): number {
  // Formula: floor(sqrt(totalCurdsEarned / 1e12))
  // Requires at least 1 trillion curds for any Rennet
  const threshold = new Decimal(1e12);
  if (totalCurdsEarned.lt(threshold)) return 0;

  const ratio = totalCurdsEarned.div(threshold);
  return Math.floor(Math.sqrt(ratio.toNumber()));
}

// Calculate base Rennet multiplier (+1% per Rennet)
export function calculateRennetMultiplier(rennet: number): number {
  return 1 + (rennet * 0.01);
}

// Calculate total prestige production multiplier
export function calculatePrestigeProductionMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  // Base Rennet bonus: +1% per Rennet
  multiplier *= calculateRennetMultiplier(prestige.rennet);

  // Aging upgrade bonuses
  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'productionBonus') {
      multiplier *= (1 + upgrade.effect.value);
    }
  }

  // Vintage Wheels bonus (future): +5% per wheel
  multiplier *= (1 + prestige.vintageWheels * 0.05);

  // Legacy bonus (future): sum of province bonuses
  const legacyBonus = Object.values(prestige.legacyBonuses).reduce((a, b) => a + b, 0);
  multiplier *= (1 + legacyBonus * 0.01);

  return multiplier;
}

// Calculate prestige click multiplier
export function calculatePrestigeClickMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'clickBonus') {
      multiplier *= (1 + upgrade.effect.value);
    }
  }

  return multiplier;
}

// Calculate generator cost reduction from prestige
export function calculatePrestigeCostReduction(prestige: PrestigeState): number {
  let reduction = 0;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'generatorCostReduction') {
      reduction += upgrade.effect.value;
    }
  }

  // Cap at 90% reduction
  return Math.min(reduction, 0.9);
}

// Calculate XP bonus from prestige
export function calculatePrestigeXpMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'xpBonus') {
      multiplier *= (1 + upgrade.effect.value);
    }
  }

  return multiplier;
}

// Calculate combat reward bonus from prestige
export function calculatePrestigeCombatMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'combatBonus') {
      multiplier *= (1 + upgrade.effect.value);
    }
  }

  return multiplier;
}

// Calculate starting curds after Aging reset
export function calculateStartingCurds(prestige: PrestigeState): Decimal {
  let startingCurds = new Decimal(0);

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'startingCurds') {
      startingCurds = startingCurds.plus(upgrade.effect.value);
    }
  }

  return startingCurds;
}

// Calculate starting generators after Aging reset
export function calculateStartingGenerators(prestige: PrestigeState): Record<string, number> {
  const starting: Record<string, number> = {};

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'startingGenerators') {
      const effect = upgrade.effect;
      starting[effect.generatorId] = (starting[effect.generatorId] || 0) + effect.value;
    }
  }

  return starting;
}
```

#### 2. Integrate Prestige Multiplier into CPS Calculation

**File**: `src/stores/gameStore.ts`
**Changes**: Update recalculateCps and related functions to include prestige multiplier

Import the new functions and update `recalculateCps`:

```typescript
import {
  calculatePrestigeProductionMultiplier,
  calculatePrestigeClickMultiplier,
  calculatePrestigeCostReduction,
} from '../systems/productionEngine';

// In recalculateCps action (update the calculation):
recalculateCps: () => {
  const { generators, upgrades, achievements, heroes, party, prestige } = get();
  const generatorMultipliers = calculateGeneratorMultipliers(upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(achievements);
  const heroBonus = calculateHeroCpsBonus(heroes, party);
  const formationBonus = calculateFormationBonus(party, heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
  const totalGlobalMultiplier =
    upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
  const newCps = calculateCps(generators, generatorMultipliers, totalGlobalMultiplier);
  set({ curdPerSecond: newCps });
},
```

Similar updates needed for all places that call `calculateCps` (buyGenerator, buyUpgrade, etc.).

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] `calculatePotentialRennet` returns correct values for edge cases
- [x] Prestige multipliers properly chain with existing multipliers
- [x] CPS updates when prestige state changes

---

## Phase 5.4: Prestige Store Actions

### Overview

Implement all prestige-related store actions for performing resets and purchasing upgrades.

### Changes Required:

#### 1. Add Prestige Actions to GameStore Interface

**File**: `src/stores/gameStore.ts`
**Changes**: Add prestige action signatures to GameStore interface

```typescript
// Prestige actions
getPotentialRennet: () => number;
canPerformAging: () => boolean;
performAging: () => { rennetGained: number; newTotal: number };
purchaseAgingUpgrade: (upgradeId: string) => boolean;
canPurchaseAgingUpgrade: (upgradeId: string) => boolean;
getAgingUpgradePurchaseCount: (upgradeId: string) => number;
getPrestigeMultipliers: () => {
  production: number;
  click: number;
  costReduction: number;
  xp: number;
  combat: number;
};
// Vintage actions (framework)
canPerformVintage: () => boolean;
performVintage: () => { wheelsGained: number; newTotal: number };
// Legacy actions (framework)
canPerformLegacy: () => boolean;
performLegacy: () => { legacyGained: number };
```

#### 2. Implement Prestige Actions

**File**: `src/stores/gameStore.ts`
**Changes**: Implement prestige actions

```typescript
// ===== Prestige Actions =====

getPotentialRennet: () => {
  const { totalCurdsEarned } = get();
  return calculatePotentialRennet(totalCurdsEarned);
},

canPerformAging: () => {
  const potentialRennet = get().getPotentialRennet();
  return potentialRennet > 0;
},

performAging: () => {
  const state = get();
  const rennetGained = calculatePotentialRennet(state.totalCurdsEarned);

  if (rennetGained === 0) {
    return { rennetGained: 0, newTotal: state.prestige.rennet };
  }

  // Calculate starting resources from Aging upgrades
  const startingCurds = calculateStartingCurds(state.prestige);
  const startingGenerators = calculateStartingGenerators(state.prestige);

  set((s) => ({
    // Reset progress
    curds: startingCurds,
    whey: new Decimal(0),
    totalCurdsEarned: new Decimal(0),
    totalClicks: 0,
    generators: startingGenerators,
    upgrades: [],

    // Keep heroes, equipment, achievements, zone progress, eh count
    // (These persist through Aging)

    // Update prestige state
    prestige: {
      ...s.prestige,
      rennet: s.prestige.rennet + rennetGained,
      totalRennet: s.prestige.totalRennet + rennetGained,
      agingResetCount: s.prestige.agingResetCount + 1,
      // agingUpgrades persist through Aging
    },

    // Reset derived values
    curdPerClick: new Decimal(1),
    curdPerSecond: new Decimal(0),

    // Reset combat state (not in combat after prestige)
    combat: {
      isInCombat: false,
      currentZone: null,
      currentStage: 0,
      enemies: [],
      heroStates: {},
      combatLog: [],
      combatSpeed: 1,
      limitBreakGauge: 0,
      battleResult: null,
    },

    lastSaved: Date.now(),
  }));

  // Recalculate CPS with new prestige multipliers
  get().recalculateCps();

  return {
    rennetGained,
    newTotal: get().prestige.rennet
  };
},

purchaseAgingUpgrade: (upgradeId: string) => {
  const state = get();
  const upgrade = getAgingUpgradeById(upgradeId);

  if (!upgrade) return false;
  if (!state.canPurchaseAgingUpgrade(upgradeId)) return false;

  set((s) => ({
    prestige: {
      ...s.prestige,
      rennet: s.prestige.rennet - upgrade.cost,
      agingUpgrades: [...s.prestige.agingUpgrades, upgradeId],
    },
  }));

  // Recalculate multipliers
  get().recalculateCps();

  return true;
},

canPurchaseAgingUpgrade: (upgradeId: string) => {
  const { prestige } = get();
  const upgrade = getAgingUpgradeById(upgradeId);
  if (!upgrade) return false;

  const totalRennetSpent = prestige.totalRennet - prestige.rennet;
  return canPurchaseAgingUpgrade(
    upgrade,
    prestige.agingUpgrades,
    prestige.rennet,
    prestige.agingResetCount,
    totalRennetSpent
  );
},

getAgingUpgradePurchaseCount: (upgradeId: string) => {
  return getAgingUpgradePurchaseCount(get().prestige.agingUpgrades, upgradeId);
},

getPrestigeMultipliers: () => {
  const { prestige } = get();
  return {
    production: calculatePrestigeProductionMultiplier(prestige),
    click: calculatePrestigeClickMultiplier(prestige),
    costReduction: calculatePrestigeCostReduction(prestige),
    xp: calculatePrestigeXpMultiplier(prestige),
    combat: calculatePrestigeCombatMultiplier(prestige),
  };
},

// ===== Vintage Actions (Framework) =====

canPerformVintage: () => {
  const { prestige } = get();
  return prestige.agingResetCount >= 100 && prestige.rennet >= 100;
},

performVintage: () => {
  const state = get();
  if (!state.canPerformVintage()) {
    return { wheelsGained: 0, newTotal: state.prestige.vintageWheels };
  }

  const wheelsGained = Math.floor(state.prestige.rennet / 100);

  set((s) => ({
    prestige: {
      ...s.prestige,
      rennet: s.prestige.rennet % 100, // Keep remainder
      vintageWheels: s.prestige.vintageWheels + wheelsGained,
      totalVintageWheels: s.prestige.totalVintageWheels + wheelsGained,
      vintageResetCount: s.prestige.vintageResetCount + 1,
      agingUpgrades: [], // Reset Aging upgrades on Vintage
    },
  }));

  return {
    wheelsGained,
    newTotal: get().prestige.vintageWheels,
  };
},

// ===== Legacy Actions (Framework) =====

canPerformLegacy: () => {
  const { prestige } = get();
  return prestige.vintageResetCount >= 10 && prestige.vintageWheels >= 10;
},

performLegacy: () => {
  const state = get();
  if (!state.canPerformLegacy()) {
    return { legacyGained: 0 };
  }

  const legacyGained = state.prestige.vintageWheels;

  set((s) => ({
    prestige: {
      ...s.prestige,
      vintageWheels: 0,
      legacy: s.prestige.legacy + legacyGained,
      legacyResetCount: s.prestige.legacyResetCount + 1,
      vintageUnlocks: [], // Reset Vintage unlocks on Legacy
    },
  }));

  return { legacyGained };
},
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] `performAging` correctly resets state and grants Rennet
- [x] Starting bonuses from Aging upgrades work correctly
- [x] Prestige multipliers update after Aging
- [x] Aging upgrade purchases persist correctly

---

## Phase 5.5: Save System Integration

### Overview

Update the save system to persist prestige state, bump version to 5, and handle migration.

### Changes Required:

#### 1. Update Save System

**File**: `src/systems/saveSystem.ts`
**Changes**: Add prestige fields and bump version

```typescript
const SAVE_VERSION = 5; // Bumped for prestige system

// Add to SerializedGameState interface:
prestige?: {
  rennet: number;
  totalRennet: number;
  agingResetCount: number;
  agingUpgrades: string[];
  vintageWheels: number;
  totalVintageWheels: number;
  vintageResetCount: number;
  vintageUnlocks: string[];
  legacy: number;
  legacyBonuses: Record<string, number>;
  legacyResetCount: number;
};

// Update serializeState to include prestige:
prestige: state.prestige,

// Update deserializeState to handle prestige (with migration from v4):
const prestige = serialized.prestige ?? {
  rennet: 0,
  totalRennet: 0,
  agingResetCount: 0,
  agingUpgrades: [],
  vintageWheels: 0,
  totalVintageWheels: 0,
  vintageResetCount: 0,
  vintageUnlocks: [],
  legacy: 0,
  legacyBonuses: {
    ontario: 0,
    quebec: 0,
    alberta: 0,
    manitoba: 0,
    saskatchewan: 0,
    yukon: 0,
    bc: 0,
    nova_scotia: 0,
  },
  legacyResetCount: 0,
};

// Include prestige multiplier in CPS recalculation during deserialization:
const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
const totalGlobalMultiplier =
  upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;

// Include prestige click multiplier:
const prestigeClickMultiplier = calculatePrestigeClickMultiplier(prestige);
const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;

// Include prestige in returned state:
prestige,
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc -b`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] Save/load correctly preserves prestige state
- [x] Migration from v4 saves works correctly (prestige defaults applied)
- [x] Prestige multipliers recalculated correctly on load

---

## Phase 5.6: Prestige UI Components

### Overview

Create UI components for displaying and interacting with the prestige system.

### Changes Required:

#### 1. Rennet Display Component

**File**: `src/components/ui/RennetDisplay.tsx` (new file)
**Changes**: Small currency display for Rennet

- Shows current Rennet count with cheese wheel icon
- Shows potential Rennet gain if reset now
- Tooltip with prestige multiplier breakdown

#### 2. Aging Confirmation Modal

**File**: `src/components/ui/AgingConfirmModal.tsx` (new file)
**Changes**: Confirmation dialog before prestige

- Shows what will be reset (curds, generators, upgrades)
- Shows what will be kept (heroes, equipment, achievements)
- Shows Rennet to be gained
- Shows current vs new prestige multiplier
- "Age My Empire" / "Cancel" buttons
- Canadian-themed messaging ("Time to let your cheese empire mature, eh?")

#### 3. Main Prestige Panel

**File**: `src/components/ui/PrestigePanel.tsx` (new file)
**Changes**: Full prestige management panel

Layout:
- **Header**: "Cheese Aging" with Rennet display
- **Aging Section**:
  - Current stats (Rennet, resets, multiplier)
  - "Age Empire" button (grayed if no Rennet gain)
  - Potential Rennet gain preview
- **Aging Upgrades Section**:
  - Grid of purchasable upgrades
  - Shows cost, effect, purchase count
  - Locked upgrades show requirements
- **Vintage Section** (locked until 100 Aging resets):
  - Shows as "Coming Soon" or locked state
  - Progress toward unlocking
- **Legacy Section** (locked until 10 Vintage resets):
  - Shows as "Coming Soon" or locked state
  - Progress toward unlocking

#### 4. Prestige Stats Display

**File**: `src/components/ui/PrestigeStats.tsx` (new file)
**Changes**: Shows all prestige-related bonuses

- Production multiplier from prestige
- Click multiplier from prestige
- Cost reduction from prestige
- XP bonus from prestige
- Combat bonus from prestige
- Starting bonuses summary

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] Prestige panel displays correctly
- [x] Rennet display updates in real-time
- [x] Aging upgrades can be purchased from UI
- [x] Confirmation modal works correctly
- [x] Locked sections show appropriate state

---

## Phase 5.7: App Integration & Navigation

### Overview

Integrate the prestige UI into the main app and add navigation.

### Changes Required:

#### 1. Update App Layout

**File**: `src/App.tsx`
**Changes**: Add Prestige tab to navigation

- Add "Aging" or "Prestige" tab (with cheese aging icon)
- Tab should show Rennet count in badge
- Conditional rendering of PrestigePanel when tab active

#### 2. Add Rennet to Currency Display

**File**: `src/components/ui/CurrencyDisplay.tsx`
**Changes**: Show Rennet in header currency area

- Add Rennet display alongside Curds/Whey (if Rennet > 0 or any Aging reset done)
- Tooltip showing prestige multiplier

#### 3. Prestige Available Notification

**File**: `src/components/ui/Layout.tsx` or similar
**Changes**: Visual indicator when prestige is beneficial

- Subtle glow or badge on Prestige tab when Rennet gain would be significant
- "New prestige available!" style notification

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc -b`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] Prestige tab appears in navigation
- [x] Tab navigation works correctly
- [x] Rennet appears in header when earned
- [x] Prestige notification appears when beneficial

---

## Phase 5.8: Prestige Polish & Canadian Flavor

### Overview

Add polish, animations, and Canadian-themed content to the prestige system.

### Changes Required:

#### 1. Canadian Prestige Dialogue

**File**: `src/data/canadianDialogue.ts`
**Changes**: Add prestige-related dialogue

```typescript
export const PRESTIGE_DIALOGUES = {
  beforeAging: [
    "Ready to let your cheese empire age, eh?",
    "Time to mature your fromage fortune!",
    "Your cheese is ready for the cave!",
  ],
  afterAging: [
    "Beauty! Your cheese empire has aged magnificently!",
    "Now that's some vintage quality, bud!",
    "Your Rennet is flowing like maple syrup!",
  ],
  milestoneResets: {
    10: "Double-double resets! You're a true affineur!",
    50: "Fifty resets? That's dedication, eh!",
    100: "A hundred resets! Vintage tier unlocked, hoser!",
  },
};
```

#### 2. Prestige Animations

**File**: Components where prestige occurs
**Changes**: Add visual feedback

- Cheese wheel "aging" animation during prestige
- Number counter animation for Rennet gained
- Golden particle effect on prestige completion
- Upgrade purchase "unlock" animation

#### 3. Prestige Audio

**File**: `src/systems/audioSystem.ts`
**Changes**: Add prestige-related sounds

- Prestige confirmation sound (aged cheese crack?)
- Rennet gain sound
- Upgrade purchase sound
- Tier unlock fanfare

#### 4. Achievement Integration

**File**: `src/data/achievements.ts`
**Changes**: Add prestige achievements

- "Fresh to Aged" - Perform first Aging reset
- "Cheese Sommelier" - Reach 100 Rennet
- "Vintage Collection" - Perform first Vintage reset
- "Master Affineur" - Own all Aging upgrades
- "Legacy of Fromage" - Reach Legacy tier

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] Canadian dialogue appears during prestige
- [x] Animations play smoothly
- [x] Achievements trigger correctly
- [x] Audio enhances the experience

---

## Testing Strategy

### Unit Tests

Create tests for:
- `calculatePotentialRennet` edge cases (0, threshold, large numbers)
- `calculatePrestigeProductionMultiplier` with various upgrade combinations
- `calculateStartingCurds` and `calculateStartingGenerators`
- Aging upgrade purchase validation
- State reset correctness after prestige

### Integration Tests

- Full prestige flow: accumulate curds -> prestige -> verify reset state
- Aging upgrade purchase -> verify multiplier changes
- Save/load with prestige state
- Multiple prestige cycles

### Manual Testing Checklist

- [ ] Prestige panel displays correctly
- [ ] Rennet calculation shows correct preview
- [ ] "Age Empire" button works with confirmation
- [ ] State correctly resets after prestige
- [ ] Heroes/achievements/equipment persist
- [ ] Starting bonuses apply correctly
- [ ] Aging upgrades can be purchased
- [ ] Aging upgrades persist through subsequent Aging resets
- [ ] Save/load preserves all prestige state
- [ ] Prestige multiplier applies to production
- [ ] Vintage/Legacy tiers show as locked
- [ ] Canadian dialogue appears
- [ ] Prestige achievements trigger

---

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Prestige system design: Research doc lines 306-360
- Rennet formula: Research doc line 314: `rennet = floor(sqrt(lifetime_curds / 1e12))`
- Aging upgrades: Research doc lines 322-329
- Vintage tier: Research doc lines 333-343
- Legacy tier: Research doc lines 345-353
- Existing store patterns: `src/stores/gameStore.ts`
- Save system patterns: `src/systems/saveSystem.ts`
- Production engine: `src/systems/productionEngine.ts`
- Type definitions: `src/types/game.ts`
