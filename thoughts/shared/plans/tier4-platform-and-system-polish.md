# Tier 4: Platform & System Polish Implementation Plan

## Overview

This plan addresses platform-level polish identified in the world-class polish roadmap: PWA support, mobile optimizations (safe areas, touch targets, haptics), accessibility refinements, and design system consolidation. These items make the game feel native and professional across all devices.

## Current State Analysis

**PWA status:**
- No `manifest.json` exists
- No service worker
- No `theme-color` meta tag
- `public/` contains only `cheese.svg`, `vite.svg`
- No `apple-touch-icon`

**Mobile gaps:**
- Zero `env(safe-area-inset-*)` usage in CSS
- `index.html:6` lacks `viewport-fit=cover`
- Sub-44px touch targets: buy-amount selector (`GeneratorPanel.tsx:185`), combat speed buttons (`CombatPanel.tsx:207-208`), header icons
- UA-sniffing mobile detection (`gameLoop.ts:27`) — iPadOS treated as desktop
- Events/challenges invisible on mobile: `hidden lg:flex` (`App.tsx:478-481`)
- No haptics (`navigator.vibrate`)

**Accessibility gaps:**
- `reducedMotion` setting never seeded from `matchMedia('(prefers-reduced-motion: reduce)')` — JS animations ignore OS preference
- Curd counter `aria-live="polite"` updates every 100ms — screen reader spam
- Invalid ARIA: `aria-selected` on `role="listitem"` (`CombatPanel.tsx:58-59`)

**Design system drift:**
- No `Button` primitive — ~14 ad-hoc button recipes
- `SettingsPanel.tsx:86-131` entirely inline hex colors
- `cheddar-*` identical to `amber-*`, components mix them freely
- No exit animations (all modals unmount instantly)
- Bare empty states (text only, no design)

## Desired End State

1. **PWA installable** — Manifest, service worker, proper icons, offline capability
2. **Mobile-native feel** — Safe area insets, 44px touch targets, haptic feedback on key interactions
3. **Accessibility polished** — OS reduced-motion respected, aria-live throttled, valid ARIA
4. **Unified design system** — Button primitive, token-only colors, exit animations, designed empty states

## What We're NOT Doing

- Full offline mode (beyond caching static assets)
- Push notifications
- Background sync
- Native app (Capacitor/Electron)
- Theme switching (dark mode)

---

## Phase 1: PWA Foundation

### Overview

Add manifest, icons, and service worker for installability and basic caching.

### Changes Required:

#### 1.1 Create Web App Manifest

**File**: `public/manifest.json` (new file)

```json
{
  "name": "The Great Canadian Cheese Quest",
  "short_name": "Cheese Quest",
  "description": "An idle clicker game with JRPG combat, Canadian theme, and artisanal cheese crafting",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFEF5",
  "theme_color": "#B8860B",
  "orientation": "any",
  "categories": ["games", "entertainment"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

#### 1.2 Add Meta Tags to index.html

**File**: `index.html`

Add to `<head>`:

```html
<meta name="theme-color" content="#B8860B" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Cheese Quest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
```

Update viewport meta (line 6):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

#### 1.3 Create PWA Icons

**Files**: `public/icons/` (new directory)
- `icon-192.png` — 192x192 cheese wheel icon
- `icon-512.png` — 512x512 cheese wheel icon  
- `apple-touch-icon.png` — 180x180 for iOS

Generate from existing `cheese.svg` or create new branded icon.

#### 1.4 Add Service Worker

**File**: `public/sw.js` (new file)

```javascript
const CACHE_NAME = 'cheese-quest-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
```

#### 1.5 Register Service Worker

**File**: `src/main.tsx`

Add after React render:

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
```

### Success Criteria:

#### Automated Verification:
- [x] Lighthouse PWA audit passes core requirements
- [x] Build succeeds: `npm run build`
- [x] Manifest validates: no console errors

#### Manual Verification:
- [ ] Chrome shows "Install" prompt when visiting site
- [ ] iOS Safari shows "Add to Home Screen" option
- [ ] Installed app launches in standalone mode
- [ ] App works offline for cached pages

