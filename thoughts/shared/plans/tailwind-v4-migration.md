---
date: 2026-01-29
author: Claude
status: pending
topic: "Tailwind CSS v4 Migration Plan"
tags: [plan, tailwind, css, migration, v4]
---

# Tailwind CSS v4 Migration Plan

## Overview

This plan migrates the project from the current broken Tailwind v3/v4 hybrid state to a fully working Tailwind v4 CSS-first configuration. It also addresses high-priority bugs discovered during the codebase research.

**Current State**: Tailwind v4 packages installed, but v3 configuration/directives in use (nothing works)
**Target State**: Fully functional Tailwind v4 with CSS-first configuration

---

## Phase 1: Preparation & Backup

### 1.1 Create a backup branch
```bash
git checkout -b tailwind-v4-migration
git add -A && git commit -m "WIP: Before Tailwind v4 migration"
```

### 1.2 Document current custom theme values
Before migration, extract all custom values from `tailwind.config.js`:

**Custom Colors:**
- `cheddar` (50-900 scale)
- `maple` (50-900 scale)
- `timber` (50-900 scale)
- `timmys` (red, brown, cream)
- `cream: '#fffef5'`
- `rind: '#8b7355'`
- `snow: '#f8fafc'`
- `ice: '#e0f2fe'`

**Custom Animations:**
- `float`, `pulse-glow`, `shake`, `slide-up`, `slide-down-fast`
- `slide-in-left`, `slide-in-right`, `fade-in`, `modal-in`
- `backdrop-in`, `number-pop`, `success-flash`, `value-highlight`

**Custom Timing Function:**
- `bounce-in: cubic-bezier(0.68, -0.55, 0.265, 1.55)`

---

## Phase 2: Run Official Upgrade Tool

### 2.1 Run the Tailwind v4 upgrade tool
```bash
npx @tailwindcss/upgrade
```

This tool will:
- Update dependencies in `package.json`
- Migrate `tailwind.config.js` to CSS `@theme` block
- Update template files with renamed utilities
- Convert `@tailwind` directives to `@import "tailwindcss"`

### 2.2 Review generated changes
The tool will modify:
- `src/index.css` - New CSS-first configuration
- `package.json` - Updated dependencies
- Template files - Renamed utilities

---

## Phase 3: Manual CSS Configuration

### 3.1 Update `src/index.css` structure

Replace the top of the file with:

