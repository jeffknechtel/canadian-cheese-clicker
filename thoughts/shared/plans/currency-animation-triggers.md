# Currency Animation Triggers Implementation Plan

## Overview

Add a store-driven animation trigger system for currency displays. Instead of tracking previous values with refs/effects (which violates ESLint rules), increment a counter on meaningful events (clicks, purchases) and use React's `key` prop to trigger CSS animations on remount.

## Current State Analysis

- `CurrencyDisplay.tsx` shows curds and CPS but has no animation on value changes
- `animate-number-pop` CSS class exists in `index.css:963-965` and works correctly
- ESLint rules block the `usePrevious` + `useEffect` pattern that would track value changes
- The store already has `totalClicks` counter but it's not suitable for animation (increments on every click, never resets)

### Key Discoveries:

- `click()` action at `productionSlice.ts:55-68` is the right place to increment a click animation trigger
- `buyGenerator()` at `productionSlice.ts:96` and `buyUpgrade()` at `productionSlice.ts:139` are purchase events
- `CurrencyDisplay.tsx` already uses `useGameStoreShallow` for optimized selectors
- `OfflineProgressModal.tsx:48` and `CombatResultsModal.tsx:117` show the correct pattern for `animate-number-pop`

## Desired End State

When the player clicks the cheese wheel or makes a purchase, the curds counter briefly scales up (pops) to provide satisfying feedback. The animation:
- Only triggers on meaningful events, not every 100ms tick
- Respects `reducedMotion` accessibility setting
- Uses existing `animate-number-pop` CSS (0.3s scale animation)

## What We're NOT Doing

- Animating CPS display (changes too frequently from buffs/combat)
- Animating rennet display (already has shimmer effect)
- Creating new animation hooks or tracking previous values
- Animating on every tick (would be annoying and distracting)

## Implementation Approach

Use a simple counter that increments on meaningful events. Pass this counter as the `key` prop to the animated element — React remounts the element when the key changes, which restarts the CSS animation. No refs, no effects, no ESLint violations.

---

## Phase 1: Add Animation Trigger to Store

### Overview

Add `currencyAnimationTrigger` counter to the production slice state and increment it on click, generator purchase, and upgrade purchase events.

### Changes Required:

#### 1. Update Production Slice Types

**File**: `src/stores/slices/production/types.ts`
**Changes**: Add `currencyAnimationTrigger` to state

```typescript
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
  currencyAnimationTrigger: number;  // NEW: increment on click/purchase
}
```

#### 2. Update Production Slice Implementation

**File**: `src/stores/slices/production/productionSlice.ts`
**Changes**: Initialize counter and increment on events

```typescript
// In initial state (around line 52):
currencyAnimationTrigger: 0,

// In click() action (around line 62-66):
set({
  curds: state.curds.plus(clickValue),
  totalCurdsEarned: state.totalCurdsEarned.plus(clickValue),
  totalClicks: state.totalClicks + 1,
  currencyAnimationTrigger: state.currencyAnimationTrigger + 1,  // NEW
});

// In buyGenerator() after successful purchase (around line 130):
currencyAnimationTrigger: state.currencyAnimationTrigger + 1,  // NEW

// In buyUpgrade() after successful purchase (around line 175):
currencyAnimationTrigger: state.currencyAnimationTrigger + 1,  // NEW
```

#### 3. Update Reset Factory (if needed for prestige)

**File**: `src/stores/slices/production/resetFactory.ts`
**Changes**: Include `currencyAnimationTrigger: 0` in reset state if not already covered

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:

- [x] Clicking cheese increments `currencyAnimationTrigger` (verified via game state)
- [x] Buying a generator increments the trigger
- [x] Buying an upgrade increments the trigger (code reviewed)
- [x] Prestige resets the trigger to 0 (resetFactory includes currencyAnimationTrigger: 0)

---

## Phase 2: Wire Up CurrencyDisplay Animation

### Overview

Consume `currencyAnimationTrigger` in CurrencyDisplay and use it as the `key` prop for the curds counter span.

### Changes Required:

#### 1. Update CurrencyDisplay Component

**File**: `src/components/ui/CurrencyDisplay.tsx`
**Changes**: Add animation trigger to selector and apply to curds display

```typescript
import { memo } from 'react';
import { useGameStore } from '../../stores';
import { useGameStoreShallow } from '../../utils/zustandOptimization';
import { useSettingsStore } from '../../stores/settingsStore';  // NEW
import { formatNumber } from '../../utils/formatNumber';
import { RennetDisplay } from './RennetDisplay';

// ... LoonieIcon unchanged ...

export function CurrencyDisplay() {
  // Add animation trigger and reducedMotion
  const { curds, curdPerSecond, prestigeRennet, agingResetCount, currencyAnimationTrigger } = useGameStoreShallow((state) => ({
    curds: state.curds,
    curdPerSecond: state.curdPerSecond,
    prestigeRennet: state.prestige.rennet,
    agingResetCount: state.prestige.agingResetCount,
    currencyAnimationTrigger: state.currencyAnimationTrigger,  // NEW
  }));
  const getPotentialRennet = useGameStore((state) => state.getPotentialRennet);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);  // NEW

  const hasPrestiged = agingResetCount > 0 || prestigeRennet > 0;
  const potentialRennet = getPotentialRennet();
  const showRennet = hasPrestiged || potentialRennet > 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 text-white font-bold text-2xl tabular-nums transition-transform duration-200"
        >
          <LoonieIcon />
          <span
            key={currencyAnimationTrigger}  // NEW: triggers remount on change
            className={!reducedMotion ? 'animate-number-pop' : ''}  // NEW
            role="status"
            aria-live="polite"
            aria-label={`${formatNumber(curds)} curds`}
          >
            {formatNumber(curds)} Curds
          </span>
        </div>
        {/* ... rest unchanged ... */}
      </div>
      {/* ... CPS display unchanged ... */}
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:

- [x] Clicking cheese wheel causes curds counter to "pop" (scale up then back)
- [x] Buying a generator causes the pop animation
- [ ] Buying an upgrade causes the pop animation
- [x] Animation does NOT trigger on passive CPS ticks
- [x] With reducedMotion enabled, no animation occurs (code reviewed - conditionally applies class)
- [x] Animation feels satisfying, not overwhelming (0.3s duration)

---

## Testing Strategy

### Unit Tests:

- No new unit tests needed — this is visual polish

### Manual Testing Steps:

1. Open game, click cheese wheel rapidly — each click should pop the counter
2. Buy a generator — counter should pop once
3. Enable reduced motion in Settings > Accessibility — animation should stop
4. Let game run idle for 10+ seconds — counter should NOT pop from passive income
5. Prestige (if available) — verify animation works after reset

## Performance Considerations

- `currencyAnimationTrigger` is a primitive number, so selector comparison is O(1)
- Animation only triggers on discrete events, not continuous ticks
- Using `key` prop for animation is React's intended remount mechanism — no extra DOM operations

## References

- UX Phase 4 plan: `thoughts/shared/plans/ux-phase4-delight-enhancements.md` (Phase 4.2 skipped)
- Existing animation usage: `src/components/ui/OfflineProgressModal.tsx:48`
- CSS definition: `src/index.css:957-965`