---

## Phase 2: Mobile Safe Areas & Touch Targets

### Overview

Handle notch/home indicator safe areas and ensure all interactive elements meet 44px minimum.

### Changes Required:

#### 2.1 Add Safe Area CSS Variables

**File**: `src/index.css`

Add to `:root`:

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
}
```

#### 2.2 Apply Safe Areas to Main Layout

**File**: `src/App.tsx`

Update root container:

```tsx
<div 
  className="min-h-screen bg-panel-wood"
  style={{
    paddingTop: 'var(--safe-area-top)',
    paddingBottom: 'var(--safe-area-bottom)',
    paddingLeft: 'var(--safe-area-left)',
    paddingRight: 'var(--safe-area-right)',
  }}
>
```

#### 2.3 Fix Header for Notch

**File**: `src/App.tsx`

Update header to account for safe area:

```tsx
<header 
  className="..."
  style={{ paddingTop: 'max(0.5rem, var(--safe-area-top))' }}
>
```

#### 2.4 Fix Mobile Tab Bar for Home Indicator

**File**: `src/App.tsx`

Mobile tab bar at bottom needs safe area padding:

```tsx
<nav 
  className="fixed bottom-0 left-0 right-0 ..."
  style={{ paddingBottom: 'var(--safe-area-bottom)' }}
>
```

#### 2.5 Audit and Fix Touch Targets

**Targets to fix:**

**GeneratorPanel.tsx:185** — Buy amount selector buttons
```tsx
// BEFORE: small buttons
<button className="px-2 py-1 text-xs ...">

// AFTER: min 44px
<button className="min-w-[44px] min-h-[44px] p-2 ...">
```

**CombatPanel.tsx:207-208** — Combat speed buttons
```tsx
// BEFORE:
<button className="px-2 py-1 text-sm ...">

// AFTER:
<button className="min-w-[44px] min-h-[44px] p-2 ...">
```

**App.tsx header icons** — Settings, help, volume buttons
```tsx
// BEFORE:
<button className="p-1.5 ...">

// AFTER:
<button className="p-2.5 min-w-[44px] min-h-[44px] ...">
```

#### 2.6 Show Event/Challenge on Mobile

**File**: `src/App.tsx`

Replace `hidden lg:flex` with responsive layout that works on mobile:

```tsx
// BEFORE:
<div className="hidden lg:flex gap-2">
  <EventIndicator />
  <ChallengeIndicator />
</div>

// AFTER: Show on mobile in header or as floating button
<div className="flex gap-2">
  <EventIndicator compact={isMobile} />
  <ChallengeIndicator compact={isMobile} />
</div>
```

#### 2.7 Replace UA-Sniffing with Capability Detection

**File**: `src/systems/gameLoop.ts`

Replace line 27:

```typescript
// BEFORE:
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// AFTER:
const isMobile = window.matchMedia('(pointer: coarse)').matches;
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] iPhone with notch: content doesn't collide with notch
- [ ] iPhone with home indicator: tab bar above indicator
- [x] All buttons pass 44px minimum (inspect with DevTools)
- [x] iPadOS treated correctly (not desktop)
- [x] Event/challenge indicators visible on mobile

---

## Phase 3: Haptic Feedback

### Overview

Add vibration feedback on key interactions for tactile polish on supported devices.

### Changes Required:

#### 3.1 Create Haptics Utility

**File**: `src/systems/haptics.ts` (new file)

```typescript
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 30],
  error: [50, 50, 50, 50, 50],
};

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function vibrate(pattern: HapticPattern): void {
  if (!hapticsEnabled) return;
  if (!('vibrate' in navigator)) return;
  
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Silently fail if vibration blocked
  }
}

export function vibrateClick(): void {
  vibrate('light');
}

export function vibrateCrit(): void {
  vibrate('medium');
}

export function vibrateLimitBreak(): void {
  vibrate('heavy');
}

export function vibrateSuccess(): void {
  vibrate('success');
}

export function vibrateError(): void {
  vibrate('error');
}
```

