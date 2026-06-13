# Tier 2: Core Feel & Correctness Implementation Plan

## Overview

This plan addresses the "Core feel & correctness" tier from the world-class polish roadmap. These are foundational improvements that affect game performance, player perception of progress, and system reliability. Tier 1 (reconnecting disconnected systems) should be completed first, as some of these items build on that work.

## Current State Analysis

**Performance issues:**
- Desktop and mobile layouts both mount simultaneously in the DOM (`App.tsx:589-633` and `App.tsx:635-803`)
- Two WebGL contexts (GameScene mounted twice) consuming GPU resources
- 14+ components subscribe to the entire store or large slices, re-rendering every 100ms tick
- `App.tsx:122` subscribes to entire `combat` slice — entire App tree re-renders on every combat frame
- Tab away returns zero progress until page reload — visibility resume resets `lastTime` instead of calculating catch-up

**Number display issues:**
- `formatNumber.ts` stops at "T" — beyond 999T shows "15000.0T"
- `numberFormat` setting exists in UI but is disconnected from formatter
- No count-up tweens; currency animation only triggers on manual clicks/purchases (partially implemented)
- Passive income, combat rewards, offline gains don't trigger animations

**Save system issues:**
- Future version saves silently start fresh (no warning to user)
- Parse failures silently start fresh (data loss with no feedback)
- Write failures logged to console only — user thinks save succeeded
- Manual save uses `alert('Game saved!')` regardless of success
- No autosave indicator in UI

**Crafting/upgrade UX gaps:**
- No sound, particles, or badge when craft completes
- No "upgrade affordable" badge on Upgrades button/tab (combat and prestige DO badge well)

**Audio architecture:**
- 25+ SFX functions connect directly to `ctx.destination` — no shared bus or compressor
- Rapid sounds can clip/stack harshly
- Two audio settings stores (`AudioControls.tsx` → `saveSystem.ts` vs `settingsStore.ts`) use different localStorage keys

## Desired End State

After this plan:
1. Only one layout (desktop OR mobile) is mounted at a time — single WebGL context, halved subscriptions
2. Components use narrow selectors — no full-store re-renders every tick
3. Tab-away time is captured and offline progress calculated on visibility resume
4. Numbers display correctly past quadrillions with scientific notation option working
5. Currency animations trigger on ALL meaningful income events
6. Save failures show user-facing toasts; save success shows non-blocking feedback; autosave indicator present
7. Craft completion and upgrade affordability have clear visual/audio feedback
8. Audio passes through a shared SFX bus with compressor and per-sound cooldowns

## What We're NOT Doing

- Onboarding/tutorials (Tier 3)
- PWA/mobile platform polish (Tier 4)
- Design system consolidation (Tier 4)
- Visual evolution of cheese wheel (Tier 5)
- Province ambient audio/prestige music (Tier 5)

---

## Phase 1: Single Layout Mount (Performance)

### Overview

Replace CSS-based visibility (`hidden md:flex` / `md:hidden`) with a React-level conditional that mounts only one layout. This halves the mounted components, eliminates the duplicate WebGL context, and reduces subscription count.

### Changes Required:

#### 1. Create useBreakpoint Hook

**File**: `src/hooks/useBreakpoint.ts` (new file)

```typescript
import { useState, useEffect } from 'react';

const MD_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < MD_BREAKPOINT : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
```

#### 2. Update App.tsx to Conditionally Mount Layouts

**File**: `src/App.tsx`

Replace the dual layout approach:

```typescript
// At top of component:
import { useIsMobile } from './hooks/useBreakpoint';

// Inside App component:
const isMobile = useIsMobile();

// Replace lines 589-803 (both layouts) with:
{isMobile ? (
  // Mobile Layout - existing mobile JSX from lines 635-803
  <div className="flex flex-col flex-1 min-h-0" role="main" aria-label="Mobile game content">
    {/* ... mobile content ... */}
  </div>
) : (
  // Desktop Layout - existing desktop JSX from lines 589-633
  <main id="main-content" className="flex flex-1 min-h-0" role="main" aria-label="Game content">
    {/* ... desktop content ... */}
  </main>
)}
```

Remove `hidden md:flex` from desktop layout, remove `md:hidden` from mobile layout.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:
- [ ] At desktop width: only desktop layout in DOM, single `<canvas>` element
- [ ] At mobile width: only mobile layout in DOM, single `<canvas>` element
- [ ] Resizing window switches layouts (verify React DevTools shows different tree)
- [ ] No visual regression at either breakpoint

