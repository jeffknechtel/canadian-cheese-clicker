# Phase 2: React Hygiene Fixes

## Overview

Fix React anti-patterns affecting performance and correctness: index-as-key usage, duplicate intervals, missing memoization (`useMemo`/`useCallback`), and components that should be wrapped in `React.memo`. This phase addresses ~8 components with high-impact performance improvements for combat (hot path) and list rendering.

## Current State Analysis

**React patterns are inconsistent** — the codebase has good examples (`GeneratorRow` and `UpgradeCard` use `React.memo`) but many similar components don't follow the pattern.

**Key Discoveries:**
- `CaveCard.tsx` runs two separate 1-second intervals that could be combined
- `HeroCombatCard` re-renders on every combat tick even when its props haven't changed
- Filter/sort operations on 30-48 items run on every render in AchievementPanel and EquipmentModal
- Handlers in HeroPanel/EquipmentModal are recreated every render, defeating `React.memo` on children

## Desired End State

- No index-as-key warnings in React DevTools
- Single consolidated interval per component
- Expensive computations wrapped in `useMemo`
- Handlers passed to children wrapped in `useCallback`
- Pure components wrapped in `React.memo`
- React Profiler shows fewer unnecessary re-renders

## What We're NOT Doing

- Phase 1 contrast fixes (separate plan)
- Phase 3 layout/overflow fixes
- Phase 4 delight enhancements
- Adding new performance monitoring
- Refactoring component structure beyond memoization

---

## Phase 2.1: Fix Index-as-Key Anti-Patterns

### Overview

Replace array index keys with stable identifiers derived from item properties. While these lists are mostly append-only (mitigating the worst effects), proper keys enable correct reconciliation if items are ever reordered or removed.

### Changes Required:

#### 1. CombatLog.tsx

**File**: `src/components/ui/CombatLog.tsx`

**Lines 120-126** — Main log entries:
```tsx
// Before
{entries.map((entry, index) => (
  <CombatLogEntryItem
    key={`${entry.timestamp}-${index}`}
    entry={entry}
    isNew={index >= newEntryThreshold}
  />
))}

// After
{entries.map((entry, index) => (
  <CombatLogEntryItem
    key={entry.timestamp}
    entry={entry}
    isNew={index >= newEntryThreshold}
  />
))}
```

**Lines 145-161** — Compact log entries:
```tsx
// Before
{recentEntries.map((entry, index) => {
  // ...
  return (
    <div
      key={`${entry.timestamp}-${index}`}
      // ...
    >

// After
{recentEntries.map((entry, index) => {
  // ...
  return (
    <div
      key={entry.timestamp}
      // ...
    >
```

**Note**: Combat log entries are append-only and timestamps are unique per entry (ms precision + sequential generation). If collision becomes an issue, add a counter to the combat engine when generating entries.

#### 2. RecipeCard.tsx

**File**: `src/components/ui/crafting/RecipeCard.tsx`

**Lines 199-206** — Recipe effects:
```tsx
// Before
{recipe.effects.map((effect, idx) => (
  <span
    key={idx}
    className="text-xs px-1.5 py-0.5 bg-white rounded border border-timber-200 text-timber-700"
  >
    {formatEffect(effect)}
  </span>
))}

// After
{recipe.effects.map((effect) => (
  <span
    key={`${effect.type}-${effect.stat ?? 'none'}`}
    className="text-xs px-1.5 py-0.5 bg-white rounded border border-timber-200 text-timber-700"
  >
    {formatEffect(effect)}
  </span>
))}
```

**Note**: Each recipe has unique effect types per stat, so `type-stat` is a stable key.

#### 3. CaveCard.tsx

**File**: `src/components/ui/crafting/CaveCard.tsx`

