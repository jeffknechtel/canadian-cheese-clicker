# Phase 4: Delight Enhancements

## Overview

Add polish and engagement through micro-interactions, value change animations, progress bar enhancements, and consistent audio/particle feedback. This phase leverages the existing animation system (`index.css:900-1090`), particle presets (`particleSystem.ts:43-183`), and audio effects (`audioSystem.ts:928-1812`) that are defined but underutilized.

## Current State Analysis

**Animation infrastructure is robust but underused:**
- `btn-ripple` and `btn-scale` classes exist but are only on 3 buttons
- `animate-number-pop` exists but only used in modals, not live currency displays
- `animate-value-highlight` defined but never used
- `animate-golden-shimmer` defined but not on RennetDisplay
- `animate-shimmer` defined but not on crafting progress bars

**Key Discoveries:**
- `src/components/ui/shared/TabButton.tsx:37` uses only `transition-colors`, no scale feedback
- `src/components/ui/shared/ProgressBar.tsx:19` has no shimmer overlay or near-completion glow
- `src/components/ui/crafting/CaveCard.tsx:144-151` has inline progress bar without shimmer
- `src/components/ui/CurrencyDisplay.tsx:34-42` has no animation on value changes
- `src/components/ui/RennetDisplay.tsx:21-28` has no golden shimmer on rennet count
- `animate-pulse` is used in several places without `reducedMotion` checks

**Established patterns to follow:**
- `src/components/ui/GeneratorPanel.tsx:50-70` — success/failure animation pattern with timeout cleanup
- `src/components/ui/OfflineProgressModal.tsx:48` — `animate-number-pop` with reducedMotion check and stagger
- `src/systems/audioSystem.ts` — direct function calls (`playPurchaseSound()`, etc.)
- `src/systems/particleSystem.ts` — `emitParticles(x, y, preset)` for global particles

## Desired End State

- All interactive buttons have consistent hover/active feedback (`btn-scale`, optionally `btn-ripple`)
- Value changes (curds, CPS with buffs) animate to draw attention
- Progress bars have shimmer overlay and glow when near completion
- Tooltips fade in smoothly
- All `animate-pulse` usages respect `reducedMotion`
- Tab content transitions use crossfade
- Key interactions have optional audio feedback (togglable)

## What We're NOT Doing

- Phase 1-3 fixes (already completed or in progress)
- Adding new particle presets (using existing 10 presets)
- Adding new sound effects (using existing synthesized sounds)
- Major component restructuring
- CheeseWheel idle animations (3D canvas, different system)
- Complex tooltip library integration (using native title + CSS fade)

---

## Phase 4.1: Universalize Button Micro-Interactions

### Overview

Apply `btn-scale` consistently to all interactive buttons. `btn-ripple` is optional and heavier — use on primary action buttons only.

### Changes Required:

#### 1. TabButton — Add Scale Feedback

**File**: `src/components/ui/shared/TabButton.tsx`

**Line 37** — Current code:
```tsx
className={`
  flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border
  ${active ? styles.active : styles.inactive}
  ${className}
`}
```

**After**:
```tsx
className={`
  flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border btn-scale
  ${active ? styles.active : styles.inactive}
  ${className}
`}
```

#### 2. CaveCard Turn/Collect Buttons — Add Scale Feedback

**File**: `src/components/ui/crafting/CaveCard.tsx`

**Lines 166-172** — Turn button:
```tsx
<button
  onClick={handleTurn}
  className="px-2 py-1 text-xs bg-timber-100 hover:bg-timber-200 text-timber-700 rounded transition-colors"
  title="Turn cheese (+1% quality)"
>
```

**After**:
```tsx
<button
  onClick={handleTurn}
  className="px-2 py-1 text-xs bg-timber-100 hover:bg-timber-200 text-timber-700 rounded transition-colors btn-scale"
  title="Turn cheese (+1% quality)"
>
```

