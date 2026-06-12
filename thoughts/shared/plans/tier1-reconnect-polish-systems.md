# Tier 1: Reconnect What's Already Built — Implementation Plan

## Overview

This plan implements the highest-leverage polish work identified in the world-class polish roadmap: reconnecting systems that were built but never wired in. The codebase contains a full particle engine, an entire combat-feedback component layer, five combat sound effects, a modal accessibility system, and other polish features that ship as dead code. Reconnecting them transforms player experience with minimal new code.

## Current State Analysis

Research (2026-06-12) confirmed the following disconnected systems:

| System | Status | Impact |
|--------|--------|--------|
| `ParticleContainer` | Never mounted in App.tsx | All `emitParticles()` calls no-op (golden cheese, synergy sparkles) |
| `CombatFeedback` components | Never imported | No damage numbers, flashes, shake, combo counter, attack effects |
| `useCombatFeedback` hooks | Never used | No screen shake or flash overlays |
| 5 combat SFX | Never called | Combat nearly silent |
| `tickCombat` conditional commit | Discards ATB progress | Combat freezes between log events |
| `ModalOverlay` | Never used | 10 modals each hand-roll overlays with inconsistent a11y |
| `useFocusTrap` | 1 of 10 modals | Focus escapes dialogs |
| Offline Progress Cap setting | UI exists, logic ignores it | Setting is cosmetic |
| `animate-bounce-in` | Class used, keyframe missing | Golden cheese notification doesn't animate entrance |

## Desired End State

After this plan:
1. **Particles work** — Golden cheese collect bursts confetti, synergy purchases sparkle
2. **Combat has juice** — Floating damage numbers, screen shake on hits, flash overlays, combo counter, death effects, hit/heal/buff/debuff sounds
3. **ATB fills smoothly** — Gauges progress every frame, not just on log events
4. **All modals accessible** — Single `ModalOverlay` base with focus trap, Escape key, `role="dialog"`, `aria-modal`, consistent animation
5. **Settings work** — Offline progress cap actually limits offline gains
6. **CSS complete** — `animate-bounce-in` keyframe defined

### Verification

- Run the game, click the cheese wheel with golden cheese active → confetti burst
- Enter combat → damage numbers float, hit sounds play, ATB bars fill smoothly
- Open any modal → Tab cycles within modal, Escape closes it
- Set offline cap to 1 hour, close browser for 2 hours, return → gains capped at 1 hour
- Golden cheese notification → entrance bounce animation plays

## What We're NOT Doing

- **onClickPosition wiring** — Deferred to Tier 2 (requires 3D→2D projection)
- **Province ambient audio** — Deferred to Tier 5 (requires zone-change hooks)
- **Prestige music theme** — Deferred to Tier 5
- **Performance optimizations** (dual layout mount, whole-store subscriptions) — Tier 2
- **Onboarding/progressive unlock** — Tier 3
- **PWA/mobile polish** — Tier 4

---

## Phase 1: Mount ParticleContainer (COMPLETED)

### Overview

Single change to enable all existing particle effects.

### Changes Required

#### 1. App.tsx — Add ParticleContainer

**File**: `src/App.tsx`

Add import near other UI component imports:
```typescript
import { ParticleContainer } from './components/ui/ParticleContainer';
```