**Lines 200-209** — Job interactions:
```tsx
// Before
{job.interactions.map((interaction, idx) => (
  <span
    key={idx}
    className="text-xs px-1.5 py-0.5 bg-timber-50 rounded text-timber-600"
  >
    {interaction.type === 'turn' && '🔄'}
    {interaction.type === 'rind_wash' && '🧽'}
    {interaction.type === 'flavor_addition' && '🌿'}
    +{interaction.qualityEffect}%
  </span>
))}

// After
{job.interactions.map((interaction) => (
  <span
    key={`${interaction.type}-${interaction.timestamp}`}
    className="text-xs px-1.5 py-0.5 bg-timber-50 rounded text-timber-600"
  >
    {interaction.type === 'turn' && '🔄'}
    {interaction.type === 'rind_wash' && '🧽'}
    {interaction.type === 'flavor_addition' && '🌿'}
    +{interaction.qualityEffect}%
  </span>
))}
```

**Note**: If `CraftingInteraction` doesn't have a `timestamp` field, verify the type definition and use whatever unique identifier exists (or add one if needed).

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] No runtime errors: `npm run dev`

#### Manual Verification:
- [ ] Combat log renders correctly during battle
- [ ] Recipe cards show effects correctly
- [ ] Cave card shows interactions correctly
- [ ] No React key warnings in browser console

---

## Phase 2.2: Consolidate Duplicate Intervals

### Overview

CaveCard runs two separate 1-second intervals: one for progress updates and one for time display. Consolidate into a single interval to reduce timer overhead and ensure synchronized updates.

### Changes Required:

#### 1. CaveCard.tsx

**File**: `src/components/ui/crafting/CaveCard.tsx`

**Current Code (Lines 79-87 and 109-120)**:
```tsx
// First interval - progress updates
useEffect(() => {
  if (isComplete) return;

  const interval = setInterval(() => {
    setProgress(getJobProgress(job.id));
  }, 1000);

  return () => clearInterval(interval);
}, [job.id, isComplete, getJobProgress]);

// ... other code ...

const [currentTime, setCurrentTime] = useState(() => Date.now());

// Second interval - time updates
useEffect(() => {
  if (isComplete) return;

  const timeInterval = setInterval(() => {
    setCurrentTime(Date.now());
  }, 1000);

  return () => clearInterval(timeInterval);
}, [isComplete]);
```

**After — Single consolidated interval**:
```tsx
const [currentTime, setCurrentTime] = useState(() => Date.now());

// Single interval for both progress and time updates
useEffect(() => {
  if (isComplete) return;

  const interval = setInterval(() => {
    setProgress(getJobProgress(job.id));
    setCurrentTime(Date.now());
  }, 1000);

  return () => clearInterval(interval);
}, [job.id, isComplete, getJobProgress]);
```

**Remove**: The second `useEffect` with `timeInterval` entirely.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Crafting progress bar updates correctly every second
- [ ] Time remaining display updates correctly
- [ ] Progress and time stay synchronized (no visual jitter)

---

## Phase 2.3: Add Missing useMemo

### Overview

Wrap expensive filter/sort operations in `useMemo` to prevent recalculation on unrelated state changes. These operations iterate over 30-48 items with comparison logic.

### Changes Required:

#### 1. AchievementPanel.tsx

**File**: `src/components/ui/AchievementPanel.tsx`

**Current Code (Lines 98-115)**:
```tsx
const unlockedAchievements = getUnlockedAchievements();
const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));
const achievementGlobalMult = getAchievementGlobalMultiplier();
const achievementClickMult = getAchievementClickMultiplier();

// Filter achievements by category
const filteredAchievements = categoryFilter === 'all'
  ? ACHIEVEMENTS.filter((a) => a.category !== 'hidden' || unlockedIds.has(a.id))
  : ACHIEVEMENTS.filter((a) => a.category === categoryFilter);

// Sort: unlocked first, then by category order
const sortedAchievements = [...filteredAchievements].sort((a, b) => {
  const aUnlocked = unlockedIds.has(a.id);
  const bUnlocked = unlockedIds.has(b.id);
  if (aUnlocked && !bUnlocked) return -1;
  if (!aUnlocked && bUnlocked) return 1;
  return 0;
});
```