#### 3.2 Add Haptics to Click Handler

**File**: `src/stores/slices/production/productionSlice.ts`

In `click` action:

```typescript
import { vibrateClick, vibrateCrit } from '../../../systems/haptics';

click: () => {
  // ... existing click logic
  vibrateClick();
  
  // If crit (fake crit currently, or real once implemented)
  if (isCrit) {
    vibrateCrit();
  }
},
```

#### 3.3 Add Haptics to Combat

**File**: `src/stores/slices/combat/combatSlice.ts`

In combat feedback processing:

```typescript
import { vibrateCrit, vibrateLimitBreak, vibrateSuccess } from '../../../systems/haptics';

// On critical hit
if (event.damageType === 'crit') {
  vibrateCrit();
}

// On limit break activation
if (event.type === 'limitBreak') {
  vibrateLimitBreak();
}

// On victory
if (result === 'victory') {
  vibrateSuccess();
}
```

#### 3.4 Add Haptics to Purchases

**File**: `src/stores/slices/production/productionSlice.ts`

In `buyGenerator` and `buyUpgrade`:

```typescript
import { vibrateClick } from '../../../systems/haptics';

buyGenerator: (id) => {
  // ... existing logic
  if (success) {
    vibrateClick();
  }
},
```

#### 3.5 Add Haptics Setting

**File**: `src/stores/settingsStore.ts`

Add to settings:

```typescript
interface GameSettings {
  // ... existing
  hapticsEnabled: boolean;
}

// Default:
hapticsEnabled: true,

// Action:
setHapticsEnabled: (enabled: boolean) => set((s) => ({
  game: { ...s.game, hapticsEnabled: enabled }
})),
```

**File**: `src/components/ui/SettingsPanel.tsx`

Add toggle:

```tsx
<SettingRow label="Haptic Feedback" description="Vibration on mobile devices">
  <Toggle
    checked={settings.game.hapticsEnabled}
    onChange={(v) => settings.setHapticsEnabled(v)}
  />
</SettingRow>
```

### Success Criteria:

#### Manual Verification:
- [ ] Mobile device: clicking cheese vibrates
- [ ] Mobile device: critical hits vibrate stronger
- [ ] Mobile device: limit break has heavy vibration
- [ ] Mobile device: victory has success pattern
- [x] Haptics toggle in settings disables vibration
- [x] Desktop: no errors (vibrate silently fails)

---

## Phase 4: Accessibility Refinements

### Overview

Seed reduced-motion from OS, throttle aria-live spam, fix invalid ARIA attributes.

### Changes Required:

#### 4.1 Seed reducedMotion from OS Preference

**File**: `src/stores/settingsStore.ts`

Initialize from media query:

```typescript
// At module level:
const prefersReducedMotion = 
  typeof window !== 'undefined' && 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In initial state:
accessibility: {
  reducedMotion: prefersReducedMotion,
  // ... other settings
}
```

**File**: `src/App.tsx`

Listen for changes:

```typescript
useEffect(() => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => {
    useSettingsStore.getState().setReducedMotion(e.matches);
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}, []);
```

#### 4.2 Throttle Curd Counter Live Region

**File**: `src/components/ui/CurrencyDisplay.tsx`

The counter currently updates every 100ms with `aria-live="polite"`. Throttle announcements:

```tsx
// BEFORE (line 43-47):
<div role="status" aria-live="polite">
  {formatNumber(curds)}
</div>

// AFTER: Only announce significant changes
const [announcedValue, setAnnouncedValue] = useState(curds);
const shouldAnnounce = curds.gte(announcedValue.mul(1.1)); // 10% increase

useEffect(() => {
  if (shouldAnnounce) {
    setAnnouncedValue(curds);
  }
}, [curds, shouldAnnounce]);

<div>
  {formatNumber(curds)}
  <div role="status" aria-live="polite" className="sr-only">
    {shouldAnnounce && `Curds: ${formatNumber(announcedValue)}`}
  </div>
</div>
```

#### 4.3 Fix Invalid ARIA in CombatPanel

**File**: `src/components/ui/CombatPanel.tsx`

