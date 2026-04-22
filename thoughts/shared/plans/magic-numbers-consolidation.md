# Magic Numbers Consolidation - Implementation Plan

## Overview

Extract 75+ scattered magic numbers into centralized constants, eliminating duplication between engine code and UI components. This improves maintainability by ensuring game balance values have a single source of truth.

## Current State Analysis

The research document (`thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`) identified magic numbers scattered across the codebase. While CPS recalculation has been centralized via the store refactor, magic numbers remain duplicated:

**Combat Constants Duplicated in UI (7+ files)**:
- `ATB_MAX = 100` defined in `combatEngine.ts:26` but hardcoded in 7 UI files
- `LIMIT_BREAK_MAX = 100` defined in `combatEngine.ts:28` but hardcoded in 4 UI files
- HP thresholds (25%, 50%) not defined anywhere, duplicated in 2 files

**Data File Repetition**:
- `costMultiplier: 1.15` repeated 15 times in `generators.ts`
- `enemyLevelScale: 1.15` repeated 13+ times in `zones.ts`

**Inline Engine Constants**:
- Defense formula divisor (100) at `combatEngine.ts:80`
- Damage variance (0.9-1.1) at `combatEngine.ts:81`
- Formation bonuses (0.05, 0.1) in `productionEngine.ts`
- Prestige multipliers (0.01, 0.05) in `productionEngine.ts`

## Desired End State

After implementing this plan:

1. **Combat constants** exported from `combatEngine.ts` and imported by all UI components
2. **Game balance constants** centralized in `src/data/constants.ts`
3. **No magic numbers** in UI components - all values imported from constants
4. **Data files** reference shared constants instead of repeating values

### Verification:
- `pnpm build` passes
- `pnpm lint` passes
- Grep for hardcoded `100` in UI combat components returns zero matches
- Grep for `1.15` in data files returns only the constant definition

## What We're NOT Doing

- Changing any game balance values (pure refactor)
- Adding configuration UI for these values
- Making constants runtime-configurable
- Refactoring non-duplicated magic numbers (single-use values are fine)

---

## Phase 1: Export Combat Constants from Engine

### Overview

Export existing combat constants from `combatEngine.ts` so UI components can import them.

### Changes Required:

#### 1. Export Combat Constants

**File**: `src/systems/combatEngine.ts`
**Lines**: 24-30

```typescript
// BEFORE (not exported):
const ATB_MAX = 100;
const BASE_ATB_RATE = 10;
const LIMIT_BREAK_MAX = 100;
const LIMIT_BREAK_GAIN_FROM_DEALT = 0.01;
const LIMIT_BREAK_GAIN_FROM_TAKEN = 0.05;

// AFTER (exported):
export const ATB_MAX = 100;
export const BASE_ATB_RATE = 10;
export const LIMIT_BREAK_MAX = 100;
export const LIMIT_BREAK_GAIN_FROM_DEALT = 0.01;
export const LIMIT_BREAK_GAIN_FROM_TAKEN = 0.05;

// Add HP threshold constants (new):
export const HP_LOW_THRESHOLD = 25;   // Below this = red/critical
export const HP_MEDIUM_THRESHOLD = 50; // Below this = yellow/warning
```

#### 2. Add Defense and Damage Constants

**File**: `src/systems/combatEngine.ts`
**Lines**: After existing constants

```typescript
// Combat calculation constants
export const DEFENSE_DIVISOR = 100; // damage = attack * (1 - defense / (defense + DEFENSE_DIVISOR))
export const DAMAGE_VARIANCE_MIN = 0.9;  // Minimum damage roll multiplier
export const DAMAGE_VARIANCE_MAX = 1.1;  // Maximum damage roll multiplier
export const INITIAL_ATB_VARIANCE = 20;  // Random 0-20% starting ATB for enemies
export const BOSS_PHASE_HEAL_PERCENT = 0.10; // 10% heal on phase transition
```

#### 3. Update Internal Usage

**File**: `src/systems/combatEngine.ts`
**Line**: 80 (defense calculation)

```typescript
// BEFORE:
const damageReduction = defense / (defense + 100);

// AFTER:
const damageReduction = defense / (defense + DEFENSE_DIVISOR);
```

**Line**: 81 (damage variance)

```typescript
// BEFORE:
const variance = 0.9 + Math.random() * 0.2;

// AFTER:
const variance = DAMAGE_VARIANCE_MIN + Math.random() * (DAMAGE_VARIANCE_MAX - DAMAGE_VARIANCE_MIN);
```

