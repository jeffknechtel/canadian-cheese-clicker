# Code Quality, Bug Fixes & Antipattern Remediation Plan

## Overview

A comprehensive Martin Fowler-style code review of "The Great Canadian Cheese Quest" codebase identified **50+ issues** spanning bugs, antipatterns, DRY violations, and type safety concerns. This plan prioritizes fixes by severity and impact.

## Current State Analysis

The codebase is a ~32,000 line incremental clicker game built with:
- React 19 + TypeScript 5.9
- Zustand for state management
- Three.js/R3F for 3D graphics
- Decimal.js for arbitrary precision math
- Tailwind CSS 4 for styling

While generally well-architected, the codebase has accumulated technical debt in several areas that require attention before they cause user-facing bugs.

## Desired End State

After implementing this plan:
1. All stale closure bugs in gameStore are eliminated
2. Combat/crafting systems have proper immutable state updates
3. DRY violations are resolved through shared components and utilities
4. React components are properly memoized to prevent unnecessary re-renders
5. Type safety is improved with proper validation of external data
6. No memory leaks from uncleaned timeouts/intervals

### Verification:
- All existing functionality works identically (manual testing)
- `pnpm build` passes without errors
- `pnpm lint` passes without warnings
- No console errors in browser during gameplay

## What We're NOT Doing

- Performance optimization beyond fixing obvious issues
- Adding new features
- Refactoring architecture (just fixing bugs within current patterns)
- Adding comprehensive test coverage (separate initiative)

---

## Phase 1: Critical Stale Closure Bugs in gameStore

### Overview
The gameStore has 4 high-severity stale closure bugs where array indices are captured outside `set()` callbacks, leading to potential data corruption if state changes between reads.

### Changes Required:

#### 1. Fix `collectCheese` stale closure

**File**: `src/stores/gameStore.ts`
**Lines**: 1825-1874

**Problem**: `jobIndex` is captured from stale state snapshot, then used inside `set()` callback.

```typescript
// BEFORE (buggy):
collectCheese: (jobId: string) => {
  const state = get();
  const jobIndex = state.crafting.activeJobs.findIndex((j) => j.id === jobId);
  if (jobIndex === -1) return null;
  const job = state.crafting.activeJobs[jobIndex];
  // ... calculations using job ...

  set((s) => {
    const newActiveJobs = [...s.crafting.activeJobs];
    newActiveJobs.splice(jobIndex, 1);  // BUG: stale index!
    // ...
  });
},

// AFTER (fixed):
collectCheese: (jobId: string) => {
  const state = get();
  const job = state.crafting.activeJobs.find((j) => j.id === jobId);
  if (!job) return null;
  // ... calculations using job ...

  set((s) => {
    const currentJobIndex = s.crafting.activeJobs.findIndex((j) => j.id === jobId);
    if (currentJobIndex === -1) return s;  // Job already removed

    const newActiveJobs = [...s.crafting.activeJobs];
    newActiveJobs.splice(currentJobIndex, 1);  // Fresh index from current state
    // ...
  });
},
```

#### 2. Fix `consumeCheese` stale closure

**File**: `src/stores/gameStore.ts`
**Lines**: 1890-1944

```typescript
// AFTER (fixed):
consumeCheese: (cheeseId: string) => {
  const state = get();
  const cheese = state.crafting.cheeseInventory.find((c) => c.id === cheeseId);
  if (!cheese) return false;
  // ... calculations using cheese ...

  set((s) => {
    const currentIndex = s.crafting.cheeseInventory.findIndex((c) => c.id === cheeseId);
    if (currentIndex === -1) return s;  // Already consumed

    const newInventory = [...s.crafting.cheeseInventory];
    newInventory.splice(currentIndex, 1);
    // ...
  });
},
```

#### 3. Fix `sellCheese` stale closure

**File**: `src/stores/gameStore.ts`
**Lines**: 1946-1976

Same pattern as above - find by ID inside `set()` callback.

#### 4. Fix `addInteraction` stale closure

**File**: `src/stores/gameStore.ts`
**Lines**: 1978-2011

