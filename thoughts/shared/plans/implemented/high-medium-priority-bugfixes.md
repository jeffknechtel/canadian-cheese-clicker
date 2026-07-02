# High and Medium Priority Bug Fixes Implementation Plan

## Overview

This plan addresses the high and medium priority issues identified in the codebase research document. The focus is on memory leaks, TypeScript safety, and accessibility improvements that impact application stability and user experience.

## Current State Analysis

The research document (`thoughts/shared/research/2026-01-29_codebase-bugs-display-issues.md`) identified several categories of issues:

**High Priority (Application Stability):**
1. Memory leaks from `requestAnimationFrame` without cleanup in 2 locations
2. Unsafe `JSON.parse` type assertions in 4 locations

**Medium Priority (Code Quality & Accessibility):**
3. Improper `useRef` typing in 7 locations across 5 files
4. Clickable divs without keyboard handlers in 5 components
5. Missing ARIA labels on icon buttons in 4 components

## Desired End State

After this plan is complete:
- All `requestAnimationFrame` calls have proper cleanup functions
- All `JSON.parse` calls have runtime validation
- All `useRef` declarations have correct TypeScript types
- All clickable divs are keyboard accessible with proper ARIA attributes
- The application passes basic accessibility audits for keyboard navigation

**Verification:**
- `npm run typecheck` passes with no errors
- Manual testing confirms keyboard navigation works on all interactive elements
- No "setState on unmounted component" warnings in console during navigation

## What We're NOT Doing

- Adding error boundaries (separate plan recommended)
- Removing dead code/unused modules
- Fixing low-priority issues (short timeouts, ref mutation during render)
- Adding ARIA labels to all components (only the 4 identified)
- Comprehensive accessibility audit (only fixing identified issues)

---

## Phase 1: Memory Leak Fixes

### Overview

Fix the two `requestAnimationFrame` memory leaks by storing animation frame IDs and canceling them in cleanup functions.

### Changes Required:

#### 1. App.tsx Loading Progress Animation

**File**: `src/App.tsx`
**Lines**: 149-172

**Current code:**
```typescript
useEffect(() => {
  if (!showLoading) return;

  const startTime = Date.now();
  const minLoadTime = 1500;

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const baseProgress = Math.min(100, (elapsed / minLoadTime) * 100);
    const jitter = Math.random() * 5;
    const progress = Math.min(100, baseProgress + jitter);

    setLoadingProgress(progress);

    if (progress < 100) {
      requestAnimationFrame(updateProgress);  // Not stored
    }
  };

  requestAnimationFrame(updateProgress);  // Not stored, no cleanup
}, [showLoading]);
```

**Fixed code:**
```typescript
useEffect(() => {
  if (!showLoading) return;

  let animationFrameId: number;
  const startTime = Date.now();
  const minLoadTime = 1500;

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const baseProgress = Math.min(100, (elapsed / minLoadTime) * 100);
    const jitter = Math.random() * 5;
    const progress = Math.min(100, baseProgress + jitter);

    setLoadingProgress(progress);

    if (progress < 100) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }
  };

  animationFrameId = requestAnimationFrame(updateProgress);

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}, [showLoading]);
```

#### 2. useFocusTrap Focus Delay

**File**: `src/hooks/useFocusTrap.ts`
**Lines**: 74-99

**Current code:**
```typescript
useEffect(() => {
  if (!isOpen) return;

  previousActiveElement.current = document.activeElement as HTMLElement;
  document.addEventListener('keydown', handleKeyDown);

  const focusableElements = getFocusableElements();
  if (focusableElements.length > 0) {
    requestAnimationFrame(() => {  // Not stored
      focusableElements[0].focus();
    });
  } else if (containerRef.current) {
    containerRef.current.focus();
  }

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    // Missing: cancelAnimationFrame
  };
}, [isOpen, handleKeyDown, getFocusableElements]);
```

