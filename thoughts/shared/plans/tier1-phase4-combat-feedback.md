# Phase 4: Wire CombatFeedback Components — Implementation Plan

## Overview

Integrate the existing `CombatFeedback.tsx` components and `useCombatFeedback.ts` hooks into `CombatPanel.tsx` to add visual combat juice: floating damage numbers, screen shake, flash overlays, combo counter, and victory/defeat banners.

## Current State Analysis

**Already built and ready to use:**
- `src/components/ui/CombatFeedback.tsx` exports 6 components:
  - `DamageNumberDisplay` / `DamageNumberContainer` — floating damage numbers
  - `FlashOverlay` — screen flash on crits/big hits
  - `CombatResultBanner` — victory/defeat banner with "Beauty, eh!"
  - `ComboCounter` — hit streak display
  - `AttackEffect` — emoji + particle burst at position
- `src/hooks/useCombatFeedback.ts` exports 2 hooks:
  - `useScreenShake()` — returns `shakeClass` CSS class
  - `useFlashEffect()` — returns `isFlashing`, `flashColor`, `triggerFlash()`
- All CSS animations exist in `src/index.css`:
  - `animate-damage-float`, `animate-flash`, `animate-shake-*`, `animate-result-banner`, `animate-attack-effect`
- `Battle.tick()` already returns `audioEvents` — we extend to add `feedbackEvents`

**Not wired in:**
- None of these components imported in `CombatPanel.tsx`
- No feedback state in Zustand store
- `Battle.tick()` doesn't emit feedback events

## Desired End State

After this phase:
1. **Damage numbers float** — When heroes/enemies take damage, numbers rise and fade at their position
2. **Screen shakes** — Heavy hits trigger shake; light shake on any hit
3. **Flash overlays** — Red flash when party takes damage, gold flash on crits
4. **Combo counter** — Consecutive hero hits increment combo; resets when party takes damage
5. **Victory/defeat banner** — "Beauty, eh!" or "Sorry about that, folks..." slides in

### Verification

- Enter combat → hero attacks → damage number floats up from enemy
- Enemy hits hero → red flash, screen shake, damage number on hero
- Get 5+ consecutive hero hits → combo counter appears and grows
- Enemy hits party → combo resets to 0
- Win battle → "VICTORY" banner slides in with confetti
- Lose battle → "DEFEAT" banner with sad emoji

## What We're NOT Doing

- **Attack effect emojis** — `AttackEffect` component exists but requires click-position tracking; defer to Tier 2
- **Per-target particle bursts** — Would need refs to track DOM positions; defer
- **Combo decay timer** — Fun polish but not essential for Phase 4
- **Critical hit detection** — Would need damage type info from combat engine; use "big damage" threshold instead

---

## Phase 4.1: Define Feedback Event Types

### Overview

Add `CombatFeedbackEvent` type to Battle aggregate and extend `BattleTickResult` to include feedback events.

### Changes Required

#### 1. Add Feedback Event Type

**File**: `src/domain/aggregates/Battle.ts`

Add after `CombatAudioEvent` type (line 16):

```typescript
export type CombatFeedbackEvent =
  | { type: 'damage'; target: 'hero' | 'enemy'; slotIndex: number; value: number; damageType: 'damage' | 'crit' | 'miss' | 'block' }
  | { type: 'heal'; target: 'hero' | 'enemy'; slotIndex: number; value: number }
  | { type: 'comboHit' }
  | { type: 'comboBreak' }
  | { type: 'flash'; color: 'red' | 'gold' | 'green' }
  | { type: 'shake'; intensity: 'light' | 'medium' | 'heavy' };
```

**Design notes:**
- `slotIndex` is the position in the party (heroes 0-4) or enemy array (0-6)
- Grid positions derived from slotIndex: heroes on left (x: 15-25%), enemies on right (x: 65-85%)
- `damageType: 'crit'` triggered when damage exceeds 150% of attacker's base attack

#### 2. Extend BattleTickResult

