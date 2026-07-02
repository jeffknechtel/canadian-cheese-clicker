# Phase 3: Layout and Display Fixes

## Overview

Fix layout issues affecting visual polish and usability: overflow handling, text truncation causing layout shift, responsive breakpoint gaps, and fixed-width panel constraints. This phase addresses ~12 components with medium-priority visual improvements.

## Current State Analysis

**Layout patterns are inconsistent** — the codebase has a well-documented z-index hierarchy (`index.css:3-21`) but some components have overflow/truncation issues, and responsive breakpoints are missing in key places.

**Key Discoveries:**
- `Layout.tsx:9` uses `overflow-hidden` on root, which could block legitimate scroll
- `GeneratorPanel.tsx:104,117` toggles between `truncate` and `whitespace-normal` on hover, causing layout shift
- `CombatLog.tsx:159` uses `truncate` without a `title` attribute for accessibility
- `SettingsPanel.tsx:109-124` has 5 tabs with `flex-1` that get cramped on mobile
- `HeroPanel.tsx:119-145` equipment slots use `p-1.5` which creates small touch targets
- `ZoneSelectPanel.tsx:108` uses fixed `grid-cols-4` with no responsive variant
- `App.tsx:593` right panel uses `w-72 lg:w-80` but lacks progressive widths for xl
- `EquipmentModal.tsx:224` uses `max-w-md w-full` with no `min-w` floor
- Z-index hierarchy is already documented in `index.css:3-21` — no additional work needed there

## Desired End State

- No nested scroll containers causing double-scroll UX
- No layout shift on hover (text expansion uses tooltips instead)
- Responsive breakpoints on all grids and tabs
- Touch targets meet WCAG 2.5.5 (44x44px minimum)
- Panels have consistent width behavior across breakpoints

## What We're NOT Doing

- Phase 1 contrast fixes (separate plan, already complete)
- Phase 2 React hygiene (separate plan, in progress)
- Phase 4 delight enhancements
- Refactoring component structure beyond layout fixes
- Z-index changes (already documented correctly)

---

## Phase 3.1: Fix Overflow Handling

### Overview

Address overflow issues that affect scroll behavior. The root `overflow-hidden` may block legitimate vertical scrolling if content exceeds viewport.

### Changes Required:

#### 1. Layout.tsx — Root Overflow

**File**: `src/components/ui/Layout.tsx`

**Line 9** — Current code:
```tsx
<div className="min-h-screen bg-linear-to-br from-cream via-cheddar-50 to-cheddar-100 overflow-hidden">
```

**After**:
```tsx
<div className="min-h-screen bg-linear-to-br from-cream via-cheddar-50 to-cheddar-100 overflow-x-hidden">
```

**Rationale**: Keep `overflow-x-hidden` to prevent horizontal scroll from decorative elements, but allow vertical scroll if content exceeds viewport height. The `min-h-screen` combined with flex layouts typically prevents this, but removing `overflow-hidden` on y-axis is a safety measure.

**Note**: DebugPanel was flagged for "nested scroll containers" but research shows lines 226 and 339 are sibling containers, not nested. No changes needed there.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Page scrolls vertically if content somehow exceeds viewport
- [ ] No horizontal scrollbar appears
- [ ] Decorative elements don't leak outside viewport

---

## Phase 3.2: Fix Text Truncation Causing Layout Shift

### Overview

Replace hover-based text expansion with tooltip-only patterns. Currently, `GeneratorPanel` toggles between `truncate` and `whitespace-normal` on hover, causing row height changes that shift all content below.

### Changes Required:

#### 1. GeneratorPanel.tsx — Remove Layout-Shifting Hover

**File**: `src/components/ui/GeneratorPanel.tsx`

The component already has `title` attributes for accessibility (lines 105, 118). Remove the class toggling that causes layout shift.

**Current Code (Lines 103-108)**:
```tsx
<span
  className={`font-semibold transition-all duration-200 text-rind ${isHovered ? 'whitespace-normal' : 'truncate'}`}
  title={generator.name}
>
  {generator.name}
</span>
```