**Lines 175-179** — Collect button:
```tsx
<button
  onClick={handleCollect}
  className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors"
>
```

**After**:
```tsx
<button
  onClick={handleCollect}
  className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors btn-scale btn-ripple"
>
```

#### 3. HeroAbilityButton — Use Consistent Class

**File**: `src/components/ui/HeroAbilityButton.tsx`

**Lines 44-53** — Currently uses inline `hover:scale-[1.02] active:scale-[0.98]`:
```tsx
className={`
  rounded font-medium transition-all duration-200 w-full
  ${abilityIsReady && !isDisabled
    ? '... hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
    : ...
  }
`}
```

**After** — Replace inline scale with `btn-scale`:
```tsx
className={`
  rounded font-medium transition-all duration-200 w-full btn-scale
  ${abilityIsReady && !isDisabled
    ? '... hover:shadow-lg'
    : ...
  }
`}
```

#### 4. Audit Other Buttons

Scan for other buttons missing `btn-scale`:
- `src/components/ui/HeroPanel.tsx` — recruit, equipment buttons
- `src/components/ui/CombatPanel.tsx` — speed control buttons
- `src/components/ui/ZoneSelectPanel.tsx` — zone/stage selection buttons

Add `btn-scale` to all interactive buttons that don't already have scale transforms.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] All tab buttons scale on hover/press
- [x] Crafting collect button has ripple effect
- [x] Hero ability buttons have consistent scale behavior
- [x] No double-scaling from conflicting classes

---

## Phase 4.2: Number/Value Change Animations

**STATUS: SKIPPED** - The ESLint `react-hooks/refs` and `react-hooks/set-state-in-effect` rules make this pattern difficult to implement correctly. The animation infrastructure exists (`animate-number-pop`, `animate-value-highlight` CSS classes) and can be wired up in the future with a different approach (e.g., CSS-only animations triggered by class toggling via data attributes).

### Overview

Add `animate-number-pop` to currency displays when values change significantly. Use `usePrevious` hook pattern to detect changes.

### Changes Required:

#### 1. Add usePrevious Hook

**File**: `src/hooks/usePrevious.ts` (new file)

```tsx
import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
```

#### 2. CurrencyDisplay — Animate Curd Changes

**File**: `src/components/ui/CurrencyDisplay.tsx`

Add import and state for animation:
```tsx
import { useState, useEffect } from 'react';
import { usePrevious } from '../../hooks/usePrevious';
import { useGameStore } from '../../stores';

// Inside component:
const { reducedMotion } = useGameStore((s) => s.settings);
const prevCurds = usePrevious(curds.toString());
const [animateCurds, setAnimateCurds] = useState(false);

useEffect(() => {
  if (prevCurds !== undefined && prevCurds !== curds.toString()) {
    if (!reducedMotion) {
      setAnimateCurds(true);
      const timeout = setTimeout(() => setAnimateCurds(false), 300);
      return () => clearTimeout(timeout);
    }
  }
}, [curds, prevCurds, reducedMotion]);
```

**Line 34-42** — Add animation class:
```tsx
className={`flex items-center gap-2 text-white font-bold text-2xl tabular-nums transition-transform duration-200 ${animateCurds ? 'animate-number-pop' : ''}`}
```

**Note**: Only animate on significant changes (not every 100ms tick). Consider debouncing or threshold (>1% change).

#### 3. CPS Display — Highlight on Buff

When CPS increases due to a buff (Eh multiplier, achievement boost), briefly highlight with `animate-value-highlight`.

**File**: `src/components/ui/CurrencyDisplay.tsx`