**File**: `src/domain/aggregates/Battle.ts`

Update interface (line 37-41):

```typescript
export interface BattleTickResult {
  battle: Battle;
  logs: readonly CombatLogEntry[];
  audioEvents: readonly CombatAudioEvent[];
  feedbackEvents: readonly CombatFeedbackEvent[];
}
```

#### 3. Initialize feedbackEvents in tick()

**File**: `src/domain/aggregates/Battle.ts`

In `tick()` method, add initialization (after line 160):

```typescript
const feedbackEvents: CombatFeedbackEvent[] = [];
```

Update return statement (line 208-212):

```typescript
return {
  battle: new Battle(newState, logs),
  logs,
  audioEvents,
  feedbackEvents,
};
```

Also update early return (line 155):

```typescript
return { battle: this, logs: [], audioEvents: [], feedbackEvents: [] };
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm run test`

---

## Phase 4.2: Emit Feedback Events from Battle.tick()

### Overview

Add feedback event emissions at key combat moments: hero attacks, enemy attacks, heals, and status effects.

### Changes Required

#### 1. Hero Attack Feedback

**File**: `src/domain/aggregates/Battle.ts`

In `#executeHeroActions` method, after damage is applied (around line 399-402), add:

```typescript
// Emit feedback events
const enemyIndex = enemies.indexOf(target);
const isCrit = damage > effectiveAttack * 1.5; // Big hit threshold
feedbackEvents.push({
  type: 'damage',
  target: 'enemy',
  slotIndex: enemyIndex,
  value: damage,
  damageType: isCrit ? 'crit' : 'damage',
});
feedbackEvents.push({ type: 'comboHit' });
if (isCrit) {
  feedbackEvents.push({ type: 'flash', color: 'gold' });
  feedbackEvents.push({ type: 'shake', intensity: 'medium' });
} else {
  feedbackEvents.push({ type: 'shake', intensity: 'light' });
}
```

**Note:** Method signature needs `feedbackEvents` parameter added.

Update method signature:

```typescript
#executeHeroActions(
  heroStates: Record<string, HeroCombatState>,
  enemies: CombatEnemy[],
  partyStats: Record<string, HeroStats>,
  logs: CombatLogEntry[],
  audioEvents: CombatAudioEvent[],
  feedbackEvents: CombatFeedbackEvent[],  // ADD THIS
  heroDamageMultiplier = 1
): { damageDealt: number }
```

Update call site in `tick()` (line 176):

```typescript
const heroActionResult = this.#executeHeroActions(heroStates, enemies, partyStats, logs, audioEvents, feedbackEvents, heroDamageMultiplier);
```

#### 2. Enemy Attack Feedback (Single Target)

**File**: `src/domain/aggregates/Battle.ts`

In `#executeEnemyActions`, after single-target damage applied (around line 517-518), add:

```typescript
// Emit feedback events
const heroIds = Object.keys(heroStates);
const heroIndex = heroIds.indexOf(target.heroId);
const isBigHit = damage > effectiveAttack * 1.5;
feedbackEvents.push({
  type: 'damage',
  target: 'hero',
  slotIndex: heroIndex,
  value: damage,
  damageType: isBigHit ? 'crit' : 'damage',
});
feedbackEvents.push({ type: 'comboBreak' });
feedbackEvents.push({ type: 'flash', color: 'red' });
feedbackEvents.push({ type: 'shake', intensity: isBigHit ? 'heavy' : 'medium' });
```

Update method signature:

```typescript
#executeEnemyActions(
  enemies: CombatEnemy[],
  heroStates: Record<string, HeroCombatState>,
  partyStats: Record<string, HeroStats>,
  logs: CombatLogEntry[],
  audioEvents: CombatAudioEvent[],
  feedbackEvents: CombatFeedbackEvent[]  // ADD THIS
): { damageTaken: number }
```

Update call site in `tick()` (line 180):

```typescript
const enemyActionResult = this.#executeEnemyActions(enemies, heroStates, partyStats, logs, audioEvents, feedbackEvents);
```

