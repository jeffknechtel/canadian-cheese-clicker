# Dynamic Events Expansion & QoL Features Implementation Plan

## Overview

This plan adds two categories of features to improve player engagement and reduce friction:

1. **Dynamic Events Expansion** — Weekly rotating challenges with exclusive rewards during seasonal events
2. **Quality of Life (QoL)** — Time-to-afford display, CPS contribution breakdown panel, and keyboard shortcuts

These address gaps identified in the state-of-the-art analysis: the game lacks rotating content variety (beyond seasonal events) and provides insufficient information to optimization-minded players.

## Current State Analysis

### Dynamic Events

The seasonal event system is functional (fixed in commit #16):
- 4 seasonal events defined in `src/data/events.ts` (Canada Day, Poutine Week, Hockey Season, Winterlude)
- `checkEventActivation()` properly handles auto-activation and auto-deactivation based on date ranges
- Events provide production/XP/drops multipliers via `getEventMultipliers()`
- `exclusiveContent` field exists but exclusive items are NOT unlocked during events — only defined as metadata

**What's missing:**
- No weekly rotating challenges
- Exclusive event content (cheeses, equipment) requires event to be active but unlock mechanism doesn't exist
- No limited-time rewards or event-specific currencies
- No event UI indicator showing active events

### QoL Features

**Time-to-afford**: Not implemented. `calculateGeneratorCost()` and `getMaxAffordable()` exist but no UI shows time until player can afford something.

**CPS Breakdown**: Not implemented. `computeCps()` in `cpsCalculator.ts` calculates total CPS from 10+ sources but no UI exposes the breakdown:
- Base generator CPS (per generator type)
- Generator-specific upgrade multipliers
- Synergy zone bonuses
- Global upgrade multiplier
- Achievement multiplier
- Hero CPS multiplier (cheese affinity)
- Formation multiplier
- Prestige multiplier (rennet)
- Eh multiplier
- Event multiplier
- Active buff multiplier

**Keyboard shortcuts**: Not implemented. No keyboard event handlers exist for game actions.

### Key Discoveries

- `GeneratorPanel.tsx:119-120` shows only base CPS per generator (`+{formatNumber(generator.baseCps)} cps each`) — doesn't account for multipliers
- `CurrencyDisplay.tsx:56-59` shows total CPS but no breakdown
- `getGeneratorMultiplier(id)` exists in `productionSlice.ts:264-268` but is unused in UI
- Event `exclusiveContent` is defined but never consumed — no "unlock during event" logic exists
- The game loop runs hourly event checks (`gameLoop.ts:74-76`) but UI has no event indicator

## Desired End State

### Dynamic Events

1. **Weekly Challenges** — Each week, one challenge is active with specific goals and rewards
2. **Event Exclusives** — Seasonal events unlock access to exclusive recipes/equipment that can be crafted/earned during the event
3. **Event UI** — Clear indicator when events are active, showing bonuses and remaining time

### QoL Features

1. **Time-to-Afford** — Generator/upgrade cards show "Affordable in X" when player can't afford
2. **CPS Breakdown** — Expandable panel showing contribution from each source
3. **Keyboard Shortcuts** — Number keys 1-9 for generators, Space for click, P for prestige panel, etc.

### Verification

- Weekly challenge rotates on Monday 00:00 UTC
- Completing a challenge grants the advertised reward
- Seasonal event shows in header with countdown
- Event-exclusive recipes become craftable during event, greyed out outside
- Generator cards show time-to-afford when hovering or insufficient funds
- CPS breakdown matches total `curdPerSecond` value
- Keyboard shortcuts work and are documented in a help modal

## What We're NOT Doing

- Multi-week challenge chains or campaign-style progression
- Event leaderboards or competitive elements
- Event currencies (too complex for first iteration)
- Persisting event progress between activations
- Real-time challenge tracking (progress checks on game tick, not server)
- QoL: notification preferences, custom keybind remapping

---

## Phase 1: Weekly Challenge System

### Overview

Add a rotating weekly challenge system. Challenges reset every Monday at 00:00 UTC. Each challenge has a goal (e.g., "Craft 5 cheeses this week") and a reward (curds, ingredients, or equipment).

### Changes Required

#### 1. Challenge Types and State

**File**: `src/types/game.ts`
**Changes**: Add challenge types after `GameEvent` interface (~line 686).

```typescript
// ===== Weekly Challenge Types =====

export type ChallengeGoalType =
  | 'craftCheese'       // Craft X cheeses
  | 'defeatEnemies'     // Defeat X enemies
  | 'earnCurds'         // Earn X curds (total, not current)
  | 'collectClicks'     // Click X times
  | 'completeZoneStage' // Complete X zone stages
  | 'consumeCheese'     // Consume X cheeses for buffs
  | 'prestigeReset';    // Perform X prestige resets

export interface ChallengeGoal {
  type: ChallengeGoalType;
  target: number;
  description: string;
}

export type ChallengeRewardType =
  | { type: 'curds'; amount: number }
  | { type: 'ingredient'; ingredientId: string }
  | { type: 'equipment'; equipmentId: string }
  | { type: 'rennet'; amount: number };

export interface WeeklyChallenge {
  id: string;
  name: string;
  description: string;
  goal: ChallengeGoal;
  reward: ChallengeRewardType;
  icon: string;
}

export interface ChallengeState {
  activeChallengeId: string | null;
  weekStartTimestamp: number;    // Monday 00:00 UTC of current week
  progress: number;              // Current progress toward goal
  completed: boolean;            // True if goal met
  claimed: boolean;              // True if reward claimed
}
```

Extend `GameState` (~line 136):

```typescript
// Challenge system
challenge: ChallengeState;
```

#### 2. Challenge Definitions

**File**: `src/data/challenges.ts` (new file)
**Changes**: Define the weekly challenge pool.

```typescript
import type { WeeklyChallenge } from '../types/game';
import Decimal from 'decimal.js';

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'cheese_crafter',
    name: 'Master Fromager',
    description: 'Craft 5 cheeses this week',
    goal: { type: 'craftCheese', target: 5, description: 'Craft 5 cheeses' },
    reward: { type: 'rennet', amount: 10 },
    icon: '🧀',
  },
  {
    id: 'enemy_slayer',
    name: 'Curd Crusher',
    description: 'Defeat 100 enemies in combat',
    goal: { type: 'defeatEnemies', target: 100, description: 'Defeat 100 enemies' },
    reward: { type: 'curds', amount: 1000000 },
    icon: '⚔️',
  },
  {
    id: 'click_champion',
    name: 'Click Champion',
    description: 'Click 1,000 times this week',
    goal: { type: 'collectClicks', target: 1000, description: 'Click 1,000 times' },
    reward: { type: 'ingredient', ingredientId: 'truffle' },
    icon: '👆',
  },
  {
    id: 'zone_explorer',
    name: 'Zone Explorer',
    description: 'Complete 20 zone stages',
    goal: { type: 'completeZoneStage', target: 20, description: 'Complete 20 stages' },
    reward: { type: 'equipment', equipmentId: 'explorers_compass' },
    icon: '🗺️',
  },
  {
    id: 'buff_master',
    name: 'Buff Master',
    description: 'Consume 10 cheeses for buffs',
    goal: { type: 'consumeCheese', target: 10, description: 'Use 10 cheese buffs' },
    reward: { type: 'rennet', amount: 5 },
    icon: '✨',
  },
  {
    id: 'prestige_pusher',
    name: 'Prestige Pusher',
    description: 'Perform 3 prestige resets',
    goal: { type: 'prestigeReset', target: 3, description: 'Reset 3 times' },
    reward: { type: 'curds', amount: 5000000 },
    icon: '🔄',
  },
];

/** Get the Monday 00:00 UTC timestamp for a given date */
export function getWeekStartTimestamp(date: Date = new Date()): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
  d.setUTCDate(diff);
  return d.getTime();
}

/** Get the challenge for a given week (deterministic rotation) */
export function getChallengeForWeek(weekStartTimestamp: number): WeeklyChallenge {
  // Stable hash: week number since epoch modulo challenge count
  const weeksSinceEpoch = Math.floor(weekStartTimestamp / (7 * 24 * 60 * 60 * 1000));
  const index = weeksSinceEpoch % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[index];
}

export function getChallengeById(id: string): WeeklyChallenge | undefined {
  return WEEKLY_CHALLENGES.find((c) => c.id === id);
}
```

#### 3. Challenge Slice

**File**: `src/stores/slices/challenge/challengeSlice.ts` (new file)
**File**: `src/stores/slices/challenge/types.ts` (new file)

Slice provides:
- `initializeChallenge()` — Called on load, sets up current week's challenge
- `incrementChallengeProgress(goalType, amount)` — Called by other slices when relevant actions occur
- `claimChallengeReward()` — Grants reward, marks claimed
- `checkWeekRollover()` — Called periodically to detect new week

```typescript
// types.ts
import type { ChallengeState } from '../../../types/game';

export interface ChallengeSlice {
  challenge: ChallengeState;
  initializeChallenge: () => void;
  incrementChallengeProgress: (goalType: string, amount?: number) => void;
  claimChallengeReward: () => boolean;
  checkWeekRollover: () => void;
}
```

#### 4. Integration with Game Actions

**Files to modify**:
- `productionSlice.ts` — `click()` calls `incrementChallengeProgress('collectClicks', 1)`
- `craftingSlice.ts` — `completeCrafting()` calls `incrementChallengeProgress('craftCheese', 1)`
- `craftingSlice.ts` — `consumeCheese()` calls `incrementChallengeProgress('consumeCheese', 1)`
- `combatSlice.ts` — `defeatEnemy()` calls `incrementChallengeProgress('defeatEnemies', 1)`
- `combatSlice.ts` — `completeStage()` calls `incrementChallengeProgress('completeZoneStage', 1)`
- `prestigeSlice.ts` — `performReset()` calls `incrementChallengeProgress('prestigeReset', 1)`

Each call is a one-liner addition at the end of the relevant action.

#### 5. Save/Load Migration

**File**: `src/systems/saveSystem.ts`
**Changes**: Add default challenge state for saves predating this feature.

```typescript
challenge: serialized.challenge ?? {
  activeChallengeId: null,
  weekStartTimestamp: 0,
  progress: 0,
  completed: false,
  claimed: false,
},
```

#### 6. Game Loop Integration

**File**: `src/systems/gameLoop.ts`
**Changes**: Add weekly rollover check alongside the hourly event check.

```typescript
// Existing hourly event check
if (currentTime - lastEventCheckTime > EVENT_CHECK_INTERVAL_MS) {
  store.checkEventActivation();
  store.checkWeekRollover(); // NEW
  lastEventCheckTime = currentTime;
}
```

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:
- [ ] New game starts with current week's challenge active
- [ ] Performing challenge action increments progress (e.g., click increments click challenge)
- [ ] Progress persists across save/load
- [ ] Completing goal marks challenge as completed
- [ ] Claiming reward grants the reward (curds/rennet/ingredient/equipment)
- [ ] Cannot claim twice
- [ ] Week rollover resets challenge state (test by manually adjusting timestamps in devtools)

---

## Phase 2: Event Exclusive Content & Event UI

### Overview

Make event `exclusiveContent` actually unlock during events. Add a header indicator showing active events.

### Changes Required

#### 1. Unlock Event Exclusives

**File**: `src/stores/slices/events/eventSlice.ts`
**Changes**: When an event activates, unlock its exclusive recipes and equipment.

Modify `checkEventActivation()` to call unlock helpers when events are added:

```typescript
for (const id of added) {
  publish({ type: 'SeasonalEventActivated', eventId: id });
  const event = getEventById(id);
  if (event?.exclusiveContent) {
    if (event.exclusiveContent.cheeses) {
      for (const recipeId of event.exclusiveContent.cheeses) {
        get().unlockRecipe(recipeId);
      }
    }
    if (event.exclusiveContent.equipment) {
      for (const equipmentId of event.exclusiveContent.equipment) {
        get().addEquipment(equipmentId);
      }
    }
  }
}
```

Note: Exclusive recipes remain unlocked permanently once obtained. Equipment is added to inventory.

#### 2. Event Indicator Component

**File**: `src/components/ui/EventIndicator.tsx` (new file)
**Changes**: Shows active events in header with icon, name, and time remaining.

```tsx
export function EventIndicator() {
  const activeEvents = useGameStore((state) => state.activeEvents);
  const eventData = activeEvents.map(getEventById).filter(Boolean);
  
  if (eventData.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full">
      {eventData.map((event) => (
        <div key={event.id} className="flex items-center gap-1" title={event.description}>
          <span>{event.icon}</span>
          <span className="text-sm font-medium">{event.name}</span>
        </div>
      ))}
    </div>
  );
}
```

#### 3. Integrate Event Indicator

**File**: `src/components/ui/Header.tsx` (or wherever the top bar is)
**Changes**: Import and render `<EventIndicator />` next to currency display.

#### 4. Challenge Indicator Component

**File**: `src/components/ui/ChallengeIndicator.tsx` (new file)
**Changes**: Shows current challenge progress in a compact format.

```tsx
export function ChallengeIndicator() {
  const challenge = useGameStore((state) => state.challenge);
  const challengeData = challenge.activeChallengeId 
    ? getChallengeById(challenge.activeChallengeId) 
    : null;
  
  if (!challengeData) return null;
  
  const progressPercent = Math.min(100, (challenge.progress / challengeData.goal.target) * 100);
  
  return (
    <button 
      className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full hover:bg-blue-200"
      onClick={() => /* open challenge modal */}
      title={challengeData.description}
    >
      <span>{challengeData.icon}</span>
      <span className="text-sm">{challenge.progress}/{challengeData.goal.target}</span>
      {challenge.completed && !challenge.claimed && (
        <span className="text-green-600 text-xs font-bold">CLAIM</span>
      )}
    </button>
  );
}
```

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] During an active seasonal event, event indicator appears in header
- [ ] Event exclusive recipes appear in crafting menu during event
- [ ] Equipment from event is added to inventory when event activates
- [ ] Challenge indicator shows current progress
- [ ] Clicking challenge indicator opens detail modal
- [ ] "CLAIM" badge appears when challenge complete but unclaimed