Similar pattern to curds, but for `curdPerSecond`:
```tsx
const prevCps = usePrevious(curdPerSecond.toString());
const [highlightCps, setHighlightCps] = useState(false);

useEffect(() => {
  if (prevCps !== undefined && prevCps !== curdPerSecond.toString()) {
    // Only highlight if CPS increased (buff, not tick fluctuation)
    const prev = new Decimal(prevCps);
    const curr = curdPerSecond;
    if (curr.gt(prev.mul(1.01)) && !reducedMotion) {
      setHighlightCps(true);
      const timeout = setTimeout(() => setHighlightCps(false), 500);
      return () => clearTimeout(timeout);
    }
  }
}, [curdPerSecond, prevCps, reducedMotion]);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck` — **SKIPPED** (see note above)
- [x] Linting passes: `npm run lint` — **SKIPPED** (see note above)
- [ ] Hook exports correctly: `usePrevious` importable — **SKIPPED**

#### Manual Verification:
- [ ] Curds counter pops when clicking cheese — **SKIPPED**
- [ ] CPS display highlights when buff activates — **SKIPPED**
- [ ] No animation spam during normal ticks — **SKIPPED**
- [ ] Animations disabled when reducedMotion is on — **SKIPPED**

---

## Phase 4.3: Progress Bar Enhancements

### Overview

Add shimmer overlay to progress bars and glow effect when near completion (>90%).

### Changes Required:

#### 1. ProgressBar — Add Shimmer and Near-Completion Glow

**File**: `src/components/ui/shared/ProgressBar.tsx`

**Current code (lines 9-24)**:
```tsx
export function ProgressBar({
  percent,
  height = 'h-2',
  bgColor = 'bg-gray-200',
  fillColor = 'bg-amber-500',
  className = '',
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

**After**:
```tsx
import { useGameStore } from '../../../stores';

interface ProgressBarProps {
  percent: number;
  height?: string;
  bgColor?: string;
  fillColor?: string;
  className?: string;
  showShimmer?: boolean;
  glowOnNearComplete?: boolean;
}

export function ProgressBar({
  percent,
  height = 'h-2',
  bgColor = 'bg-gray-200',
  fillColor = 'bg-amber-500',
  className = '',
  showShimmer = false,
  glowOnNearComplete = false,
}: ProgressBarProps) {
  const { reducedMotion } = useGameStore((s) => s.settings);
  const nearComplete = percent >= 90 && percent < 100;
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div 
      className={`${height} ${bgColor} rounded-full overflow-hidden relative ${className} ${
        glowOnNearComplete && nearComplete && !reducedMotion ? 'animate-pulse-glow' : ''
      }`}
    >
      <div
        className={`h-full ${fillColor} transition-all duration-300 relative`}
        style={{ width: `${clampedPercent}%` }}
      >
        {showShimmer && !reducedMotion && clampedPercent > 0 && clampedPercent < 100 && (
          <div className="absolute inset-0 animate-shimmer" />
        )}
      </div>
    </div>
  );
}
```

#### 2. CaveCard — Use Enhanced Progress Bar

**File**: `src/components/ui/crafting/CaveCard.tsx`

Replace inline progress bar with shared component:

**Lines 144-151** — Current inline progress bar:
```tsx
<div className="h-2 bg-timber-100 rounded-full overflow-hidden">
  <div
    className={`h-full transition-all duration-1000 ${
      isComplete ? 'bg-green-500' : 'bg-cheddar-400'
    }`}
    style={{ width: `${Math.min(100, progress)}%` }}
  />
</div>
```

**After** — Use ProgressBar component:
```tsx
import { ProgressBar } from '../shared/ProgressBar';

// In JSX:
<ProgressBar
  percent={progress}
  height="h-2"
  bgColor="bg-timber-100"
  fillColor={isComplete ? 'bg-green-500' : 'bg-cheddar-400'}
  showShimmer={!isComplete}
  glowOnNearComplete
/>
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:

- [x] Crafting progress bars have shimmer effect while aging
- [x] Progress bars glow when >90% complete
- [x] Shimmer disabled with reducedMotion setting
- [x] Shimmer stops when job completes

---

## Phase 4.4: Tooltip Entrance Animations

### Overview