**After**:
```tsx
<span
  className="font-semibold text-rind truncate"
  title={generator.name}
>
  {generator.name}
</span>
```

**Current Code (Lines 116-121)**:
```tsx
<p
  className={`text-xs transition-all duration-200 text-gray-600 ${isHovered ? 'whitespace-normal' : 'truncate'}`}
  title={generator.description}
>
  {generator.description}
</p>
```

**After**:
```tsx
<p
  className="text-xs text-gray-600 truncate"
  title={generator.description}
>
  {generator.description}
</p>
```

**Additionally**: Since `isHovered` state is now only used for visual hover effects (not text expansion), check if it can be simplified or removed entirely in favor of CSS `:hover`. If the component uses `isHovered` for other purposes (e.g., button visibility), keep the state but remove the class toggling.

#### 2. CombatLog.tsx — Add Title to Truncated Messages

**File**: `src/components/ui/CombatLog.tsx`

**Line 159** — Current code in `CompactCombatLog`:
```tsx
<span className={`flex-1 truncate ${colorClass}`}>{entry.message}</span>
```

**After**:
```tsx
<span className={`flex-1 truncate ${colorClass}`} title={entry.message}>{entry.message}</span>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Generator rows no longer shift height on hover
- [ ] Full generator name/description visible via native tooltip on hover
- [ ] Combat log messages show full text via tooltip on hover
- [ ] No layout shift anywhere in the UI on hover

---

## Phase 3.3: Fix Responsive Breakpoint Gaps

### Overview

Add responsive variants to components that use fixed column counts or cramped layouts on mobile.

### Changes Required:

#### 1. SettingsPanel.tsx — Tab Bar Mobile Scroll

**File**: `src/components/ui/SettingsPanel.tsx`

**Lines 109-124** — Current code:
```tsx
<div className="flex border-b" style={{ borderColor: '#E5DCC8', backgroundColor: '#F5F0E1' }}>
  {(['audio', 'graphics', 'accessibility', 'game', 'data'] as SettingsTab[]).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors"
      // ...
    >
      {tab}
    </button>
  ))}
</div>
```

**After**:
```tsx
<div 
  className="flex border-b overflow-x-auto scrollbar-thin" 
  style={{ borderColor: '#E5DCC8', backgroundColor: '#F5F0E1' }}
>
  {(['audio', 'graphics', 'accessibility', 'game', 'data'] as SettingsTab[]).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="shrink-0 py-3 px-4 text-sm font-medium capitalize transition-colors"
      // ...
    >
      {tab}
    </button>
  ))}
</div>
```

**Changes**:
- Container: Add `overflow-x-auto scrollbar-thin` to enable horizontal scroll on mobile
- Buttons: Change `flex-1` to `shrink-0` so tabs don't compress to illegible widths

#### 2. HeroPanel.tsx — Equipment Slot Touch Targets

**File**: `src/components/ui/HeroPanel.tsx`

**Lines 119-145** — Equipment slot buttons use `p-1.5` (6px padding), creating touch targets below the WCAG 2.5.5 recommendation of 44x44px.

**Current code (line 127)**:
```tsx
className={`
  flex-1 p-1.5 rounded text-xs transition-all duration-200
  // ...
`}
```

**After**:
```tsx
className={`
  flex-1 p-2 sm:p-1.5 rounded text-xs transition-all duration-200
  // ...
`}
```

**Changes**:
- Use `p-2` (8px) on mobile for larger touch targets
- Use `p-1.5` (6px) on `sm:` breakpoint and up where mouse precision is expected

#### 3. ZoneSelectPanel.tsx — Stage Grid Responsive

**File**: `src/components/ui/ZoneSelectPanel.tsx`

**Line 108** — Current code:
```tsx
<div className="grid grid-cols-4 gap-1">
```

**After**:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
```