---

## Phase 3: Time-to-Afford Display

### Overview

Add time-to-afford calculation and display to generator cards. Show "Affordable in X" when player can't afford.

### Changes Required

#### 1. Time-to-Afford Utility

**File**: `src/utils/timeToAfford.ts` (new file)
**Changes**: Utility function to calculate time until affordable.

```typescript
import Decimal from 'decimal.js';

export interface TimeToAfford {
  canAfford: boolean;
  seconds: number | null;     // null if CPS is 0 and can't afford
  formatted: string;          // "2m 30s", "1h 15m", "∞"
}

export function calculateTimeToAfford(
  cost: Decimal,
  currentCurds: Decimal,
  curdPerSecond: Decimal
): TimeToAfford {
  if (currentCurds.gte(cost)) {
    return { canAfford: true, seconds: 0, formatted: 'Now' };
  }
  
  if (curdPerSecond.isZero() || curdPerSecond.isNegative()) {
    return { canAfford: false, seconds: null, formatted: '∞' };
  }
  
  const remaining = cost.minus(currentCurds);
  const seconds = remaining.div(curdPerSecond).ceil().toNumber();
  
  return {
    canAfford: false,
    seconds,
    formatted: formatDuration(seconds),
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
```

#### 2. Add to GeneratorRow

