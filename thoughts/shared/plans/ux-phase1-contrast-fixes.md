# Phase 1: Critical Contrast Fixes (WCAG AA Compliance)

## Overview

Fix all text contrast failures to meet WCAG AA compliance (4.5:1 for normal text, 3:1 for large text). This phase addresses 12+ color combinations that fail accessibility requirements, including disabled buttons, gray text on light backgrounds, yellow/amber text, and hardcoded inline styles that bypass high-contrast mode.

## Current State Analysis

**Accessibility infrastructure exists** — the codebase has a mature high-contrast mode system (`src/index.css:680-747`) with CSS custom properties and `!important` overrides. However:

1. **Disabled button patterns are inconsistent** — 5 different patterns used across the codebase
2. **`text-gray-400` used liberally** — ~15+ locations where it fails on light backgrounds
3. **Inline styles bypass high-contrast mode** — `GeneratorPanel.tsx` uses `style={{}}` extensively
4. **Yellow/amber text on light backgrounds** — several locations with pale text

**Key Discoveries:**
- Good pattern: `bg-gray-200 text-gray-700` (~4.48:1 contrast) used in `HeroAbilityButton.tsx:50`
- Bad pattern: `bg-cheddar-200 text-cheddar-400` (~2.5:1 contrast) used in `BetaAgreement.tsx:135`
- Bad pattern: `text-gray-400` on white/cream (~2.9:1 contrast) used in 10+ files

## Desired End State

- All text meets WCAG AA contrast (4.5:1 normal, 3:1 large)
- Disabled buttons use consistent `bg-gray-200 text-gray-600` pattern
- All `text-gray-400` on light backgrounds upgraded to `text-gray-500` or `text-gray-600`
- No inline `style={{}}` color attributes — all use Tailwind classes
- High-contrast mode works on all text elements

## What We're NOT Doing

- Phase 2 React hygiene fixes (memoization, keys)
- Phase 3 layout/overflow fixes
- Phase 4 delight enhancements
- Changing visual design beyond minimum contrast fixes
- Adding new accessibility features (focus traps, screen reader labels)

---

## Phase 1.1: Disabled Button Standardization

### Overview

Standardize all disabled button patterns to use `bg-gray-200 text-gray-600 cursor-not-allowed` which provides ~4.5:1 contrast ratio.

### Changes Required:

#### 1. BetaAgreement.tsx

**File**: `src/components/ui/BetaAgreement.tsx`

**Line 114** — Scroll indicator (borderline, fix for consistency):
```tsx
// Before
<div className="px-6 py-2 bg-cheddar-100 text-center text-xs text-cheddar-500 animate-pulse">

// After
<div className="px-6 py-2 bg-cheddar-100 text-center text-xs text-cheddar-700 animate-pulse">
```

**Line 135** — Disabled button:
```tsx
// Before
: 'bg-cheddar-200 text-cheddar-400 cursor-not-allowed'

// After
: 'bg-gray-200 text-gray-600 cursor-not-allowed'
```

#### 2. FeedbackWidget.tsx

**File**: `src/components/ui/FeedbackWidget.tsx`

**Line 239** — Disabled submit button:
```tsx
// Before
? 'bg-cheddar-200 text-cheddar-400 cursor-not-allowed'

// After
? 'bg-gray-200 text-gray-600 cursor-not-allowed'
```

**Line 216** — Version info (secondary fix):
```tsx
// Before
<p className="text-xs text-cheddar-400">

// After
<p className="text-xs text-gray-500">
```

#### 3. ZoneSelectPanel.tsx

**File**: `src/components/ui/ZoneSelectPanel.tsx`

**Line 123** — Locked stage button:
```tsx
// Before
'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'

// After
'bg-gray-200 text-gray-600 border border-gray-300 cursor-not-allowed'
```

**Line 147** — Locked boss button:
```tsx
// Before
'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'

// After
'bg-gray-200 text-gray-600 border border-gray-300 cursor-not-allowed'
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [ ] No runtime errors in dev: `npm run dev`

#### Manual Verification:
- [ ] BetaAgreement scroll indicator text is readable
- [ ] BetaAgreement disabled button clearly shows disabled state
- [ ] FeedbackWidget disabled button clearly shows disabled state
- [ ] ZoneSelectPanel locked buttons are distinguishable from enabled

---

## Phase 1.2: Gray Text Upgrades

### Overview

Replace all `text-gray-400` on light backgrounds with `text-gray-500` or `text-gray-600` to meet WCAG AA.

### Changes Required:

#### 1. ZoneSelectPanel.tsx

**File**: `src/components/ui/ZoneSelectPanel.tsx`

**Line 72** — Recommended level:
```tsx
// Before
<p className="text-xs text-gray-400 mt-0.5">Recommended Lv. {zone.recommendedLevel}</p>

