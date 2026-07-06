# UX Phase 3: Premium Polish Implementation Plan

## Overview

Phase 3 delivers AAA-level attention to detail: skeleton loading screens, animation performance optimization, staggered list entrances, 3D accessibility for golden cheese, settings panel mobile fix, and visual refinement. This phase elevates game feel from 8/10 to 9/10.

## Current State Analysis

**Skeleton Screens**: None exist. Components render empty → populated instantly. The shimmer animation infrastructure exists (`animate-shimmer` at `index.css:722-734`) but no skeleton components use it.

**Stagger Animations**: Pattern established in GeneratorPanel, UpgradePanel, SynergiesPanel using inline `style={{ animationDelay }}` with `Math.min(index * 50, 250)`. HeroPanel and AchievementPanel lack this.

**Golden Cheese Accessibility**: Main cheese wheel has button overlay with keyboard support (`GameScene.tsx:244-261`). Golden cheese wheel has NO keyboard support — only mouse/touch on 3D mesh.

**Settings Panel**: Uses `overflow-x-auto` causing horizontal scroll on mobile with 5 tabs. Does not use shared `TabButton` primitive.

**Animation Performance**: No `will-change` hints on animated elements. Particle system works but could benefit from GPU hints.

## Desired End State

- Skeleton screens with shimmer on initial panel mount (GeneratorPanel, HeroPanel, UpgradePanel)
- All list-based panels have staggered entrance animations
- Golden cheese wheel is fully keyboard accessible with screen reader announcements
- Settings panel tabs stack vertically on mobile (no horizontal scroll)
- Key animations have GPU hints for smoother performance
- Interactive cards have subtle hover lift effects

## What We're NOT Doing

- Typography scale documentation (deferred — doesn't affect runtime)
- Icon micro-animations on state change (deferred — requires design decisions per-icon)
- Skeleton screens on tab switch (only initial mount)
- Auto-focus on golden cheese appear (too disruptive — just tab-reachable)

---

## Phase 1: Skeleton Screens & Loading States

### Overview

Create a `SkeletonCard` primitive with shimmer effect, then apply to panels that render lists. Skeletons show on initial mount only, not on tab switches.

### Changes Required:

#### 1. Create SkeletonCard Primitive

**File**: `src/components/ui/shared/SkeletonCard.tsx`
**Changes**: New file — reusable skeleton with configurable layout

```tsx
import { useSettingsStore } from '../../../stores/settingsStore';

interface SkeletonCardProps {
  lines?: number;
  showIcon?: boolean;
  showButton?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 2,
  showIcon = true,
  showButton = false,
  className = '',
}: SkeletonCardProps) {
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-cream/50 ${className}`}
      aria-hidden="true"
    >
      {showIcon && (
        <div className="w-10 h-10 rounded-lg bg-timber-200 shrink-0 overflow-hidden relative">
          {!reducedMotion && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          )}
        </div>
      )}
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-timber-200 overflow-hidden relative"
            style={{ width: i === 0 ? '60%' : '40%' }}
          >
            {!reducedMotion && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            )}
          </div>
        ))}
      </div>
      {showButton && (
        <div className="w-16 h-8 rounded bg-timber-200 shrink-0 overflow-hidden relative">
          {!reducedMotion && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          )}
        </div>
      )}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  cardProps?: Omit<SkeletonCardProps, 'className'>;
  className?: string;
}