**File**: `src/components/ui/GeneratorPanel.tsx`
**Changes**: Show time-to-afford when player can't afford.

Import the utility and add to GeneratorRow:

```typescript
import { calculateTimeToAfford } from '../../utils/timeToAfford';

// Inside GeneratorRow component
const curds = useGameStore((state) => state.curds);
const curdPerSecond = useGameStore((state) => state.curdPerSecond);

const timeToAfford = !canAfford 
  ? calculateTimeToAfford(cost, curds, curdPerSecond) 
  : null;
```

Render below the buy button or as part of button label:

```tsx
{timeToAfford && !timeToAfford.canAfford && (
  <div className="text-xs text-gray-500 mt-1">
    {timeToAfford.seconds !== null 
      ? `Affordable in ${timeToAfford.formatted}` 
      : 'Need CPS first'}
  </div>
)}
```

#### 3. Add to UpgradePanel (if exists)

Apply same pattern to upgrade cards if an UpgradePanel component exists.

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Generator card shows "Affordable in X" when can't afford
- [ ] Time updates as curds accumulate (within reason, ~1s precision is fine)
- [ ] Shows "∞" or "Need CPS first" when CPS is 0
- [ ] Disappears when generator becomes affordable
- [ ] Time estimate is reasonably accurate (±5%)