Add smooth fade-in to tooltips via CSS. Native `title` attributes don't support animation, so this applies to custom tooltip components.

### Changes Required:

#### 1. Add Tooltip Animation Classes

**File**: `src/index.css`

Add after the existing `animate-fade-in` definition (~line 995):
```css
.tooltip-enter {
  animation: fade-in 0.15s ease-out forwards;
}

[data-tooltip]:hover::after {
  animation: fade-in 0.15s ease-out 0.1s forwards;
  animation-fill-mode: both;
}
```

#### 2. Update Custom Tooltip Components

If the codebase has custom tooltip components (check for `Tooltip.tsx` or tooltip patterns), add `animate-fade-in` class with a short delay.

**Note**: Many tooltips currently use native `title` attributes which cannot be animated. Converting to custom tooltips is out of scope — only enhance existing custom tooltip implementations.

### Success Criteria:

#### Automated Verification:

- [x] CSS compiles without errors
- [x] No duplicate animation definitions

#### Manual Verification:

- [x] Custom tooltips fade in smoothly
- [x] No jarring instant appearance

---

## Phase 4.5: Reduce Motion Compliance

### Overview

Audit all `animate-pulse` usages and wrap in `reducedMotion` checks.

### Changes Required:

#### 1. HeroPanel Fighting Badge

**File**: `src/components/ui/HeroPanel.tsx`

**Line 74** — Current:
```tsx
<span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 animate-pulse">
  Fighting
</span>
```

**After**:
```tsx
const { reducedMotion } = useGameStore((s) => s.settings);
// ...
<span className={`text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 ${!reducedMotion ? 'animate-pulse' : ''}`}>
  Fighting
</span>
```

#### 2. CombatATBBar READY! Indicator

**File**: `src/components/ui/CombatATBBar.tsx`

**Line 63** — Wrap in reducedMotion check.

#### 3. CombatPanel Ready Indicator

**File**: `src/components/ui/CombatPanel.tsx`

**Line 96** — Wrap in reducedMotion check.

#### 4. CombatLog New Entry Highlight

**File**: `src/components/ui/CombatLog.tsx`

**Line 49** — Wrap in reducedMotion check.

#### 5. App Notification Badges

**File**: `src/App.tsx`

**Lines 487, 524, 676, 731** — Wrap in reducedMotion check.

### Success Criteria:

#### Automated Verification:

- [x] `grep -r "animate-pulse" src/ | grep -v reducedMotion` returns empty (all checked)
- [x] TypeScript compiles

#### Manual Verification:

- [x] Pulsing animations stop when reducedMotion is enabled
- [x] Static indicators still visible without animation

---

## Phase 4.6: Tab Content Transitions

### Overview

Add crossfade animation when switching between tab content panels.

### Changes Required:

#### 1. Create AnimatedTabContent Wrapper

**File**: `src/components/ui/shared/AnimatedTabContent.tsx` (new file)

```tsx
import { ReactNode } from 'react';
import { useGameStore } from '../../../stores';

interface AnimatedTabContentProps {
  children: ReactNode;
  activeKey: string;
}

export function AnimatedTabContent({ children, activeKey }: AnimatedTabContentProps) {
  const { reducedMotion } = useGameStore((s) => s.settings);

  return (
    <div 
      key={activeKey}
      className={!reducedMotion ? 'animate-fade-in' : ''}
    >
      {children}
    </div>
  );
}
```

#### 2. Apply to Tab-Based Panels

**Files to update**:
- `src/components/ui/SettingsPanel.tsx` — 5 settings tabs
- `src/components/ui/AchievementPanel.tsx` — category filter tabs
- `src/components/ui/CraftingPanel.tsx` — recipe category tabs

Wrap tab content in `<AnimatedTabContent activeKey={currentTab}>`.

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles
- [x] New component exports correctly

#### Manual Verification:

- [x] Tab content fades in when switching tabs
- [x] No flash of previous content
- [x] Animation disabled with reducedMotion

