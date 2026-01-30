# Phase 3: JRPG Hero System - Implementation Plan

## Overview

Implement a party-based JRPG hero system for "The Great Canadian Cheese Quest." This phase introduces 8 unique Canadian-themed heroes with stats, equipment, and party formation mechanics. Heroes provide passive production bonuses and will serve as the foundation for the combat system in Phase 4.

## Current State Analysis

The game currently has:
- **Core clicker mechanics**: Click-based and idle curd production (Phase 1)
- **15 generators**: 5 basic + 10 Canadian-themed with geometric cost scaling
- **50+ upgrades**: Click multipliers, generator multipliers, global multipliers
- **32+ achievements**: Various categories with reward multipliers
- **Zustand store**: Single source of truth with computed values (CPS, click value)
- **Type system**: Well-defined interfaces in `src/types/game.ts`
- **UI patterns**: Panel components with row subcomponents, Tailwind styling

**Key Integration Points**:
- `src/types/game.ts:3-17` - `GameState` interface needs hero state
- `src/stores/gameStore.ts:75-89` - Initial state needs hero defaults
- `src/stores/gameStore.ts:140-142` - Multiplier calculation chain needs hero multipliers
- `src/systems/productionEngine.ts` - Needs hero production bonus calculations

## Desired End State

A fully functional hero system where:
1. Players can recruit 8 unique Canadian heroes at different progression milestones
2. Each hero has base stats (HP, Attack, Defense, Speed, Cheese Affinity)
3. Heroes can be equipped with items in 4 slots (Weapon, Armor, Accessory, Cheese Charm)
4. A party of 4 heroes can be arranged in a 2x2 formation (front/back rows)
5. Heroes provide passive CPS bonuses based on their level and Cheese Affinity stat
6. Heroes gain XP from idle time and can level up to increase stats
7. The UI displays hero roster, party formation, and equipment management

**Verification Criteria**:
- `pnpm typecheck` passes with no errors
- `pnpm lint` passes with no warnings
- `pnpm build` produces working production bundle
- Heroes appear in UI, can be recruited, equipped, and assigned to party
- Hero multipliers properly affect CPS calculations
- Save/load preserves hero state including levels, equipment, and formation

## Assumptions Made

1. **No combat yet**: Heroes provide passive bonuses only; combat comes in Phase 4
2. **Equipment is basic**: Tier 1-3 equipment with simple stat bonuses; no crafting this phase
3. **XP from idle only**: Heroes gain XP based on time elapsed, not clicks
4. **Recruitment costs curds**: Heroes are purchased with curds at milestone amounts
5. **Formation is visual prep**: Formation bonuses exist but matter more in Phase 4 combat
6. **8 heroes total this phase**: One per initial roster as defined in research document

## What We're NOT Doing

- **Combat system**: Battles, enemies, skills - deferred to Phase 4
- **Equipment crafting**: Simple shop/drop system, no crafting
- **Hero recruitment quests**: Heroes unlock via currency thresholds only
- **Limit breaks**: Combat-only feature for Phase 4
- **3D hero models**: Heroes represented in UI only, no 3D scene presence yet
- **Province-locked heroes**: All 8 base heroes available regardless of province progress

## Implementation Approach

Follow existing codebase patterns:
1. **Types first**: Define interfaces in `src/types/game.ts`
2. **Data second**: Create static content in `src/data/heroes.ts` and `src/data/equipment.ts`
3. **Engine functions**: Add hero calculations to `src/systems/productionEngine.ts`
4. **Store integration**: Extend Zustand store with hero state and actions
5. **UI components**: Build `HeroPanel.tsx` following `GeneratorPanel.tsx` pattern
6. **Save system**: Extend save/load to persist hero state

---

## Phase 3.1: Type Definitions

### Overview

Define all TypeScript interfaces and types for the hero system. This establishes the contract for all subsequent implementation.

### Changes Required:

#### 1. Core Hero Types

**File**: `src/types/game.ts`
**Changes**: Add hero-related interfaces after achievement types