---

## Phase 4: CPS Breakdown Panel

### Overview

Add an expandable panel showing the breakdown of CPS contributions from each source.

### Changes Required

#### 1. CPS Breakdown Calculator

**File**: `src/stores/slices/production/cpsBreakdown.ts` (new file)
**Changes**: Function that returns itemized CPS contributions.

```typescript
import Decimal from 'decimal.js';
import type { GameStore } from '../../types';
import { GENERATORS } from '../../../data/generators';
import { 
  calculateGeneratorMultipliers, 
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeGeneratorEfficiency,
} from '../../../systems/productionEngine';

export interface CpsBreakdownItem {
  label: string;
  value: Decimal;        // Contribution to CPS
  multiplier?: number;   // If this is a multiplier, show it
  percentage?: number;   // Percentage of total CPS
  category: 'generator' | 'multiplier';
}

export interface CpsBreakdown {
  items: CpsBreakdownItem[];
  total: Decimal;
}

export function computeCpsBreakdown(state: GameStore): CpsBreakdown {
  const items: CpsBreakdownItem[] = [];
  
  // 1. Generator base CPS (before multipliers)
  let baseGeneratorCps = new Decimal(0);
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  
  for (const generator of GENERATORS) {
    const owned = state.generators[generator.id] ?? 0;
    if (owned > 0) {
      const genMultiplier = generatorMultipliers[generator.id] ?? 1;
      const contribution = generator.baseCps.times(owned).times(genMultiplier);
      baseGeneratorCps = baseGeneratorCps.plus(contribution);
      items.push({
        label: `${generator.name} (×${owned})`,
        value: contribution,
        category: 'generator',
      });
    }
  }
  
  // 2. Global multipliers
  const globalUpgradeMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
  const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes, /* synergy */);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();
  const eventMultipliers = state.getEventMultipliers();
  const buffMultipliers = state.getActiveBuffMultipliers();
  const efficiencyMultiplier = calculatePrestigeGeneratorEfficiency(state.prestige, Object.values(state.generators).reduce((a, b) => a + b, 0));
  
  if (globalUpgradeMultiplier > 1) {
    items.push({ label: 'Upgrade Bonus', multiplier: globalUpgradeMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (achievementMultiplier > 1) {
    items.push({ label: 'Achievement Bonus', multiplier: achievementMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (heroMultiplier > 1) {
    items.push({ label: 'Hero Affinity', multiplier: heroMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (formationMultiplier > 1) {
    items.push({ label: 'Formation Bonus', multiplier: formationMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (prestigeMultiplier > 1) {
    items.push({ label: 'Prestige Bonus', multiplier: prestigeMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (ehMultiplier > 1) {
    items.push({ label: 'Eh! Bonus', multiplier: ehMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  if (eventMultipliers.production > 1) {
    items.push({ label: 'Event Bonus', multiplier: eventMultipliers.production, value: new Decimal(0), category: 'multiplier' });
  }
  if (buffMultipliers.production > 1) {
    items.push({ label: 'Cheese Buff', multiplier: buffMultipliers.production, value: new Decimal(0), category: 'multiplier' });
  }
  if (efficiencyMultiplier > 1) {
    items.push({ label: 'Generator Efficiency', multiplier: efficiencyMultiplier, value: new Decimal(0), category: 'multiplier' });
  }
  
  const total = state.curdPerSecond;
  
  // Calculate percentages for generators
  for (const item of items) {
    if (item.category === 'generator') {
      item.percentage = item.value.div(baseGeneratorCps).times(100).toNumber();
    }
  }
  
  return { items, total };
}
```