```typescript
// AFTER (fixed):
addInteraction: (jobId: string, interactionType: InteractionType) => {
  const state = get();
  const job = state.crafting.activeJobs.find((j) => j.id === jobId);
  if (!job) return false;
  // ... validation ...

  set((s) => {
    const currentIndex = s.crafting.activeJobs.findIndex((j) => j.id === jobId);
    if (currentIndex === -1) return s;

    const newJobs = [...s.crafting.activeJobs];
    newJobs[currentIndex] = {
      ...newJobs[currentIndex],
      interactions: [...newJobs[currentIndex].interactions, fullInteraction],
    };
    // ...
  });
},
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [x] Crafting cheese, collecting, consuming, and selling all work correctly
- [x] Adding interactions to aging cheese works
- [x] No console errors during rapid crafting operations

**Note:** Phase 1 fixes were already implemented in the codebase. All four functions (`collectCheese`, `consumeCheese`, `sellCheese`, `addInteraction`) correctly use `find()` outside `set()` for validation and `findIndex()` inside `set()` for fresh state access.

---

## Phase 2: Combat Engine State Mutation Bugs

### Overview
The combat engine has shallow copy issues that can cause race conditions and state corruption.

### Changes Required:

#### 1. Fix shallow copy in `tickCombat`

**File**: `src/systems/combatEngine.ts`
**Lines**: 586-606

```typescript
// BEFORE (buggy):
const updatedHeroStates = { ...state.heroStates };  // Shallow copy only!
// Later mutates inner objects directly:
heroState.atbGauge = updateAtbGauge(...);  // MUTATION!

// AFTER (fixed):
const updatedHeroStates: Record<string, HeroCombatState> = {};
for (const [id, heroState] of Object.entries(state.heroStates)) {
  updatedHeroStates[id] = {
    ...heroState,
    statusEffects: [...heroState.statusEffects],  // Deep copy arrays
    skillCooldowns: { ...heroState.skillCooldowns },
  };
}
// Now safe to modify updatedHeroStates[id].atbGauge
```

#### 2. Fix shallow copy of enemy statusEffects

**File**: `src/systems/combatEngine.ts`
**Line**: 587

```typescript
// BEFORE:
const updatedEnemies = state.enemies.map((e) => ({ ...e }));