Lines 58-59 have `aria-selected` on `role="listitem"`:

```tsx
// BEFORE:
<li role="listitem" aria-selected={isSelected}>

// AFTER: Use aria-current for non-selectable lists
<li role="listitem" aria-current={isSelected ? 'true' : undefined}>
```

Or change to proper listbox if selection is the intent:

```tsx
<ul role="listbox">
  <li role="option" aria-selected={isSelected}>
```

#### 4.4 Add Missing ARIA Labels

Audit and fix:

```tsx
// Header buttons without labels
<button aria-label="Settings" ...>
<button aria-label="Help" ...>
<button aria-label="Toggle music" ...>

// Combat speed without label
<button aria-label="Combat speed: 1x" ...>
```

### Success Criteria:

#### Automated Verification:
- [ ] axe accessibility audit: no critical/serious issues
- [x] TypeScript compiles

#### Manual Verification:
- [x] OS "Reduce Motion" on → game animations disabled
- [x] Screen reader: curd counter doesn't announce every 100ms
- [x] Screen reader: combat panel navigable without errors
- [x] All interactive elements have accessible names

---

## Phase 5: Button Primitive

### Overview

Create a unified Button component to replace ~14 ad-hoc button implementations.

### Changes Required:

#### 5.1 Create Button Component

**File**: `src/components/ui/shared/Button.tsx` (new file)

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-cheddar-600 hover:bg-cheddar-700 text-white shadow-sm active:scale-95',
  secondary: 'bg-timber-100 hover:bg-timber-200 text-timber-800 border border-timber-300',
  ghost: 'hover:bg-white/20 text-current',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-cheddar-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

#### 5.2 Export from Shared Index

**File**: `src/components/ui/shared/index.ts`

```typescript
export { Button } from './Button';
```

#### 5.3 Migrate Key Buttons (Incremental)

Start with highest-visibility buttons:

**SettingsPanel.tsx** — Save/Reset buttons
**AgingConfirmModal.tsx** — Confirm/Cancel buttons
**CombatResultsModal.tsx** — Continue button
**GeneratorPanel.tsx** — Buy buttons

Example migration:

```tsx
// BEFORE:
<button
  onClick={onSave}
  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
>
  Save Game
</button>

// AFTER:
import { Button } from '@/components/ui/shared/Button';

<Button variant="primary" onClick={onSave}>
  Save Game
</Button>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [ ] Storybook (if exists) shows Button variants

#### Manual Verification:
- [x] All Button variants look correct
- [x] Button meets 44px touch target
- [x] Button has focus ring
- [x] Loading state shows spinner
- [x] Disabled state visually distinct

---

## Phase 6: Design System Consolidation

### Overview

Retokenize SettingsPanel, collapse duplicate palettes, add exit animations, design empty states.

### Changes Required:

#### 6.1 Retokenize SettingsPanel

**File**: `src/components/ui/SettingsPanel.tsx`

Replace all inline hex colors with tokens:

```tsx
// BEFORE (lines 86-131):
style={{ backgroundColor: '#FFFEF5', borderColor: '#8B7355', color: '#D4A853' }}

// AFTER:
className="bg-panel-wood border-timber-400 text-cheddar-500"
```

Full replacement map:
- `#FFFEF5` → `bg-panel-wood` (already defined)
- `#8B7355` → `border-timber-500` or `text-timber-500`
- `#D4A853` → `text-cheddar-500`
- `#F5F0E6` → `bg-timber-50`

#### 6.2 Collapse Duplicate Palettes

**File**: `src/index.css`

`cheddar-*` is byte-identical to `amber-*`. Pick one and alias:

```css
@theme {
  /* Remove duplicate cheddar definitions, alias to amber */
  --color-cheddar-50: var(--color-amber-50);
  --color-cheddar-100: var(--color-amber-100);
  /* ... etc */
}
```

Or simpler: find-replace `cheddar-` → `amber-` across codebase and remove cheddar definitions.

Same for `maple-*` and `red-*`.

#### 6.3 Add Exit Animations

**File**: `src/index.css`