#### 2. CPS Breakdown Component

**File**: `src/components/ui/CpsBreakdownPanel.tsx` (new file)
**Changes**: Expandable panel showing breakdown.

```tsx
import { useState, useMemo } from 'react';
import { useGameStore } from '../../stores';
import { computeCpsBreakdown } from '../../stores/slices/production/cpsBreakdown';
import { formatNumber } from '../../utils/formatNumber';

export function CpsBreakdownPanel() {
  const [expanded, setExpanded] = useState(false);
  const state = useGameStore();
  
  const breakdown = useMemo(() => computeCpsBreakdown(state), [
    state.generators,
    state.upgrades,
    state.achievements,
    state.heroes,
    state.party,
    state.prestige,
    state.ehCount,
    state.activeEvents,
    state.crafting.activeBuffs,
  ]);
  
  const generators = breakdown.items.filter((i) => i.category === 'generator');
  const multipliers = breakdown.items.filter((i) => i.category === 'multiplier');
  
  return (
    <div className="bg-cream/80 rounded-lg p-3">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
        aria-expanded={expanded}
      >
        <span className="font-semibold text-timber-700">CPS Breakdown</span>
        <span className="text-sm">{expanded ? '▼' : '▶'}</span>
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          <div className="font-medium text-gray-700">Generators</div>
          {generators.map((item, i) => (
            <div key={i} className="flex justify-between pl-2">
              <span>{item.label}</span>
              <span className="tabular-nums">{formatNumber(item.value)}/s ({item.percentage?.toFixed(1)}%)</span>
            </div>
          ))}
          
          {multipliers.length > 0 && (
            <>
              <div className="font-medium text-gray-700 mt-3">Multipliers</div>
              {multipliers.map((item, i) => (
                <div key={i} className="flex justify-between pl-2">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-green-600">×{item.multiplier?.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
          
          <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
            <span>Total CPS</span>
            <span className="tabular-nums">{formatNumber(breakdown.total)}/s</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. Integrate into Main UI

**File**: `src/components/ui/MainPanel.tsx` (or appropriate location)
**Changes**: Add `<CpsBreakdownPanel />` below currency display or in a stats section.

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] CPS breakdown panel shows all active generators
- [ ] Generator percentages sum to ~100% (within rounding)
- [ ] Multipliers show correct values matching known bonuses
- [ ] Total matches the displayed CPS in header
- [ ] Panel expands/collapses correctly
- [ ] Updates when generators purchased or multipliers change

---

## Phase 5: Keyboard Shortcuts

### Overview

Add keyboard shortcuts for common actions. Document them in a help modal.

### Changes Required

#### 1. Keyboard Shortcut Hook

**File**: `src/hooks/useKeyboardShortcuts.ts` (new file)
**Changes**: Central hook for registering keyboard handlers.

```typescript
import { useEffect } from 'react';
import { useGameStore } from '../stores';