**After**:
```tsx
const unlockedAchievements = getUnlockedAchievements();
const achievementGlobalMult = getAchievementGlobalMultiplier();
const achievementClickMult = getAchievementClickMultiplier();

const unlockedIds = useMemo(
  () => new Set(unlockedAchievements.map((a) => a.id)),
  [unlockedAchievements]
);

const sortedAchievements = useMemo(() => {
  const filtered = categoryFilter === 'all'
    ? ACHIEVEMENTS.filter((a) => a.category !== 'hidden' || unlockedIds.has(a.id))
    : ACHIEVEMENTS.filter((a) => a.category === categoryFilter);

  return [...filtered].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id);
    const bUnlocked = unlockedIds.has(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });
}, [categoryFilter, unlockedIds]);
```

**Add import**: `useMemo` from 'react'

#### 2. EquipmentModal.tsx

**File**: `src/components/ui/EquipmentModal.tsx`

**Current Code (Lines 181-201)**:
```tsx
// Filter equipment
const filteredEquipment = slotEquipment.filter((eq) => {
  if (filter === 'owned') return equipmentInventory.includes(eq.id);
  if (filter === 'buyable') return !equipmentInventory.includes(eq.id);
  return true;
});

// Sort by: currently equipped first, then owned, then by cost
const sortedEquipment = [...filteredEquipment].sort((a, b) => {
  // Currently equipped first
  if (a.id === currentEquipmentId) return -1;
  if (b.id === currentEquipmentId) return 1;

  // Then owned
  const aOwned = equipmentInventory.includes(a.id);
  const bOwned = equipmentInventory.includes(b.id);
  if (aOwned && !bOwned) return -1;
  if (!aOwned && bOwned) return 1;

  // Then by cost
  return a.cost.comparedTo(b.cost);
});
```

**After**:
```tsx
const sortedEquipment = useMemo(() => {
  const filtered = slotEquipment.filter((eq) => {
    if (filter === 'owned') return equipmentInventory.includes(eq.id);
    if (filter === 'buyable') return !equipmentInventory.includes(eq.id);
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (a.id === currentEquipmentId) return -1;
    if (b.id === currentEquipmentId) return 1;

    const aOwned = equipmentInventory.includes(a.id);
    const bOwned = equipmentInventory.includes(b.id);
    if (aOwned && !bOwned) return -1;
    if (!aOwned && bOwned) return 1;

    return a.cost.comparedTo(b.cost);
  });
}, [slotEquipment, filter, equipmentInventory, currentEquipmentId]);
```

**Add import**: `useMemo` from 'react' (if not already imported)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Achievement panel filters/sorts correctly when changing categories
- [ ] Equipment modal filters/sorts correctly when changing filter
- [ ] React Profiler shows fewer re-computations on unrelated state changes

---

## Phase 2.4: Add Missing useCallback

### Overview

Wrap handler functions in `useCallback` to maintain stable references. This prevents child components wrapped in `React.memo` from re-rendering when parent state changes but handler logic remains the same.

### Changes Required:

#### 1. HeroPanel.tsx

**File**: `src/components/ui/HeroPanel.tsx`

**Current Code (Lines 307-327)**:
```tsx
const getNextEmptySlot = () => {
  const slots: PartySlot[] = ['slot1', 'slot2', 'slot3', 'slot4'];
  return slots.find((slot) => !party[slot]);
};

const handleAddToParty = (heroId: string) => {
  if (isHeroInParty(heroId)) return;
  const slot = getNextEmptySlot();
  if (slot) {
    assignToParty(heroId, slot);
  }
};

const handleEquipmentClick = (heroId: string, slot: EquipmentSlot) => {
  if (onEquipmentClick) {
    onEquipmentClick(heroId, slot);
  }
};
```

**After**:
```tsx
const getNextEmptySlot = useCallback(() => {
  const slots: PartySlot[] = ['slot1', 'slot2', 'slot3', 'slot4'];
  return slots.find((slot) => !party[slot]);
}, [party]);

const handleAddToParty = useCallback((heroId: string) => {
  if (isHeroInParty(heroId)) return;
  const slots: PartySlot[] = ['slot1', 'slot2', 'slot3', 'slot4'];
  const slot = slots.find((s) => !party[s]);
  if (slot) {
    assignToParty(heroId, slot);
  }
}, [isHeroInParty, party, assignToParty]);

const handleEquipmentClick = useCallback((heroId: string, slot: EquipmentSlot) => {
  onEquipmentClick?.(heroId, slot);
}, [onEquipmentClick]);
```