#### 3. Enemy Attack Feedback (AoE)

**File**: `src/domain/aggregates/Battle.ts`

In `#executeEnemyActions`, inside the AoE loop (around line 480-481), add after damage applied:

```typescript
// Emit feedback events for AoE
const heroIds = Object.keys(heroStates);
const heroIndex = heroIds.indexOf(heroState.heroId);
feedbackEvents.push({
  type: 'damage',
  target: 'hero',
  slotIndex: heroIndex,
  value: damage,
  damageType: 'damage',
});
```

After the AoE loop completes (before single-target else branch):

```typescript
feedbackEvents.push({ type: 'comboBreak' });
feedbackEvents.push({ type: 'flash', color: 'red' });
feedbackEvents.push({ type: 'shake', intensity: 'heavy' });
```

#### 4. Heal Feedback

**File**: `src/domain/aggregates/Battle.ts`

In `#processHeroStatusEffects`, after healing detected (around line 663), add:

```typescript
if (result.healing > 0) {
  const heroIds = Object.keys(heroStates);
  const heroIndex = heroIds.indexOf(heroId);
  feedbackEvents.push({
    type: 'heal',
    target: 'hero',
    slotIndex: heroIndex,
    value: result.healing,
  });
  feedbackEvents.push({ type: 'flash', color: 'green' });
  audioEvents.push({ type: 'heal' });
}
```

Update method signature:

```typescript
#processHeroStatusEffects(
  heroStates: Record<string, HeroCombatState>,
  logs: CombatLogEntry[],
  audioEvents: CombatAudioEvent[],
  feedbackEvents: CombatFeedbackEvent[]  // ADD THIS
): { damageTaken: number }
```

Update call site in `tick()` (line 184):

```typescript
const heroStatusResult = this.#processHeroStatusEffects(heroStates, logs, audioEvents, feedbackEvents);
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm run test`

---

## Phase 4.3: Add Feedback State to Combat Store

### Overview

Add feedback-related state to the combat slice and actions to update it.

### Changes Required

#### 1. Add Feedback State Types

**File**: `src/types/game.ts`

Add after `CombatState` interface (around line 316):

```typescript
export interface CombatFeedbackState {
  damageNumbers: Array<{
    id: string;
    value: number;
    type: 'damage' | 'heal' | 'crit' | 'miss' | 'block';
    x: number;
    y: number;
  }>;
  comboCount: number;
  maxCombo: number;
  isFlashing: boolean;
  flashColor: 'red' | 'gold' | 'green' | null;
  shakeIntensity: 'light' | 'medium' | 'heavy' | null;
}
```

Extend `CombatState`:

```typescript
export interface CombatState {
  // ... existing fields ...
  feedback: CombatFeedbackState;
}
```

#### 2. Initialize Feedback State

**File**: `src/stores/slices/combat/combatSlice.ts`

Add to initial state (around line 20):

```typescript
feedback: {
  damageNumbers: [],
  comboCount: 0,
  maxCombo: 0,
  isFlashing: false,
  flashColor: null,
  shakeIntensity: null,
},
```

#### 3. Add Feedback Actions

**File**: `src/stores/slices/combat/combatSlice.ts`

Add inside the slice (after existing actions):