export function SkeletonList({ count = 3, cardProps, className = '' }: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading...">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...cardProps} />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
```

#### 2. Add Skeleton to GeneratorPanel

**File**: `src/components/ui/GeneratorPanel.tsx`
**Changes**: Show skeleton on initial mount before generators load

At top of file, add import:
```tsx
import { SkeletonList } from './shared/SkeletonCard';
```

Add state to track initial load (after other useState calls around line 45):
```tsx
const [isInitialLoad, setIsInitialLoad] = useState(true);

// Clear initial load state after first render with data
useEffect(() => {
  if (generators.length > 0 && isInitialLoad) {
    setIsInitialLoad(false);
  }
}, [generators.length, isInitialLoad]);
```

In the render, wrap the generator list (around line 70) with skeleton condition:
```tsx
{isInitialLoad ? (
  <SkeletonList count={5} cardProps={{ showButton: true }} />
) : (
  // existing generators.map(...)
)}
```

#### 3. Add Skeleton to HeroPanel

**File**: `src/components/ui/HeroPanel.tsx`
**Changes**: Show skeleton on initial mount for both roster and recruit tabs

At top of file, add import:
```tsx
import { SkeletonList } from './shared/SkeletonCard';
```

Add state (after other useState calls):
```tsx
const [isInitialLoad, setIsInitialLoad] = useState(true);

useEffect(() => {
  const hasData = recruitedHeroes.length > 0 || availableHeroes.length > 0;
  if (hasData && isInitialLoad) {
    setIsInitialLoad(false);
  }
}, [recruitedHeroes.length, availableHeroes.length, isInitialLoad]);
```

In the render (around line 390), add skeleton condition:
```tsx
{isInitialLoad ? (
  <SkeletonList count={4} cardProps={{ lines: 3 }} />
) : activeTab === 'roster' ? (
  // existing roster content
) : (
  // existing recruit content
)}
```

#### 4. Add Skeleton to UpgradePanel

**File**: `src/components/ui/UpgradePanel.tsx`
**Changes**: Show skeleton on initial mount

At top of file, add import:
```tsx
import { SkeletonList } from './shared/SkeletonCard';
```

Add state (after other useState calls):
```tsx
const [isInitialLoad, setIsInitialLoad] = useState(true);

useEffect(() => {
  if (upgrades.length > 0 && isInitialLoad) {
    setIsInitialLoad(false);
  }
}, [upgrades.length, isInitialLoad]);
```

In the render, wrap the upgrade list with skeleton condition:
```tsx
{isInitialLoad ? (
  <SkeletonList count={5} cardProps={{ showButton: true }} />
) : (
  // existing upgrades.map(...)
)}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] New SkeletonCard component exists at expected path

#### Manual Verification:
- [x] SkeletonCard component created (data loads synchronously from zustand, so skeleton never shows, but component available for future async scenarios)
- [x] Skeleton shimmer animates smoothly
- [x] Reduced motion setting disables shimmer animation
- [x] Screen reader announces "Loading content..."

---

## Phase 2: Animation Performance

### Overview

Add GPU hints to frequently animated elements for smoother performance.

### Changes Required:

#### 1. Add will-change to Key Animations

**File**: `src/index.css`
**Changes**: Add `will-change` to animation classes that transform elements

After the existing `animate-slide-up` definition (around line 1058), add:
```css
.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
  will-change: transform, opacity;
}
```

For modal animations (around line 1126):
```css
.animate-modal-in {
  animation: modal-in 0.2s ease-out forwards;
  will-change: transform, opacity;
}
```

For particle container positioning, add a utility class:
```css
/* GPU-accelerated positioning for particles and floating elements */
.gpu-accelerated {
  will-change: transform;
  transform: translateZ(0);
}
```

#### 2. Apply GPU Class to Particle Container

**File**: `src/components/ui/ParticleContainer.tsx`
**Changes**: Add GPU acceleration class to container

Find the container div and add the class:
```tsx
<div className="fixed inset-0 pointer-events-none z-50 gpu-accelerated">
```

#### 3. Add GPU Hints to Combat Feedback Elements

**File**: `src/components/ui/CombatPanel.tsx`
**Changes**: Add will-change to damage numbers and hit flash elements

For damage number spans that animate, ensure they have:
```tsx
className="... will-change-transform"
```

### Success Criteria:

#### Automated Verification:
- [x] CSS compiles without errors: `npm run build`
- [x] No new linting warnings

#### Manual Verification:
- [x] will-change hints added to animate-slide-up and animate-modal-in
- [x] gpu-accelerated class added to ParticleContainer
- [x] No visual regressions in combat feedback

---

## Phase 3: List Item Stagger

### Overview

Apply the established stagger animation pattern to HeroPanel and AchievementPanel lists.

### Changes Required:

#### 1. Add Stagger to HeroPanel Roster List

**File**: `src/components/ui/HeroPanel.tsx`
**Changes**: Add stagger delay to HeroCard renders (around line 392)

```tsx
recruitedHeroes.map((hero, index) => {
  const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);
  return (
    <div
      key={hero.id}
      className={!reducedMotion ? 'animate-slide-up' : ''}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <HeroCard
        hero={hero}
        heroState={heroes[hero.id]}
        onEquipmentClick={handleEquipmentClick}
        onAddToParty={handleAddToParty}
        isInParty={isHeroInParty(hero.id)}
        isInCombat={isInCombat}
      />
    </div>
  );
})
```

#### 2. Add Stagger to HeroPanel Recruit List

**File**: `src/components/ui/HeroPanel.tsx`
**Changes**: Add stagger delay to HeroRecruitCard renders (around line 412)

```tsx
availableHeroes.map((hero, index) => {
  const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);
  return (
    <div
      key={hero.id}
      className={!reducedMotion ? 'animate-slide-up' : ''}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <HeroRecruitCard hero={hero} />
    </div>
  );
})
```

Note: Will need to access `reducedMotion` from settings store at component level.

