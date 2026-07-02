# UI Consistency Phase 1: Dialog Background Standardization

## Overview

Standardize modal/dialog backgrounds across the codebase to use the `panel-wood-solid` pattern established by `KeyboardHelpModal`. This ensures all modals have opaque wood-grain backgrounds instead of semi-transparent `bg-cream` that shows through to the game content behind.

## Current State Analysis

**Reference Implementation (KeyboardHelpModal):**
- File: [KeyboardHelpModal.tsx:77](src/components/ui/KeyboardHelpModal.tsx#L77)
- Pattern: `bg-white rounded-lg shadow-xl ... panel-wood-solid`

**CSS Definition (panel-wood-solid):**
- File: [index.css:121-137](src/index.css#L121-L137)
- Provides: Wood grain gradient overlay + solid `#ffffff` background

**Components Needing Updates:**

| Component | File | Current | Issue |
|-----------|------|---------|-------|
| OfflineProgressModal | [OfflineProgressModal.tsx:32](src/components/ui/OfflineProgressModal.tsx#L32) | `bg-cream` | Semi-transparent |
| AgingConfirmModal | [AgingConfirmModal.tsx:39](src/components/ui/AgingConfirmModal.tsx#L39) | `bg-cream` | Semi-transparent |
| EquipmentModal | [EquipmentModal.tsx:228](src/components/ui/EquipmentModal.tsx#L228) | `bg-cream panel-wood` | Uses non-solid variant |
| ChangelogModal | [ChangelogModal.tsx:64](src/components/ui/ChangelogModal.tsx#L64) | `bg-cream` | Semi-transparent |
| CombatResultsModal | [CombatResultsModal.tsx:62-66](src/components/ui/CombatResultsModal.tsx#L62-L66) | Gradient to `cream` | Semi-transparent base |

## Desired End State

All modals use the consistent pattern:
```tsx
className="... bg-white ... panel-wood-solid ..."
```

This provides:
1. Solid white fallback background
2. Wood grain texture overlay
3. Opaque appearance (no game content showing through)
4. Consistent visual style matching KeyboardHelpModal

## What We're NOT Doing

- **AchievementToast** - Intentionally semi-transparent. Toasts are transient notifications where the frosted glass effect helps users maintain awareness of the game state. This is different from modals which command full attention.
- Changing z-index values (Phase 2)
- Updating button contrast (Phase 3)
- Adding tooltip support (Phase 3)

---

## Phase 1.1: Update OfflineProgressModal

### Overview

Update the "Welcome Back" modal that shows offline progress when returning to the game.

### Changes Required:

#### 1. OfflineProgressModal.tsx

**File**: `src/components/ui/OfflineProgressModal.tsx`

**Line 32** - Change modal container background:

**Current:**
```tsx
<div className={`bg-cream border-4 border-cheddar-500 rounded-lg p-8 max-w-md mx-4 shadow-2xl ${!reducedMotion ? 'animate-modal-in' : ''}`}>
```

**New:**
```tsx
<div className={`bg-white panel-wood-solid border-4 border-cheddar-500 rounded-lg p-8 max-w-md mx-4 shadow-2xl ${!reducedMotion ? 'animate-modal-in' : ''}`}>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Open the game after being away for >1 minute
- [ ] Verify the "Welcome Back" modal has an opaque wood-grain background
- [ ] Verify no game content is visible through the modal background
- [ ] Verify the modal still animates in correctly (if reducedMotion is off)

---

## Phase 1.2: Update AgingConfirmModal

### Overview

Update the prestige confirmation modal that appears when the user initiates the "Age Your Empire" prestige action.

### Changes Required:

#### 1. AgingConfirmModal.tsx

**File**: `src/components/ui/AgingConfirmModal.tsx`

**Line 39** - Change modal container background:

**Current:**
```tsx
<div className={`bg-cream border-4 border-amber-500 rounded-lg p-6 max-w-lg mx-4 shadow-2xl transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
```

**New:**
```tsx
<div className={`bg-white panel-wood-solid border-4 border-amber-500 rounded-lg p-6 max-w-lg mx-4 shadow-2xl transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Navigate to the Prestige panel
- [ ] Click "Age My Empire" (requires sufficient curds)
- [ ] Verify the confirmation modal has an opaque wood-grain background
- [ ] Verify the modal entrance animation still works correctly

---

## Phase 1.3: Update EquipmentModal

### Overview

Update the equipment selection modal to use `panel-wood-solid` instead of `panel-wood` (the non-solid variant).

### Changes Required:

#### 1. EquipmentModal.tsx

**File**: `src/components/ui/EquipmentModal.tsx`

**Line 228** - Change modal container background:

**Current:**
```tsx
<div
  className={`bg-cream rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col panel-wood ${!reducedMotion ? 'animate-modal-in' : ''}`}
  onClick={(e) => e.stopPropagation()}
>
```

**New:**
```tsx
<div
  className={`bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col panel-wood-solid ${!reducedMotion ? 'animate-modal-in' : ''}`}
  onClick={(e) => e.stopPropagation()}
>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Navigate to the Heroes panel
- [ ] Click on an equipment slot (weapon, armor, accessory, or cheese charm)
- [ ] Verify the equipment modal has an opaque wood-grain background
- [ ] Verify equipment filtering and selection still work correctly

---

## Phase 1.4: Update ChangelogModal

### Overview

Update the changelog/version history modal background.

### Changes Required:

#### 1. ChangelogModal.tsx

**File**: `src/components/ui/ChangelogModal.tsx`

**Line 64** - Change modal container background:

**Current:**
```tsx
<div className="bg-cream rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
```

**New:**
```tsx
<div className="bg-white panel-wood-solid rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Open Settings, then click "View Changelog" (or equivalent)
- [ ] Verify the changelog modal has an opaque wood-grain background
- [ ] Verify changelog entries expand/collapse correctly
- [ ] Verify search and filter functionality still works

---

## Phase 1.5: Update CombatResultsModal

### Overview

Update the combat results modal (victory/defeat screen) to have a solid background base.

### Changes Required:

#### 1. CombatResultsModal.tsx

**File**: `src/components/ui/CombatResultsModal.tsx`

**Lines 62-69** - Update the gradient backgrounds to use solid white base with wood texture:

**Current:**
```tsx
<div
  className={`
    mx-4 max-w-md w-full rounded-lg shadow-2xl overflow-hidden
    ${isVictory
      ? 'bg-linear-to-b from-cheddar-50 to-cream border-4 border-cheddar-500'
      : 'bg-linear-to-b from-gray-100 to-cream border-4 border-gray-400'
    }
    ${!reducedMotion ? 'animate-modal-in' : ''}
  `}
>
```

**New:**
```tsx
<div
  className={`
    mx-4 max-w-md w-full rounded-lg shadow-2xl overflow-hidden panel-wood-solid
    ${isVictory
      ? 'bg-linear-to-b from-cheddar-50 to-white border-4 border-cheddar-500'
      : 'bg-linear-to-b from-gray-100 to-white border-4 border-gray-400'
    }
    ${!reducedMotion ? 'animate-modal-in' : ''}
  `}
>
```

**Note**: Changed `to-cream` to `to-white` and added `panel-wood-solid`. The gradient still provides visual distinction between victory (cheddar tint) and defeat (gray tint), but now over an opaque base.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Enter combat and win a battle
- [ ] Verify the victory modal has an opaque background with cheddar gradient
- [ ] Enter combat and lose a battle (or flee)
- [ ] Verify the defeat modal has an opaque background with gray gradient
- [ ] Verify rewards display correctly on victory
- [ ] Verify "Try Again" and "Return to Zone Select" buttons work

---

## Testing Strategy

### Unit Tests:
- No unit test changes needed - these are CSS class changes only

### Integration Tests:
- Verify all modals render without console errors
- Verify no visual regressions in component snapshots (if applicable)

### Manual Testing Steps:

1. **OfflineProgressModal**: Close the game, wait 1+ minute, reopen
2. **AgingConfirmModal**: Go to Prestige tab, click Age (need enough curds)
3. **EquipmentModal**: Go to Heroes, click any equipment slot
4. **ChangelogModal**: Open Settings → View Changelog
5. **CombatResultsModal**: Complete a combat (win or lose)

For each modal, verify:
- [ ] Background is opaque (no game visible through)
- [ ] Wood grain texture is visible
- [ ] Modal content is readable
- [ ] Animations still work (if reducedMotion is disabled)
- [ ] Close/dismiss functionality works

---

## References

- Research document: [2026-01-30_ui-consistency-cleanup.md](thoughts/shared/research/2026-01-30_ui-consistency-cleanup.md)
- Reference implementation: [KeyboardHelpModal.tsx:77](src/components/ui/KeyboardHelpModal.tsx#L77)
- CSS definitions: [index.css:104-137](src/index.css#L104-L137)