```typescript
addDamageNumber: (damage: CombatFeedbackState['damageNumbers'][0]) => {
  const state = get();
  set({
    combat: {
      ...state.combat,
      feedback: {
        ...state.combat.feedback,
        damageNumbers: [...state.combat.feedback.damageNumbers, damage].slice(-20), // Cap at 20
      },
    },
  });
},

removeDamageNumber: (id: string) => {
  const state = get();
  set({
    combat: {
      ...state.combat,
      feedback: {
        ...state.combat.feedback,
        damageNumbers: state.combat.feedback.damageNumbers.filter((d) => d.id !== id),
      },
    },
  });
},

incrementCombo: () => {
  const state = get();
  const newCombo = state.combat.feedback.comboCount + 1;
  set({
    combat: {
      ...state.combat,
      feedback: {
        ...state.combat.feedback,
        comboCount: newCombo,
        maxCombo: Math.max(state.combat.feedback.maxCombo, newCombo),
      },
    },
  });
},

resetCombo: () => {
  const state = get();
  set({
    combat: {
      ...state.combat,
      feedback: {
        ...state.combat.feedback,
        comboCount: 0,
      },
    },
  });
},

triggerFlash: (color: 'red' | 'gold' | 'green') => {
  const state = get();
  set({
    combat: {
      ...state.combat,
      feedback: {
        ...state.combat.feedback,
        isFlashing: true,
        flashColor: color,
      },
    },
  });
  setTimeout(() => {
    const current = get();
    set({
      combat: {
        ...current.combat,
        feedback: {
          ...current.combat.feedback,
          isFlashing: false,
          flashColor: null,
        },
      },
    });
  }, 150);
},

triggerShake: (intensity: 'light' | 'medium' | 'heavy') => {
  const state = get();
  set({
    combat: {
      ...state.combat,
      feedback: {
        ...state.combat.feedback,
        shakeIntensity: intensity,
      },
    },
  });
  const duration = intensity === 'light' ? 150 : intensity === 'medium' ? 300 : 500;
  setTimeout(() => {
    const current = get();
    set({
      combat: {
        ...current.combat,
        feedback: {
          ...current.combat.feedback,
          shakeIntensity: null,
        },
      },
    });
  }, duration);
},

resetFeedback: () => {
  const state = get();
  set({
    combat: {
      ...state.combat,
      feedback: {
        damageNumbers: [],
        comboCount: 0,
        maxCombo: 0,
        isFlashing: false,
        flashColor: null,
        shakeIntensity: null,
      },
    },
  });
},
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`

---

## Phase 4.4: Process Feedback Events in tickCombat

### Overview

Update `tickCombat` to process `feedbackEvents` from `Battle.tick()` and trigger the appropriate state updates.

### Changes Required

#### 1. Import CombatFeedbackEvent Type

**File**: `src/stores/slices/combat/combatSlice.ts`

Update import:

```typescript
import { Battle, type CombatFeedbackEvent } from '../../../domain/aggregates/Battle';
```

#### 2. Process Feedback Events

**File**: `src/stores/slices/combat/combatSlice.ts`

In `tickCombat`, after destructuring Battle.tick result:

```typescript
const { battle: updated, logs, audioEvents, feedbackEvents } = battle.tick(deltaMs, partyStats, heroDamageMultiplier);
```

Add feedback event processing (after audio event loop):

```typescript
// Process feedback events
for (const event of feedbackEvents) {
  switch (event.type) {
    case 'damage':
    case 'heal': {
      const { x, y } = getGridPosition(event.target, event.slotIndex);
      get().addDamageNumber({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        value: event.value,
        type: event.type === 'heal' ? 'heal' : event.damageType,
        x,
        y,
      });
      break;
    }
    case 'comboHit':
      get().incrementCombo();
      break;
    case 'comboBreak':
      get().resetCombo();
      break;
    case 'flash':
      get().triggerFlash(event.color);
      break;
    case 'shake':
      get().triggerShake(event.intensity);
      break;
  }
}
```

#### 3. Add Grid Position Helper

**File**: `src/stores/slices/combat/combatSlice.ts`

Add helper function at top of file (after imports):

```typescript
function getGridPosition(target: 'hero' | 'enemy', slotIndex: number): { x: number; y: number } {
  if (target === 'hero') {
    // Heroes on left side, stacked vertically
    return {
      x: 20 + (slotIndex % 2) * 5, // Slight horizontal offset for variety
      y: 15 + slotIndex * 18, // 5 heroes spaced vertically
    };
  } else {
    // Enemies on right side, can have more
    return {
      x: 75 + (slotIndex % 2) * 5,
      y: 20 + slotIndex * 12, // More enemies, tighter spacing
    };
  }
}
```

#### 4. Reset Feedback on Combat Start