**Line**: 325 (boss phase heal)

```typescript
// BEFORE:
boss.currentHp = Math.min(boss.maxHp, boss.currentHp + boss.maxHp * 0.10);

// AFTER:
boss.currentHp = Math.min(boss.maxHp, boss.currentHp + boss.maxHp * BOSS_PHASE_HEAL_PERCENT);
```

**Line**: 486 (initial ATB variance)

```typescript
// BEFORE:
atbGauge: Math.random() * 20,

// AFTER:
atbGauge: Math.random() * INITIAL_ATB_VARIANCE,
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] Constants are exported: `grep -c "export const ATB_MAX" src/systems/combatEngine.ts` returns 1

#### Manual Verification:
- [ ] Combat still functions identically

---

## Phase 2: Update UI Components to Import Combat Constants

### Overview

Replace hardcoded magic numbers in UI components with imports from `combatEngine.ts`.

### Changes Required:

#### 1. Update CombatPanel.tsx

**File**: `src/components/ui/CombatPanel.tsx`

Add import at top:
```typescript
import { ATB_MAX, LIMIT_BREAK_MAX, HP_LOW_THRESHOLD, HP_MEDIUM_THRESHOLD } from '../../systems/combatEngine';
```

**Line**: 25-28

```typescript
// BEFORE:
const hpPercentage = (heroState.currentHp / heroState.maxHp) * 100;
const isLowHp = hpPercentage < 25;
const isMediumHp = hpPercentage < 50;
const isReady = heroState.atbGauge >= 100;