---

## Phase 2: Narrow Store Selectors (Performance)

### Overview

Convert the 14 whole-store subscriptions to narrow selectors that only re-render when their specific data changes. Critical priority: `App.tsx:122` combat subscription (affects entire tree).

### Changes Required:

#### 2.1 Fix App.tsx Combat Subscription (Critical)

**File**: `src/App.tsx`

Replace line 122:
```typescript
// BEFORE:
const combat = useGameStore((state) => state.combat);

// AFTER:
const isInCombat = useGameStore((state) => state.combat.isInCombat);
const battleResult = useGameStore((state) => state.combat.battleResult);
const currentZone = useGameStore((state) => state.combat.currentZone);
const currentStage = useGameStore((state) => state.combat.currentStage);
```

Update all usages of `combat.isInCombat` → `isInCombat`, etc.

#### 2.2 Fix High-Severity Component Subscriptions

**File**: `src/components/ui/UpgradePanel.tsx:163`
```typescript
// BEFORE:
const { getAvailableUpgrades, getPurchasedUpgrades, getClickMultiplier } = useGameStore();

// AFTER:
const getAvailableUpgrades = useGameStore((s) => s.getAvailableUpgrades);
const getPurchasedUpgrades = useGameStore((s) => s.getPurchasedUpgrades);
const getClickMultiplier = useGameStore((s) => s.getClickMultiplier);
```

**File**: `src/components/ui/RennetDisplay.tsx:10`
```typescript
// BEFORE:
const { prestige, getPotentialRennet, getPrestigeMultipliers } = useGameStore();

// AFTER:
const rennet = useGameStore((s) => s.prestige.rennet);
const agingResetCount = useGameStore((s) => s.prestige.agingResetCount);
const getPotentialRennet = useGameStore((s) => s.getPotentialRennet);
const getPrestigeMultipliers = useGameStore((s) => s.getPrestigeMultipliers);
```

**File**: `src/components/ui/crafting/ActiveBuffsBar.tsx:6`
```typescript
// BEFORE:
const { crafting } = useGameStore();

// AFTER:
const activeBuffs = useGameStore((s) => s.crafting.activeBuffs);
```

**File**: `src/components/ui/crafting/RecipeCard.tsx:23`
```typescript
// BEFORE:
const { curds, crafting, startCrafting, canStartCrafting } = useGameStore();

// AFTER:
const curds = useGameStore((s) => s.curds);
const unlockedIngredients = useGameStore((s) => s.crafting.unlockedIngredients);
const startCrafting = useGameStore((s) => s.startCrafting);
const canStartCrafting = useGameStore((s) => s.canStartCrafting);
```

#### 2.3 Fix Medium-Severity Component Subscriptions

Apply same pattern to:
- `src/components/ui/crafting/CaveCard.tsx:73`
- `src/components/ui/crafting/CheeseCollectionView.tsx:23`
- `src/components/ui/crafting/CheeseInventoryCard.tsx:13`
- `src/components/ui/PrestigeStats.tsx:22`
- `src/components/ui/PrestigePanel.tsx:69,181`
- `src/components/ui/CraftingPanel.tsx:104`
- `src/components/ui/HeroPanel.tsx:174`
- `src/components/ui/AchievementPanel.tsx:97`

#### 2.4 Fix Modal Subscriptions (Lower Priority)

- `src/components/ui/AgingConfirmModal.tsx:14` — only mounts when modal open, so lower impact

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] React DevTools Profiler: components don't re-render on unrelated state changes
- [ ] Combat panel updates smoothly without causing header/other panels to flash
- [ ] No functional regressions in any affected panel

---

## Phase 3: Visibility-Resume Offline Progress

### Overview

When the tab regains visibility, calculate offline progress for the hidden duration instead of discarding it. The existing `calculateOfflineProgress` function handles the math; we just need to call it on resume.

### Changes Required:

#### 1. Track Hidden Timestamp in Game Loop

**File**: `src/systems/gameLoop.ts`

```typescript
// Add after line 37 (module-level state):
let hiddenTimestamp: number | null = null;

// Modify setupVisibilityHandler (lines 135-149):
export function setupVisibilityHandler(onVisibilityResume?: (hiddenDuration: number) => void) {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      hiddenTimestamp = Date.now();
      pauseGameLoop();
    } else {
      const duration = hiddenTimestamp ? Date.now() - hiddenTimestamp : 0;
      hiddenTimestamp = null;
      if (duration > 0 && onVisibilityResume) {
        onVisibilityResume(duration);
      }
      resumeGameLoop();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}
```