**File**: `src/stores/slices/combat/combatSlice.ts`

In `startCombat` action, add reset call:

```typescript
get().resetFeedback();
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm run test`

---

## Phase 4.5: Integrate Components in CombatPanel

### Overview

Import and render the feedback components in CombatPanel.

### Changes Required

#### 1. Import Components

**File**: `src/components/ui/CombatPanel.tsx`

Add imports:

```typescript
import {
  DamageNumberContainer,
  FlashOverlay,
  ComboCounter,
  CombatResultBanner,
} from './CombatFeedback';
```

#### 2. Add State Selectors

**File**: `src/components/ui/CombatPanel.tsx`

Add selectors (near existing `useGameStore` calls):

```typescript
const feedback = useGameStore((state) => state.combat.feedback);
const removeDamageNumber = useGameStore((state) => state.removeDamageNumber);
```

#### 3. Add Shake Class to Container

**File**: `src/components/ui/CombatPanel.tsx`

Derive shake class:

```typescript
const shakeClass = feedback.shakeIntensity
  ? `animate-shake-${feedback.shakeIntensity}`
  : '';
```

Add to the main combat section (the `<section>` element wrapping combat content):

```tsx
<section className={`relative ${shakeClass} ...existing classes...`}>
```

#### 4. Render Feedback Components

**File**: `src/components/ui/CombatPanel.tsx`

Inside the combat section, add (before the closing `</section>`):

```tsx
{/* Combat Feedback Overlays */}
<FlashOverlay
  isFlashing={feedback.isFlashing}
  color={feedback.flashColor || 'red'}
/>
<DamageNumberContainer
  numbers={feedback.damageNumbers}
  onRemove={removeDamageNumber}
/>
<ComboCounter
  count={feedback.comboCount}
  maxCombo={feedback.maxCombo}
/>
{combat.battleResult && combat.battleResult !== 'ongoing' && (
  <CombatResultBanner result={combat.battleResult} />
)}
```

#### 5. Ensure Relative Positioning

The combat section needs `relative` positioning for absolute overlays to work. Verify the `<section>` has `relative` class or add it.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Enter combat → damage numbers float up from targets
- [ ] Take hit → screen shakes, red flash
- [ ] Land big hit → gold flash
- [ ] Consecutive hero hits → combo counter appears and grows
- [ ] Enemy hits party → combo resets
- [ ] Victory → banner slides in with "Beauty, eh!"
- [ ] Defeat → banner with "Sorry about that, folks..."

---

## Testing Strategy

### Unit Tests
- `Battle.tick()` returns `feedbackEvents` array
- Feedback events contain correct `slotIndex` values
- Combo events emit on hero attacks and enemy attacks

### Integration Tests
- `tickCombat` processes feedback events and updates state
- Damage numbers appear and auto-remove after 1 second
- Flash/shake state resets after timeout

### Manual Testing Steps
1. Start combat with a weak enemy (e.g., Stage 1)
2. Watch hero attack → floating damage number appears on enemy
3. Wait for enemy to attack → red flash, screen shake, damage number on hero
4. Get 5+ consecutive hero hits before enemy acts → combo counter shows "5"
5. Let enemy hit → combo resets to 0
6. Win battle → "VICTORY" banner
7. Test with reduced motion enabled → no shake animations

## Performance Considerations

- Damage numbers capped at 20 to prevent memory growth
- Flash/shake use CSS animations (GPU-accelerated)
- Timeout-based cleanup for transient state
- Components respect `reducedMotion` setting

## References

- Parent plan: `thoughts/shared/plans/tier1-reconnect-polish-systems.md`
- CombatFeedback components: `src/components/ui/CombatFeedback.tsx`
- Combat feedback hooks: `src/hooks/useCombatFeedback.ts`
- Battle aggregate: `src/domain/aggregates/Battle.ts`
- Combat slice: `src/stores/slices/combat/combatSlice.ts`
- Combat panel: `src/components/ui/CombatPanel.tsx`