**Fixed code:**
```typescript
useEffect(() => {
  if (!isOpen) return;

  let animationFrameId: number | undefined;

  previousActiveElement.current = document.activeElement as HTMLElement;
  document.addEventListener('keydown', handleKeyDown);

  const focusableElements = getFocusableElements();
  if (focusableElements.length > 0) {
    animationFrameId = requestAnimationFrame(() => {
      focusableElements[0].focus();
    });
  } else if (containerRef.current) {
    containerRef.current.focus();
  }

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (animationFrameId !== undefined) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, [isOpen, handleKeyDown, getFocusableElements]);
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [ ] `npm run lint` passes (pre-existing errors unrelated to Phase 1)
- [x] `npm run build` succeeds

#### Manual Verification:
- [ ] Loading screen animation plays correctly
- [ ] Modal focus trapping works correctly
- [ ] No "setState on unmounted component" warnings when rapidly opening/closing modals
- [ ] No memory growth when repeatedly triggering loading screen

---

## Phase 2: Fix useRef Typing

### Overview

Fix TypeScript type mismatches where `useRef<number>(undefined)` should be `useRef<number | undefined>(undefined)`.

### Changes Required:

#### 1. ClickEffects.tsx

**File**: `src/components/game/ClickEffects.tsx`
**Line**: 31

```typescript
// Before
const animationRef = useRef<number>(undefined);

// After
const animationRef = useRef<number | undefined>(undefined);
```

#### 2. ParticleContainer.tsx

**File**: `src/components/ui/ParticleContainer.tsx`
**Lines**: 48, 142, 144

```typescript
// Line 48 - Before
const animationRef = useRef<number>(undefined);
// After
const animationRef = useRef<number | undefined>(undefined);

// Line 142 - Before
const animationRef = useRef<number>(undefined);
// After
const animationRef = useRef<number | undefined>(undefined);

// Line 144 - Before
const configRef = useRef<ParticleConfig>(undefined);
// After
const configRef = useRef<ParticleConfig | undefined>(undefined);
```

#### 3. AchievementToast.tsx

**File**: `src/components/ui/AchievementToast.tsx`
**Line**: 64

```typescript
// Before
const animationRef = useRef<number>(undefined);

// After
const animationRef = useRef<number | undefined>(undefined);
```

#### 4. CombatFeedback.tsx

**File**: `src/components/ui/CombatFeedback.tsx`
**Line**: 217

```typescript
// Before
const animationRef = useRef<number>(undefined);

// After
const animationRef = useRef<number | undefined>(undefined);
```

#### 5. PrestigePanel.tsx

**File**: `src/components/ui/PrestigePanel.tsx`
**Line**: 144

```typescript
// Before
const animationRef = useRef<number>(undefined);

// After
const animationRef = useRef<number | undefined>(undefined);
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes with no errors
- [ ] `npm run lint` passes (pre-existing errors unrelated to Phase 2)

#### Manual Verification:
- [ ] Particle effects still work correctly
- [ ] Achievement toasts animate properly
- [ ] Combat feedback animations work
- [ ] Prestige panel animations work

---

## Phase 3: Unsafe JSON.parse Validation

### Overview

Add runtime validation to `JSON.parse` calls that currently use unsafe type assertions. Create a simple validation utility and apply it to the 4 identified locations.

### Changes Required:

#### 1. Create Validation Utility

**File**: `src/utils/validation.ts` (new file)