#### 2. Add applyOfflineProgress Action to Persistence Slice

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

```typescript
// Add new action:
applyOfflineProgress: (hiddenDurationMs: number) => {
  const state = get();
  const { curdPerSecond } = state;
  const offlineProgressCapHours = useSettingsStore.getState().game.offlineProgressCap;
  
  // Use the same calculation as load() but with hidden duration
  const hiddenSeconds = hiddenDurationMs / 1000;
  const capSeconds = offlineProgressCapHours * 60 * 60;
  const elapsedSeconds = Math.min(hiddenSeconds, capSeconds);
  
  // Only award if hidden for more than 1 minute (matches calculateOfflineProgress threshold)
  if (elapsedSeconds < 60) return null;
  
  const curdsEarned = curdPerSecond.mul(elapsedSeconds);
  
  set((s) => ({
    curds: s.curds.plus(curdsEarned),
    totalCurdsEarned: s.totalCurdsEarned.plus(curdsEarned),
  }));
  
  return { curdsEarned, secondsAway: elapsedSeconds };
},
```

#### 3. Wire Up in App.tsx

**File**: `src/App.tsx`

```typescript
// In the useEffect that sets up visibility handler (around line 201-212):
useEffect(() => {
  const cleanup = setupVisibilityHandler((hiddenDuration) => {
    const progress = useGameStore.getState().applyOfflineProgress(hiddenDuration);
    if (progress && progress.curdsEarned.gt(0)) {
      // Could trigger a toast here, or reuse OfflineProgressModal
      // For now, just apply silently — modal is optional enhancement
    }
  });
  return cleanup;
}, []);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm tsc --noEmit`

#### Manual Verification:
- [ ] Switch to another tab for 2+ minutes, return — curds increased
- [ ] Hidden time respects offline cap setting
- [ ] Hidden for <1 minute awards nothing (threshold)
- [ ] No double-counting with startup offline progress

---

## Phase 4: Number Formatting Past Trillion

### Overview

Extend `formatNumber` to handle quadrillion+ and wire the existing `numberFormat` setting to switch between standard and scientific notation.

### Changes Required:

#### 1. Extend formatNumber with More Suffixes and Scientific Option

**File**: `src/utils/formatNumber.ts`

```typescript
import Decimal from 'decimal.js';
import { useSettingsStore } from '../stores/settingsStore';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: Decimal | number, forceStandard?: boolean): string {
  const num = value instanceof Decimal ? value : new Decimal(value);
  const format = forceStandard ? 'standard' : useSettingsStore.getState().game.numberFormat;
  
  if (num.lt(1000)) {
    return num.floor().toString();
  }
  
  if (format === 'scientific') {
    return num.toExponential(2);
  }
  
  // Standard format with suffixes
  const tier = Math.floor(num.log10().div(3).toNumber());
  
  if (tier >= SUFFIXES.length) {
    // Fall back to scientific for extremely large numbers
    return num.toExponential(2);
  }
  
  const scale = new Decimal(10).pow(tier * 3);
  const scaled = num.div(scale);
  
  return scaled.toFixed(1) + SUFFIXES[tier];
}

// For display that doesn't need settings lookup (performance-critical paths)
export function formatNumberStandard(value: Decimal | number): string {
  return formatNumber(value, true);
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [ ] Unit test: `formatNumber(1e15)` returns "1.0Qa"
- [ ] Unit test: `formatNumber(1e18)` returns "1.0Qi"

#### Manual Verification:
- [ ] Change Settings > Number Format to Scientific — all numbers show e-notation
- [ ] Numbers beyond 999T display correctly with suffixes
- [ ] Performance: no noticeable lag from settings lookup (memoize if needed)

---

## Phase 5: Currency Animation Triggers (Complete Implementation)

### Overview

The `currency-animation-triggers.md` plan is mostly implemented (Phase 1 done, Phase 2 partial). Complete it by adding triggers for passive income, combat rewards, and offline gains.

### Changes Required:

#### 1. Add Animation Trigger to Passive Income

**File**: `src/stores/slices/production/productionSlice.ts`

In the `tick` action (around line 73-89), increment trigger on meaningful passive gains:

```typescript
tick: (deltaMs: number) => {
  const state = get();
  const curdsPerMs = state.curdPerSecond.div(1000);
  const earned = curdsPerMs.mul(deltaMs);
  
  // Only trigger animation if earned > some threshold (avoid constant animation)
  const shouldAnimate = earned.gte(state.curdPerSecond.mul(0.5)); // Half a second's worth
  
  set({
    curds: state.curds.plus(earned),
    totalCurdsEarned: state.totalCurdsEarned.plus(earned),
    currencyAnimationTrigger: shouldAnimate 
      ? state.currencyAnimationTrigger + 1 
      : state.currencyAnimationTrigger,
  });
},
```

**Note**: This approach may be too aggressive. Alternative: only animate on meaningful events like milestone crosses or golden cheese. Evaluate during testing.

#### 2. Add Animation Trigger to Combat Rewards

**File**: `src/stores/slices/combat/combatSlice.ts`

When combat ends with rewards, increment the animation trigger:

```typescript
// In the combat resolution logic where curds are awarded:
get().incrementCurrencyAnimation(); // Add this helper or inline increment
```

#### 3. Add Animation Trigger to Offline Progress

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

In `applyOfflineProgress` (from Phase 3), increment trigger after applying curds:

```typescript
set((s) => ({
  curds: s.curds.plus(curdsEarned),
  totalCurdsEarned: s.totalCurdsEarned.plus(curdsEarned),
  currencyAnimationTrigger: s.currencyAnimationTrigger + 1, // Add this
}));
```

### Success Criteria:

#### Manual Verification:
- [ ] Collecting combat rewards triggers currency pop
- [ ] Collecting offline progress triggers currency pop
- [ ] Passive income does NOT constantly trigger (decide on threshold vs event-only)

---

## Phase 6: Save System User Feedback

### Overview

Replace silent failures and `alert()` with toast notifications. Add autosave indicator. Create backup of rejected saves.

### Changes Required:

#### 1. Create Save Toast System

**File**: `src/systems/saveToast.ts` (new file)

```typescript
type SaveToastType = 'success' | 'error' | 'autosave';