// AFTER:
const hpPercentage = (heroState.currentHp / heroState.maxHp) * 100;
const isLowHp = hpPercentage < HP_LOW_THRESHOLD;
const isMediumHp = hpPercentage < HP_MEDIUM_THRESHOLD;
const isReady = heroState.atbGauge >= ATB_MAX;
```

**Line**: 335

```typescript
// BEFORE:
if (combat.limitBreakGauge >= 100) {

// AFTER:
if (combat.limitBreakGauge >= LIMIT_BREAK_MAX) {
```

#### 2. Update EnemyDisplay.tsx

**File**: `src/components/ui/EnemyDisplay.tsx`

Add import at top:
```typescript
import { ATB_MAX, HP_LOW_THRESHOLD, HP_MEDIUM_THRESHOLD } from '../../systems/combatEngine';
```

**Lines**: 46-48

```typescript
// BEFORE:
const hpPercentage = (enemy.currentHp / enemy.maxHp) * 100;
const isLowHp = hpPercentage < 25;
const isMediumHp = hpPercentage < 50;
const isReady = enemy.atbGauge >= 100;

// AFTER:
const hpPercentage = (enemy.currentHp / enemy.maxHp) * 100;
const isLowHp = hpPercentage < HP_LOW_THRESHOLD;
const isMediumHp = hpPercentage < HP_MEDIUM_THRESHOLD;
const isReady = enemy.atbGauge >= ATB_MAX;
```

#### 3. Update HeroAbilityButton.tsx

**File**: `src/components/ui/HeroAbilityButton.tsx`

Add import at top:
```typescript
import { LIMIT_BREAK_MAX } from '../../systems/combatEngine';
```

**Line**: 139

```typescript
// BEFORE:
const isLimitBreakReady = combat.limitBreakGauge >= 100;

// AFTER:
const isLimitBreakReady = combat.limitBreakGauge >= LIMIT_BREAK_MAX;
```

#### 4. Update CombatATBBar.tsx

**File**: `src/components/ui/CombatATBBar.tsx`

Add import at top:
```typescript
import { ATB_MAX } from '../../systems/combatEngine';
```

**Line**: 14 (default parameter)

```typescript
// BEFORE:
maxValue = 100,

// AFTER:
maxValue = ATB_MAX,
```

**Line**: 92

```typescript
// BEFORE:
const isReady = currentValue >= 100;

// AFTER:
const isReady = currentValue >= ATB_MAX;
```

#### 5. Update useKeyboardShortcuts.ts

**File**: `src/hooks/useKeyboardShortcuts.ts`

Add import at top:
```typescript
import { ATB_MAX } from '../systems/combatEngine';
```

**Line**: 265

```typescript
// BEFORE:
const readyHero = aliveHeroes.find((h) => h.atbGauge >= 100);

// AFTER:
const readyHero = aliveHeroes.find((h) => h.atbGauge >= ATB_MAX);
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] Grep for hardcoded ATB check: `grep -r "atbGauge >= 100" src/components src/hooks` returns 0 matches
- [x] Grep for hardcoded limit break check: `grep -r "limitBreakGauge >= 100" src/components` returns 0 matches

#### Manual Verification:
- [ ] Combat UI displays ATB bars correctly
- [ ] Limit break activates when gauge is full
- [ ] HP color thresholds work correctly (red < 25%, yellow < 50%)

---

## Phase 3: Create Game Balance Constants File

### Overview

Create a centralized constants file for game balance values used across data files.

### Changes Required:

#### 1. Create Constants File

**File**: `src/data/constants.ts` (new)

```typescript
/**
 * Centralized game balance constants.
 * Single source of truth for values used across multiple data files.
 */

// ===== Generator Balance =====

/** Cost multiplier for all generators (exponential scaling) */
export const GENERATOR_COST_MULTIPLIER = 1.15;

// ===== Zone/Enemy Balance =====

/** Enemy level scaling per stage within a zone */
export const ENEMY_LEVEL_SCALE = 1.15;

/** Default number of stages per zone */
export const STAGES_PER_ZONE = 10;

// ===== Hero Balance =====

/** Maximum hero level */
export const HERO_MAX_LEVEL = 50;

/** Base XP required for level 2 */
export const BASE_XP_REQUIREMENT = 100;

/** XP requirement multiplier per level */
export const XP_MULTIPLIER_PER_LEVEL = 1.5;

// ===== Formation Bonuses =====

/** Bonus for tank in front row */
export const FORMATION_TANK_FRONT_BONUS = 0.05;

/** Bonus for healer in back row */
export const FORMATION_HEALER_BACK_BONUS = 0.05;

/** Bonus for full party (4 heroes) */
export const FORMATION_FULL_PARTY_BONUS = 0.10;

// ===== Prestige Multipliers =====

/** Production bonus per rennet point (Aging tier) */
export const RENNET_PRODUCTION_MULTIPLIER = 0.01;

/** Production bonus per vintage wheel (Vintage tier) */
export const VINTAGE_WHEEL_MULTIPLIER = 0.05;

/** Production bonus per legacy point (Legacy tier) */
export const LEGACY_POINT_MULTIPLIER = 0.01;

/** Maximum prestige cost reduction (90%) */
export const MAX_PRESTIGE_COST_REDUCTION = 0.9;

// ===== Cheese Crafting =====

/** Cheese affinity divisor for quality calculation */
export const CHEESE_AFFINITY_DIVISOR = 1000;

// ===== Game Loop =====

/** Game logic tick interval in milliseconds */
export const GAME_TICK_INTERVAL_MS = 100;

/** Mobile device tick interval (slower for battery) */
export const MOBILE_TICK_INTERVAL_MS = 150;

/** Target frame rate for rendering */
export const TARGET_FPS = 60;

/** Frame budget in milliseconds (1000 / TARGET_FPS) */
export const FRAME_BUDGET_MS = 16;
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] File exists: `test -f src/data/constants.ts`

#### Manual Verification:
- [x] Constants are organized logically by category

---

## Phase 4: Update Data Files to Use Constants

### Overview

Replace repeated magic numbers in data files with imports from the constants file.

### Changes Required:

#### 1. Update generators.ts

**File**: `src/data/generators.ts`

Add import at top:
```typescript
import { GENERATOR_COST_MULTIPLIER } from './constants';
```

Replace all 15 instances of `costMultiplier: 1.15` with `costMultiplier: GENERATOR_COST_MULTIPLIER`:

**Lines**: 12, 21, 30, 39, 48, 58, 67, 76, 85, 94, 103, 112, 121, 130, 139

```typescript
// BEFORE (repeated 15 times):
costMultiplier: 1.15,

// AFTER (repeated 15 times):
costMultiplier: GENERATOR_COST_MULTIPLIER,
```

#### 2. Update zones.ts

**File**: `src/data/zones.ts`

Add import at top:
```typescript
import { ENEMY_LEVEL_SCALE, STAGES_PER_ZONE } from './constants';
```

Replace all instances of `enemyLevelScale: 1.15`:

**Lines**: 48, 114, 180, 246, 312, 378, 444, 510, 576, 642, 708, 774, 840, 909, 1056 (and more)

```typescript
// BEFORE (repeated 13+ times):
enemyLevelScale: 1.15,

// AFTER:
enemyLevelScale: ENEMY_LEVEL_SCALE,
```

#### 3. Update productionEngine.ts

**File**: `src/systems/productionEngine.ts`

Add import at top:
```typescript
import {
  FORMATION_TANK_FRONT_BONUS,
  FORMATION_HEALER_BACK_BONUS,
  FORMATION_FULL_PARTY_BONUS,
  RENNET_PRODUCTION_MULTIPLIER,
  VINTAGE_WHEEL_MULTIPLIER,
  LEGACY_POINT_MULTIPLIER,
  MAX_PRESTIGE_COST_REDUCTION,
  CHEESE_AFFINITY_DIVISOR,
} from '../data/constants';
```

**Line**: 192 (cheese affinity)

```typescript
// BEFORE:
return 1 + totalAffinity / 1000;

// AFTER:
return 1 + totalAffinity / CHEESE_AFFINITY_DIVISOR;
```

**Lines**: 218, 230, 238 (formation bonuses)

```typescript
// BEFORE:
if (isTankInFront) bonus += 0.05;
if (isHealerInBack) bonus += 0.05;
if (isFullParty) bonus += 0.1;

// AFTER:
if (isTankInFront) bonus += FORMATION_TANK_FRONT_BONUS;
if (isHealerInBack) bonus += FORMATION_HEALER_BACK_BONUS;
if (isFullParty) bonus += FORMATION_FULL_PARTY_BONUS;
```

**Line**: 287 (rennet multiplier)

```typescript
// BEFORE:
return 1 + rennet * 0.01;

// AFTER:
return 1 + rennet * RENNET_PRODUCTION_MULTIPLIER;
```

**Line**: 309 (vintage wheel bonus)

```typescript
// BEFORE:
return 1 + vintageWheels * 0.05;

// AFTER:
return 1 + vintageWheels * VINTAGE_WHEEL_MULTIPLIER;
```

**Line**: 313 (legacy bonus)

```typescript
// BEFORE:
return 1 + legacyPoints * 0.01;

// AFTER:
return 1 + legacyPoints * LEGACY_POINT_MULTIPLIER;
```

**Line**: 350 (max cost reduction)

```typescript
// BEFORE:
return Math.min(0.9, reduction);

// AFTER:
return Math.min(MAX_PRESTIGE_COST_REDUCTION, reduction);
```

#### 4. Update gameLoop.ts

**File**: `src/systems/gameLoop.ts`

Add import at top:
```typescript
import { GAME_TICK_INTERVAL_MS, MOBILE_TICK_INTERVAL_MS, FRAME_BUDGET_MS } from '../data/constants';
```

**Lines**: 10-15

```typescript
// BEFORE:
const GAME_LOGIC_INTERVAL_MS = 100;
const FRAME_BUDGET_MS = 16;

// AFTER:
// Remove local definitions, use imports
```

**Line**: 30

```typescript
// BEFORE:
return isMobile() ? 150 : GAME_LOGIC_INTERVAL_MS;

// AFTER:
return isMobile() ? MOBILE_TICK_INTERVAL_MS : GAME_TICK_INTERVAL_MS;
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] Grep for raw 1.15 in generators.ts: `grep -c "1\.15" src/data/generators.ts` returns 0
- [x] Grep for formation bonuses: `grep -c "0\.05" src/systems/productionEngine.ts` returns 0