```typescript
/**
 * Type guard utilities for runtime validation of parsed JSON data
 */

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Validates that a value matches the PrivacyConsent interface
 */
export function isPrivacyConsent(value: unknown): value is {
  analyticsEnabled: boolean;
  consentedAt: number | null;
  version: number;
} {
  return (
    isObject(value) &&
    typeof value.analyticsEnabled === 'boolean' &&
    (value.consentedAt === null || typeof value.consentedAt === 'number') &&
    typeof value.version === 'number'
  );
}

/**
 * Validates that a value matches the AnalyticsEvent interface
 */
export function isAnalyticsEvent(value: unknown): value is {
  type: string;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
} {
  return (
    isObject(value) &&
    typeof value.type === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.sessionId === 'string' &&
    isObject(value.data)
  );
}

/**
 * Validates an array where each element passes a type guard
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(guard);
}

/**
 * Validates that a value matches the ExperimentAssignment structure
 */
export function isExperimentAssignment(value: unknown): value is {
  variant: string;
  assignedAt: number;
} {
  return (
    isObject(value) &&
    typeof value.variant === 'string' &&
    typeof value.assignedAt === 'number'
  );
}

/**
 * Validates ExperimentAssignments object
 */
export function isExperimentAssignments(
  value: unknown
): value is Record<string, { variant: string; assignedAt: number }> {
  if (!isObject(value)) return false;
  return Object.values(value).every(isExperimentAssignment);
}

/**
 * Validates that a value matches the BugReport interface (basic validation)
 */
export function isBugReport(value: unknown): value is {
  id: string;
  description: string;
  category: string;
  timestamp: number;
  url: string;
  consoleErrors: string[];
  gameState: Record<string, unknown>;
  browserInfo: Record<string, unknown>;
} {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.description === 'string' &&
    typeof value.category === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.url === 'string' &&
    isArray(value.consoleErrors) &&
    isObject(value.gameState) &&
    isObject(value.browserInfo)
  );
}
```

#### 2. Update bugReporter.ts

**File**: `src/systems/bugReporter.ts`
**Line**: 265

```typescript
// Add import at top
import { isArrayOf, isBugReport } from '../utils/validation';

// Before (line 261-268)
export function getStoredReports(): BugReport[] {
  try {
    const raw = localStorage.getItem(BUG_REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BugReport[];
  } catch {
    return [];
  }
}

// After
export function getStoredReports(): BugReport[] {
  try {
    const raw = localStorage.getItem(BUG_REPORTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isArrayOf(parsed, isBugReport)) {
      console.warn('Invalid bug reports data in localStorage, clearing');
      localStorage.removeItem(BUG_REPORTS_KEY);
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}
```

#### 3. Update analyticsService.ts

**File**: `src/systems/analyticsService.ts`
**Lines**: 265, 296

```typescript
// Add import at top
import { isPrivacyConsent, isArrayOf, isAnalyticsEvent } from '../utils/validation';

// Before loadConsent (lines 257-278)
private loadConsent(): PrivacyConsent {
  // ...
  const consent = JSON.parse(stored) as PrivacyConsent;
  // ...
}

// After loadConsent
private loadConsent(): PrivacyConsent {
  if (typeof localStorage === 'undefined') {
    return { analyticsEnabled: false, consentedAt: null, version: CURRENT_CONSENT_VERSION };
  }

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isPrivacyConsent(parsed)) {
        if (parsed.version === CURRENT_CONSENT_VERSION) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  return { analyticsEnabled: false, consentedAt: null, version: CURRENT_CONSENT_VERSION };
}

// Before loadQueueFromStorage (lines 290-304)
private loadQueueFromStorage(): void {
  // ...
  const events = JSON.parse(stored) as AnalyticsEvent[];
  // ...
}

// After loadQueueFromStorage
private loadQueueFromStorage(): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isArrayOf(parsed, isAnalyticsEvent)) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.eventQueue = parsed.filter((e) => e.timestamp > oneDayAgo);
      } else {
        console.warn('Invalid analytics events in localStorage, clearing');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {
    // Ignore parse errors
  }
}
```

#### 4. Update abTesting.ts

**File**: `src/systems/abTesting.ts`
**Line**: 62