// After
<p className="text-xs text-gray-500 mt-0.5">Recommended Lv. {zone.recommendedLevel}</p>
```

**Line 83** — "Locked" text:
```tsx
// Before
<span className="text-xs text-gray-400">Locked</span>

// After
<span className="text-xs text-gray-500">Locked</span>
```

**Line 194** — Header subtext:
```tsx
// Before (if text-gray-400 or text-gray-500)
// Verify current class and upgrade if needed to text-gray-600
```

#### 2. HeroPanel.tsx

**File**: `src/components/ui/HeroPanel.tsx`

**Lines 240, 244, 248, 252, 256** — Base stat labels in HeroRecruitCard:
```tsx
// Before
<span className="text-gray-400">❤️</span>
<span className="text-gray-400">⚔️</span>
<span className="text-gray-400">🛡️</span>
<span className="text-gray-400">💨</span>
<span className="text-gray-400">🧀</span>

// After
<span className="text-gray-500">❤️</span>
<span className="text-gray-500">⚔️</span>
<span className="text-gray-500">🛡️</span>
<span className="text-gray-500">💨</span>
<span className="text-gray-500">🧀</span>
```

**Line 224** — Unaffordable cost:
```tsx
// Before
<span className="text-gray-400">{formatNumber(hero.recruitCost)}</span>

// After
<span className="text-gray-500">{formatNumber(hero.recruitCost)}</span>
```

#### 3. AchievementToast.tsx

**File**: `src/components/ui/AchievementToast.tsx`

**Line 197** — "Click to dismiss":
```tsx
// Before
<div className="text-xs text-gray-400 shrink-0 relative z-10">

// After
<div className="text-xs text-gray-500 shrink-0 relative z-10">
```

#### 4. CombatLog.tsx

**File**: `src/components/ui/CombatLog.tsx`

**Line 54** — Timestamps:
```tsx
// Before
<span className="text-gray-400 shrink-0 tabular-nums">[{formatTime(entry.timestamp)}]</span>

// After
<span className="text-gray-500 shrink-0 tabular-nums">[{formatTime(entry.timestamp)}]</span>
```

**Line 115** — Empty state:
```tsx
// Before
<div className="p-4 text-center text-gray-400 text-sm">

// After
<div className="p-4 text-center text-gray-500 text-sm">
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] ZoneSelectPanel recommended levels are readable
- [ ] HeroPanel recruit card stats are readable
- [ ] Achievement toasts dismiss hint is visible
- [ ] Combat log timestamps are readable

---

## Phase 1.3: Yellow/Amber Text Fixes

### Overview

Fix pale yellow/amber text that fails contrast requirements on light or gradient backgrounds.

### Changes Required:

#### 1. CombatFeedback.tsx

**File**: `src/components/ui/CombatFeedback.tsx`

**Line 201** — "MAX!" label on orange/red gradient:
```tsx
// Before
<div className="text-[10px] text-yellow-200">MAX!</div>

// After
<div className="text-[10px] text-white font-bold drop-shadow-sm">MAX!</div>
```

#### 2. App.tsx

**File**: `src/App.tsx`

**Line 534** — Potential rennet on amber/red background:
```tsx
// Before
<span className="text-xs text-amber-200">+{potentialRennet}</span>

// After
<span className="text-xs text-white font-medium">+{potentialRennet}</span>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Combat "MAX!" indicator is clearly visible during max combo
- [ ] Prestige button shows rennet gain clearly on red header

---

## Phase 1.4: Tooltip/Popover Contrast

### Overview

Fix tooltip text that fails contrast on dark backgrounds.

### Changes Required:

#### 1. RennetDisplay.tsx

**File**: `src/components/ui/RennetDisplay.tsx`

**Line 34** — Tooltip body on `bg-rind`:
```tsx
// Before
<div className="space-y-0.5 text-gray-200">