---

## Phase 4.7: Audio Feedback Expansion (Optional)

### Overview

Add subtle audio feedback to additional interactions. All audio respects the existing `sfxEnabled` setting.

### Changes Required:

#### 1. Tab Switch Sound

**File**: `src/components/ui/shared/TabButton.tsx`

Add soft click on tab switch:
```tsx
import { playPurchaseSound } from '../../../systems/audioSystem';

// In onClick handler (lower volume variant needed):
// Note: May need to add playTabSwitchSound() to audioSystem.ts
```

**Decision needed**: The research doc notes this may be "too noisy". Consider adding a separate "UI sounds" toggle in settings, or skip this enhancement.

#### 2. Slider Change Sound

**File**: `src/components/ui/SettingsPanel.tsx`

Add tick sound on slider changes (volume, speed, etc.).

**Decision needed**: Same concern about noise level.

### Success Criteria:

**STATUS: SKIPPED** - Marked as optional in plan. Deferred pending user testing to validate sounds aren't annoying.

#### Automated Verification:

- [ ] TypeScript compiles — **SKIPPED**

#### Manual Verification:

- [ ] Audio plays on interaction (if implemented) — **SKIPPED**
- [ ] Audio respects sfxEnabled setting — **SKIPPED**
- [ ] User testing confirms sounds are not annoying — **SKIPPED**

---

## Testing Strategy

### Unit Tests:
- No new unit tests required — these are visual/audio polish changes

### Integration Tests:
- Existing tests should continue to pass

### Manual Testing Steps:

1. **Button Feedback Test**:
   - Hover over various buttons throughout the app
   - Verify scale effect on hover (1.02x)
   - Verify scale effect on press (0.98x)
   - Verify ripple on primary action buttons

2. **Value Animation Test**:
   - Click cheese wheel rapidly
   - Verify curd counter pops on significant increases
   - Activate a buff (achievement, Eh)
   - Verify CPS display highlights briefly

3. **Progress Bar Test**:
   - Start crafting a cheese
   - Verify shimmer effect on progress bar
   - Wait until >90% complete
   - Verify glow effect appears

4. **Reduced Motion Test**:
   - Enable "Reduce Motion" in accessibility settings
   - Verify all animations stop
   - Verify static indicators still visible

5. **Tab Transition Test**:
   - Switch between tabs in Settings, Achievements, Crafting
   - Verify smooth fade-in of content

## Performance Considerations

- `btn-scale` uses CSS transforms (GPU-accelerated, performant)
- `animate-number-pop` is 300ms duration, won't accumulate
- Shimmer uses CSS animation, not JS (performant)
- `usePrevious` hook is O(1) memory

## Migration Notes

None — no data migration required. These are purely visual/audio enhancements.

## References

- Original research: `thoughts/shared/research/2026-06-09_ux-display-contrast-hygiene-review.md`
- Phase 1 plan: `thoughts/shared/plans/ux-phase1-contrast-fixes.md` (complete)
- Phase 2 plan: `thoughts/shared/plans/ux-phase2-react-hygiene.md` (complete)
- Phase 3 plan: `thoughts/shared/plans/ux-phase3-layout-display-fixes.md` (complete)
- Animation CSS: `src/index.css:900-1090`
- Particle system: `src/systems/particleSystem.ts`
- Audio system: `src/systems/audioSystem.ts`

## Open Questions Resolved

1. **Reduced motion for "Fighting" badges**: Use static indicator without `animate-pulse` — the red background and "Fighting" text are sufficient without animation.

2. **Number animations on every tick vs significant changes**: Animate only on significant changes (>1% increase for curds, any increase for CPS after buff). Use threshold check in effect.

3. **Audio for tab switching**: Defer to Phase 4.7 as optional — requires user testing to validate. Start with visual enhancements only.

4. **Z-index CSS custom properties**: Out of scope for delight phase — belongs in infrastructure/DX improvements.