# UI Consistency Phase 2: Z-Index and Overlay Consistency

## Overview

Standardize z-index values across the codebase to establish a clear, predictable stacking hierarchy. This phase addresses the AudioControls dropdown appearing below toasts and standardizes the SettingsPanel z-index to follow the established pattern.

## Current State Analysis

**Current Z-Index Hierarchy** (discovered via codebase analysis):

| Z-Level | Component | File:Line |
|---------|-----------|-----------|
| `z-[9999]` | SettingsPanel | [SettingsPanel.tsx:80](src/components/ui/SettingsPanel.tsx#L80) |
| `z-100` | BetaAgreement | [BetaAgreement.tsx:34](src/components/ui/BetaAgreement.tsx#L34) |
| `z-90` | LoadingScreen | [LoadingScreen.tsx:45](src/components/ui/LoadingScreen.tsx#L45) |
| `z-80` | PrivacyConsent | [PrivacyConsent.tsx:57](src/components/ui/PrivacyConsent.tsx#L57) |
| `z-70` | ChangelogModal, KeyboardHelpModal | Multiple |
| `z-60` | EquipmentModal, CombatResultsModal | Multiple |
| `z-50` | OfflineProgressModal, AgingConfirmModal | Multiple |
| `z-40` | Toasts, DebugPanel, FeedbackWidget | Multiple |
| `z-30` | AudioControls dropdown, RennetDisplay tooltip | Multiple |

**Issues Identified:**

1. **AudioControls dropdown (`z-30`)** is below toasts (`z-40`) - if a toast appears while the volume panel is open, it can partially obscure the controls
2. **SettingsPanel (`z-[9999]`)** uses an arbitrary value instead of following the semantic hierarchy
3. **No documentation** exists for the z-index scale, making it easy to introduce inconsistencies

## Desired End State

After this phase:
1. AudioControls dropdown appears above toasts but below modals (`z-45`)
2. SettingsPanel uses the semantic `z-100` value (matching BetaAgreement priority)
3. Z-index hierarchy is documented in `index.css` for future reference

**Verification:**
- Open the game and hover over audio controls
- Trigger a toast notification (e.g., achievement)
- Verify the audio panel remains fully visible above the toast
- Open Settings and verify it appears above all other elements

## What We're NOT Doing

- **Visual header separators** - The research found no actual obstruction issues with dialog headers. This was a potential perception issue that doesn't require a fix.
- **Changing other z-index values** - The existing hierarchy (z-50 through z-100) is well-structured and doesn't need modification.
- **Creating a z-index constants file** - A comment block in CSS is sufficient for this scale; a separate config adds unnecessary complexity.

---

## Phase 2.1: Raise AudioControls Dropdown Z-Index

### Overview

Raise the AudioControls volume panel from `z-30` to `z-45` so it appears above toasts (`z-40`) but below modals (`z-50+`).

### Changes Required:

#### 1. AudioControls.tsx

**File**: `src/components/ui/AudioControls.tsx`

**Line 164** - Update the dropdown panel z-index:

**Current:**
```tsx
className="hidden sm:block absolute right-0 top-full mt-2 p-4 bg-white rounded-lg shadow-lg z-30 min-w-[200px]"
```

**New:**
```tsx
className="hidden sm:block absolute right-0 top-full mt-2 p-4 bg-white rounded-lg shadow-lg z-45 min-w-[200px]"
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Hover over the audio control button to open the volume panel
- [ ] While panel is open, trigger a toast (e.g., earn an achievement or wait for dialogue)
- [ ] Verify the audio panel remains fully visible and interactive above the toast
- [ ] Verify clicking the volume sliders still works correctly

---

## Phase 2.2: Standardize SettingsPanel Z-Index

### Overview

Change SettingsPanel from the arbitrary `z-[9999]` to the semantic `z-100`, matching BetaAgreement's priority level and following the established hierarchy.

### Changes Required:

#### 1. SettingsPanel.tsx

**File**: `src/components/ui/SettingsPanel.tsx`

**Line 80** - Update the overlay z-index:

**Current:**
```tsx
className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
```

**New:**
```tsx
className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60"
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Open Settings while other modals are potentially visible
- [ ] Verify Settings appears above all game content
- [ ] Verify Settings appears above toasts and notifications
- [ ] Verify the close button and all tabs are accessible
- [ ] Verify clicking outside the modal closes it correctly

---

## Phase 2.3: Document Z-Index Hierarchy

### Overview

Add a comment block to `index.css` documenting the z-index scale for future reference.

### Changes Required:

#### 1. index.css

**File**: `src/index.css`

**Location**: Add after the existing comment block near line 1 (after the Tailwind imports)

**Add:**
```css
/*
 * Z-INDEX HIERARCHY
 * =================
 * Use these semantic levels for consistent stacking:
 *
 * z-10 to z-20  : Internal element layering (decorative overlays, icons)
 * z-30          : Tooltips (RennetDisplay, etc.)
 * z-40          : Floating UI (toasts, debug panel, feedback widget)
 * z-45          : Dropdowns that need to appear above toasts (AudioControls)
 * z-50          : Standard modals (OfflineProgressModal, AgingConfirmModal)
 * z-60          : Higher modals (EquipmentModal, CombatResultsModal)
 * z-70          : Priority modals (ChangelogModal, KeyboardHelpModal)
 * z-80          : Consent dialogs (PrivacyConsent)
 * z-90          : Loading screens (LoadingScreen)
 * z-100         : Critical overlays (BetaAgreement, SettingsPanel)
 *
 * NEVER use arbitrary values like z-[9999]. If you need a new level,
 * add it to this hierarchy and document it here.
 */
```

### Success Criteria:

#### Automated Verification:
- [x] CSS is valid (no syntax errors)
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Comment is visible at the top of `index.css`
- [x] Hierarchy is accurate and matches actual component usage

---

## Testing Strategy

### Unit Tests:
- No unit test changes needed - these are CSS class changes only

### Integration Tests:
- Verify all affected components render without console errors

### Manual Testing Steps:

1. **AudioControls + Toast Interaction**:
   - Hover over audio button to show volume panel
   - Trigger an achievement or wait for dialogue toast
   - Verify panel stays above toast and remains interactive

2. **SettingsPanel Layering**:
   - Open Settings from the gear icon
   - Verify it appears above all game content
   - Click outside to close, verify backdrop click works
   - Open Settings while a toast is showing, verify Settings is on top

3. **Full Z-Index Verification**:
   - Open various modals in sequence
   - Verify higher z-index modals always appear above lower ones
   - Verify LoadingScreen (z-90) covers normal modals (z-50-70)
   - Verify BetaAgreement (z-100) would cover everything if shown

---

## Performance Considerations

No performance impact - these are simple CSS class changes that don't affect rendering performance or bundle size.

---

## References

- Research document: [2026-01-30_ui-consistency-cleanup.md](thoughts/shared/research/2026-01-30_ui-consistency-cleanup.md)
- Phase 1 plan: [ui-consistency-phase1-dialog-backgrounds.md](thoughts/shared/plans/ui-consistency-phase1-dialog-backgrounds.md)
- AudioControls component: [AudioControls.tsx:164](src/components/ui/AudioControls.tsx#L164)
- SettingsPanel component: [SettingsPanel.tsx:80](src/components/ui/SettingsPanel.tsx#L80)