// AFTER:
const updatedEnemies = state.enemies.map((e) => ({
  ...e,
  statusEffects: [...e.statusEffects],  // Deep copy the array
}));
```

#### 3. Fix boss minion spawning timing bug

**File**: `src/systems/combatEngine.ts`
**Line**: 375

```typescript
// BEFORE (spawns multiple minions per second):
if (combatTime > 0 && Math.floor(combatTime) % 30 === 0 && Math.floor(combatTime) !== 0) {

// AFTER (spawns once at each 30s mark):
const prevSecond = Math.floor(combatTime - deltaSeconds);
const currSecond = Math.floor(combatTime);
if (currSecond > 0 && currSecond % 30 === 0 && prevSecond % 30 !== 0) {
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Combat at 4x speed works without visual glitches
- [ ] Boss fights spawn exactly 1 minion every 30 seconds
- [ ] Status effects apply and expire correctly

**Note:** Phase 2 changes:
- Fixes 1 and 2 (deep copying heroStates and enemies) were already implemented in the codebase at lines 586-598
- Fix 3 (boss minion spawning timing) was implemented by adding `deltaSeconds` parameter and using boundary-crossing logic instead of modulo check

---

## Phase 3: Precision and Division-by-Zero Bugs

### Overview
Several calculation functions have potential precision loss or division-by-zero risks.

### Changes Required:

#### 1. Fix precision loss in `calculatePotentialRennet`

**File**: `src/systems/productionEngine.ts`
**Lines**: 334-335

```typescript
// BEFORE:
const ratio = totalCurdsEarned.div(threshold);
return Math.floor(Math.sqrt(ratio.toNumber()));  // Precision loss!

// AFTER:
const ratio = totalCurdsEarned.div(threshold);
// Use Decimal.sqrt() and floor() for arbitrary precision
return Decimal.sqrt(ratio).floor().toNumber();
```

#### 2. Add division-by-zero guard in generator cost

**File**: `src/systems/productionEngine.ts`
**Lines**: 52-54

```typescript
// BEFORE:
const denominator = new Decimal(costMultiplier).minus(1);
return baseCost.mul(multiplierPowOwned).mul(numerator.div(denominator)).floor();

// AFTER:
const denominator = new Decimal(costMultiplier).minus(1);
if (denominator.isZero()) {
  // Linear cost for costMultiplier === 1
  return baseCost.mul(count).floor();
}
return baseCost.mul(multiplierPowOwned).mul(numerator.div(denominator)).floor();
```

#### 3. Fix precision loss in checkMilestone

**File**: `src/stores/gameStore.ts`
**Line**: 1025

```typescript
// BEFORE:
const totalNum = totalCurdsEarned.toNumber();

// AFTER:
// Compare using Decimal to avoid precision loss
for (const threshold of MILESTONE_THRESHOLDS) {
  if (threshold > lastMilestone && totalCurdsEarned.gte(threshold)) {
```

#### 4. Increase bulk purchase limit

**File**: `src/systems/productionEngine.ts`
**Line**: 70

```typescript
// BEFORE:
let high = 1000;

// AFTER:
let high = 100000;  // Support late-game bulk purchases
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes

#### Manual Verification:
- [ ] Prestige rennet calculations work correctly with very large curd counts
- [ ] Milestone notifications trigger at correct thresholds
- [ ] Bulk purchasing works for large amounts

---

## Phase 4: Side Effects in State Updates

### Overview
The `grantXp` function has callbacks and analytics inside `set()` which is an antipattern.

### Changes Required:

#### 1. Move side effects outside `set()` in grantXp

**File**: `src/stores/gameStore.ts`
**Lines**: 929-981

```typescript
// BEFORE:
grantXp: (heroId: string, amount: number) => {
  set((s) => {
    // ... calculations ...
    while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
      // ...
      if (heroDef && heroLevelUpCallback) {
        heroLevelUpCallback(heroDef, level);  // Side effect in set()!
      }
      trackHeroLevelUp(heroId, level);  // Side effect in set()!
    }
    return { heroes: newHeroes, curdPerSecond: newCps };
  });
},

// AFTER:
grantXp: (heroId: string, amount: number) => {
  const levelUps: Array<{ heroId: string; level: number }> = [];

  set((s) => {
    // ... calculations ...
    while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
      // ...
      levelUps.push({ heroId, level });  // Collect, don't execute
    }
    return { heroes: newHeroes, curdPerSecond: newCps };
  });

  // Execute side effects AFTER state update
  for (const { heroId: hId, level } of levelUps) {
    const heroDef = getHeroById(hId);
    if (heroDef && heroLevelUpCallback) {
      heroLevelUpCallback(heroDef, level);
    }
    trackHeroLevelUp(hId, level);
  }
},
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes

#### Manual Verification:
- [ ] Hero level-up notifications still appear
- [ ] Analytics events still fire on level-up

---

## Phase 5: DRY Violations - Extract Shared Components

### Overview
Extract repeated UI patterns into reusable components.

### Changes Required:

#### 1. Create PanelContainer component

**File**: `src/components/ui/shared/PanelContainer.tsx` (new)

```typescript
interface PanelContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelContainer({ children, className = '' }: PanelContainerProps) {
  return (
    <div className={`p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain ${className}`}>
      {children}
    </div>
  );
}
```

Update 9 files: UpgradePanel, CombatPanel, AchievementPanel, CraftingPanel, GeneratorPanel, HeroPanel, PrestigePanel, ZoneSelectPanel, PartyFormationPanel.

#### 2. Create TabButton component

**File**: `src/components/ui/shared/TabButton.tsx` (new)

```typescript
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function TabButton({ active, onClick, children, className = '' }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-t-lg border transition-colors ${
        active
          ? 'bg-timber-500 text-white border-timber-600'
          : 'bg-timber-100 text-timber-700 border-timber-300 hover:bg-timber-200'
      } ${className}`}
    >
      {children}
    </button>
  );
}
```

#### 3. Create ModalOverlay component

**File**: `src/components/ui/shared/ModalOverlay.tsx` (new)

```typescript
interface ModalOverlayProps {
  children: React.ReactNode;
  onClose?: () => void;
  zIndex?: number;
}