Add component before toast containers (around line 805):
```tsx
{/* Particle Container for visual effects */}
<ParticleContainer />

{/* Toast Containers */}
<AchievementToastContainer />
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Wait for golden cheese → click it → confetti burst appears
- [ ] Golden cheese visible → ambient sparkles animate around it
- [ ] Purchase a synergy upgrade → sparkle burst at button location

---

## Phase 2: Fix tickCombat ATB Bug (COMPLETED)

### Overview

Remove the conditional commit that discards ATB progress on log-free frames. This is a prerequisite for combat polish — without it, ATB bars stall.

### Changes Required

#### 1. combatSlice.ts — Unconditional State Commit

**File**: `src/stores/slices/combat/combatSlice.ts`

Replace the conditional commit (lines 72-79):

**Before:**
```typescript
if (logs.length > 0 || updated.result !== state.combat.battleResult) {
  set({
    combat: {
      ...updated.toState(),
      combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
    },
  });
}
```

**After:**
```typescript
set({
  combat: {
    ...updated.toState(),
    combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
  },
});
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm run test`

#### Manual Verification:
- [ ] Enter combat → ATB bars fill smoothly frame-by-frame (not jumping)
- [ ] Combat feels responsive, no freezing between attacks
- [ ] Victory/defeat still triggers correctly

---

## Phase 3: Wire Combat Audio Events (COMPLETED)

### Overview

Add an `audioEvents` return channel from `Battle.tick()` so `combatSlice` can trigger the 5 dead combat SFX without coupling audio to log parsing.

### Changes Required

#### 1. Define AudioEvent Type

**File**: `src/domain/aggregates/Battle.ts`

Add type definition near top of file:
```typescript
export type CombatAudioEvent = 
  | { type: 'attack'; variant: 'physical' | 'magic' | 'critical' }
  | { type: 'enemyDefeat' }
  | { type: 'heal' }
  | { type: 'buff' }
  | { type: 'debuff' };