```css
@import "tailwindcss";

/* Load legacy config if needed for complex plugins */
/* @config "./tailwind.config.js"; */

@theme {
  /* ===== Custom Colors ===== */

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

  /* Wood/Timber colors */
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

  /* Single colors */
  --color-cream: #fffef5;
  --color-rind: #8b7355;
  --color-snow: #f8fafc;
  --color-ice: #e0f2fe;

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

### 3.2 Update custom utilities syntax

Replace `@layer utilities` with `@utility`:

```css
/* OLD v3 syntax */
@layer utilities {
  .transition-smooth {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* NEW v4 syntax */
@utility transition-smooth {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 3.3 Update custom components syntax

Replace `@layer components` with `@layer components` (still valid but may need adjustments):

```css
/* Components layer is still valid in v4 */
@layer components {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--color-cheddar-300) transparent;
  }
}
```

---

## Phase 4: Fix Renamed Utilities in Templates

### 4.1 Shadow utilities renamed

| v3 Class | v4 Class |
|----------|----------|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `shadow-md` | `shadow-md` (unchanged) |

Search and replace in all `.tsx` files:
```bash
# Find files with old shadow classes
grep -r "shadow-sm\|shadow " --include="*.tsx" src/
```

### 4.2 Border radius utilities renamed

| v3 Class | v4 Class |
|----------|----------|
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |

### 4.3 Blur utilities renamed

| v3 Class | v4 Class |
|----------|----------|
| `blur-sm` | `blur-xs` |
| `blur` | `blur-sm` |

### 4.4 CSS variable syntax in arbitrary values

```html
<!-- OLD v3 -->
<div class="bg-[--brand-color]">

<!-- NEW v4 -->
<div class="bg-(--brand-color)">
```

---

## Phase 5: Fix High Priority Bugs

### 5.1 Fix loading animation memory leak

**File**: `src/App.tsx:150-172`

```typescript
// Add cleanup to the useEffect
useEffect(() => {
  if (!showLoading) return;

  let animationId: number;
  const startTime = Date.now();
  const minLoadTime = 1500;

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const baseProgress = Math.min(100, (elapsed / minLoadTime) * 100);
    const jitter = Math.random() * 5;
    const progress = Math.min(100, baseProgress + jitter);

    setLoadingProgress(progress);

    if (progress < 100) {
      animationId = requestAnimationFrame(updateProgress);
    }
  };

  animationId = requestAnimationFrame(updateProgress);

  // Cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}, [showLoading]);
```

### 5.2 Fix animation ref types

**File**: `src/components/ui/PrestigePanel.tsx:144-146`

```typescript
// Change from:
const animationRef = useRef<number>(undefined);

// To:
const animationRef = useRef<number | null>(null);
```

Also fix in `src/components/ui/AchievementToast.tsx:64`.

### 5.3 Fix silent null return in HeroCombatCard

**File**: `src/components/ui/CombatPanel.tsx:23`

```typescript
// Change from:
if (!hero) return null;

// To:
if (!hero) {
  console.warn(`Hero not found for combat card`);
  return null;
}
```

Or better, handle at the parent level to prevent rendering invalid hero states.

---

## Phase 6: PostCSS Configuration

### 6.1 Update `postcss.config.js`

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

Note: `autoprefixer` is now built into Tailwind v4, so it can be removed.

### 6.2 Update `package.json` scripts (if needed)

Ensure build command works:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

---

## Phase 7: Testing & Validation

### 7.1 Visual regression testing

1. Start dev server: `pnpm dev`
2. Check each major component:
   - [ ] Header with Tim Hortons styling (`header-timmys`)
   - [ ] Currency display with custom colors
   - [ ] Generator panel with wood textures
   - [ ] Combat panel with all animations
   - [ ] Modals (settings, equipment, combat results)
   - [ ] Loading screen with cheese theme
   - [ ] Mobile responsive layout

### 7.2 Verify custom colors work

Check these classes render correctly:
- `bg-cream`, `bg-cheddar-500`, `text-cheddar-600`
- `bg-maple-500`, `text-maple-700`
- `bg-timber-500`, `border-rind`
- `header-timmys` (Tim Hortons gradient)

### 7.3 Verify animations work

Test these animations:
- Achievement toast slide-in
- Modal fade-in
- Combat shake effects
- Prestige panel particles
- Button hover effects

### 7.4 Run build

```bash
pnpm build
```

Check for:
- No TypeScript errors
- No PostCSS errors
- Bundle size (should be smaller with v4)

---

## Phase 8: Cleanup

### 8.1 Remove legacy config (optional)

If everything works without `@config "./tailwind.config.js"`:
```bash
rm tailwind.config.js
```

### 8.2 Remove unused dependencies

```bash
pnpm remove autoprefixer  # Built into Tailwind v4
```

### 8.3 Update documentation

Update any docs referencing the old config format.

---

## Rollback Plan

If migration fails:

```bash
git checkout master
git branch -D tailwind-v4-migration
```

Or revert to v3:
```bash
pnpm remove tailwindcss @tailwindcss/postcss
pnpm add -D tailwindcss@^3.4.0 postcss autoprefixer
```

---

## Summary Checklist

- [ ] Phase 1: Create backup branch
- [ ] Phase 2: Run `npx @tailwindcss/upgrade`
- [ ] Phase 3: Configure `@theme` block with custom colors/animations
- [ ] Phase 4: Fix renamed utilities (shadow, rounded, blur)
- [ ] Phase 5: Fix high-priority bugs
- [ ] Phase 6: Update PostCSS config
- [ ] Phase 7: Visual testing
- [ ] Phase 8: Cleanup

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1-2 | 15 min |
| Phase 3 | 30 min |
| Phase 4 | 45 min (many files to update) |
| Phase 5 | 20 min |
| Phase 6 | 5 min |
| Phase 7 | 30 min |
| Phase 8 | 10 min |
| **Total** | ~2.5 hours |