#### Manual Verification:
- [ ] Generator costs scale correctly
- [ ] Zone enemy levels scale correctly
- [ ] Formation bonuses apply correctly
- [ ] Prestige multipliers work correctly

---

## Phase 5: Complete Boss Reward Multipliers

### Overview

Add missing boss reward multipliers to ensure all 13+ bosses have defined values.

### Changes Required:

#### 1. Complete Boss Reward Table

**File**: `src/systems/combatEngine.ts`
**Lines**: 936-960

```typescript
// BEFORE (only 5 bosses defined):
const BOSS_REWARD_MULTIPLIERS: Record<string, { curds: number; xp: number; wheyPercent: number }> = {
  bland_baron: { curds: 1.5, xp: 2.0, wheyPercent: 0.15 },
  fromage_fantome: { curds: 1.8, xp: 2.5, wheyPercent: 0.20 },
  oil_slick_sally: { curds: 1.7, xp: 2.3, wheyPercent: 0.18 },
  wheat_witch: { curds: 1.6, xp: 2.2, wheyPercent: 0.17 },
  pacific_rim_crab: { curds: 2.0, xp: 3.0, wheyPercent: 0.25 },
};

// AFTER (all 13 province bosses + 3 mythology bosses):
const BOSS_REWARD_MULTIPLIERS: Record<string, { curds: number; xp: number; wheyPercent: number }> = {
  // Province Bosses (difficulty scales west to east)
  bland_baron: { curds: 1.5, xp: 2.0, wheyPercent: 0.15 },           // BC
  oil_slick_sally: { curds: 1.6, xp: 2.1, wheyPercent: 0.16 },       // Alberta
  wheat_witch: { curds: 1.7, xp: 2.2, wheyPercent: 0.17 },           // Saskatchewan
  bison_blizzard: { curds: 1.8, xp: 2.3, wheyPercent: 0.18 },        // Manitoba
  fromage_fantome: { curds: 1.9, xp: 2.4, wheyPercent: 0.19 },       // Ontario
  poutine_poltergeist: { curds: 2.0, xp: 2.5, wheyPercent: 0.20 },   // Quebec
  lobster_leviathan: { curds: 2.1, xp: 2.6, wheyPercent: 0.21 },     // New Brunswick
  foghorn_phantom: { curds: 2.2, xp: 2.7, wheyPercent: 0.22 },       // Nova Scotia
  potato_primarch: { curds: 2.3, xp: 2.8, wheyPercent: 0.23 },       // PEI
  viking_vessel: { curds: 2.4, xp: 2.9, wheyPercent: 0.24 },         // Newfoundland
  arctic_aurora: { curds: 2.5, xp: 3.0, wheyPercent: 0.25 },         // Yukon
  permafrost_prince: { curds: 2.6, xp: 3.1, wheyPercent: 0.26 },     // NWT
  polar_patriarch: { curds: 2.7, xp: 3.2, wheyPercent: 0.27 },       // Nunavut
  
  // Mythology Bosses (hardest content)
  pacific_rim_crab: { curds: 3.0, xp: 4.0, wheyPercent: 0.30 },      // Pacific Myth
  sasquatch_supreme: { curds: 3.5, xp: 4.5, wheyPercent: 0.35 },     // Forest Myth
  wendigo_king: { curds: 4.0, xp: 5.0, wheyPercent: 0.40 },          // Northern Myth
};

// Export default multiplier constant
export const DEFAULT_BOSS_REWARD_MULTIPLIER = { curds: 1.0, xp: 1.0, wheyPercent: 0.1 };
```