```typescript
// Hero system types to add:

export type HeroClass = 'tank' | 'dps' | 'support' | 'healer';
export type Province = 'ontario' | 'quebec' | 'alberta' | 'manitoba' | 'saskatchewan' | 'yukon' | 'bc' | 'nova_scotia';
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
  frontLeft: string | null;  // Hero ID or null
  frontRight: string | null;
  backLeft: string | null;
  backRight: string | null;
}

// Formation position type for iteration
export type FormationPosition = 'frontLeft' | 'frontRight' | 'backLeft' | 'backRight';
```

#### 2. Extend GameState

**File**: `src/types/game.ts`
**Changes**: Add hero fields to `GameState` interface

```typescript
export interface GameState {
  // ... existing fields ...

  // Hero system
  heroes: Record<string, HeroState>; // Recruited heroes by ID
  party: PartyFormation;
  equipmentInventory: string[]; // Owned equipment IDs
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes with new types (types are valid; downstream errors in store/save expected until Phase 3.5/3.7)
- [x] No circular dependencies in type imports

#### Manual Verification:
- [x] All types are exported from `src/types/game.ts`
- [x] Types match the research document specifications

---

## Phase 3.2: Hero Data Definitions

### Overview

Create static hero data for the initial 8 heroes, following the pattern established in `generators.ts`.

### Changes Required:

#### 1. Hero Definitions

**File**: `src/data/heroes.ts` (new file)
**Changes**: Define all 8 initial heroes

Heroes from research document:
1. **Maple Knight** (Tank, Ontario) - "Sorry Shield"
2. **Poutine Mage** (DPS, Quebec) - "Gravy Blast"
3. **Mountie Ranger** (Support, Alberta) - "Always Get My Cheese"
4. **Hockey Enforcer** (DPS, Manitoba) - "Slapshot"
5. **Voyageur Bard** (Support, Saskatchewan) - "Paddle Song"
6. **Toque Monk** (Tank, Yukon) - "Cold Resistance"
7. **West Coast Druid** (Healer, BC) - "Cedar Healing"
8. **Maritime Fisher** (DPS, Nova Scotia) - "Lobster Trap"

Cost progression: Each hero costs ~10x the previous, starting at 1M curds.

```typescript
// Cost progression for 8 heroes:
// 1M, 10M, 100M, 1B, 10B, 100B, 1T, 10T
```

Include helper function: `getHeroById(id: string): HeroDefinition | undefined`

#### 2. XP Curve Constants

**File**: `src/data/heroes.ts`
**Changes**: Add XP scaling constants

```typescript
export const HERO_XP_BASE = 100; // XP needed for level 2
export const HERO_XP_MULTIPLIER = 1.5; // Each level requires 1.5x more XP
export const HERO_MAX_LEVEL = 100;