// After
<div className="space-y-0.5 text-white">
```

**Line 41** — Tooltip footer on `bg-rind`:
```tsx
// Before
<div className="text-gray-300 mt-1 pt-1 border-t border-gray-500">

// After
<div className="text-white/90 mt-1 pt-1 border-t border-white/30">
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Rennet tooltip text is clearly readable on hover

---

## Phase 1.5: Hardcoded Colors to Tailwind Classes

### Overview

Replace inline `style={{}}` color attributes in GeneratorPanel.tsx with Tailwind classes to enable high-contrast mode support.

### Changes Required:

#### 1. GeneratorPanel.tsx

**File**: `src/components/ui/GeneratorPanel.tsx`

**Line 105** — Generator name:
```tsx
// Before
style={{ color: '#8b7355' }}

// After
className="... text-rind"
// Remove style attribute entirely
```

**Line 112** — Owned count:
```tsx
// Before
style={{ color: isCanadianTier ? '#dc2626' : '#b45309' }}

// After
className={`... ${isCanadianTier ? 'text-red-600' : 'text-amber-700'}`}
// Remove style attribute entirely
```

**Line 120** — Description:
```tsx
// Before
style={{ color: '#4b5563' }}

// After
className="... text-gray-600"
// Remove style attribute entirely
```

**Line 125** — CPS label:
```tsx
// Before
style={{ color: isCanadianTier ? '#dc2626' : '#d97706' }}

// After
className={`... ${isCanadianTier ? 'text-red-600' : 'text-amber-600'}`}
// Remove style attribute entirely
```

**Lines 135-141** — Buy button:
```tsx
// Before
style={{ 
  backgroundColor: canAfford ? (isCanadianTier ? '#dc2626' : '#b45309') : '#9ca3af',
  color: canAfford ? '#ffffff' : '#6b7280',
  cursor: canAfford ? 'pointer' : 'not-allowed'
}}

// After
className={`... ${
  canAfford 
    ? isCanadianTier 
      ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
      : 'bg-amber-700 hover:bg-amber-800 text-white cursor-pointer'
    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
}`}
// Remove style attribute entirely
```

**Line 161** — Header "Generators":
```tsx
// Before
style={{ color: '#5f4810' }}

// After
className="... text-timber-700"
// Remove style attribute entirely
```

**Lines 172-175** — Buy amount buttons:
```tsx
// Before
style={{ 
  backgroundColor: buyAmount === amount ? '#8b6914' : 'rgba(255,255,255,0.5)', 
  color: buyAmount === amount ? '#ffffff' : '#5f4810' 
}}

// After
className={`... ${
  buyAmount === amount 
    ? 'bg-timber-500 text-white' 
    : 'bg-white/50 text-timber-700'
}`}
// Remove style attribute entirely
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] No `style={{` containing `color:` or `backgroundColor:` in GeneratorPanel.tsx

#### Manual Verification:
- [ ] GeneratorPanel looks identical visually in normal mode
- [ ] High-contrast mode properly overrides GeneratorPanel colors
- [ ] Generator buy buttons work correctly in both states

---

## Testing Strategy

### Unit Tests:
- No unit tests required — these are pure styling changes

### Integration Tests:
- No integration tests required

### Manual Testing Steps:
1. Open the game in normal mode
2. Verify all changed components look correct:
   - BetaAgreement (clear localStorage to trigger)
   - FeedbackWidget (click feedback button)
   - ZoneSelectPanel (go to Combat tab)
   - HeroPanel (go to Heroes tab, Recruit sub-tab)
   - AchievementToast (unlock an achievement)
   - CombatLog (enter combat)
   - CombatFeedback (get max combo in combat)
   - App prestige button (accumulate enough resources)
   - RennetDisplay (hover over rennet counter)
   - GeneratorPanel (main production tab)
3. Enable high-contrast mode in Settings
4. Verify all text is now black/white with proper contrast
5. Test with browser accessibility checker extension

## Performance Considerations

None — these are CSS class swaps with no runtime impact.

## Migration Notes

None — no data migration required.

## References

- Original research: `thoughts/shared/research/2026-06-09_ux-display-contrast-hygiene-review.md`
- WCAG 2.1 AA contrast requirements: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
- High-contrast mode implementation: `src/index.css:680-747`
- Color palette: `tailwind.config.js:6-56`