interface SaveToast {
  id: string;
  type: SaveToastType;
  message: string;
}

let toastCallback: ((toast: SaveToast) => void) | null = null;

export function setSaveToastCallback(cb: typeof toastCallback) {
  toastCallback = cb;
}

export function showSaveToast(type: SaveToastType, message: string) {
  if (toastCallback) {
    toastCallback({ id: crypto.randomUUID(), type, message });
  }
}
```

#### 2. Update saveGame to Return Success/Failure

**File**: `src/systems/saveSystem.ts`

```typescript
export function saveGame(state: GameState): boolean {
  try {
    const data: SaveData = {
      version: CURRENT_VERSION,
      state: serializeState({
        ...state,
        lastSaved: Date.now(),
      }),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}
```

#### 3. Backup Rejected Saves in loadGame

**File**: `src/systems/saveSystem.ts`

```typescript
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);

    if (data.version > CURRENT_VERSION) {
      // Backup the rejected save
      localStorage.setItem(SAVE_KEY + '_backup_v' + data.version, raw);
      showSaveToast('error', 
        `Save from newer version (v${data.version}) cannot be loaded. ` +
        `A backup was created. Starting fresh game.`
      );
      return null;
    }

    // ... rest of migration logic
  } catch (error) {
    // Backup the corrupted save
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      localStorage.setItem(SAVE_KEY + '_backup_corrupted_' + Date.now(), raw);
      showSaveToast('error', 'Save data was corrupted. A backup was created. Starting fresh game.');
    }
    console.error('Failed to load game:', error);
    return null;
  }
}
```

#### 4. Replace alert() in SettingsPanel

**File**: `src/components/ui/SettingsPanel.tsx`

```typescript
// Replace line 175:
onSave={() => {
  const success = saveGame();
  showSaveToast(
    success ? 'success' : 'error',
    success ? 'Game saved!' : 'Failed to save game'
  );
}}
```

#### 5. Add SaveToastContainer Component

**File**: `src/components/ui/SaveToast.tsx` (new file)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { setSaveToastCallback } from '../../systems/saveToast';

interface SaveToast {
  id: string;
  type: 'success' | 'error' | 'autosave';
  message: string;
}

export function SaveToastContainer() {
  const [toasts, setToasts] = useState<SaveToast[]>([]);

  const addToast = useCallback((toast: SaveToast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3000);
  }, []);

  useEffect(() => {
    setSaveToastCallback(addToast);
    return () => setSaveToastCallback(null);
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-up ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-timber-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

#### 6. Add Autosave Indicator to Header

**File**: `src/components/ui/AutosaveIndicator.tsx` (new file)

A small icon that briefly appears when autosave runs (reuse existing save icon or add subtle animation).

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm tsc --noEmit`