**Changes**:
- 2 columns on mobile (more readable, larger touch targets)
- 4 columns on `sm:` breakpoint (640px+)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Settings tabs scrollable horizontally on narrow screens (< 400px)
- [ ] Settings tabs readable and tappable on mobile
- [ ] Equipment slots have adequate touch target size on mobile
- [ ] Zone stage grid shows 2 columns on mobile, 4 on desktop
- [ ] Test at 320px, 375px, 640px, 1024px viewport widths

---

## Phase 3.4: Fix Fixed-Width Panel Issues

### Overview

Add progressive width scaling and minimum width constraints to panels.

### Changes Required:

#### 1. App.tsx — Right Panel Progressive Widths

**File**: `src/App.tsx`

**Line 593** — Current code:
```tsx
<aside className="w-72 lg:w-80 p-4 overflow-hidden shrink-0 flex flex-col gap-4">
```

**After**:
```tsx
<aside className="w-72 lg:w-80 xl:w-96 p-4 overflow-hidden shrink-0 flex flex-col gap-4">
```

**Changes**:
- Add `xl:w-96` (24rem/384px) for extra-large screens (1280px+)
- This gives more breathing room on wide monitors

**Also update left panel (line 583)** for consistency:
```tsx
// Before
<aside id="generators-panel" className="w-72 lg:w-80 p-4 overflow-hidden shrink-0">

// After
<aside id="generators-panel" className="w-72 lg:w-80 xl:w-96 p-4 overflow-hidden shrink-0">
```

#### 2. EquipmentModal.tsx — Add Minimum Width

**File**: `src/components/ui/EquipmentModal.tsx`

**Line 224** — Current code:
```tsx
<div className="bg-cream border border-timber-300 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
```

**After**:
```tsx
<div className="bg-cream border border-timber-300 rounded-xl shadow-2xl max-w-md w-full min-w-[320px] max-h-[80vh] flex flex-col">
```

**Changes**:
- Add `min-w-[320px]` to prevent modal from becoming too narrow on edge cases
- This matches the minimum viewport width (`body { min-width: 320px }` in `index.css:36`)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Side panels expand to 384px on 1440px+ screens
- [ ] Equipment modal maintains readable width even in constrained containers
- [ ] No horizontal overflow at any breakpoint

---

## Testing Strategy

### Unit Tests:
- No new unit tests required — these are layout/CSS changes that don't alter behavior

### Integration Tests:
- Existing tests should continue to pass

### Manual Testing Steps:

1. **Overflow Test**:
   - Resize browser to various heights
   - Verify vertical scroll works if content exceeds viewport
   - Verify no horizontal scrollbar appears

2. **Layout Shift Test**:
   - Hover over generator rows rapidly
   - Verify no height changes occur
   - Verify native tooltip shows full text

3. **Mobile Responsive Test** (use DevTools device emulation):
   - Test at 320px width (iPhone SE)
   - Test at 375px width (iPhone X)
   - Test at 640px width (tablet portrait)
   - Verify settings tabs are scrollable
   - Verify zone stages show 2 columns → 4 columns
   - Verify equipment slots are tappable

4. **Wide Screen Test**:
   - Test at 1440px width
   - Test at 1920px width
   - Verify side panels scale up appropriately

5. **Equipment Modal Test**:
   - Open equipment modal
   - Resize window to various widths
   - Verify modal maintains minimum 320px width

## Performance Considerations

- Removing `transition-all` from generator rows reduces reflow calculations
- Using `shrink-0` on settings tabs prevents flex recalculation
- `overflow-x-auto` only creates scroll when needed (no performance impact when not scrolling)

## Migration Notes

None — no data migration required. These are purely layout/CSS changes.

## References

- Original research: `thoughts/shared/research/2026-06-09_ux-display-contrast-hygiene-review.md`
- Phase 1 plan: `thoughts/shared/plans/ux-phase1-contrast-fixes.md` (complete)
- Phase 2 plan: `thoughts/shared/plans/ux-phase2-react-hygiene.md` (in progress)
- Z-index documentation: `src/index.css:3-21`