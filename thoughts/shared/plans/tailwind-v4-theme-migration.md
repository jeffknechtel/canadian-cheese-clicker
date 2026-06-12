# Tailwind v4 @theme Migration Plan

## Overview

Migrate custom color definitions from `tailwind.config.js` to Tailwind v4's CSS-based `@theme` directive. This fixes the current issue where custom colors (`timber-*`, `timmys-*`, etc.) aren't being generated because Tailwind v4 no longer auto-detects JavaScript config files.

## Current State Analysis

**The Problem:**
- Tailwind v4.1.18 is installed but custom colors defined in `tailwind.config.js` aren't working
- `src/index.css` imports Tailwind but doesn't reference the config file
- Classes like `bg-timber-100`, `text-timber-700` generate no styles, causing white-on-white contrast issues

**Current Config (`tailwind.config.js`):**
- Custom color palettes: `cheddar`, `maple`, `timber` (50-900 scales)
- Single colors: `timmys.red/brown/cream`, `cream`, `rind`, `snow`, `ice`
- Custom animations: `float`, `pulse-glow`, `shake`, `slide-up`, etc.
- Custom timing function: `bounce-in`

## Desired End State

- All custom colors defined in CSS using `@theme` directive
- Custom animations defined in `@theme`
- `tailwind.config.js` removed (no longer needed)
- All existing color classes work correctly with proper contrast
- No changes to component code required

### Verification:
- All `timber-*`, `cheddar-*`, `maple-*`, `timmys-*` classes render correct colors
- Build succeeds with no errors
- No visual regressions in the UI

## What We're NOT Doing

- Changing any component class names
- Modifying the color values themselves
- Restructuring the CSS file beyond adding `@theme`
- Using the automatic upgrade tool (manual migration is cleaner for this scope)

---

## Phase 1: Add @theme Block with Custom Colors

### Overview

Add the `@theme` directive to `src/index.css` with all custom color definitions from `tailwind.config.js`.

### Changes Required

**File**: `src/index.css`
**Changes**: Add `@theme` block immediately after `@import 'tailwindcss';`

```css
@import 'tailwindcss';

@theme {
  /* ===== Custom Color Palettes ===== */
  
  /* Cheese colors - Cheddar */
  --color-cheddar-50: #fffbeb;
  --color-cheddar-100: #fef3c7;
  --color-cheddar-200: #fde68a;
  --color-cheddar-300: #fcd34d;
  --color-cheddar-400: #fbbf24;
  --color-cheddar-500: #f59e0b;
  --color-cheddar-600: #d97706;
  --color-cheddar-700: #b45309;
  --color-cheddar-800: #92400e;
  --color-cheddar-900: #78350f;

  /* Canadian colors - Maple */
  --color-maple-50: #fef2f2;
  --color-maple-100: #fee2e2;
  --color-maple-200: #fecaca;
  --color-maple-300: #fca5a5;
  --color-maple-400: #f87171;
  --color-maple-500: #ef4444;
  --color-maple-600: #dc2626;
  --color-maple-700: #b91c1c;
  --color-maple-800: #991b1b;
  --color-maple-900: #7f1d1d;

  /* Wood/Timber colors (Canadian cabin aesthetic) */
  --color-timber-50: #faf5f0;
  --color-timber-100: #f0e6d8;
  --color-timber-200: #e0ccb0;
  --color-timber-300: #c9a875;
  --color-timber-400: #b18a4a;
  --color-timber-500: #8b6914;
  --color-timber-600: #755812;
  --color-timber-700: #5f4810;
  --color-timber-800: #4a380d;
  --color-timber-900: #35280a;

  /* Tim Hortons-inspired colors */
  --color-timmys-red: #c8102e;
  --color-timmys-brown: #4a2c2a;
  --color-timmys-cream: #f5e6d3;

  /* Single-value custom colors */
  --color-cream: #fffef5;
  --color-rind: #8b7355;
  --color-snow: #f8fafc;
  --color-ice: #e0f2fe;
}
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build`
- [x] Type checking passes: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] `timber-*` classes now render correct brown/tan colors
- [ ] `cheddar-*` classes render correct yellow/orange colors
- [ ] `timmys-*` classes render correct Tim Hortons colors
- [ ] Inactive tab buttons in UpgradePanel have visible text

---

## Phase 2: Add Custom Animations to @theme

### Overview

Move custom animation definitions from `tailwind.config.js` to the `@theme` block.

### Changes Required

**File**: `src/index.css`
**Changes**: Add animation variables to the `@theme` block

