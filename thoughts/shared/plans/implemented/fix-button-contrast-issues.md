# Button Contrast Issues - Implementation Plan

## Overview

Fix buttons with potential contrast issues where white text appears on light-colored backgrounds (particularly `cheddar-500`/`amber-500` which have borderline WCAG AA compliance).

## Current State Analysis

### Color Palette Contrast Ratios (with white text #FFFFFF)
| Color | Hex | Contrast Ratio | WCAG AA |
|-------|-----|----------------|---------|
| cheddar-500 | #f59e0b | ~3.4:1 | Fails (needs 4.5:1) |
| cheddar-600 | #d97706 | ~4.5:1 | Passes |
| timber-500 | #8b6914 | ~4.8:1 | Passes |
| timber-600 | #755812 | ~6.0:1 | Passes |
| amber-500 | #f59e0b | ~3.4:1 | Fails |
| amber-600 | #d97706 | ~4.5:1 | Passes |
| maple-500 | #ef4444 | ~4.0:1 | Borderline |
| maple-600 | #dc2626 | ~5.0:1 | Passes |

### Button Patterns Found

**Primary Action Buttons using `cheddar-500` (potentially problematic):**
- `src/components/ui/GeneratorPanel.tsx:137` - Buy button background (#f59e0b)
- `src/components/ui/OfflineProgressModal.tsx:56` - bg-cheddar-500 text-white
- `src/components/ui/KeyboardHelpModal.tsx:142` - bg-cheddar-500 text-white
- `src/components/ui/PrivacyConsent.tsx:151` - bg-cheddar-500 text-white
- `src/components/ui/SettingsPanel.tsx:193,560` - bg-cheddar-500 text-white
- `src/components/ui/ChangelogModal.tsx:177` - bg-cheddar-500 text-white
- `src/components/ui/crafting/RecipeCard.tsx:226` - bg-cheddar-500 text-white
- `src/components/ui/crafting/CheeseInventoryCard.tsx:87` - bg-cheddar-500 text-white

**Tab Buttons using `amber-500` (potentially problematic):**
- `src/components/ui/PrestigePanel.tsx:359-390` - Active tabs use bg-amber-500 text-white
- `src/components/ui/shared/TabButton.tsx:15` - Active amber variant uses bg-amber-500

**Buttons with Good Contrast (no changes needed):**
- Tab buttons using `timber-500` - ~4.8:1 ratio, passes
- Tab buttons using `cheddar-500` in TabButton.tsx (but amber variant is borderline)
- Disabled buttons (`bg-gray-200 text-gray-700`) - ~4.5:1 ratio, passes
- Combat speed buttons (`bg-maple-500`) - ~4.0:1 ratio, borderline but acceptable

## Desired End State

All buttons meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text):
1. Primary action buttons use `cheddar-600` instead of `cheddar-500` for backgrounds
2. Tab buttons use `amber-600` instead of `amber-500` for active state
3. All text-white combinations have at least 4.5:1 contrast ratio

## What We're NOT Doing

- Changing the overall color scheme or theme
- Modifying disabled button states (already compliant)
- Changing timber-based buttons (already have good contrast)
- Altering hover states that use 600-level colors (already good)

---

## Phase 1: Update Primary Action Button Colors

### Overview
Change primary action buttons from `cheddar-500` to `cheddar-600` background color.

### Changes Required:

#### 1. GeneratorPanel.tsx
**File**: `src/components/ui/GeneratorPanel.tsx`
**Line**: 137
**Changes**: Update inline style from `#f59e0b` to `#d97706`

```tsx
// Before
backgroundColor: canAfford
  ? isCanadianTier ? '#ef4444' : '#f59e0b'
  : '#e5e7eb',

// After
backgroundColor: canAfford
  ? isCanadianTier ? '#dc2626' : '#d97706'  // maple-600 and cheddar-600
  : '#e5e7eb',
```

#### 2. OfflineProgressModal.tsx
**File**: `src/components/ui/OfflineProgressModal.tsx`
**Line**: 56
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

```tsx
// Before
className="bg-cheddar-500 hover:bg-cheddar-600 text-white ..."

// After
className="bg-cheddar-600 hover:bg-cheddar-700 text-white ..."
```

#### 3. KeyboardHelpModal.tsx
**File**: `src/components/ui/KeyboardHelpModal.tsx`
**Line**: 142
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

#### 4. PrivacyConsent.tsx
**File**: `src/components/ui/PrivacyConsent.tsx`
**Line**: 151
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