**Note**: Inlined `getNextEmptySlot` logic into `handleAddToParty` to avoid dependency chain complexity. Alternative: keep separate but ensure both are memoized.

**Add import**: `useCallback` from 'react' (if not already imported)

#### 2. EquipmentModal.tsx

**File**: `src/components/ui/EquipmentModal.tsx`

**Find the handler definitions** (around lines 160-180) and wrap in useCallback:

```tsx
// Before (inline definitions)
const handleBuy = (equipmentId: string) => {
  const success = buyEquipment(equipmentId);
  if (success) {
    playPurchaseSound();
  }
};

const handleEquip = (equipmentId: string) => {
  equipItem(heroId, equipmentId);
};

const handleUnequip = () => {
  unequipItem(heroId, slot);
};

// After
const handleBuy = useCallback((equipmentId: string) => {
  const success = buyEquipment(equipmentId);
  if (success) {
    playPurchaseSound();
  }
}, [buyEquipment]);

const handleEquip = useCallback((equipmentId: string) => {
  equipItem(heroId, equipmentId);
}, [heroId, equipItem]);

const handleUnequip = useCallback(() => {
  unequipItem(heroId, slot);
}, [heroId, slot, unequipItem]);
```

**Then update the map** (Lines 282-293) to pass handlers directly instead of creating inline arrows:

```tsx
// Before
{sortedEquipment.map((eq) => (
  <EquipmentCard
    key={eq.id}
    equipment={eq}
    isOwned={equipmentInventory.includes(eq.id)}
    isEquipped={eq.id === currentEquipmentId}
    isEquippedByOther={isEquippedByOtherHero(eq.id)}
    onBuy={() => handleBuy(eq.id)}
    onEquip={() => handleEquip(eq.id)}
    onUnequip={handleUnequip}
  />
))}

// After
{sortedEquipment.map((eq) => (
  <EquipmentCard
    key={eq.id}
    equipment={eq}
    isOwned={equipmentInventory.includes(eq.id)}
    isEquipped={eq.id === currentEquipmentId}
    isEquippedByOther={isEquippedByOtherHero(eq.id)}
    onBuy={handleBuy}
    onEquip={handleEquip}
    onUnequip={handleUnequip}
  />
))}
```

**Then update EquipmentCard** to accept the handler and call it with its own `equipment.id`:

```tsx
// In EquipmentCard component, change:
onClick={() => onBuy()}
// To:
onClick={() => onBuy(equipment.id)}

// Same for onEquip
```

**Add import**: `useCallback` from 'react' (if not already imported)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Adding heroes to party works correctly
- [ ] Equipment click opens modal correctly
- [ ] Buy/equip/unequip equipment works correctly
- [ ] React Profiler shows stable handler references

---

## Phase 2.5: Add React.memo to Pure Components

### Overview

Wrap pure components in `React.memo` to prevent re-renders when props haven't changed. Priority given to hot paths (combat) and list items.

### Changes Required:

#### 1. HeroCombatCard (HIGH PRIORITY - Combat Hot Path)

**File**: `src/components/ui/CombatPanel.tsx`

**Lines 13-186** — Wrap the component:
```tsx
// Before
function HeroCombatCard({ heroState, isSelected = false, heroNumber }: HeroCombatCardProps) {
  // ... ~170 lines
}

// After
const HeroCombatCard = memo(function HeroCombatCard({ 
  heroState, 
  isSelected = false, 
  heroNumber 
}: HeroCombatCardProps) {
  // ... ~170 lines
});
```

**Add import**: `memo` from 'react'

**Additional optimization**: The component reads `combat` from the store. Narrow the selector:
```tsx
// Before
const combat = useGameStore((state) => state.combat);

// After - only select what's needed
const battleResult = useGameStore((state) => state.combat.battleResult);
```

#### 2. SpeedControl