```css
@theme {
  /* ... colors from Phase 1 ... */

  /* ===== Custom Animations ===== */
  --animate-float: float 2s ease-in-out infinite;
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite;
  --animate-shake: shake 0.3s ease-in-out;
  --animate-slide-up: slide-up 0.3s ease-out forwards;
  --animate-slide-down-fast: slide-down 0.2s ease-out forwards;
  --animate-slide-in-left: slide-in-left 0.25s ease-out forwards;
  --animate-slide-in-right: slide-in-right 0.25s ease-out forwards;
  --animate-fade-in: fade-in 0.3s ease-out forwards;
  --animate-modal-in: modal-in 0.25s ease-out forwards;
  --animate-backdrop-in: backdrop-in 0.2s ease-out forwards;
  --animate-number-pop: number-pop 0.3s ease-out;
  --animate-success-flash: success-flash 0.4s ease-out;
  --animate-value-highlight: value-highlight 0.5s ease-out;

  /* ===== Custom Timing Functions ===== */
  --ease-bounce-in: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**Note**: The `@keyframes` definitions already exist in `src/index.css` under `@layer utilities` and `@layer components`. These do NOT need to move into `@theme` - only the animation shorthand references need to be in `@theme`.

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build`
- [x] No CSS compilation errors

#### Manual Verification:
- [ ] `animate-float` class works on elements
- [ ] `animate-shake` triggers on failed purchases
- [ ] Modal animations (`animate-modal-in`) work correctly

---

## Phase 3: Remove tailwind.config.js

### Overview

Delete the now-redundant JavaScript config file since all theme values are in CSS.

### Changes Required

**File**: `tailwind.config.js`
**Changes**: Delete the file entirely

```bash
rm tailwind.config.js
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds without config file: `pnpm build`
- [ ] Dev server starts correctly: `pnpm dev`

#### Manual Verification:
- [ ] All custom colors still work
- [ ] All animations still work
- [ ] No visual regressions

---

## Phase 4: Revert Temporary Contrast Fix

### Overview

Now that `timber-*` colors work, revert the temporary fix that changed UpgradePanel tabs from `timber-*` to `amber-*`.

### Changes Required

**File**: `src/components/ui/UpgradePanel.tsx`
**Changes**: Restore original `timber-*` classes for tab buttons

Main tabs (lines ~173-198):
```tsx
{/* Main Tabs (Upgrades vs Synergies) */}
<div className="flex gap-1 mb-3">
  <button
    onClick={() => setMainTab('upgrades')}
    className={`
      flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border
      ${mainTab === 'upgrades'
        ? 'bg-timber-500 text-white border-timber-600'
        : 'bg-timber-100 text-timber-700 border-timber-300 hover:bg-timber-200'
      }
    `}
  >
    Upgrades
  </button>
  <button
    onClick={() => setMainTab('synergies')}
    className={`
      flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border
      ${mainTab === 'synergies'
        ? 'bg-timber-500 text-white border-timber-600'
        : 'bg-timber-100 text-timber-700 border-timber-300 hover:bg-timber-200'
      }
    `}
  >
    Synergies ({synergyPurchased.length}/5)
  </button>
</div>
```

Sub-tabs (lines ~215-240):
```tsx
{/* Upgrade Sub-Tabs */}
<div className="flex gap-1 mb-3">
  <button
    onClick={() => setUpgradeTab('available')}
    className={`
      flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border
      ${upgradeTab === 'available'
        ? 'bg-timber-400 text-white border-timber-500'
        : 'bg-timber-50 text-timber-600 border-timber-200 hover:bg-timber-100'
      }
    `}
  >
    Available ({availableUpgrades.length})
  </button>
  <button
    onClick={() => setUpgradeTab('purchased')}
    className={`
      flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border
      ${upgradeTab === 'purchased'
        ? 'bg-timber-400 text-white border-timber-500'
        : 'bg-timber-50 text-timber-600 border-timber-200 hover:bg-timber-100'
      }
    `}
  >
    Owned ({purchasedUpgrades.length})
  </button>
</div>
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Inactive tabs have visible tan/brown background and dark text
- [ ] Active tabs have darker brown background with white text
- [ ] Proper contrast on all tab states

---

## Testing Strategy

### Visual Regression Check

After each phase, verify these components render correctly:
1. **UpgradePanel** - Tab buttons should have proper contrast
2. **GeneratorPanel** - Canadian tier styling with red accents
3. **Header** - Tim Hortons red gradient
4. **Modals** - Wood panel styling with proper borders
5. **Achievement cards** - Cheddar-colored unlocked state

### Browser DevTools Check

1. Open DevTools → Elements
2. Select an element with a custom color class (e.g., `bg-timber-100`)
3. Verify the computed style shows the correct hex value (`#f0e6d8`)

---

## Performance Considerations

- CSS-based `@theme` is faster than JavaScript config parsing
- No runtime overhead - colors are compiled at build time
- Smaller config footprint (no JS file to load)

## References

- Tailwind v4 Theme Documentation: https://tailwindcss.com/docs/theme
- Tailwind v4 Upgrade Guide: https://tailwindcss.com/docs/upgrade-guide
- Current config: `tailwind.config.js`
- CSS file: `src/index.css`