**Note**: Boss IDs should be verified against actual boss definitions in `src/data/enemies.ts`. The above uses placeholder names that may need adjustment.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] All boss IDs in BOSS_REWARD_MULTIPLIERS match zones.ts bossId values

#### Manual Verification:
- [ ] Defeating each boss gives appropriate rewards
- [ ] Harder bosses (later provinces) give better rewards

---

## Testing Strategy

### Unit Tests:
- Verify constants are exported correctly
- Verify imported constants match expected values
- Verify calculations produce same results with constants vs hardcoded values

### Integration Tests:
- Combat flow with ATB and limit break thresholds
- Generator purchasing with cost multiplier
- Zone progression with enemy level scaling
- Prestige calculations with multipliers

### Manual Testing Steps:
1. Start new game, buy generators - verify costs scale at 1.15x
2. Enter combat - verify ATB fills and triggers at 100
3. Fill limit break gauge - verify activates at 100
4. Take damage - verify HP color thresholds (red < 25%, yellow < 50%)
5. Perform Aging prestige - verify rennet bonus applies
6. Defeat various bosses - verify appropriate rewards

---

## Performance Considerations

- **No performance impact**: Constants are resolved at bundle time
- **Slightly smaller bundle**: Repeated literals consolidated
- **Better tree-shaking**: Unused constants can be eliminated

---

## Migration Notes

- **No data migration required**: Pure code refactor
- **No save file changes**: Constants don't affect serialization
- **Backwards compatible**: All values unchanged

---

## References

- Research document: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Combat constants: `src/systems/combatEngine.ts:24-30`
- Generator data: `src/data/generators.ts`
- Zone data: `src/data/zones.ts`
- Production calculations: `src/systems/productionEngine.ts`