**File**: `src/components/ui/CombatPanel.tsx`

**Lines 193-218**:
```tsx
// Before
function SpeedControl({ currentSpeed, onSpeedChange }: SpeedControlProps) {
  const speeds: Array<1 | 2 | 4> = [1, 2, 4];
  // ...
}

// After
const COMBAT_SPEEDS: Array<1 | 2 | 4> = [1, 2, 4];

const SpeedControl = memo(function SpeedControl({ 
  currentSpeed, 
  onSpeedChange 
}: SpeedControlProps) {
  // Use COMBAT_SPEEDS instead of local speeds array
  // ...
});
```

**Note**: Move `speeds` array outside component to prevent recreation.

#### 3. AchievementCard

**File**: `src/components/ui/AchievementPanel.tsx`

**Lines 27-88**:
```tsx
// Before
function AchievementCard({ achievement, isUnlocked }: AchievementCardProps) {
  // ...
}

// After
const AchievementCard = memo(function AchievementCard({ 
  achievement, 
  isUnlocked 
}: AchievementCardProps) {
  // ...
});
```

**Add import**: `memo` from 'react'

#### 4. EnemyCard (if exists as separate component)

**File**: `src/components/ui/EnemyDisplay.tsx`

Check if there's a separate `EnemyCard` component. If so, wrap it:
```tsx
const EnemyCard = memo(function EnemyCard({ enemy, ...props }: EnemyCardProps) {
  // ...
});
```

#### 5. ZoneCard

**File**: `src/components/ui/ZoneSelectPanel.tsx`

If `ZoneCard` is a separate component (Lines 28-159), wrap it:
```tsx
const ZoneCard = memo(function ZoneCard({ zone, ...props }: ZoneCardProps) {
  // ...
});
```

#### 6. PartySlot

**File**: `src/components/ui/PartyFormationPanel.tsx`

**Lines 23-103** (if exists):
```tsx
const PartySlot = memo(function PartySlot({ slot, ...props }: PartySlotProps) {
  // ...
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Combat runs smoothly with no visual glitches
- [ ] Speed control buttons work correctly
- [ ] Achievement cards display correctly
- [ ] Zone cards display correctly
- [ ] Party formation works correctly
- [ ] React Profiler shows significantly fewer re-renders during combat

---

## Testing Strategy

### Unit Tests:
- No new unit tests required — these are optimization changes that don't alter behavior

### Integration Tests:
- Existing tests should continue to pass

### Manual Testing Steps:
1. **Combat Performance Test**:
   - Enter combat with a full party of 4 heroes
   - Let combat run for 30+ seconds
   - Verify no visual stuttering or lag
   - Check React Profiler for render counts

2. **Achievement Panel Test**:
   - Open Achievements tab
   - Switch between category filters rapidly
   - Verify correct filtering and no visual glitches

3. **Equipment Modal Test**:
   - Open equipment modal for a hero
   - Switch between filter options (All/Owned/Buyable)
   - Buy and equip items
   - Verify all operations work correctly

4. **Crafting Test**:
   - Start a crafting job
   - Watch progress bar and time remaining
   - Verify they update in sync every second
   - Add interactions and verify they display correctly

5. **Hero Management Test**:
   - Add heroes to party
   - Open equipment modal via hero card
   - Verify all interactions work

## Performance Considerations

- **HeroCombatCard memoization** is the highest-impact change — combat runs on frame ticks (60fps) and party has 4 heroes
- **useMemo for sorting** prevents O(n log n) operations on every render for 30-48 item lists
- **Interval consolidation** reduces timer overhead and prevents potential race conditions between updates
- **useCallback** enables `React.memo` to work correctly on child components

## Migration Notes

None — no data migration required. These are purely code optimizations.

## References

- Original research: `thoughts/shared/research/2026-06-09_ux-display-contrast-hygiene-review.md`
- Phase 1 plan: `thoughts/shared/plans/ux-phase1-contrast-fixes.md`
- Good existing patterns: `GeneratorRow` and `UpgradeCard` already use `React.memo`
- React documentation: https://react.dev/reference/react/memo