Add exit animation keyframes:

```css
@keyframes modal-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slide-out-up {
  from { 
    opacity: 1;
    transform: translateY(0);
  }
  to { 
    opacity: 0;
    transform: translateY(-10px);
  }
}

@theme {
  --animate-modal-out: modal-out 0.15s ease-in forwards;
  --animate-fade-out: fade-out 0.15s ease-out forwards;
  --animate-slide-out-up: slide-out-up 0.15s ease-out forwards;
}
```

**File**: `src/components/ui/shared/ModalOverlay.tsx`

Add exit animation support:

```tsx
interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ModalOverlay({ isOpen, onClose, children }: ModalOverlayProps) {
  const [isClosing, setIsClosing] = useState(false);
  
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150); // Match animation duration
  }, [onClose]);
  
  if (!isOpen && !isClosing) return null;
  
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      isClosing ? 'animate-fade-out' : 'animate-fade-in'
    )}>
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className={cn(
        'relative',
        isClosing ? 'animate-modal-out' : 'animate-modal-in'
      )}>
        {children}
      </div>
    </div>
  );
}
```

#### 6.4 Design Empty States

**File**: `src/components/ui/shared/EmptyState.tsx` (new file)

```tsx
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <span className="text-5xl mb-4" role="img" aria-hidden>
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-timber-700 mb-2">
        {title}
      </h3>
      <p className="text-sm text-timber-500 max-w-xs mb-4">
        {description}
      </p>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

Apply to existing empty states:

**UpgradePanel.tsx:254-258**
```tsx
<EmptyState
  icon="🧀"
  title="No Upgrades Available"
  description="Buy more generators to unlock powerful upgrades!"
/>
```

**EquipmentModal.tsx:292**
```tsx
<EmptyState
  icon="⚔️"
  title="No Equipment Yet"
  description="Defeat enemies to find equipment for your heroes."
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [x] No inline hex colors in SettingsPanel
- [ ] CSS audit: no duplicate palette definitions

#### Manual Verification:
- [x] SettingsPanel uses token colors (no visual change)
- [ ] Modals animate out smoothly when closing
- [x] Empty states have icons and helpful text
- [ ] No jarring instant-unmount on modal close

---

## Testing Strategy

### Automated Tests:
- Lighthouse PWA audit in CI
- axe-core accessibility audit in CI
- CSS-in-JS lint for inline colors (if tooling supports)

### Manual Testing Steps:

1. **PWA Installation**:
   - Chrome desktop: "Install" in address bar
   - Chrome Android: "Add to Home Screen"
   - Safari iOS: "Add to Home Screen"
   - Verify standalone launch

2. **Mobile Safe Areas**:
   - iPhone with notch: header below notch
   - iPhone with home indicator: tab bar above indicator
   - Landscape mode: side insets respected

3. **Touch Targets**:
   - Use Chrome DevTools mobile emulator with touch target overlay
   - Verify all buttons >= 44x44px

4. **Haptics**:
   - Android device: click, combat, purchases vibrate
   - iOS device: haptics work via Taptic Engine
   - Toggle setting disables all haptics

5. **Accessibility**:
   - OS reduced motion → game respects it
   - Screen reader: no rapid-fire announcements
   - axe DevTools: no violations

6. **Design System**:
   - SettingsPanel matches other panels visually
   - Modal close animates
   - Empty states look designed, not placeholder

## Performance Considerations

- Service worker caches static assets only (small footprint)
- Haptics are fire-and-forget (no async)
- Exit animations use CSS (GPU-accelerated)
- No runtime palette generation

## Migration Notes

- PWA can be added incrementally (manifest first, then SW)
- Button primitive migration is incremental per-file
- Exit animations require testing each modal individually

## References

- World-class polish roadmap: `thoughts/shared/research/2026-06-12_14-19-23_world-class-polish-roadmap.md`
- Tailwind theme: `src/index.css`
- Settings store: `src/stores/settingsStore.ts`
- Existing modals: `AgingConfirmModal`, `CombatResultsModal`, `SettingsPanel`, etc.
