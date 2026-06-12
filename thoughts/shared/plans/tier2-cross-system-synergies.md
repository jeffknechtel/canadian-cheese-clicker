# Cross-System Synergy Upgrades Implementation Plan

## Overview

Implement 5 cross-system synergy upgrades that connect previously siloed game systems (generators, heroes, combat, crafting, Eh counter). Synergies are purchased with Whey (boss-drop currency), giving whey clear purpose and rewarding combat engagement. Each synergy creates visible, immediate feedback that makes multiple systems feel interconnected.

## Current State Analysis

**What exists:**
- 5 isolated game systems: generators/production, heroes, combat, crafting, prestige
- Whey currency earned from bosses (~10-40% drop rate) but limited spending options
- Eh counter wired into CPS at +1% per 100 clicks via `getEhMultiplier()` in [productionSlice.ts:227-230](src/stores/slices/production/productionSlice.ts#L227-L230)
- CPS pipeline consolidated in [cpsCalculator.ts:22-48](src/stores/slices/production/cpsCalculator.ts#L22-L48) — single source of truth
- Event-driven recalculation via `CpsInputsChanged` domain events
- Aging upgrades pattern: `prestige.agingUpgrades: string[]` with purchase logic in [prestigeSlice.ts:108-126](src/stores/slices/prestige/prestigeSlice.ts#L108-L126)
- Formation bonuses at +5-10% in [constants.ts:32-39](src/data/constants.ts#L32-L39)

**What's missing:**
- No synergy upgrade data definitions
- No synergy state in store
- No synergy multiplier in CPS pipeline
- No whey spending UI beyond (limited) equipment
- No cross-system bonus interactions

## Desired End State

Players can purchase 5 synergy upgrades using Whey currency. Each synergy creates a meaningful connection between two game systems:

| Synergy | Cost | Effect | Systems |
|---------|------|--------|---------|
| The Canadian Way | 10 Whey | +2% CPS per 100 Eh (doubled from base +1%) | Eh → Production |
| Battle-Hardened Vats | 20 Whey | +5% to random generator per zone cleared | Combat → Production |
| Cheese-Fueled Warriors | 30 Whey | Active cheese buffs grant +25% combat damage | Crafting → Combat |
| Fromage Affinity | 25 Whey | Hero cheese affinity reduces crafting time by affinity/10% | Heroes → Crafting |
| Combat Harmony | 40 Whey | Full party of 4 different classes: +25% CPS (up from +10%) | Heroes → Production |

### Verification:

1. Synergies tab appears in upgrade panel showing all 5 synergies
2. Unpurchased synergies show Whey cost; purchased show checkmark
3. Purchasing deducts Whey and applies effect immediately
4. Each synergy effect is measurable:
   - The Canadian Way: CPS breakdown shows doubled Eh bonus
   - Battle-Hardened Vats: Generator panel shows zone-granted bonuses
   - Cheese-Fueled Warriors: Combat damage numbers increase with active buffs
   - Fromage Affinity: Crafting time display decreases based on party affinity
   - Combat Harmony: Formation bonus shows +25% with qualifying party
5. Save/load preserves purchased synergies
6. Prestige does NOT reset synergies (permanent unlocks)

### Key Discoveries:

- Whey is stored in `combat.whey` per [combatSlice.ts](src/stores/slices/combat/combatSlice.ts)
- Zone completion tracked in `combat.zoneProgress[zoneId].stagesCleared` and `combat.zoneProgress[zoneId].bossDefeated`
- Hero cheese affinity in `heroes[id].cheeseAffinity` (0-100 scale)
- Active buffs in `crafting.activeBuffs` array with `effect.type` of `productionBoost`, `clickBoost`, `xpBoost`
- Formation calculation in [productionEngine.ts:233-283](src/systems/productionEngine.ts#L233-L283) checks party composition
- Combat damage formula in [combatEngine.ts:81-120](src/systems/combatEngine.ts#L81-L120)

## What We're NOT Doing

- Vintage/Legacy prestige expansion (separate plan)
- Combat AI fixes (enemy ability selection bug)
- Manual ability activation in combat
- New synergies beyond the 5 specified
- Synergy stacking/multiple purchases
- Synergy prerequisites or unlock chains
- Synergy interaction with Golden Cheese events

---

## Phase 1: Data Model and Types

### Overview

Define TypeScript types for synergies, add synergy data definitions, and extend game state types. No logic yet — just the data model.

### Changes Required:

#### 1. Synergy Types

**File**: `src/types/game.ts`
**Changes**: Add synergy types after the `AgingUpgradeEffect` type (~line 43).

```typescript
// ===== Synergy Upgrade Types =====

export type SynergyId =
  | 'the_canadian_way'
  | 'battle_hardened_vats'
  | 'cheese_fueled_warriors'
  | 'fromage_affinity'
  | 'combat_harmony';

export interface SynergyUpgrade {
  id: SynergyId;
  name: string;
  description: string;
  cost: number;  // Whey cost
  effect: SynergyEffect;
  systemsConnected: [string, string];  // For UI display
  icon: string;
}

export type SynergyEffect =
  | { type: 'ehMultiplierBonus'; value: number }           // Additional % per Eh tier
  | { type: 'zoneGeneratorBonus'; value: number }          // % bonus per zone cleared
  | { type: 'buffCombatDamage'; value: number }            // % damage when buffs active
  | { type: 'affinityCraftingSpeed'; divisor: number }     // Affinity / divisor = % faster
  | { type: 'fullPartyFormationBonus'; value: number };    // Override formation bonus %
```

#### 2. Synergy Data File

**File**: `src/data/synergies.ts` (new file)
**Changes**: Define all 5 synergies.

```typescript
import type { SynergyUpgrade } from '../types/game';

export const SYNERGIES: SynergyUpgrade[] = [
  {
    id: 'the_canadian_way',
    name: 'The Canadian Way',
    description: 'Every 100 Eh clicks grants +2% CPS (doubled from +1%)',
    cost: 10,
    effect: { type: 'ehMultiplierBonus', value: 0.01 },  // Additional +1% per tier
    systemsConnected: ['Eh Counter', 'Production'],
    icon: '🇨🇦',
  },
  {
    id: 'battle_hardened_vats',
    name: 'Battle-Hardened Vats',
    description: 'Each combat zone cleared grants +5% to a random generator',
    cost: 20,
    effect: { type: 'zoneGeneratorBonus', value: 0.05 },
    systemsConnected: ['Combat', 'Production'],
    icon: '⚔️',
  },
  {
    id: 'cheese_fueled_warriors',
    name: 'Cheese-Fueled Warriors',
    description: 'Active cheese buffs grant +25% combat damage',
    cost: 30,
    effect: { type: 'buffCombatDamage', value: 0.25 },
    systemsConnected: ['Crafting', 'Combat'],
    icon: '🧀',
  },
  {
    id: 'fromage_affinity',
    name: 'Fromage Affinity',
    description: 'Party cheese affinity reduces crafting time (affinity/10 = % faster)',
    cost: 25,
    effect: { type: 'affinityCraftingSpeed', divisor: 10 },
    systemsConnected: ['Heroes', 'Crafting'],
    icon: '👨‍🍳',
  },
  {
    id: 'combat_harmony',
    name: 'Combat Harmony',
    description: 'Full party of 4 different classes grants +25% CPS (up from +10%)',
    cost: 40,
    effect: { type: 'fullPartyFormationBonus', value: 0.25 },
    systemsConnected: ['Heroes', 'Production'],
    icon: '🤝',
  },
];

export function getSynergyById(id: string): SynergyUpgrade | undefined {
  return SYNERGIES.find((s) => s.id === id);
}
```

#### 3. Synergy Constants

**File**: `src/data/constants.ts`
**Changes**: Add synergy-related constants after the Eh multiplier section (~line 133).

```typescript
// ===== Synergy Balance =====

/** Base Eh bonus per tier (synergy doubles this) */
export const BASE_EH_BONUS_PER_TIER = 0.01;

/** Synergy: Additional Eh bonus per tier when "The Canadian Way" purchased */
export const SYNERGY_EH_BONUS_ADDITION = 0.01;

/** Synergy: Generator bonus per zone cleared for "Battle-Hardened Vats" */
export const SYNERGY_ZONE_GENERATOR_BONUS = 0.05;

/** Synergy: Combat damage bonus when buffs active for "Cheese-Fueled Warriors" */
export const SYNERGY_BUFF_COMBAT_DAMAGE = 0.25;

/** Synergy: Affinity divisor for crafting speed for "Fromage Affinity" */
export const SYNERGY_AFFINITY_CRAFTING_DIVISOR = 10;

/** Synergy: Full party formation bonus for "Combat Harmony" (replaces base +10%) */
export const SYNERGY_FULL_PARTY_FORMATION_BONUS = 0.25;
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] `SYNERGIES.length === 5`

#### Manual Verification:

- [x] Import `SYNERGIES` in a test file — no errors

---

## Phase 2: Store Slice and State

### Overview

Create a synergy store slice following the established slice pattern. Add synergy state, purchase action, and helper methods.

### Changes Required:

#### 1. Synergy Slice Types

**File**: `src/stores/slices/synergy/types.ts` (new file)

```typescript
import type { SynergyId } from '../../../types/game';

export interface SynergyState {
  purchased: SynergyId[];
  // Battle-Hardened Vats: track which generator gets bonus per zone
  zoneGeneratorBonuses: Record<string, string>;  // zoneId -> generatorId
}

export interface SynergySlice {
  synergy: SynergyState;
  
  // Actions
  purchaseSynergy: (id: SynergyId) => boolean;
  canPurchaseSynergy: (id: SynergyId) => boolean;
  hasSynergy: (id: SynergyId) => boolean;
  
  // Computed values for other slices
  getSynergyEhBonus: () => number;
  getSynergyZoneGeneratorMultipliers: () => Record<string, number>;
  getSynergyBuffCombatDamageBonus: () => number;
  getSynergyCraftingSpeedMultiplier: () => number;
  getSynergyFormationBonus: () => number | null;  // null = use default
  
  // For Battle-Hardened Vats: assign bonus when zone cleared
  assignZoneGeneratorBonus: (zoneId: string) => void;
  
  // For prestige
  getPrestigeSynergyReset: () => Partial<{ synergy: SynergyState }>;
}
```

#### 2. Synergy Slice Implementation

**File**: `src/stores/slices/synergy/synergySlice.ts` (new file)

```typescript
import type { SliceCreator } from '../../types';
import type { SynergySlice, SynergyState } from './types';
import type { SynergyId } from '../../../types/game';
import { getSynergyById, SYNERGIES } from '../../../data/synergies';
import { publish } from '../../../domain/events';
import { generatorRegistry } from '../../../domain/registries';
import {
  SYNERGY_EH_BONUS_ADDITION,
  SYNERGY_ZONE_GENERATOR_BONUS,
  SYNERGY_BUFF_COMBAT_DAMAGE,
  SYNERGY_AFFINITY_CRAFTING_DIVISOR,
  SYNERGY_FULL_PARTY_FORMATION_BONUS,
} from '../../../data/constants';

const initialSynergyState: SynergyState = {
  purchased: [],
  zoneGeneratorBonuses: {},
};

export const createSynergySlice: SliceCreator<SynergySlice> = (set, get) => ({
  synergy: initialSynergyState,

  purchaseSynergy: (id: SynergyId) => {
    const state = get();
    const synergy = getSynergyById(id);
    
    if (!synergy) return false;
    if (!state.canPurchaseSynergy(id)) return false;

    // Deduct whey from combat slice
    set({
      combat: {
        ...state.combat,
        whey: state.combat.whey - synergy.cost,
      },
      synergy: {
        ...state.synergy,
        purchased: [...state.synergy.purchased, id],
      },
    });

    publish({ type: 'CpsInputsChanged' });
    publish({ type: 'SynergyPurchased', synergyId: id });

    return true;
  },

  canPurchaseSynergy: (id: SynergyId) => {
    const state = get();
    const synergy = getSynergyById(id);
    
    if (!synergy) return false;
    if (state.synergy.purchased.includes(id)) return false;
    if (state.combat.whey < synergy.cost) return false;
    
    return true;
  },

  hasSynergy: (id: SynergyId) => {
    return get().synergy.purchased.includes(id);
  },

  getSynergyEhBonus: () => {
    if (!get().hasSynergy('the_canadian_way')) return 0;
    return SYNERGY_EH_BONUS_ADDITION;
  },

  getSynergyZoneGeneratorMultipliers: () => {
    const state = get();
    if (!state.hasSynergy('battle_hardened_vats')) return {};

    const multipliers: Record<string, number> = {};
    
    for (const generatorId of Object.values(state.synergy.zoneGeneratorBonuses)) {
      multipliers[generatorId] = (multipliers[generatorId] ?? 1) * (1 + SYNERGY_ZONE_GENERATOR_BONUS);
    }
    
    return multipliers;
  },

  getSynergyBuffCombatDamageBonus: () => {
    const state = get();
    if (!state.hasSynergy('cheese_fueled_warriors')) return 0;
    
    // Check if any buffs are active
    const now = Date.now();
    const hasActiveBuff = state.crafting.activeBuffs.some(
      (buff) => now < buff.endTime
    );
    
    return hasActiveBuff ? SYNERGY_BUFF_COMBAT_DAMAGE : 0;
  },

  getSynergyCraftingSpeedMultiplier: () => {
    const state = get();
    if (!state.hasSynergy('fromage_affinity')) return 1;

    // Calculate total party cheese affinity
    const partyHeroIds = state.party.filter((id): id is string => id !== null);
    if (partyHeroIds.length === 0) return 1;

    let totalAffinity = 0;
    for (const heroId of partyHeroIds) {
      const hero = state.heroes[heroId];
      if (hero) {
        totalAffinity += hero.cheeseAffinity;
      }
    }

    const avgAffinity = totalAffinity / partyHeroIds.length;
    const speedBonus = avgAffinity / SYNERGY_AFFINITY_CRAFTING_DIVISOR / 100;
    
    // Return multiplier (0.9 = 10% faster, etc.)
    return Math.max(0.5, 1 - speedBonus);  // Cap at 50% faster
  },

  getSynergyFormationBonus: () => {
    const state = get();
    if (!state.hasSynergy('combat_harmony')) return null;

    // Check if party has 4 heroes of 4 different classes
    const partyHeroIds = state.party.filter((id): id is string => id !== null);
    if (partyHeroIds.length !== 4) return null;

    const classes = new Set<string>();
    for (const heroId of partyHeroIds) {
      const hero = state.heroes[heroId];
      if (hero) {
        classes.add(hero.class);
      }
    }

    // All 4 must be different classes
    if (classes.size === 4) {
      return SYNERGY_FULL_PARTY_FORMATION_BONUS;
    }

    return null;
  },

  assignZoneGeneratorBonus: (zoneId: string) => {
    const state = get();
    if (!state.hasSynergy('battle_hardened_vats')) return;
    if (state.synergy.zoneGeneratorBonuses[zoneId]) return;  // Already assigned

    // Pick a random generator
    const generators = generatorRegistry.getAll();
    const randomIndex = Math.floor(Math.random() * generators.length);
    const generatorId = generators[randomIndex].id;

    set({
      synergy: {
        ...state.synergy,
        zoneGeneratorBonuses: {
          ...state.synergy.zoneGeneratorBonuses,
          [zoneId]: generatorId,
        },
      },
    });

    publish({ type: 'CpsInputsChanged' });
  },

  getPrestigeSynergyReset: () => {
    // Synergies are PERMANENT — do not reset on prestige
    return {};
  },
});

export { initialSynergyState };
```

#### 3. Export Slice

**File**: `src/stores/slices/synergy/index.ts` (new file)

```typescript
export { createSynergySlice, initialSynergyState } from './synergySlice';
export type { SynergySlice, SynergyState } from './types';
```

#### 4. Register Slice in Store

**File**: `src/stores/gameStore.ts`
**Changes**: Import and compose the synergy slice.

Add import:
```typescript
import { createSynergySlice, initialSynergyState } from './slices/synergy';
import type { SynergySlice } from './slices/synergy';
```

Add to `GameStore` type (with other slice types):
```typescript
& SynergySlice
```

Add to store creation (with other slice creators):
```typescript
...createSynergySlice(set, get, api),
```

#### 5. Add Domain Event Type

**File**: `src/domain/events/types.ts`
**Changes**: Add synergy event type.

```typescript
| { type: 'SynergyPurchased'; synergyId: string }
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [x] `useGameStore.getState().synergy` returns initial state
- [x] `useGameStore.getState().hasSynergy('the_canadian_way')` returns `false`
- [x] Setting `whey = 100` then `purchaseSynergy('the_canadian_way')` returns `true`
- [x] After purchase, `hasSynergy('the_canadian_way')` returns `true`
- [x] `whey` decreased by 10

---

## Phase 3: CPS Pipeline Integration

### Overview

Wire synergy effects into the CPS calculation pipeline and other affected systems (combat damage, crafting time, formation bonus).

### Changes Required:

#### 1. Eh Multiplier Enhancement

**File**: `src/stores/slices/production/productionSlice.ts`
**Changes**: Modify `getEhMultiplier` to include synergy bonus.

Find `getEhMultiplier` (~line 227) and update:

```typescript
getEhMultiplier: () => {
  const { ehCount } = get();
  const synergyBonus = get().getSynergyEhBonus();
  const baseBonus = EH_BONUS_PER_TIER + synergyBonus;  // 0.01 + 0.01 = 0.02 with synergy
  const ehTier = Math.floor(ehCount / EH_DIVISOR);
  return 1 + ehTier * baseBonus;
},
```

#### 2. Generator Multipliers Enhancement

**File**: `src/stores/slices/production/cpsCalculator.ts`
**Changes**: Include synergy zone bonuses in generator multipliers.

Update `computeCps` function:

```typescript
export function computeCps(state: GameStore): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  
  // Apply synergy zone bonuses
  const synergyZoneMultipliers = state.getSynergyZoneGeneratorMultipliers();
  for (const [generatorId, multiplier] of Object.entries(synergyZoneMultipliers)) {
    generatorMultipliers[generatorId] = (generatorMultipliers[generatorId] ?? 1) * multiplier;
  }

  // ... rest of function unchanged
```

#### 3. Formation Bonus Enhancement

**File**: `src/systems/productionEngine.ts`
**Changes**: Check for synergy formation bonus override.

Find `calculateFormationMultiplier` (~line 233) and update the full party check:

```typescript
export function calculateFormationMultiplier(
  party: (string | null)[],
  heroes: Record<string, HeroState>,
  synergyFormationBonus?: number | null  // New parameter
): number {
  // ... existing tank/healer logic ...

  // Full party bonus
  const filledSlots = party.filter((id) => id !== null).length;
  if (filledSlots === 4) {
    // Use synergy bonus if provided and conditions met, else default
    if (synergyFormationBonus !== null && synergyFormationBonus !== undefined) {
      bonus += synergyFormationBonus;
    } else {
      bonus += FORMATION_FULL_PARTY_BONUS;
    }
  }

  return 1 + bonus;
}
```

Update call site in `cpsCalculator.ts`:

```typescript
const synergyFormationBonus = state.getSynergyFormationBonus();
const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes, synergyFormationBonus);
```

#### 4. Combat Damage Enhancement

**File**: `src/systems/combatEngine.ts`
**Changes**: Apply synergy damage bonus when calculating hero damage.

Find the damage calculation section (~line 81-120) and add synergy bonus:

```typescript
// After calculating base damage, before applying to target
const synergyDamageBonus = store.getSynergyBuffCombatDamageBonus();
const finalDamage = Math.floor(baseDamage * (1 + synergyDamageBonus));
```

This requires passing `store` to the damage function or accessing it via the existing pattern.

#### 5. Crafting Time Enhancement

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Changes**: Apply synergy speed multiplier when starting a craft.

Find `startCrafting` action and modify duration calculation:

```typescript
startCrafting: (recipeId: string, slotIndex: number) => {
  // ... existing validation ...
  
  const recipe = getRecipeById(recipeId);
  const baseDuration = recipe.craftingTime;
  const synergyMultiplier = get().getSynergyCraftingSpeedMultiplier();
  const actualDuration = Math.floor(baseDuration * synergyMultiplier);
  
  // Use actualDuration instead of baseDuration for endTime calculation
  const slot: CraftingSlot = {
    recipeId,
    startTime: now,
    endTime: now + actualDuration,
    // ...
  };
```

#### 6. Zone Clear Hook for Battle-Hardened Vats

**File**: `src/stores/slices/combat/combatSlice.ts`
**Changes**: Call `assignZoneGeneratorBonus` when a zone is cleared for the first time.

Find the zone completion logic and add:

```typescript
// When zone/boss is defeated for the first time
if (!previouslyCleared) {
  get().assignZoneGeneratorBonus(zoneId);
}
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] Purchase "The Canadian Way" → Eh multiplier in CPS breakdown shows doubled rate
- [ ] Clear a zone with "Battle-Hardened Vats" → random generator gets +5% bonus
- [ ] Have active cheese buff with "Cheese-Fueled Warriors" → combat damage increases by 25%
- [ ] Form party with high affinity heroes + "Fromage Affinity" → crafting time decreases
- [ ] Form party of 4 different classes + "Combat Harmony" → formation bonus shows +25%

---

## Phase 4: Save/Load Compatibility

### Overview

Ensure synergy state persists correctly and loads gracefully for existing saves.

### Changes Required:

#### 1. Save System Integration

**File**: `src/systems/saveSystem.ts`
**Changes**: Include synergy state in save/load.

In `saveGame`:
```typescript
synergy: state.synergy,
```

In `loadGame`:
```typescript
synergy: savedState.synergy ?? {
  purchased: [],
  zoneGeneratorBonuses: {},
},
```

#### 2. Increment Save Version

**File**: `src/data/constants.ts` or wherever `SAVE_VERSION` is defined
**Changes**: Bump version for migration awareness.

```typescript
export const SAVE_VERSION = 8;  // Was 7
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`

#### Manual Verification:

- [ ] Purchase synergy → save → reload → synergy still purchased
- [ ] Fresh game load (no save) → synergy state initializes correctly
- [ ] Old save (version 8) → loads without error, synergy state empty

---

## Phase 5: UI - Synergies Tab

### Overview

Add a "Synergies" tab to the upgrade panel showing all 5 synergies with purchase buttons.

### Changes Required:

#### 1. Synergies Tab Component

**File**: `src/components/ui/SynergiesPanel.tsx` (new file)

```typescript
import { useGameStore } from '../../stores/gameStore';
import { SYNERGIES } from '../../data/synergies';

export function SynergiesPanel() {
  const whey = useGameStore((s) => s.combat.whey);
  const purchased = useGameStore((s) => s.synergy.purchased);
  const purchaseSynergy = useGameStore((s) => s.purchaseSynergy);
  const canPurchaseSynergy = useGameStore((s) => s.canPurchaseSynergy);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Cross-System Synergies</h3>
        <div className="text-sm text-muted-foreground">
          Whey: <span className="font-mono text-amber-400">{whey}</span>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Permanent upgrades that connect game systems. Purchased with Whey from boss battles.
      </p>

      <div className="grid gap-3">
        {SYNERGIES.map((synergy) => {
          const isPurchased = purchased.includes(synergy.id);
          const canBuy = canPurchaseSynergy(synergy.id);

          return (
            <div
              key={synergy.id}
              className={`p-4 rounded-lg border ${
                isPurchased
                  ? 'bg-green-900/20 border-green-700'
                  : canBuy
                  ? 'bg-card border-border hover:border-primary cursor-pointer'
                  : 'bg-muted/50 border-border opacity-60'
              }`}
              onClick={() => canBuy && purchaseSynergy(synergy.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{synergy.icon}</span>
                  <div>
                    <h4 className="font-medium">{synergy.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {synergy.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {synergy.systemsConnected[0]} → {synergy.systemsConnected[1]}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {isPurchased ? (
                    <span className="text-green-400 text-lg">✓</span>
                  ) : (
                    <span className={`font-mono ${canBuy ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      {synergy.cost} Whey
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 2. Add Tab to Upgrade Panel

**File**: `src/components/ui/UpgradePanel.tsx`
**Changes**: Add "Synergies" tab alongside existing upgrade tabs.

Add import:
```typescript
import { SynergiesPanel } from './SynergiesPanel';
```

Add to tabs array (wherever tabs are defined):
```typescript
{ id: 'synergies', label: 'Synergies', icon: '🔗' }
```

Add tab content:
```typescript
{activeTab === 'synergies' && <SynergiesPanel />}
```

#### 3. Whey Display in Header (Optional)

**File**: `src/components/ui/Header.tsx` or appropriate location
**Changes**: Show Whey currency alongside other currencies.

```typescript
<span className="text-amber-400">🧪 {whey} Whey</span>
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:

- [ ] Synergies tab appears in upgrade panel
- [ ] All 5 synergies display with correct info
- [ ] Whey count shows correctly
- [ ] Affordable synergies highlight on hover
- [ ] Clicking affordable synergy purchases it
- [ ] Purchased synergies show checkmark and green background
- [ ] Unaffordable synergies appear dimmed

---

## Phase 6: Polish and Feedback

### Overview

Add audio feedback, particle effects, and notifications for synergy purchases. Add synergy bonus indicators where relevant.

### Changes Required:

#### 1. Purchase Sound Effect

**File**: `src/systems/audioSystem.ts`
**Changes**: Add `playSynergyPurchaseSound()` function.

Pattern: Similar to `playRennetGainSound()` but with a "connection" theme — two tones that harmonize.

```typescript
export function playSynergyPurchaseSound(): void {
  if (!audioState.enabled) return;
  
  const now = audioContext.currentTime;
  
  // Two harmonizing tones representing "connection"
  const freq1 = 440;  // A4
  const freq2 = 554;  // C#5 (major third)
  
  // First tone
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = freq1;
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialDecayTo(0.001, now + 0.5);
  osc1.connect(gain1).connect(audioContext.destination);
  osc1.start(now);
  osc1.stop(now + 0.5);
  
  // Second tone (slightly delayed)
  const osc2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq2;
  gain2.gain.setValueAtTime(0, now + 0.1);
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.15);
  gain2.gain.exponentialDecayTo(0.001, now + 0.6);
  osc2.connect(gain2).connect(audioContext.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.6);
}
```

#### 2. Purchase Particles

**File**: `src/components/ui/SynergiesPanel.tsx`
**Changes**: Emit particles on successful purchase.

```typescript
import { emitParticles } from '../../systems/particleSystem';

// In click handler:
const success = purchaseSynergy(synergy.id);
if (success) {
  playSynergyPurchaseSound();
  emitParticles(event.clientX, event.clientY, 'goldenSparkles');
}
```

#### 3. CPS Breakdown Enhancement (Optional)

**File**: `src/components/ui/CpsBreakdown.tsx` or similar
**Changes**: Show synergy contributions in the CPS breakdown tooltip.

If a breakdown component exists, add lines for:
- "The Canadian Way: +X% (Eh bonus doubled)"
- "Battle-Hardened Vats: +X% (zone bonuses)"
- "Combat Harmony: +X% (formation bonus)"

#### 4. Crafting Time Display

**File**: `src/components/ui/crafting/RecipeCard.tsx` or similar
**Changes**: Show reduced crafting time when Fromage Affinity is active.

```typescript
const synergyMultiplier = useGameStore((s) => s.getSynergyCraftingSpeedMultiplier());
const displayTime = Math.floor(recipe.craftingTime * synergyMultiplier);

// Show original time struck through if synergy reduces it
{synergyMultiplier < 1 && (
  <span className="text-muted-foreground line-through mr-1">
    {formatTime(recipe.craftingTime)}
  </span>
)}
<span>{formatTime(displayTime)}</span>
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:

- [ ] Purchasing synergy plays harmonizing sound
- [ ] Purchasing synergy shows golden sparkle particles
- [ ] CPS breakdown shows synergy contributions (if implemented)
- [ ] Crafting time shows synergy reduction (if Fromage Affinity active)
- [ ] Combat damage numbers reflect Cheese-Fueled Warriors bonus

---

## Testing Strategy

### Manual Testing Workflow:

1. **Fresh game**: Verify no synergies purchased, UI shows all 5 available
2. **Earn Whey**: Defeat bosses to accumulate 125+ Whey (enough for all synergies)
3. **Purchase each synergy** and verify:
   - The Canadian Way: Click 100+ times, check CPS increases by +2% per 100 (not +1%)
   - Battle-Hardened Vats: Clear a zone, verify random generator shows +5% bonus
   - Cheese-Fueled Warriors: Eat cheese, enter combat, verify damage numbers increase
   - Fromage Affinity: Form high-affinity party, start craft, verify faster time
   - Combat Harmony: Form 4-different-class party, verify +25% formation bonus
4. **Save/Load**: Save, reload, verify all synergies still active
5. **Prestige**: Perform aging reset, verify synergies NOT reset (permanent)

### Edge Cases:

- Purchase synergy with exactly enough Whey (boundary condition)
- Try to re-purchase already-owned synergy (should fail silently)
- Battle-Hardened Vats: Clear zone that was already cleared before buying synergy
- Fromage Affinity with empty party (should return 1x multiplier)
- Combat Harmony with 4 heroes of same class (should NOT apply bonus)
- Cheese-Fueled Warriors with no active buffs (should NOT apply bonus)

### Key Invariants:

- Synergies never reset on prestige
- Whey can never go negative
- Each synergy can only be purchased once
- Zone generator bonuses persist across saves
- Synergy effects multiplicatively stack with other bonuses

---

## Performance Considerations

- `getSynergyZoneGeneratorMultipliers()` iterates `zoneGeneratorBonuses` object — at most 16 zones, negligible
- `getSynergyBuffCombatDamageBonus()` checks active buffs — at most ~10 buffs, negligible
- `getSynergyCraftingSpeedMultiplier()` iterates party (4 heroes) — negligible
- CPS recalculation already event-driven — synergy changes trigger same `CpsInputsChanged` event

No performance concerns anticipated.

---

## Migration Notes

- Save version bumps from 7 to 8
- Old saves load with empty synergy state (no migration needed)
- No data transformation required — pure additive feature

---

## References

- Research: `thoughts/shared/research/2026-06-10_23-22-43_making-the-game-more-fun-state-of-the-art-analysis.md` — Tier 2 section
- Original proposal: `thoughts/shared/research/2026-02-28_3-ways-to-make-the-game-more-fun.md` — Enhancement 3
- CPS pipeline: `src/stores/slices/production/cpsCalculator.ts`
- Prestige slice pattern: `src/stores/slices/prestige/prestigeSlice.ts`
- Constants: `src/data/constants.ts`
- Combat engine: `src/systems/combatEngine.ts`
- Crafting slice: `src/stores/slices/crafting/craftingSlice.ts`