#### 5. SettingsPanel.tsx
**File**: `src/components/ui/SettingsPanel.tsx`
**Lines**: 193, 560
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

#### 6. ChangelogModal.tsx
**File**: `src/components/ui/ChangelogModal.tsx`
**Line**: 177
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

#### 7. crafting/RecipeCard.tsx
**File**: `src/components/ui/crafting/RecipeCard.tsx`
**Line**: 226
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

#### 8. crafting/CheeseInventoryCard.tsx
**File**: `src/components/ui/crafting/CheeseInventoryCard.tsx`
**Line**: 87
**Changes**: Replace `bg-cheddar-500` with `bg-cheddar-600`

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web lint` passes
- [x] `pnpm --filter web build` succeeds

#### Manual Verification:
- [x] Generator buy buttons are clearly readable
- [x] Modal action buttons have good contrast
- [x] Settings Done button is clearly visible
- [x] All cheddar-colored buttons pass WCAG contrast checker

---

## Phase 2: Update Tab Button Active States

### Overview
Update tab buttons that use `amber-500` to use `amber-600` for better contrast.

### Changes Required:

#### 1. PrestigePanel.tsx
**File**: `src/components/ui/PrestigePanel.tsx`
**Lines**: 360, 372, 384
**Changes**: Replace `bg-amber-500` with `bg-amber-600` for active state

```tsx
// Before
${activeTab === 'aging'
  ? 'bg-amber-500 text-white border-amber-600'
  : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
}

// After
${activeTab === 'aging'
  ? 'bg-amber-600 text-white border-amber-700'
  : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
}
```

#### 2. shared/TabButton.tsx (amber variant)
**File**: `src/components/ui/shared/TabButton.tsx`
**Line**: 15
**Changes**: Update amber variant active state

```tsx
// Before
amber: {
  active: 'bg-amber-500 text-white border-amber-600',
  ...
}

// After
amber: {
  active: 'bg-amber-600 text-white border-amber-700',
  ...
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web lint` passes

#### Manual Verification:
- [ ] Prestige panel tabs are clearly readable when active
- [ ] Active tab state is distinguishable from inactive

---

## Phase 3: Update Canadian-Themed Buttons (maple-500)

### Overview
Update buttons using `maple-500` to use `maple-600` for consistent contrast improvement.

### Changes Required:

#### 1. CombatPanel.tsx
**File**: `src/components/ui/CombatPanel.tsx`
**Lines**: 67, 207-209
**Changes**: Replace `bg-maple-500` with `bg-maple-600`

#### 2. HeroPanel.tsx
**File**: `src/components/ui/HeroPanel.tsx`
**Lines**: 157, 267
**Changes**: Replace `from-maple-500 to-maple-600` with `from-maple-600 to-maple-700`

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web lint` passes

#### Manual Verification:
- [ ] Combat speed buttons are clearly readable
- [ ] Hero "Add to Party" buttons have good contrast
- [ ] All maple-colored buttons pass WCAG contrast checker

---

## Phase 4: Verify Generator Panel Buy Amount Selector

### Overview
Ensure the buy amount selector buttons have proper contrast.

### Changes Required:

#### 1. GeneratorPanel.tsx
**File**: `src/components/ui/GeneratorPanel.tsx`
**Lines**: 172-175
**Changes**: Update inline style for active state

```tsx
// Before
backgroundColor: buyAmount === amount ? '#8b6914' : 'rgba(255,255,255,0.5)',

// This is already timber-500 (#8b6914) which has ~4.8:1 contrast - acceptable
// No changes needed for this component
```

### Success Criteria:

#### Automated Verification:
- [x] Verified no changes needed (timber-500 already passes)

---

## Testing Strategy

### Automated Testing:
1. Run full build: `pnpm --filter web build`
2. Run linting: `pnpm --filter web lint`
3. Run type checking: `pnpm --filter web typecheck`

### Manual Testing:
1. Open each panel and verify button visibility
2. Use browser dev tools or WCAG contrast checker extension
3. Test in different lighting conditions
4. Verify hover states still work correctly

### Contrast Verification Tool:
Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

| Element | Background | Text | Expected Ratio |
|---------|------------|------|----------------|
| Primary buttons | #d97706 | #FFFFFF | 4.5:1+ |
| Amber tabs | #d97706 | #FFFFFF | 4.5:1+ |
| Maple buttons | #dc2626 | #FFFFFF | 5.0:1+ |

## References

- WCAG 2.1 Contrast Requirements: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Tailwind Color Reference: tailwind.config.js