export function useKeyboardShortcuts() {
  const click = useGameStore((state) => state.click);
  const buyGenerator = useGameStore((state) => state.buyGenerator);
  const canAffordGenerator = useGameStore((state) => state.canAffordGenerator);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          click();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          const generatorIndex = parseInt(e.key, 10) - 1;
          const generatorIds = ['milk_bucket', 'curd_vat', 'cheese_press', 'aging_room', 'cheese_cave', 
            'curling_stone', 'hockey_stick', 'maple_syrup_tap', 'poutine_stand', 'timmys_franchise',
            'moose_cavalry', 'igloo_factory', 'northern_lights_harness', 'beaver_dam_generator', 'cn_tower_amplifier'];
          const id = generatorIds[generatorIndex];
          if (id && canAffordGenerator(id, 1)) {
            buyGenerator(id, 1);
          }
          break;
        }
        case '?':
          // Toggle help modal (handled by App state)
          document.dispatchEvent(new CustomEvent('toggleHelpModal'));
          break;
      }
    };
    
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [click, buyGenerator, canAffordGenerator]);
}
```

#### 2. Apply Hook in App

**File**: `src/App.tsx`
**Changes**: Call `useKeyboardShortcuts()` at top level.

```typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  useKeyboardShortcuts();
  // ... rest of component
}
```

#### 3. Help Modal Component

**File**: `src/components/ui/HelpModal.tsx` (new file)
**Changes**: Modal showing keyboard shortcuts.

```tsx
import { useEffect, useState } from 'react';