export function ModalOverlay({ children, onClose, zIndex = 50 }: ModalOverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs`}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {children}
    </div>
  );
}
```

#### 4. Create ProgressBar component

**File**: `src/components/ui/shared/ProgressBar.tsx` (new)

```typescript
interface ProgressBarProps {
  percent: number;
  height?: string;
  bgColor?: string;
  fillColor?: string;
  className?: string;
}

export function ProgressBar({
  percent,
  height = 'h-2',
  bgColor = 'bg-gray-200',
  fillColor = 'bg-amber-500',
  className = ''
}: ProgressBarProps) {
  return (
    <div className={`${height} ${bgColor} rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${fillColor} transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
```

#### 5. Create useReducedMotion hook

**File**: `src/hooks/useReducedMotion.ts` (new)

```typescript
import { useSettingsStore } from '../stores/settingsStore';

export function useReducedMotion(): boolean {
  return useSettingsStore((state) => state.accessibility.reducedMotion);
}
```

Update 12 files to use this hook instead of inline selector.

#### 6. Extract CPS recalculation to utility

**File**: `src/systems/productionEngine.ts`

Add a new function that encapsulates the repeated CPS calculation pattern:

```typescript
export function recalculateCpsFromState(state: GameState): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroBonus = calculateHeroCpsBonus(state.heroes, state.party);
  const formationBonus = calculateFormationBonus(state.party, state.heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const totalGlobalMultiplier = upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
  return calculateCps(state.generators, generatorMultipliers, totalGlobalMultiplier);
}
```

Replace 12+ instances in gameStore.ts with calls to this function.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] All panels render correctly with new components
- [ ] Modal overlays work as before
- [ ] Progress bars display correctly

---

## Phase 6: React Memoization and Performance

### Overview
Add proper memoization to prevent unnecessary re-renders.

### Changes Required:

#### 1. Memoize accessibilityClasses in App.tsx

**File**: `src/App.tsx`
**Lines**: 426-433

```typescript
// BEFORE:
const accessibilityClasses = [
  accessibility.colorblindMode !== 'none' ? `colorblind-${accessibility.colorblindMode}` : '',
  // ...
].filter(Boolean).join(' ');

// AFTER:
const accessibilityClasses = useMemo(() => [
  accessibility.colorblindMode !== 'none' ? `colorblind-${accessibility.colorblindMode}` : '',
  accessibility.reducedMotion ? 'reduced-motion' : '',
  accessibility.highContrast ? 'high-contrast' : '',
  `font-size-${accessibility.fontSize}`,
].filter(Boolean).join(' '), [accessibility]);
```

#### 2. Memoize calculateHeroStats calls

**File**: `src/components/ui/HeroPanel.tsx`
**Line**: 44

```typescript
// BEFORE:
function HeroCard({ hero, heroState, ... }: HeroCardProps) {
  const stats = calculateHeroStats(hero.id, heroState);  // Every render!

// AFTER:
function HeroCard({ hero, heroState, ... }: HeroCardProps) {
  const stats = useMemo(
    () => calculateHeroStats(hero.id, heroState),
    [hero.id, heroState]
  );
```

Apply same pattern in PartyFormationPanel.tsx.

#### 3. Clean up setTimeout in purchase animations

**File**: `src/components/ui/GeneratorPanel.tsx`
**Lines**: 48-59

```typescript
// BEFORE:
if (!reducedMotion) {
  setPurchaseAnimation('success');
  setTimeout(() => setPurchaseAnimation(null), 400);  // No cleanup!
}

// AFTER:
const animationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
  return () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
  };
}, []);

// In handler:
if (!reducedMotion) {
  setPurchaseAnimation('success');
  animationTimeoutRef.current = setTimeout(() => setPurchaseAnimation(null), 400);
}
```

Apply same pattern in UpgradePanel.tsx.

#### 4. Memoize isHeroInParty function

**File**: `src/components/ui/HeroPanel.tsx`
**Lines**: 292-299

```typescript
// BEFORE:
const isHeroInParty = (heroId: string): boolean => {
  return party.frontLeft === heroId || ...;
};

// AFTER:
const isHeroInParty = useCallback((heroId: string): boolean => {
  return party.frontLeft === heroId ||
         party.frontRight === heroId ||
         party.backLeft === heroId ||
         party.backRight === heroId;
}, [party]);
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes

#### Manual Verification:
- [ ] React DevTools shows fewer re-renders on currency updates
- [ ] No "state update on unmounted component" warnings in console

---

## Phase 7: Type Safety Improvements

### Overview
Add proper validation for external data and fix unsafe type assertions.

### Changes Required:

#### 1. Add runtime validation for localStorage JSON

**File**: `src/systems/bugReporter.ts`
**Line**: 265