```typescript
// Add import at top
import { isExperimentAssignments } from '../utils/validation';

// Before (lines 49-71)
function loadAssignments(): ExperimentAssignments {
  // ...
  assignments = JSON.parse(stored) as ExperimentAssignments;
  // ...
}

// After
function loadAssignments(): ExperimentAssignments {
  if (assignments !== null) {
    return assignments;
  }

  if (typeof localStorage === 'undefined') {
    assignments = {};
    return assignments;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isExperimentAssignments(parsed)) {
        assignments = parsed;
      } else {
        console.warn('Invalid experiment assignments in localStorage, clearing');
        localStorage.removeItem(STORAGE_KEY);
        assignments = {};
      }
    } else {
      assignments = {};
    }
  } catch {
    assignments = {};
  }

  return assignments;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] Bug reporter still loads/saves reports correctly
- [ ] Analytics consent persists correctly
- [ ] A/B testing assignments persist correctly
- [ ] Corrupted localStorage data is handled gracefully (clear and reset)

---

## Phase 4: Accessibility - Keyboard Handlers

### Overview

Add keyboard navigation support to clickable div elements. Each element needs:
- `role="button"`
- `tabIndex={0}`
- `onKeyDown` handler for Enter/Space
- `aria-label` for screen readers

### Changes Required:

#### 1. DialogueToast.tsx

**File**: `src/components/ui/DialogueToast.tsx`
**Lines**: 67-77

```tsx
// Before
<div
  className={`...`}
  onClick={() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 300);
  }}
>

// After
<div
  role="button"
  tabIndex={0}
  aria-label={`Dismiss dialogue: ${item.text.substring(0, 30)}...`}
  className={`...`}
  onClick={() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 300);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExiting(true);
      setTimeout(() => onDismiss(item.id), 300);
    }
  }}
>
```

#### 2. AchievementToast.tsx

**File**: `src/components/ui/AchievementToast.tsx`
**Lines**: 142-155

```tsx
// Before
<div
  ref={containerRef}
  className={`...`}
  onClick={() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 300);
  }}
>

// After
<div
  ref={containerRef}
  role="button"
  tabIndex={0}
  aria-label={`Dismiss achievement notification: ${item.achievement.name}`}
  className={`...`}
  onClick={() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 300);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExiting(true);
      setTimeout(() => onDismiss(item.id), 300);
    }
  }}
>
```

#### 3. PartyFormationPanel.tsx

**File**: `src/components/ui/PartyFormationPanel.tsx`
**Lines**: 31-41

```tsx
// Before
<div
  className={`...`}
  onClick={onClick}
>

// After
<div
  role="button"
  tabIndex={0}
  aria-label={hero
    ? `${hero.name} in ${position} position. Click to change.`
    : `Empty ${position} slot. Click to assign hero.`}
  className={`...`}
  onClick={onClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }}
>
```

Note: The `position` variable is available from the component props.

#### 4. UpgradePanel.tsx

**File**: `src/components/ui/UpgradePanel.tsx`
**Lines**: 75-91

```tsx
// Before
<div
  className={`...`}
  onClick={handleBuy}
>

// After
<div
  role="button"
  tabIndex={isPurchased ? -1 : 0}
  aria-label={
    isPurchased
      ? `${upgrade.name} - Already purchased`
      : canAfford
        ? `Purchase ${upgrade.name} for ${upgrade.cost} ${upgrade.costCurrency}`
        : `${upgrade.name} - Cannot afford (costs ${upgrade.cost} ${upgrade.costCurrency})`
  }
  aria-disabled={isPurchased || !canAfford}
  className={`...`}
  onClick={handleBuy}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBuy();
    }
  }}
>
```

#### 5. PrestigePanel.tsx

**File**: `src/components/ui/PrestigePanel.tsx`
**Lines**: 80-94

```tsx
// Before
<div
  className={`...`}
  onClick={handleClick}
>

// After
<div
  role="button"
  tabIndex={canPurchase && !isMaxed ? 0 : -1}
  aria-label={
    isMaxed
      ? `${upgrade.name} - Maximum level reached`
      : isLocked
        ? `${upgrade.name} - Locked`
        : canPurchase
          ? `Purchase ${upgrade.name} for ${upgrade.cost} Rennet`
          : `${upgrade.name} - Cannot afford (costs ${upgrade.cost} Rennet)`
  }
  aria-disabled={!canPurchase || isMaxed}
  className={`...`}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [ ] `npm run lint` passes (pre-existing errors unrelated to Phase 4)