export function getXpForLevel(level: number): number {
  return Math.floor(HERO_XP_BASE * Math.pow(HERO_XP_MULTIPLIER, level - 1));
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes (heroes.ts has no errors; store/save errors expected until Phase 3.5/3.7)
- [x] `pnpm lint` passes

#### Manual Verification:
- [x] All 8 heroes defined with unique stats and abilities
- [x] Cost progression is balanced (accessible but challenging)

---

## Phase 3.3: Equipment Data Definitions

### Overview

Create equipment data for Tier 1-3 items across all 4 slots.

### Changes Required:

#### 1. Equipment Definitions

**File**: `src/data/equipment.ts` (new file)
**Changes**: Define equipment items

Create 3 tiers of equipment for each slot (12 items per slot = 48 total):

**Weapons** (boost Attack):
- Common: Cheese Knife (+5 ATK), Curd Cutter (+8 ATK), Milk Sword (+12 ATK)
- Uncommon: Fromager's Blade (+20 ATK), etc.
- Rare: Legendary weapons (+50 ATK), etc.

**Armor** (boost Defense, HP):
- Common: Cheese Cloth Robe, Wax Vest, Rind Armor
- Uncommon/Rare variants

**Accessories** (boost Speed, various):
- Common: Milk Bucket Pendant, Curd Earrings, Aging Timer
- Uncommon/Rare variants

**Cheese Charms** (boost Cheese Affinity):
- Common: Fresh Curd Charm (+5 Affinity)
- Uncommon: Aged Cheddar Charm (+15 Affinity)
- Rare: Vintage Wheel Charm (+30 Affinity)

Include helper function: `getEquipmentById(id: string): Equipment | undefined`

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes (equipment.ts has no errors; store/save errors expected until Phase 3.5/3.7)
- [x] `pnpm lint` passes

#### Manual Verification:
- [x] Equipment provides meaningful stat progression
- [x] Costs scale appropriately with rarity

---

## Phase 3.4: Production Engine - Hero Calculations

### Overview

Add hero-related calculation functions to the production engine.

### Changes Required:

#### 1. Hero Multiplier Calculations

**File**: `src/systems/productionEngine.ts`
**Changes**: Add new calculation functions

```typescript
// Calculate total CPS bonus from all party heroes
export function calculateHeroCpsBonus(
  heroes: Record<string, HeroState>,
  party: PartyFormation,
  equipment: string[]
): number {
  // Sum cheeseAffinity of active party members
  // Apply equipment bonuses
  // Apply level scaling
  // Return as multiplier (1.0 = no bonus)
}

// Calculate effective stats for a hero (base + growth + equipment)
export function calculateHeroStats(
  heroId: string,
  heroState: HeroState
): HeroStats {
  // Get base stats from hero definition
  // Add stat growth * (level - 1)
  // Add equipment bonuses
  // Return total stats
}

// Calculate XP gain rate (per second, for idle progression)
export function calculateXpPerSecond(
  curdPerSecond: Decimal
): number {
  // XP scales with CPS: 1 XP per 1000 CPS per second
  return Math.max(0.1, curdPerSecond.div(1000).toNumber());
}

// Calculate formation bonus multiplier
export function calculateFormationBonus(
  party: PartyFormation,
  heroes: Record<string, HeroState>
): number {
  // Bonus for having tank in front: +5%
  // Bonus for having healer in back: +5%
  // Bonus for full party: +10%
  // Max bonus: +20%
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes (productionEngine.ts compiles cleanly; store/save errors expected until Phase 3.5/3.7)
- [x] `pnpm lint` passes

#### Manual Verification:
- [x] Calculations produce expected values for test cases
- [x] Empty party returns neutral multipliers (1.0)

---

## Phase 3.5: Zustand Store - Hero State & Actions

### Overview

Extend the game store with hero state management and actions.

### Changes Required:

#### 1. Initial State Extension

**File**: `src/stores/gameStore.ts`
**Changes**: Add hero fields to initial state

```typescript
const initialState: GameState = {
  // ... existing fields ...
  heroes: {},
  party: {
    frontLeft: null,
    frontRight: null,
    backLeft: null,
    backRight: null,
  },
  equipmentInventory: [],
};
```

#### 2. Hero Actions

**File**: `src/stores/gameStore.ts`
**Changes**: Add hero-related actions to store interface and implementation

```typescript
// New actions to add:
recruitHero: (heroId: string) => boolean;
canAffordHero: (heroId: string) => boolean;
isHeroRecruited: (heroId: string) => boolean;
getHeroState: (heroId: string) => HeroState | undefined;
getAvailableHeroes: () => HeroDefinition[]; // Unrecruited heroes
getRecruitedHeroes: () => HeroDefinition[]; // Recruited heroes

// Party management
assignToParty: (heroId: string, position: FormationPosition) => boolean;
removeFromParty: (position: FormationPosition) => void;
swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => void;
getPartyHeroes: () => (HeroDefinition | null)[];

// Equipment management
buyEquipment: (equipmentId: string) => boolean;
canAffordEquipment: (equipmentId: string) => boolean;
equipItem: (heroId: string, equipmentId: string) => boolean;
unequipItem: (heroId: string, slot: EquipmentSlot) => void;
getHeroEquipment: (heroId: string) => Equipment[];

// XP and leveling
grantXp: (heroId: string, amount: number) => void;
tickHeroXp: (deltaMs: number) => void; // Called from game loop
```

#### 3. Integrate Hero Multipliers into CPS

**File**: `src/stores/gameStore.ts`
**Changes**: Update `buyGenerator`, `buyUpgrade`, and `recalculateCps` to include hero bonuses

The multiplier chain becomes:
```
totalCps = baseCps * generatorMultipliers * upgradeGlobal * achievementGlobal * heroBonus * formationBonus
```

#### 4. Hero Unlock Callback

**File**: `src/stores/gameStore.ts`
**Changes**: Add callback for hero level-up notifications (similar to achievement callback)

```typescript
type HeroLevelUpCallback = (hero: HeroDefinition, newLevel: number) => void;
let heroLevelUpCallback: HeroLevelUpCallback | null = null;
export function setHeroLevelUpCallback(callback: HeroLevelUpCallback | null): void;
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Can recruit heroes when affordable
- [ ] Party assignment works correctly
- [ ] Equipment equip/unequip functions properly
- [ ] Hero CPS bonus affects total production

---

## Phase 3.6: Game Loop - Hero XP Ticks

### Overview

Integrate hero XP progression into the game loop.

### Changes Required:

#### 1. XP Tick Integration

**File**: `src/systems/gameLoop.ts`
**Changes**: Call `tickHeroXp` from the main game loop

```typescript
function gameTick(deltaMs: number) {
  const store = useGameStore.getState();
  store.tick(deltaMs);
  store.tickHeroXp(deltaMs); // Add this line
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [ ] Heroes gain XP over time while game is running
- [ ] Level-ups trigger callback notification

---

## Phase 3.7: Save System Extension

### Overview

Extend save/load to persist hero state.

### Changes Required:

#### 1. Save Format Update

**File**: `src/systems/saveSystem.ts`
**Changes**: Update `SAVE_VERSION` and handle hero state serialization

```typescript
const SAVE_VERSION = 4; // Increment from 3

// Serialize hero state (no Decimal values in heroes, so straightforward)
// Handle equipment inventory
// Handle party formation
```

#### 2. Migration from v3

**File**: `src/systems/saveSystem.ts`
**Changes**: Add migration for saves without hero data

```typescript
// If loading v3 save, add default hero fields:
if (!savedData.heroes) {
  savedData.heroes = {};
  savedData.party = { frontLeft: null, frontRight: null, backLeft: null, backRight: null };
  savedData.equipmentInventory = [];
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [x] Save preserves hero levels, XP, equipment, and party
- [x] Old saves migrate correctly with empty hero state

---

## Phase 3.8: Hero Panel UI Component

### Overview

Create the main hero UI panel following the `GeneratorPanel.tsx` pattern.

### Changes Required:

#### 1. Hero Panel Component

**File**: `src/components/ui/HeroPanel.tsx` (new file)
**Changes**: Create hero roster and recruitment UI

Structure:
```
HeroPanel
├── Header (toggle between Roster/Recruit tabs)
├── Roster Tab
│   └── HeroCard (for each recruited hero)
│       ├── Portrait/Icon
│       ├── Name, Level, Class
│       ├── Stats summary
│       ├── Equipment slots (clickable)
│       └── "Add to Party" button
└── Recruit Tab
    └── HeroRecruitCard (for each unrecruited hero)
        ├── Portrait/Icon (silhouette if locked)
        ├── Name, Class, Province
        ├── Special ability description
        └── Recruit button with cost
```

Follow existing patterns:
- Use `useGameStore` hooks for state
- Use `formatNumber` for cost display
- Use Tailwind with existing color palette (maple, cheddar, timber)
- Canadian-tier styling for special heroes

#### 2. Party Formation Panel

**File**: `src/components/ui/PartyFormationPanel.tsx` (new file)
**Changes**: Create party arrangement UI

Structure:
```
PartyFormationPanel
├── Header "Party Formation"
├── 2x2 Grid
│   ├── Front Row (Left, Right)
│   └── Back Row (Left, Right)
├── Each slot shows:
│   ├── Hero icon if assigned
│   ├── "Empty" if not
│   └── Click to open hero selector
└── Formation Bonus display
```

#### 3. Equipment Modal

**File**: `src/components/ui/EquipmentModal.tsx` (new file)
**Changes**: Create equipment management modal

Opens when clicking equipment slot on a hero:
- Shows current equipped item (if any)
- Lists available equipment for that slot
- Buy/Equip/Unequip buttons

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `pnpm build` succeeds

#### Manual Verification:
- [ ] Hero panel displays correctly in UI
- [ ] Can recruit heroes with sufficient curds
- [ ] Can assign heroes to party formation
- [ ] Can equip/unequip items on heroes
- [ ] Responsive design works on different screen sizes

---

## Phase 3.9: App Integration

### Overview

Integrate hero components into the main application layout.

### Changes Required:

#### 1. Add Hero Panel to Layout

**File**: `src/App.tsx`
**Changes**: Add HeroPanel to the UI layout

Suggested placement: New tab or panel alongside Generators/Upgrades/Achievements.

```tsx
// Add tab for Heroes in the panel navigation
// Render HeroPanel when Heroes tab is selected
```

#### 2. Add Level-Up Toast

**File**: `src/App.tsx`
**Changes**: Register hero level-up callback for notifications

```tsx
useEffect(() => {
  setHeroLevelUpCallback((hero, level) => {
    // Show toast notification
    toast.success(`${hero.name} reached level ${level}!`);
  });
  return () => setHeroLevelUpCallback(null);
}, []);
```

#### 3. Party Formation Display

**File**: `src/App.tsx`
**Changes**: Add PartyFormationPanel to UI (possibly collapsible in corner or dedicated area)

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `pnpm build` succeeds

#### Manual Verification:
- [ ] Hero panel accessible from main UI
- [ ] Level-up notifications appear
- [ ] Party formation visible and interactive

---

## Phase 3.10: Polish & Balance

### Overview

Final adjustments, testing, and balance tuning.

### Changes Required:

#### 1. Balance Tuning

**File**: `src/data/heroes.ts`, `src/data/equipment.ts`
**Changes**: Adjust costs and stat values based on playtesting

Key balance targets:
- First hero recruitable after ~30 minutes of play
- Full hero roster requires significant late-game progress
- Hero CPS bonus meaningful but not game-breaking (10-50% range total)

#### 2. UI Polish

**File**: Various UI components
**Changes**:
- Add hover states and transitions
- Ensure consistent styling with existing panels
- Add loading states for expensive operations

#### 3. Canadian Flavor

**Files**: Hero data, UI text
**Changes**:
- Add Canadian dialogue triggers for hero events
- Hero-specific catch phrases on recruit/level-up
- Polite error messages ("Sorry, you can't afford this hero, eh!")

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `pnpm build` produces optimized bundle

#### Manual Verification:
- [ ] Heroes are fun and satisfying to collect
- [ ] Balance feels right for progression
- [ ] No performance issues with hero calculations
- [ ] Canadian humor shines through

---

## Testing Strategy

### Unit Testing

Focus areas:
1. `productionEngine.ts` - Hero calculation functions
2. `gameStore.ts` - Hero state mutations
3. `saveSystem.ts` - Serialization/deserialization

Test cases:
- Empty party returns neutral multipliers
- Hero stats calculated correctly with equipment
- XP accumulation and level-up thresholds
- Party formation bonus calculations

### Integration Testing

1. Full recruitment flow: Earn curds -> Recruit hero -> Assign to party -> See CPS increase
2. Save/load cycle: Recruit heroes -> Save -> Reload -> Verify state
3. Equipment flow: Buy equipment -> Equip on hero -> See stat change -> Unequip

### Manual Testing Checklist

- [ ] Recruit first hero with starting resources (after clicking)
- [ ] Level up a hero through idle play
- [ ] Fill all 4 party slots
- [ ] Equip items in all slots on one hero
- [ ] Save, close, reopen - verify state persists
- [ ] Offline progress includes hero XP
- [ ] No console errors during normal play
- [ ] Mobile responsive UI works

---

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Existing type patterns: `src/types/game.ts:19-74`
- Generator data pattern: `src/data/generators.ts`
- Store patterns: `src/stores/gameStore.ts`
- UI component patterns: `src/components/ui/GeneratorPanel.tsx`