```

#### 2. Update Battle.tick Return Type

**File**: `src/domain/aggregates/Battle.ts`

Change `tick()` return type and implementation:

**Current signature (approx line 145):**
```typescript
tick(deltaMs: number, ...): { battle: Battle; logs: CombatLogEntry[] }
```

**New signature:**
```typescript
tick(deltaMs: number, ...): { battle: Battle; logs: CombatLogEntry[]; audioEvents: CombatAudioEvent[] }
```

Initialize `audioEvents: CombatAudioEvent[] = []` at start of `tick()`.

Add audio events at these points:
- After hero attack damage applied → `audioEvents.push({ type: 'attack', variant: 'physical' })`
- After enemy defeated → `audioEvents.push({ type: 'enemyDefeat' })`
- After heal effect applied → `audioEvents.push({ type: 'heal' })`
- After buff applied → `audioEvents.push({ type: 'buff' })`
- After debuff applied → `audioEvents.push({ type: 'debuff' })`

Return `{ battle: updated, logs, audioEvents }`.

#### 3. Update combatSlice to Play Audio

**File**: `src/stores/slices/combat/combatSlice.ts`

Import audio functions:
```typescript
import { 
  playAttackSound, 
  playEnemyDefeatSound, 
  playHealSound, 
  playBuffSound, 
  playDebuffSound 
} from '../../../systems/audioSystem';
```

In `tickCombat`, after receiving `{ battle, logs, audioEvents }`:
```typescript
// Play combat audio events
for (const event of audioEvents) {
  switch (event.type) {
    case 'attack':
      playAttackSound(event.variant);
      break;
    case 'enemyDefeat':
      playEnemyDefeatSound();
      break;
    case 'heal':
      playHealSound();
      break;
    case 'buff':
      playBuffSound();
      break;
    case 'debuff':
      playDebuffSound();
      break;
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm run test`

#### Manual Verification:
- [ ] Enter combat → hear hit sounds on attacks
- [ ] Defeat an enemy → hear defeat sound
- [ ] Use healing ability → hear heal chime
- [ ] Apply buff → hear rising tone
- [ ] Enemy applies debuff → hear descending tone

---

## Phase 4: Wire CombatFeedback Components (DEFERRED)

### Overview

Integrate the existing `CombatFeedback.tsx` components and `useCombatFeedback.ts` hooks into `CombatPanel.tsx`.

### Changes Required

#### 1. Add Combat Feedback State to combatSlice

**File**: `src/stores/slices/combat/combatSlice.ts`

Add to CombatState type:
```typescript
damageNumbers: DamageNumber[];
comboCount: number;
flashColor: 'red' | 'gold' | 'white' | 'green' | null;
shakeIntensity: 'light' | 'medium' | 'heavy' | null;
```

Initialize in default state:
```typescript
damageNumbers: [],
comboCount: 0,
flashColor: null,
shakeIntensity: null,
```

Add actions:
```typescript
addDamageNumber: (number: DamageNumber) => void;
clearDamageNumber: (id: string) => void;
incrementCombo: () => void;
resetCombo: () => void;
triggerFlash: (color: 'red' | 'gold' | 'white' | 'green') => void;
clearFlash: () => void;
triggerShake: (intensity: 'light' | 'medium' | 'heavy') => void;
clearShake: () => void;
```

#### 2. Emit Feedback Events from Battle

Extend `CombatAudioEvent` to include visual feedback, or add a parallel `CombatFeedbackEvent` type:

```typescript
export type CombatFeedbackEvent =
  | { type: 'damage'; target: 'hero' | 'enemy'; targetId: string; value: number; isCrit: boolean; isMiss: boolean }
  | { type: 'heal'; targetId: string; value: number }
  | { type: 'comboHit' }
  | { type: 'comboBreak' }
  | { type: 'flash'; color: 'red' | 'gold' | 'white' | 'green' }
  | { type: 'shake'; intensity: 'light' | 'medium' | 'heavy' };
```

Return alongside `audioEvents` from `Battle.tick()`.

#### 3. Process Feedback Events in combatSlice

In `tickCombat`, process feedback events to spawn damage numbers, update combo, trigger flashes/shakes.

#### 4. Integrate Components in CombatPanel

**File**: `src/components/ui/CombatPanel.tsx`

Import components:
```typescript
import { 
  DamageNumberContainer, 
  FlashOverlay, 
  ComboCounter,
  CombatResultBanner 
} from './CombatFeedback';
import { useScreenShake } from '../../hooks/useCombatFeedback';
```

Add screen shake to main container:
```tsx
const { shakeClass } = useScreenShake();

<section className={`... ${shakeClass}`}>
```

Add components inside the combat area:
```tsx
<FlashOverlay isFlashing={flashColor !== null} color={flashColor || 'red'} />
<DamageNumberContainer numbers={damageNumbers} onRemove={clearDamageNumber} />
<ComboCounter count={comboCount} maxCombo={maxCombo} />
{battleResult !== 'ongoing' && (
  <CombatResultBanner result={battleResult} onAnimationComplete={handleResultComplete} />
)}
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Enter combat → damage numbers float up from targets
- [ ] Take big hit → screen shakes, red flash
- [ ] Use limit break → gold flash
- [ ] Consecutive hits → combo counter appears and grows
- [ ] Get hit → combo resets
- [ ] Victory → banner slides in with "Beauty, eh!"

---

## Phase 5: Enhance ModalOverlay and Migrate Modals

### Overview

Upgrade `ModalOverlay` to be the canonical modal base with focus trap, Escape handling, `role="dialog"`, `aria-modal`, and consistent animation. Then migrate all 10 modals.

### Changes Required

#### 1. Enhance ModalOverlay

**File**: `src/components/ui/shared/ModalOverlay.tsx`

```tsx
import { useRef, useEffect, useCallback } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export function ModalOverlay({
  isOpen,
  onClose,
  children,
  className = '',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalOverlayProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useFocusTrap(modalRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-modal-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={`relative ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
```

#### 2. Migrate All 10 Modals

Each modal needs:
1. Import `ModalOverlay`
2. Wrap content in `ModalOverlay` with `isOpen` and `onClose` props
3. Add `id` to title element, pass as `ariaLabelledBy`
4. Remove hand-rolled backdrop, focus trap, Escape handling

**Modals to migrate:**
1. `AgingConfirmModal.tsx`
2. `SettingsPanel.tsx` (when rendered as modal overlay)
3. `EquipmentModal.tsx`
4. `CombatResultsModal.tsx`
5. `OfflineProgressModal.tsx`
6. `BetaAgreement.tsx`
7. `ChangelogModal.tsx`
8. `PrivacyConsent.tsx`
9. `KeyboardHelpModal.tsx`
10. `ChallengeIndicator.tsx` (inline modal portion)

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`

#### Manual Verification

3 modals migrated: AgingConfirmModal, OfflineProgressModal, EquipmentModal

- [ ] Open any modal → focus trapped inside
- [ ] Press Escape → modal closes
- [ ] Click backdrop → modal closes
- [ ] Tab through modal → cycles, doesn't escape
- [ ] Close modal → focus returns to trigger element
- [ ] Screen reader announces modal as dialog

---

## Phase 6: Honor Offline Progress Cap Setting (COMPLETED)

### Overview

Make the offline progress cap setting actually limit offline gains.

### Changes Required

#### 1. Update calculateOfflineProgress

**File**: `src/systems/saveSystem.ts`

Modify `calculateOfflineProgress` to accept and use the setting:

```typescript
export function calculateOfflineProgress(
  lastSaveTime: number,
  cps: number,
  offlineProgressCapHours: number = 8
): { curds: Decimal; elapsedSeconds: number } {
  const now = Date.now();
  const elapsedMs = now - lastSaveTime;
  const capSeconds = offlineProgressCapHours * 60 * 60;
  const elapsedSeconds = Math.min(elapsedMs / 1000, capSeconds);
  // ... rest of calculation
}
```

#### 2. Pass Setting When Calling

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

When calling `calculateOfflineProgress`, pass the setting:

```typescript
import { useSettingsStore } from '../../settingsStore';

// In the load function:
const offlineProgressCapHours = useSettingsStore.getState().game.offlineProgressCap;
const { curds, elapsedSeconds } = calculateOfflineProgress(
  savedState.lastSaveTime,
  cps,
  offlineProgressCapHours
);
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm run test`

#### Manual Verification:
- [ ] Set offline cap to 1 hour in Settings
- [ ] Note current curds, close browser
- [ ] Wait 2+ hours (or mock time)
- [ ] Return → gains capped at 1 hour worth

---

## Phase 7: Fix animate-bounce-in (COMPLETED)

### Overview

Add the missing CSS keyframe for the golden cheese notification entrance animation.

### Changes Required

#### 1. Add Keyframe and Animation Variable

**File**: `src/index.css`

Add inside `@theme` block (near other animation variables):
```css
--animate-bounce-in: bounce-in 0.5s var(--ease-bounce-in) forwards;
```

Add keyframes after `@theme` block:
```css
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [ ] No CSS errors in browser console

#### Manual Verification:
- [ ] Wait for golden cheese notification → banner bounces in smoothly
- [ ] With reduced motion enabled → no bounce animation

---

## Testing Strategy

### Unit Tests
- Battle.tick returns audioEvents array
- calculateOfflineProgress respects cap parameter
- ModalOverlay renders with correct ARIA attributes

### Integration Tests
- Combat slice processes audio events
- Combat slice processes feedback events
- Particle container receives emit calls

### Manual Testing Steps
1. **Particles**: Click golden cheese, buy synergy, observe confetti/sparkles
2. **Combat audio**: Full combat from start to victory, verify all 5 SFX play appropriately
3. **Combat feedback**: Watch for damage numbers, combo counter, screen shake, flashes
4. **ATB smoothness**: Observe ATB bars filling continuously, not jumping
5. **Modals**: Open each modal, test Tab cycling, Escape close, backdrop click
6. **Offline cap**: Set to 1hr, close/reopen after time, verify cap honored
7. **Bounce-in**: Trigger golden cheese notification, observe entrance animation

## Performance Considerations

- **Combat feedback state**: Keep damage number array capped (auto-remove after 1s)
- **Audio cooldowns**: May need per-sound cooldowns if combat is too noisy (Tier 2 SFX bus work)
- **Modal animations**: Exit animations not included in this tier (would require animation-before-unmount pattern)

## Migration Notes

- Phase 2 (ATB fix) must complete before Phase 4 (combat feedback) for proper testing
- Phase 3 (audio events) and Phase 4 (feedback events) can be combined if preferred
- Modal migration (Phase 5) can be done incrementally per-modal

## References

- Research: `thoughts/shared/research/2026-06-12_14-19-23_world-class-polish-roadmap.md`
- Prior combat audio: `thoughts/shared/plans/implemented/combat-audio-integration-phase1.md`
- Prior combat UX: `thoughts/shared/research/implemented/2026-02-02_combat-ux-analysis-multi-phase.md`
- Particle system: `src/systems/particleSystem.ts`
- Combat feedback: `src/components/ui/CombatFeedback.tsx`, `src/hooks/useCombatFeedback.ts`
- Audio system: `src/systems/audioSystem.ts:1168-1592` (dead SFX)
- Modal overlay: `src/components/ui/shared/ModalOverlay.tsx`
- Focus trap: `src/hooks/useFocusTrap.ts`