#### Manual Verification:
- [ ] Click "Save Game" in Settings — toast appears (not alert)
- [ ] Simulate localStorage full (quota exceeded) — error toast appears
- [ ] Future version save → error toast + backup created in localStorage
- [ ] Autosave triggers → brief indicator visible

---

## Phase 7: Crafting Complete Celebration

### Overview

Add sound, particles, and badge when a crafting job completes.

### Changes Required:

#### 1. Add Crafting Complete Sound

**File**: `src/systems/audioSystem.ts`

```typescript
export function playCraftingCompleteSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;
  
  // Cheerful completion chime - similar to achievement but shorter
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.4, now);
  gainNode.gain.exponentialDecayTo(0.01, now + 0.5);
  gainNode.connect(ctx.destination);
  
  // Rising two-note chime
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start(now + i * 0.1);
    osc.stop(now + 0.5);
  });
}
```

#### 2. Trigger Sound and Particles on Completion

**File**: `src/stores/slices/crafting/craftingSlice.ts`

In `tickCrafting` where `CheeseCollected` is published for newly completed jobs:

```typescript
import { playCraftingCompleteSound } from '../../../systems/audioSystem';
import { emitParticles } from '../../../components/ui/ParticleContainer';

// After line 277 (where CheeseCollected event is published):
playCraftingCompleteSound();
emitParticles('confetti', { x: window.innerWidth / 2, y: window.innerHeight / 3 });
```

#### 3. Add Crafting Badge to Tab/Button

**File**: `src/App.tsx`

Add state to track uncollected completed crafts:

```typescript
const completedCrafts = useGameStore((s) => 
  s.crafting.activeJobs.filter(j => j.notificationSent && !j.collected).length
);

// In crafting button (desktop ~line 629, mobile ~line 799):
{completedCrafts > 0 && (
  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-xs text-white flex items-center justify-center">
    {completedCrafts}
  </span>
)}
```

### Success Criteria:

#### Manual Verification:
- [ ] Start a craft, wait for completion — sound plays, particles emit
- [ ] Crafting tab shows badge with count of ready-to-collect cheeses
- [ ] Collecting cheese clears the badge count
- [ ] Sound respects SFX volume setting

---

## Phase 8: Upgrade Affordable Badge

### Overview

Show a badge on the Upgrades button/tab when at least one upgrade becomes affordable.

### Changes Required:

#### 1. Add Selector for Affordable Upgrades Count

**File**: `src/stores/slices/production/productionSlice.ts`

```typescript
getAffordableUpgradeCount: () => {
  const state = get();
  const available = state.getAvailableUpgrades();
  return available.filter(u => state.canAffordUpgrade(u.id)).length;
},
```

#### 2. Add Badge to Upgrades Button

**File**: `src/App.tsx`

```typescript
const affordableUpgrades = useGameStore((s) => s.getAffordableUpgradeCount());

// In upgrades button (desktop ~line 535, mobile ~line 773):
<button ...>
  Upgrades
  {affordableUpgrades > 0 && (
    <span className="ml-1 px-1.5 py-0.5 bg-green-500 rounded-full text-xs text-white">
      {affordableUpgrades}
    </span>
  )}
</button>
```

### Success Criteria:

#### Manual Verification:
- [ ] When curds reach an upgrade's cost, badge appears on Upgrades button
- [ ] Buying the upgrade removes it from count
- [ ] Badge shows correct count when multiple upgrades affordable
- [ ] No badge when no upgrades affordable

---

## Phase 9: Audio SFX Bus with Compressor and Cooldowns

### Overview

Route all SFX through a shared gain node with a compressor to prevent clipping. Add per-sound cooldowns to prevent rapid stacking.

### Changes Required:

#### 1. Create Shared SFX Bus

**File**: `src/systems/audioSystem.ts`

```typescript
// Add after line 37 (module state):
let sfxBus: GainNode | null = null;
let sfxCompressor: DynamicsCompressorNode | null = null;

function getSfxBus(): GainNode {
  if (!sfxBus) {
    const ctx = getAudioContext();
    sfxCompressor = ctx.createDynamicsCompressor();
    sfxCompressor.threshold.value = -24;
    sfxCompressor.knee.value = 30;
    sfxCompressor.ratio.value = 12;
    sfxCompressor.attack.value = 0.003;
    sfxCompressor.release.value = 0.25;
    sfxCompressor.connect(ctx.destination);
    
    sfxBus = ctx.createGain();
    sfxBus.connect(sfxCompressor);
  }
  return sfxBus;
}
```