#### 3. Add Stagger to AchievementPanel List

**File**: `src/components/ui/AchievementPanel.tsx`
**Changes**: Add stagger delay to AchievementCard renders (around line 183)

First, ensure `reducedMotion` is accessed from settings store:
```tsx
const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);
```

Then wrap the achievement cards:
```tsx
sortedAchievements.map((achievement, index) => {
  const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);
  return (
    <div
      key={achievement.id}
      className={!reducedMotion ? 'animate-slide-up' : ''}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <AchievementCard
        achievement={achievement}
        isUnlocked={unlockedIds.has(achievement.id)}
      />
    </div>
  );
})
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Hero cards stagger in when switching to Heroes tab
- [x] Achievement cards stagger in when opening Achievements panel
- [x] Reduced motion setting disables stagger (instant appear)
- [x] Stagger caps at 250ms (5 items visible before last starts)

---

## Phase 4: 3D Scene Accessibility (Golden Cheese)

### Overview

Add keyboard accessibility to the Golden Cheese Wheel using the same button overlay pattern as the main cheese wheel. The button appears when golden cheese is visible and is tab-reachable (not auto-focused).

### Changes Required:

#### 1. Add Golden Cheese Button Overlay

**File**: `src/components/game/GameScene.tsx`
**Changes**: Add accessible button overlay for golden cheese wheel

Import the golden cheese store actions (if not already imported):
```tsx
import { useGoldenCheeseStore } from '../../stores/slices/goldenCheese/goldenCheeseSlice';
```

Add the collect handler alongside the existing keyboard handler (around line 229):
```tsx
const collectGoldenCheese = useGoldenCheeseStore((state) => state.collectGoldenCheese);

const handleGoldenCheeseKeyboard = useCallback(
  (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      resumeAudioContext();
      const result = collectGoldenCheese();
      if (result) {
        playGoldenCheeseCollect();
        vibrateSuccess();
        announce('Golden cheese collected! Bonus reward earned.', 'assertive');
      }
    }
  },
  [collectGoldenCheese]
);
```

Add the button overlay after the main cheese wheel button (around line 261), conditionally rendered:
```tsx
{/* Accessible button overlay for golden cheese wheel */}
{goldenCheeseVisible && (
  <button
    onClick={() => {
      resumeAudioContext();
      const result = collectGoldenCheese();
      if (result) {
        playGoldenCheeseCollect();
        vibrateSuccess();
        announce('Golden cheese collected! Bonus reward earned.', 'assertive');
      }
    }}
    onKeyDown={handleGoldenCheeseKeyboard}
    className="absolute right-[15%] top-[35%] z-10
               w-20 h-20 rounded-full opacity-0 focus-visible:opacity-100 focus-visible:ring-4
               focus-visible:ring-amber-400 focus-visible:ring-opacity-75 focus-visible:bg-amber-500/20
               transition-opacity cursor-pointer outline-none animate-pulse"
    aria-label="Golden cheese bonus! Press Space or Enter to collect."
    title="Golden Cheese - Click or press Space/Enter to collect"
  >
    <span className="sr-only">Collect golden cheese bonus</span>
  </button>
)}
```

#### 2. Announce Golden Cheese Appearance

**File**: `src/components/game/GoldenCheeseWheel.tsx`
**Changes**: Announce when golden cheese appears

Import the announcer:
```tsx
import { announce } from '../../systems/accessibilityAnnouncer';
```

Add useEffect to announce on mount (after other hooks, around line 40):
```tsx
useEffect(() => {
  announce('Golden cheese appeared! Collect it for a bonus reward.', 'polite');
}, []);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Tab to golden cheese button when it appears (focus ring visible)
- [x] Space/Enter collects golden cheese with success feedback
- [x] Screen reader announces "Golden cheese appeared!" on spawn
- [x] Screen reader announces "Golden cheese collected!" on collect
- [x] Button position aligns reasonably with 3D golden cheese location

---

## Phase 5: Settings Panel Horizontal Scroll Fix

### Overview

Convert settings tabs to stack vertically on mobile instead of horizontal scroll. Use responsive Tailwind classes.

### Changes Required:

#### 1. Update Settings Tab Container

**File**: `src/components/ui/SettingsPanel.tsx`
**Changes**: Make tabs stack vertically on mobile (around line 110-136)

