# Upgrade Panel Scroll Fix Implementation Plan

## Overview

The UpgradePanel is not scrollable when it has many upgrades, causing content to overflow and appear broken near the bottom. This is a CSS flexbox issue where intermediate wrapper divs break the flex height chain.

## Current State Analysis

The layout hierarchy is:
1. `<aside>` (App.tsx:939) — `w-72 p-4 overflow-hidden shrink-0 flex flex-col gap-4`
2. `<PanelContainer>` — `h-full flex flex-col` (via PanelContainer.tsx)
3. `<div role="tabpanel">` (UpgradePanel.tsx:208) — **NO flex classes** ← problem
4. Upgrade list div (UpgradePanel.tsx:240) — `flex-1 overflow-y-auto`

The `flex-1 overflow-y-auto` on the upgrade list cannot work because its parent tabpanel div doesn't participate in flex layout. The flex height chain is broken at step 3.

## Desired End State

The upgrade list should scroll when content exceeds the available height. The panel should fill the available space without overflowing.

**Verification**: Open the game with many upgrades purchased, switch to "Owned" tab — list should scroll smoothly without content clipping at bottom.

## What We're NOT Doing

- Not changing the overall layout structure
- Not modifying PanelContainer
- Not adding JavaScript-based height calculations

---

## Phase 1: Fix Flex Height Chain in UpgradePanel

### Overview

Add the missing flex layout classes to the tabpanel wrapper divs and the upgrades header container so the upgrade list can properly use `flex-1` to fill remaining space and `overflow-y-auto` to scroll.

### Changes Required:

**File**: `src/components/ui/UpgradePanel.tsx`

#### 1. Make the upgrades tabpanel a flex column container

**Line 208**: Change the tabpanel div to participate in flex layout:

```tsx
// Before:
<div role="tabpanel" id="panel-upgrades" aria-labelledby="tab-upgrades">

// After:
<div role="tabpanel" id="panel-upgrades" aria-labelledby="tab-upgrades" className="flex-1 flex flex-col min-h-0">
```

#### 2. Also fix the synergies tabpanel for consistency

**Line 204**: The synergies panel wrapper should also flex properly:

```tsx
// Before:
<div role="tabpanel" id="panel-synergies" aria-labelledby="tab-synergies">

// After:
<div role="tabpanel" id="panel-synergies" aria-labelledby="tab-synergies" className="flex-1 min-h-0 overflow-y-auto">
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint` (pre-existing error in useFreezeDetector.ts unrelated to this change)

#### Manual Verification:
- [ ] Open game in browser with dev server
- [ ] Purchase several upgrades or progress to have 10+ in "Owned" tab
- [ ] Switch to "Owned" tab — list scrolls when content exceeds panel height
- [ ] Switch to "Available" tab — list scrolls similarly
- [ ] Test "Synergies" tab — content doesn't overflow
- [ ] Test on mobile viewport — scrolling works correctly
- [ ] No horizontal overflow or clipping at panel edges

---

## Testing Strategy

### Manual Testing Steps:
1. Start dev server: `npm run dev`
2. Open game at localhost in browser
3. Use browser devtools to add extra upgrade cards (or progress normally)
4. Verify scroll behavior on both Available and Owned tabs
5. Test at different viewport sizes (mobile, tablet, desktop)

## References

- PanelContainer.tsx defines `h-full flex flex-col` base styling
- App.tsx:939 shows the aside container has `overflow-hidden`
- The `min-h-0` is critical on flex children to allow them to shrink below content size