#### 2. Add Per-Sound Cooldowns

**File**: `src/systems/audioSystem.ts`

```typescript
const soundCooldowns: Map<string, number> = new Map();

function canPlaySound(soundId: string, cooldownMs: number): boolean {
  const now = performance.now();
  const lastPlayed = soundCooldowns.get(soundId) ?? 0;
  if (now - lastPlayed < cooldownMs) {
    return false;
  }
  soundCooldowns.set(soundId, now);
  return true;
}

const SFX_COOLDOWNS: Record<string, number> = {
  click: 30,
  purchase: 80,
  attack: 60,
  ability: 100,
  heal: 80,
  buff: 80,
  debuff: 80,
  defeat: 200,
};
```

#### 3. Route SFX Through Bus

Update all ~25 SFX functions to:
1. Check cooldown: `if (!canPlaySound('click', SFX_COOLDOWNS.click)) return;`
2. Connect to bus instead of destination: `gainNode.connect(getSfxBus());`

Example for `playClickSound`:
```typescript
export function playClickSound(): void {
  if (!canPlaySound('click', SFX_COOLDOWNS.click)) return;
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;
  
  const ctx = getAudioContext();
  const gainNode = ctx.createGain();
  // ... existing synthesis code ...
  gainNode.connect(getSfxBus()); // Changed from ctx.destination
}
```

#### 4. Unify Audio Settings Stores

**File**: `src/components/ui/AudioControls.tsx`

Remove local state and legacy persistence — use `settingsStore` as single source of truth:

```typescript
export function AudioControls() {
  const { 
    masterVolume, musicVolume, sfxVolume, musicEnabled, sfxEnabled,
    setMasterVolume, setMusicVolume, setSfxVolume, setMusicEnabled, setSfxEnabled
  } = useSettingsStore((s) => ({
    masterVolume: s.audio.masterVolume,
    musicVolume: s.audio.musicVolume,
    sfxVolume: s.audio.sfxVolume,
    musicEnabled: s.audio.musicEnabled,
    sfxEnabled: s.audio.sfxEnabled,
    setMasterVolume: s.setMasterVolume,
    setMusicVolume: s.setMusicVolume,
    setSfxVolume: s.setSfxVolume,
    setMusicEnabled: s.setMusicEnabled,
    setSfxEnabled: s.setSfxEnabled,
  }));
  
  // Remove loadAudioPreferences/saveAudioPreferences calls
  // The settingsStore persist middleware handles this
}
```

### Success Criteria:

#### Manual Verification:
- [ ] Rapid clicking doesn't create harsh stacked sounds
- [ ] Combat with multiple simultaneous hits doesn't clip
- [ ] Volume controls in both AudioControls and Settings panel stay in sync
- [ ] Audio preferences persist across page reloads (single localStorage key)

---

## Testing Strategy

### Automated Tests:
- Unit test for `formatNumber` with large values
- Unit test for `useIsMobile` hook (mock matchMedia)

### Manual Testing Steps:

1. **Performance**: Open React DevTools Profiler, trigger combat — verify App doesn't re-render on every combat tick
2. **Layout**: Resize browser window across 768px breakpoint — verify single layout mounts
3. **Offline**: Tab away 2+ minutes, return — verify curds increased
4. **Numbers**: Acquire 1Qa+ curds (use dev tools if needed) — verify display shows "Qa" not "1000.0T"
5. **Save**: Fill localStorage to near quota, try to save — verify error toast (not silent fail)
6. **Crafting**: Complete a craft — verify sound plays, particles emit, badge appears
7. **Upgrades**: Earn enough for an upgrade — verify badge appears on Upgrades button
8. **Audio**: Click rapidly, trigger combat — verify no harsh clipping

## Performance Considerations

- `useIsMobile` uses `matchMedia` event listener (no polling)
- Narrow selectors reduce re-render count from ~14 to 0 on unrelated state changes
- SFX bus is created once and reused (no per-sound overhead)
- `formatNumber` setting lookup could be memoized if profiling shows overhead

## References

- World-class polish roadmap: `thoughts/shared/research/2026-06-12_14-19-23_world-class-polish-roadmap.md`
- Currency animation plan: `thoughts/shared/plans/currency-animation-triggers.md`
- Existing offline progress: `src/systems/saveSystem.ts:271-290`
- Existing badge patterns: `src/App.tsx:490-545`