export function HelpModal() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    document.addEventListener('toggleHelpModal', handler);
    return () => document.removeEventListener('toggleHelpModal', handler);
  }, []);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="font-medium">Space</dt>
            <dd>Click the cheese</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium">1-9</dt>
            <dd>Buy generator (in order)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium">?</dt>
            <dd>Toggle this help</dd>
          </div>
        </dl>
        <button 
          onClick={() => setOpen(false)}
          className="mt-4 w-full py-2 bg-timber-500 text-white rounded hover:bg-timber-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

#### 4. Render Help Modal

**File**: `src/App.tsx`
**Changes**: Add `<HelpModal />` to render tree.

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification (pre-existing implementation):
- [x] Space bar clicks the cheese
- [x] Number keys 1-5 purchase corresponding generators when affordable
- [x] Number keys do nothing when generator unaffordable
- [x] "?" key toggles help modal
- [x] Shortcuts don't trigger when typing in input fields
- [x] Help modal shows all shortcuts

---

## Testing Strategy

### Unit Tests (if test framework exists)

- `timeToAfford.ts`: Test edge cases (0 CPS, negative remaining, various durations)
- `challenges.ts`: Test week calculation, challenge rotation
- `cpsBreakdown.ts`: Test breakdown calculation matches total CPS

### Manual Testing

1. **Weekly Challenges**:
   - Start fresh game, verify challenge appears
   - Complete challenge goal, verify "CLAIM" appears
   - Claim reward, verify reward granted
   - Manually advance week (devtools), verify rollover

2. **Event Exclusives**:
   - Set system date to event period (e.g., July 1 for Canada Day)
   - Verify event indicator appears
   - Verify exclusive recipes are craftable
   - Verify equipment added to inventory

3. **Time-to-Afford**:
   - With insufficient curds, verify time estimate shown
   - Wait and verify time decreases
   - Verify estimate accuracy (within 10%)

4. **CPS Breakdown**:
   - Purchase generators, verify they appear in breakdown
   - Activate multipliers (prestige, buffs), verify they appear
   - Verify total matches header CPS

5. **Keyboard Shortcuts**:
   - Test each shortcut
   - Test that shortcuts don't fire in input fields

## Performance Considerations

- `computeCpsBreakdown()` is memoized on relevant state changes
- Time-to-afford recalculates on each render but is cheap (Decimal division)
- Keyboard event handler uses `useEffect` cleanup properly
- Challenge progress increment is O(1)

## Migration Notes

- Save migration adds default `challenge` state
- No data migration needed for existing saves — features are additive
- Event exclusives unlock on event activation, not retroactively

## References

- Research document: `thoughts/shared/research/2026-06-10_23-22-43_making-the-game-more-fun-state-of-the-art-analysis.md`
- Existing event system: `src/stores/slices/events/eventSlice.ts`
- CPS calculator: `src/stores/slices/production/cpsCalculator.ts`
- Generator panel: `src/components/ui/GeneratorPanel.tsx`
- Production engine: `src/systems/productionEngine.ts`
- Constants: `src/data/constants.ts`