```typescript
// BEFORE:
return JSON.parse(raw) as BugReport[];

// AFTER:
const parsed = JSON.parse(raw);
if (!Array.isArray(parsed)) {
  console.warn('Invalid bug reports format in localStorage, resetting');
  return [];
}
return parsed as BugReport[];
```

Apply similar pattern to:
- `analyticsService.ts:265` (PrivacyConsent)
- `analyticsService.ts:296` (AnalyticsEvent[])
- `abTesting.ts:62` (ExperimentAssignments)

#### 2. Fix document.activeElement casting

**File**: `src/hooks/useFocusTrap.ts`
**Lines**: 81, 129

```typescript
// BEFORE:
previousActiveElement.current = document.activeElement as HTMLElement;

// AFTER:
previousActiveElement.current = document.activeElement instanceof HTMLElement
  ? document.activeElement
  : null;
```

#### 3. Add null guards in audio system

**File**: `src/systems/audioSystem.ts`
**Lines**: 351, 373, 394

```typescript
// BEFORE:
noteGain.connect(musicGainNode!);

// AFTER:
if (musicGainNode) {
  noteGain.connect(musicGainNode);
} else {
  console.warn('Audio: musicGainNode not initialized');
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Game loads correctly even with corrupted localStorage
- [ ] Audio plays correctly when audio context initializes
- [ ] Focus management works for keyboard navigation

---

## Phase 8: Cleanup and Deprecation Fixes

### Overview
Fix deprecated API usage and remove dead code.

### Changes Required:

#### 1. Replace deprecated substr with substring

**File**: `src/stores/gameStore.ts`
**Lines**: 1759, 1852, 1917

```typescript
// BEFORE:
id: `job_${now}_${Math.random().toString(36).substr(2, 9)}`,

// AFTER:
id: `job_${now}_${Math.random().toString(36).substring(2, 11)}`,
```

#### 2. Remove or implement clickerEngine.ts

**File**: `src/systems/clickerEngine.ts`

The file is a placeholder with no implementation. Either:
- Remove the file entirely, OR
- Move click logic from gameStore.ts into this file

Recommend: Remove the file since click logic is already in gameStore.

#### 3. Fix unused deltaMs parameter

**File**: `src/stores/gameStore.ts`
**Lines**: 1817-1823

Either implement the intended functionality or remove the parameter:

```typescript
// Option A: Remove unused parameter
tickCrafting: () => {
  // No-op - jobs are managed by collectCheese
},

// Option B: Implement notification logic (if intended)
tickCrafting: (_deltaMs: number) => {
  const state = get();
  const completedJobs = state.crafting.activeJobs.filter(
    (job) => Date.now() >= job.endTime && !job.notified
  );
  // ... notify user of completed jobs ...
},
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` passes
- [x] `pnpm lint` passes (no deprecation warnings)

#### Manual Verification:
- [ ] All ID generation still works correctly
- [ ] No broken imports from removed files

**Note:** Phase 8 changes implemented:
- Fixed 1 remaining `substr` usage in `startCrafting` (line 1767) - changed to `substring(2, 11)`
- Removed placeholder `clickerEngine.ts` file (was unused, click logic already in gameStore)
- `tickCrafting` parameter handling was already correct - uses underscore prefix convention with eslint disable comment

---

## Testing Strategy

### Unit Tests:
- Test stale closure fixes with concurrent operations
- Test division-by-zero edge cases in calculations
- Test precision with very large Decimal values

### Integration Tests:
- Test crafting flow end-to-end
- Test combat with status effects and speed changes
- Test prestige calculations

### Manual Testing Steps:
1. Start a new game and verify all panels load
2. Craft cheese, add interactions, collect, consume, and sell
3. Run combat at 4x speed and verify no visual glitches
4. Reach late game (use debug panel) and verify large number calculations
5. Test keyboard navigation through all modals
6. Verify audio plays correctly
7. Test with localStorage cleared/corrupted

---

## Performance Considerations

- The shared components should reduce bundle size slightly through deduplication
- Memoization will reduce CPU usage on frequent state updates
- Deep copying in combat engine may have minor performance impact (acceptable trade-off for correctness)

---

## Migration Notes

No data migrations required. All changes are code-only and backward compatible with existing save data.

---

## References

- Original analysis: Code review session 2026-01-30
- Files analyzed: 40+ components, 13 systems, 2 stores
- Total issues found: 50+
- Severity breakdown: 8 Critical, 15 Medium, 27+ Low