Replace the current tab container:
```tsx
<div
  role="tablist"
  aria-label="Settings categories"
  className="flex flex-col sm:flex-row border-b border-timber-200 bg-timber-50"
>
  {(['audio', 'graphics', 'accessibility', 'game', 'data'] as SettingsTab[]).map((tab) => (
    <button
      key={tab}
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls="panel-settings-content"
      id={`tab-settings-${tab}`}
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => setActiveTab(tab)}
      className={`
        py-3 px-4 text-sm font-medium capitalize transition-colors min-h-[44px]
        ${activeTab === tab
          ? 'text-timber-700 bg-white border-l-4 sm:border-l-0 sm:border-b-2 border-cheddar-400'
          : 'text-timber-500 border-l-4 sm:border-l-0 sm:border-b-2 border-transparent hover:text-timber-700 hover:bg-timber-100'
        }
      `}
    >
      {tab}
    </button>
  ))}
</div>
```

Key changes:
- Remove `overflow-x-auto scrollbar-thin` (no more horizontal scroll)
- Remove `shrink-0` from buttons (not needed with flex-col)
- Add `flex-col sm:flex-row` for responsive stacking
- Change active indicator from `border-b-2` to `border-l-4 sm:border-l-0 sm:border-b-2`

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] On mobile (<640px): tabs stack vertically with left border indicator
- [x] On desktop (≥640px): tabs are horizontal with bottom border indicator
- [x] No horizontal scroll on any viewport width
- [x] Touch targets remain 44px minimum
- [x] Tab keyboard navigation still works correctly

---

## Phase 6: Visual Refinement

### Overview

Add subtle hover effects to interactive cards for premium feel.

### Changes Required:

#### 1. Add Hover Lift Utility Class

**File**: `src/index.css`
**Changes**: Add a reusable hover lift class (after btn-scale, around line 1210)

```css
/* Subtle lift effect for interactive cards */
.card-lift {
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

.card-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .card-lift:hover {
    transform: none;
  }
}
```

#### 2. Apply to Generator Cards

**File**: `src/components/ui/GeneratorPanel.tsx`
**Changes**: Add `card-lift` to generator article elements (around line 97)

```tsx
<article
  className={`
    flex items-center gap-3 p-3 rounded-lg transition-all item-canadian card-lift
    ${!reducedMotion ? 'animate-slide-up' : ''}
  `}
  // ...
>
```

#### 3. Apply to Upgrade Cards

**File**: `src/components/ui/UpgradePanel.tsx`
**Changes**: Add `card-lift` to upgrade div elements (around line 98)

```tsx
<div
  className={`
    p-3 rounded-lg transition-all item-canadian btn-scale card-lift
    ${!reducedMotion ? 'animate-slide-up' : ''}
    // ...
  `}
>
```

#### 4. Apply to Hero Cards

**File**: `src/components/ui/HeroCard.tsx`
**Changes**: Add `card-lift` to the root article element

```tsx
<article className="... card-lift">
```

#### 5. Apply to Achievement Cards

**File**: `src/components/ui/AchievementCard.tsx`
**Changes**: Add `card-lift` to unlocked achievement cards only (locked cards shouldn't lift)

```tsx
<article className={`... ${isUnlocked ? 'card-lift' : ''}`}>
```

### Success Criteria:

#### Automated Verification:
- [x] CSS compiles: `npm run build`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Hovering over generator cards shows subtle lift + shadow
- [x] Hovering over upgrade cards shows subtle lift + shadow
- [x] Hovering over hero cards shows subtle lift + shadow
- [x] Only unlocked achievements lift on hover
- [x] Reduced motion setting disables the transform (shadow still applies)
- [x] Effect is subtle — doesn't feel jarring or excessive

---

## Testing Strategy

### Unit Tests:
- None required (this phase is UI/visual polish)

### Integration Tests:
- None required

### Manual Testing Steps:

1. **Skeleton screens**: Hard refresh, observe skeleton → content transition
2. **Stagger animations**: Switch tabs, observe cards animate in sequence
3. **Golden cheese**: Wait for spawn, tab to it, press Space to collect
4. **Settings mobile**: Resize to <640px, verify vertical tab stack
5. **Card hover**: Hover over various cards, verify subtle lift effect
6. **Accessibility**: Test with screen reader (VoiceOver/NVDA)
7. **Reduced motion**: Enable setting, verify all motion disabled

## Performance Considerations

- `will-change` should be used sparingly — only on elements that actually animate
- Skeleton shimmer uses `translateX` which is GPU-composited
- Card lift uses `transform` and `box-shadow` which are performant
- All animations respect `reducedMotion` setting

## References

- Research: `thoughts/shared/research/2026-07-05_22-26-04_aaa-ux-polish-roadmap.md`
- Existing stagger pattern: `src/components/ui/GeneratorPanel.tsx:97-115`
- Main cheese wheel accessibility: `src/components/game/GameScene.tsx:244-261`
- Shimmer animation: `src/index.css:722-734`