#### Manual Verification:
- [ ] Tab key navigates through all interactive elements in order
- [ ] Enter and Space keys activate clickable elements
- [ ] Screen reader announces element purposes correctly
- [ ] Focus ring is visible on focused elements
- [ ] Disabled elements are not focusable (tabIndex -1)

---

## Phase 5: Accessibility - Missing ARIA Labels

### Overview

Add `aria-label` attributes to icon buttons that currently only have `title` attributes.

### Changes Required:

#### 1. PartyFormationPanel.tsx - Remove Button

**File**: `src/components/ui/PartyFormationPanel.tsx`
**Lines**: 66-75

```tsx
// Before
<button
  onClick={(e) => {
    e.stopPropagation();
    onRemove?.();
  }}
  className="..."
  title="Remove from party"
>

// After
<button
  onClick={(e) => {
    e.stopPropagation();
    onRemove?.();
  }}
  className="..."
  title="Remove from party"
  aria-label={`Remove ${hero?.name || 'hero'} from party`}
>
```

#### 2. EquipmentModal.tsx - Close Button

**File**: `src/components/ui/EquipmentModal.tsx`
**Lines**: 238-242

```tsx
// Before
<button onClick={onClose} className="...">
  ✕
</button>

// After
<button
  onClick={onClose}
  className="..."
  aria-label="Close equipment modal"
>
  ✕
</button>
```

#### 3. HeroPanel.tsx - Equipment Slots

**File**: `src/components/ui/HeroPanel.tsx`
**Lines**: 118-136

Add `aria-label` to equipment slot buttons describing the slot type and current equipment.

#### 4. DebugPanel.tsx - Debug Button

**File**: `src/components/ui/DebugPanel.tsx`
**Lines**: 180-186

```tsx
// Before
<button
  onClick={() => setIsOpen(true)}
  className="..."
  title="Debug Panel"
>

// After
<button
  onClick={() => setIsOpen(true)}
  className="..."
  title="Debug Panel"
  aria-label="Open debug panel"
>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [ ] `npm run lint` passes (pre-existing errors unrelated to Phase 5)

#### Manual Verification:
- [ ] Screen reader announces button purposes correctly
- [ ] All icon buttons have descriptive labels
- [ ] VoiceOver/NVDA testing confirms accessibility

---

## Testing Strategy

### Unit Tests:
- No new unit tests required for these fixes
- Existing tests should continue to pass

### Integration Tests:
- No new integration tests required

### Manual Testing Steps:

1. **Memory Leak Testing:**
   - Open DevTools Memory tab
   - Take heap snapshot
   - Rapidly navigate between views that trigger loading/modals
   - Take another heap snapshot
   - Verify no significant memory growth

2. **Keyboard Navigation Testing:**
   - Tab through all interactive elements on each panel
   - Verify focus order is logical
   - Verify Enter/Space activates elements
   - Verify focus ring is visible

3. **Screen Reader Testing:**
   - Test with VoiceOver (Mac) or NVDA (Windows)
   - Navigate through panels
   - Verify all interactive elements are announced correctly

4. **localStorage Corruption Testing:**
   - Manually corrupt localStorage values in DevTools
   - Reload page
   - Verify graceful handling (no crashes, data reset)

---

## Performance Considerations

- The validation utility adds minimal overhead (microseconds per call)
- Keyboard event handlers are lightweight
- No performance impact expected from these changes

---

## Migration Notes

- No data migration required
- localStorage data that fails validation will be cleared and reset to defaults
- Users may lose bug reports or analytics consent if data is corrupted

---

## References

- Research document: `thoughts/shared/research/2026-01-29_codebase-bugs-display-issues.md`
- Good accessibility example: `src/components/ui/crafting/RecipeCard.tsx:78-90`
- React error boundary pattern: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
