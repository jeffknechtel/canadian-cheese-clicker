# Tier 3: Onboarding & Progressive Unlock Implementation Plan

## Overview

Transform the "everything at once" new player experience into guided discovery through progressive unlock of tabs/panels, contextual first-time hints, an in-game help modal, and a prestige recoup-time estimate. This addresses the biggest genuine gap identified in the world-class polish roadmap.

## Current State Analysis

**No onboarding exists:**
- All 7 mobile tabs render unconditionally (`App.tsx:629-761`)
- All 6 desktop panel buttons render unconditionally (`App.tsx:514-586`)
- All 15 generators visible from tick zero (`GeneratorPanel.tsx:169-170`)
- A/B stub for `onboarding_flow` with variants `['control', 'tutorial_tips', 'video_intro']` is commented out (`abTesting.ts:23-31`)

**Existing progressive unlock patterns we can reuse:**
- Zone unlocking: `isZoneUnlocked()` in `zones.ts:1110-1134` — supports `zone_complete`, `curds`, `achievement`, `none`
- Upgrade visibility: `checkRequirement()` in `productionSlice.ts:183-210` — gates by `generatorOwned` count
- Prestige tiers: `canPerformVintage/Legacy()` in `prestigeSlice.ts:159-162, 219-222` — reset count + currency
- Achievements: `checkAchievementRequirement()` in `achievementSlice.ts:34-189` — 25+ requirement types

**Only teaching surfaces:**
- 57 loading tips shown ~1.5s each (`loadingTips.ts:9-57`, `LoadingScreen.tsx:9,18-24`)
- Bare empty-state hints (`UpgradePanel.tsx:257-260`, `HeroPanel.tsx:387-392`)
- 32 native `title=` attributes for truncated text
- `GLOSSARY.md` is dev-only, not player-facing

## Desired End State

1. **Tabs/panels appear as systems become relevant** — new players see Generators → Upgrades, then unlock Combat, Heroes, Crafting, Prestige, Achievements progressively
2. **Generators revealed ~2 ahead of affordable** — maintains "what's next" anticipation without overwhelming
3. **Contextual first-time hints** — brief, dismissible hints on first click, first generator buy, first combat, first prestige
4. **In-game help modal** — player-facing glossary explaining Rennet, Whey, Eh, quality, and core mechanics
5. **Prestige recoup-time estimate** — AgingConfirmModal shows "Time to recoup current production: ~X minutes"

## What We're NOT Doing

- Full tutorial system with scripted sequences (the A/B `video_intro` variant)
- Forced tutorial that blocks gameplay
- Achievement progressive unlock (already gated by completion)
- Zone progressive unlock (already implemented via `isZoneUnlocked`)
- Changing the A/B testing framework itself

---

## Phase 1: Progressive Unlock Infrastructure

### Overview

Create a centralized unlock system that tracks which features the player has unlocked, with milestone-based thresholds stored in constants.

### Changes Required:

#### 1.1 Add Unlock Milestone Constants

**File**: `src/data/constants.ts`
**Location**: Add after existing milestone constants

```typescript
// Progressive unlock thresholds
export const UNLOCK_THRESHOLDS = {
  // Tabs/Panels (curds earned)
  upgrades: 0,           // Available immediately (generators need upgrades)
  combat: 1_000,         // After first few generators
  heroes: 10_000,        // After first combat attempts
  crafting: 100_000,     // Mid-game feature
  prestige: 1_000_000_000_000, // 1T curds (prestige becomes viable)
  achievements: 100,     // Show early to give goals
  
  // Generator reveal: show N generators ahead of what player can afford
  generatorRevealAhead: 2,
} as const;
```

#### 1.2 Add Unlock State to Persistence

**File**: `src/types/game.ts`
**Location**: Add to existing state types

```typescript
export interface UnlockState {
  // Tracks which features have been unlocked (persisted)
  unlockedFeatures: Set<FeatureId>;
  // Tracks which first-time hints have been shown (persisted)
  shownHints: Set<HintId>;
}

export type FeatureId = 
  | 'upgrades' 
  | 'combat' 
  | 'heroes' 
  | 'crafting' 
  | 'prestige' 
  | 'achievements';

export type HintId = 
  | 'firstClick'
  | 'firstGenerator'
  | 'firstCombat'
  | 'firstPrestige'
  | 'firstCraft';
```

#### 1.3 Create Unlock Slice

**File**: `src/stores/slices/unlock/unlockSlice.ts` (new file)

```typescript
import { StateCreator } from 'zustand';
import { UNLOCK_THRESHOLDS } from '@/data/constants';
import type { GameState } from '@/types/game';
import type { FeatureId, HintId } from '@/types/game';

export interface UnlockSlice {
  unlockedFeatures: Set<FeatureId>;
  shownHints: Set<HintId>;
  
  isFeatureUnlocked: (feature: FeatureId) => boolean;
  checkUnlocks: () => FeatureId[];  // Returns newly unlocked features
  isHintShown: (hint: HintId) => boolean;
  markHintShown: (hint: HintId) => void;
}

export const createUnlockSlice: StateCreator<GameState, [], [], UnlockSlice> = (set, get) => ({
  unlockedFeatures: new Set(['upgrades', 'achievements'] as FeatureId[]),
  shownHints: new Set(),
  
  isFeatureUnlocked: (feature: FeatureId) => {
    return get().unlockedFeatures.has(feature);
  },
  
  checkUnlocks: () => {
    const state = get();
    const totalCurds = state.totalCurdsEarned;
    const newlyUnlocked: FeatureId[] = [];
    
    const checks: [FeatureId, number][] = [
      ['combat', UNLOCK_THRESHOLDS.combat],
      ['heroes', UNLOCK_THRESHOLDS.heroes],
      ['crafting', UNLOCK_THRESHOLDS.crafting],
      ['prestige', UNLOCK_THRESHOLDS.prestige],
    ];
    
    for (const [feature, threshold] of checks) {
      if (!state.unlockedFeatures.has(feature) && totalCurds.gte(threshold)) {
        newlyUnlocked.push(feature);
      }
    }
    
    if (newlyUnlocked.length > 0) {
      set((s) => ({
        unlockedFeatures: new Set([...s.unlockedFeatures, ...newlyUnlocked]),
      }));
    }
    
    return newlyUnlocked;
  },
  
  isHintShown: (hint: HintId) => {
    return get().shownHints.has(hint);
  },
  
  markHintShown: (hint: HintId) => {
    set((s) => ({
      shownHints: new Set([...s.shownHints, hint]),
    }));
  },
});
```

#### 1.4 Wire Unlock Slice into Store

**File**: `src/stores/gameStore.ts`
**Changes**: Import and compose the unlock slice

```typescript
import { createUnlockSlice, UnlockSlice } from './slices/unlock/unlockSlice';

// Add to GameState type
export type GameState = ProductionSlice & HeroSlice & CombatSlice & ... & UnlockSlice;

// Add to store creation
export const useGameStore = create<GameState>()(
  // ...existing middleware
  (...args) => ({
    ...createProductionSlice(...args),
    ...createHeroSlice(...args),
    // ...existing slices
    ...createUnlockSlice(...args),
  })
);
```

#### 1.5 Add Unlock Check to Game Loop

**File**: `src/systems/gameLoop.ts`
**Location**: In the tick function, after production updates

```typescript
// Check for newly unlocked features
const newlyUnlocked = state.checkUnlocks();
if (newlyUnlocked.length > 0) {
  // Play unlock sound and show notification
  for (const feature of newlyUnlocked) {
    playUnlockSound();
    announce(`${getFeatureDisplayName(feature)} unlocked!`);
  }
}
```

#### 1.6 Add to Save/Load

**File**: `src/systems/saveSystem.ts`
**Changes**: Add unlockedFeatures and shownHints to save schema

```typescript
// In save function
unlockedFeatures: Array.from(state.unlockedFeatures),
shownHints: Array.from(state.shownHints),

// In load function
unlockedFeatures: new Set(saved.unlockedFeatures ?? ['upgrades', 'achievements']),
shownHints: new Set(saved.shownHints ?? []),
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`
- [x] App runs without console errors: `npm run dev`

#### Manual Verification:
- [ ] Fresh game starts with only Generators, Upgrades, Achievements tabs visible
- [ ] Reaching 1K curds unlocks Combat tab with notification
- [ ] Reaching 10K curds unlocks Heroes tab
- [ ] Reaching 100K curds unlocks Crafting tab
- [ ] Reaching 1T curds unlocks Prestige tab
- [ ] Unlocked features persist across page reload

---

## Phase 2: Tab/Panel Gating

### Overview

Gate mobile tabs and desktop panel buttons based on unlocked features.

### Changes Required:

#### 2.1 Create useUnlockedTabs Hook

**File**: `src/hooks/useUnlockedTabs.ts` (new file)

```typescript
import { useGameStore } from '@/stores/gameStore';
import { useShallow } from 'zustand/react/shallow';
import type { FeatureId } from '@/types/game';

type MobileTab = 'generators' | 'upgrades' | 'combat' | 'heroes' | 'achievements' | 'prestige' | 'crafting';
type RightPanelView = 'upgrades' | 'achievements' | 'heroes' | 'combat' | 'prestige' | 'crafting';

const TAB_TO_FEATURE: Record<MobileTab, FeatureId | null> = {
  generators: null,  // Always visible
  upgrades: 'upgrades',
  combat: 'combat',
  heroes: 'heroes',
  achievements: 'achievements',
  prestige: 'prestige',
  crafting: 'crafting',
};

export function useUnlockedTabs() {
  const isFeatureUnlocked = useGameStore((s) => s.isFeatureUnlocked);
  
  const isTabUnlocked = (tab: MobileTab | RightPanelView): boolean => {
    const feature = TAB_TO_FEATURE[tab as MobileTab];
    if (feature === null) return true;  // Generators always visible
    return isFeatureUnlocked(feature);
  };
  
  const unlockedMobileTabs = (['generators', 'upgrades', 'combat', 'heroes', 'achievements', 'prestige', 'crafting'] as MobileTab[])
    .filter(isTabUnlocked);
  
  const unlockedDesktopPanels = (['upgrades', 'combat', 'heroes', 'achievements', 'prestige', 'crafting'] as RightPanelView[])
    .filter(isTabUnlocked);
  
  return { isTabUnlocked, unlockedMobileTabs, unlockedDesktopPanels };
}
```

#### 2.2 Gate Mobile Tabs

**File**: `src/App.tsx`
**Location**: Mobile tab navigation bar (~lines 629-761)

```tsx
// Import the hook
import { useUnlockedTabs } from '@/hooks/useUnlockedTabs';

// In component:
const { isTabUnlocked, unlockedMobileTabs } = useUnlockedTabs();

// Replace the static tab list with:
{unlockedMobileTabs.map((tab) => (
  <button
    key={tab}
    onClick={() => setMobileTab(tab)}
    className={/* existing classes */}
  >
    {/* Tab content - move existing JSX into a TabButton component or inline */}
  </button>
))}
```

#### 2.3 Gate Desktop Panel Buttons

**File**: `src/App.tsx`
**Location**: Desktop header buttons (~lines 514-586)

```tsx
// Use the same hook
const { isTabUnlocked } = useUnlockedTabs();

// Wrap each panel button with conditional rendering:
{isTabUnlocked('combat') && (
  <button onClick={() => setRightPanelView('combat')} /* ... */>
    {/* Combat button content */}
  </button>
)}

{isTabUnlocked('heroes') && (
  <button onClick={() => setRightPanelView('heroes')} /* ... */>
    {/* Heroes button content */}
  </button>
)}

// ... repeat for achievements, prestige, crafting
```

#### 2.4 Handle Default Panel When Current Is Locked

**File**: `src/App.tsx`
**Location**: After unlock hook usage

```tsx
// If current panel becomes locked (e.g., fresh game), fallback to first unlocked
useEffect(() => {
  if (!isTabUnlocked(rightPanelView)) {
    setRightPanelView('upgrades');  // Upgrades is always unlocked
  }
  if (!isTabUnlocked(mobileTab) && mobileTab !== 'generators') {
    setMobileTab('generators');
  }
}, [isTabUnlocked, rightPanelView, mobileTab]);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Fresh game mobile: only Generators, Upgrades, Achievements tabs visible
- [ ] Fresh game desktop: only Upgrades, Achievements panel buttons visible
- [ ] Earning 1K curds makes Combat tab/button appear
- [ ] Tab bar doesn't show empty gaps where locked tabs would be
- [ ] Keyboard navigation (1-7) only cycles through unlocked tabs

---

## Phase 3: Generator Progressive Reveal

### Overview

Show generators ~2 ahead of what the player can afford, creating "what's next" anticipation without overwhelming.

### Changes Required:

#### 3.1 Add Generator Visibility Logic

**File**: `src/stores/slices/production/productionSlice.ts`
**Location**: Add new selector

```typescript
import { UNLOCK_THRESHOLDS } from '@/data/constants';
import { GENERATORS } from '@/data/generators';

// Add to slice:
getVisibleGenerators: () => {
  const state = get();
  const curds = state.curds;
  
  // Find the highest generator the player can afford
  let highestAffordableIndex = -1;
  for (let i = 0; i < GENERATORS.length; i++) {
    if (curds.gte(GENERATORS[i].baseCost)) {
      highestAffordableIndex = i;
    }
  }
  
  // Show up to N generators ahead
  const revealUpTo = Math.min(
    highestAffordableIndex + UNLOCK_THRESHOLDS.generatorRevealAhead + 1,
    GENERATORS.length
  );
  
  // Always show at least the first 3 generators
  const minVisible = 3;
  
  return GENERATORS.slice(0, Math.max(revealUpTo, minVisible));
},
```

#### 3.2 Update GeneratorPanel to Use Visible Generators

**File**: `src/components/ui/GeneratorPanel.tsx`
**Location**: Replace GENERATORS usage (~line 169-170)

```tsx
// Instead of:
// {GENERATORS.map((generator) => ...)}

// Use:
const visibleGenerators = useGameStore((s) => s.getVisibleGenerators());

// Then:
{visibleGenerators.map((generator) => (
  <GeneratorCard key={generator.id} generator={generator} />
))}

// Add a "more to unlock" indicator at the bottom if there are hidden generators:
{visibleGenerators.length < GENERATORS.length && (
  <div className="text-center text-gray-500 py-4 text-sm">
    <span className="text-lg">🔒</span>
    <p>More generators unlock as you progress!</p>
    <p className="text-xs mt-1">
      Next: {GENERATORS[visibleGenerators.length]?.name}
    </p>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Fresh game shows first 3 generators
- [ ] Earning enough to afford generator 2 reveals generator 4
- [ ] "More generators unlock" hint shows at bottom
- [ ] All 15 generators visible once player can afford the 13th

---

## Phase 4: First-Time Hint System

### Overview

Show brief, dismissible contextual hints on key first interactions.

### Changes Required:

#### 4.1 Create FirstTimeHint Component

**File**: `src/components/ui/shared/FirstTimeHint.tsx` (new file)

```tsx
import { useGameStore } from '@/stores/gameStore';
import type { HintId } from '@/types/game';

interface FirstTimeHintProps {
  hintId: HintId;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const HINT_CONTENT: Record<HintId, { title: string; message: string }> = {
  firstClick: {
    title: 'Click the Cheese!',
    message: 'Click or tap the cheese wheel to earn curds. Keep clicking to grow your cheese empire!',
  },
  firstGenerator: {
    title: 'Automated Production',
    message: 'Generators produce curds automatically every second. Buy more to increase your CPS!',
  },
  firstCombat: {
    title: 'Battle for Cheese',
    message: 'Send heroes to fight enemies across Canada. Defeat bosses to unlock new zones!',
  },
  firstPrestige: {
    title: 'Aging Your Cheese',
    message: 'Reset your progress to earn Rennet, a permanent multiplier. The more curds you have, the more Rennet you gain!',
  },
  firstCraft: {
    title: 'Cheese Crafting',
    message: 'Craft special cheeses for temporary buffs. Higher quality ingredients give better results!',
  },
};

export function FirstTimeHint({ hintId, children, position = 'bottom' }: FirstTimeHintProps) {
  const isHintShown = useGameStore((s) => s.isHintShown);
  const markHintShown = useGameStore((s) => s.markHintShown);
  
  const shouldShow = !isHintShown(hintId);
  const content = HINT_CONTENT[hintId];
  
  if (!shouldShow) {
    return <>{children}</>;
  }
  
  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };
  
  return (
    <div className="relative">
      {children}
      <div 
        className={`absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 z-50 w-64 animate-fade-in`}
        role="tooltip"
      >
        <div className="bg-rind text-white rounded-lg shadow-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{content.title}</p>
              <p className="text-xs mt-1 text-white/90">{content.message}</p>
            </div>
            <button
              onClick={() => markHintShown(hintId)}
              className="text-white/70 hover:text-white shrink-0"
              aria-label="Dismiss hint"
            >
              ✕
            </button>
          </div>
          <button
            onClick={() => markHintShown(hintId)}
            className="mt-2 w-full text-xs bg-white/20 hover:bg-white/30 rounded py-1 transition-colors"
          >
            Got it!
          </button>
        </div>
        {/* Arrow */}
        <div className={`absolute left-1/2 -translate-x-1/2 ${position === 'bottom' ? '-top-1' : '-bottom-1'} border-4 border-transparent ${position === 'bottom' ? 'border-b-rind' : 'border-t-rind'}`} />
      </div>
    </div>
  );
}
```

#### 4.2 Add Hint to Cheese Wheel (First Click)

**File**: `src/components/game/GameScene.tsx`
**Location**: Around the cheese wheel mesh

```tsx
import { FirstTimeHint } from '@/components/ui/shared/FirstTimeHint';

// Wrap the clickable cheese wheel:
<FirstTimeHint hintId="firstClick" position="bottom">
  {/* existing cheese wheel mesh */}
</FirstTimeHint>
```

#### 4.3 Add Hint to First Generator Purchase

**File**: `src/components/ui/GeneratorPanel.tsx`
**Location**: Around the first generator card

```tsx
import { FirstTimeHint } from '@/components/ui/shared/FirstTimeHint';

// For the first generator only:
{visibleGenerators.map((generator, index) => (
  index === 0 ? (
    <FirstTimeHint key={generator.id} hintId="firstGenerator" position="right">
      <GeneratorCard generator={generator} />
    </FirstTimeHint>
  ) : (
    <GeneratorCard key={generator.id} generator={generator} />
  )
))}
```

#### 4.4 Add Hint When Combat Unlocks

**File**: `src/App.tsx`
**Location**: When Combat tab first appears

```tsx
// In the unlock notification handler (from Phase 1):
if (feature === 'combat') {
  // Mark that we should show the combat hint when they navigate there
  // The hint will show on the CombatPanel itself
}
```

**File**: `src/components/ui/ZoneSelectPanel.tsx`
**Location**: Wrap the zone selection content

```tsx
import { FirstTimeHint } from '@/components/ui/shared/FirstTimeHint';

// At the top of the panel:
<FirstTimeHint hintId="firstCombat" position="top">
  <div className="...">
    {/* Zone selection content */}
  </div>
</FirstTimeHint>
```

#### 4.5 Add Hint to Prestige Panel

**File**: `src/components/ui/PrestigePanel.tsx`
**Location**: Near the Aging button

```tsx
import { FirstTimeHint } from '@/components/ui/shared/FirstTimeHint';

// Wrap the aging section:
<FirstTimeHint hintId="firstPrestige" position="top">
  {/* Aging button and explanation */}
</FirstTimeHint>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Fresh game shows "Click the Cheese!" hint near wheel
- [ ] Dismissing hint persists across page reload
- [ ] First generator hint appears next to Milk Pail
- [ ] Combat hint shows when first entering Combat tab
- [ ] Prestige hint shows when first entering Prestige tab
- [ ] Hints are accessible (keyboard dismissible, proper ARIA)

---

## Phase 5: In-Game Help Modal

### Overview

Create a player-facing mechanics glossary explaining core concepts: Curds, CPS, Rennet, Whey, Eh, and quality.

### Changes Required:

#### 5.1 Create HelpModal Component

**File**: `src/components/ui/HelpModal.tsx` (new file)

```tsx
import { ModalOverlay } from '@/components/ui/shared/ModalOverlay';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELP_SECTIONS = [
  {
    title: 'Curds & Production',
    icon: '🧀',
    items: [
      { term: 'Curds', definition: 'The primary currency. Earned by clicking the cheese wheel or from generators.' },
      { term: 'CPS', definition: 'Curds Per Second — your automatic production rate from generators and bonuses.' },
      { term: 'Generators', definition: 'Automated producers that generate curds every second. More = higher CPS.' },
    ],
  },
  {
    title: 'Prestige & Multipliers',
    icon: '⭐',
    items: [
      { term: 'Rennet', definition: 'Prestige currency earned by Aging (resetting). Permanently boosts all production.' },
      { term: 'Whey', definition: 'Secondary prestige currency for powerful synergy upgrades.' },
      { term: 'Eh', definition: 'Canadian politeness bonus! Increases over time and multiplies both CPS and click value.' },
      { term: 'Aging', definition: 'Reset your curds and generators to earn Rennet. More curds = more Rennet gained.' },
    ],
  },
  {
    title: 'Combat',
    icon: '⚔️',
    items: [
      { term: 'Heroes', definition: 'Recruit heroes to fight across Canada. Each has unique abilities.' },
      { term: 'ATB', definition: 'Active Time Battle — heroes and enemies act when their bar fills.' },
      { term: 'Limit Break', definition: 'Powerful ultimate ability that charges as your heroes take and deal damage.' },
      { term: 'Zones', definition: 'Battle areas representing Canadian provinces. Defeat bosses to unlock new zones.' },
    ],
  },
  {
    title: 'Crafting',
    icon: '🪤',
    items: [
      { term: 'Recipes', definition: 'Craft special cheeses that provide temporary production and combat buffs.' },
      { term: 'Quality', definition: 'Higher quality ingredients produce stronger, longer-lasting buffs.' },
      { term: 'Caves', definition: 'Affinage caves for aging cheese. Unlock more caves with Rennet.' },
    ],
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;
  
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-panel-wood rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-modal-in">
        <div className="bg-header-timmys px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📖</span> Game Guide
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl"
            aria-label="Close help"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
          {HELP_SECTIONS.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <h3 className="font-semibold text-rind-700 flex items-center gap-2 mb-2">
                <span>{section.icon}</span> {section.title}
              </h3>
              <dl className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.term} className="bg-white/50 rounded p-2">
                    <dt className="font-medium text-sm text-rind-800">{item.term}</dt>
                    <dd className="text-xs text-rind-600 mt-0.5">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        
        <div className="px-4 py-3 bg-white/30 text-center">
          <p className="text-xs text-rind-500">
            Press <kbd className="keyboard-key">?</kbd> anytime to open this guide
          </p>
        </div>
      </div>
    </ModalOverlay>
  );
}
```

#### 5.2 Add Help Button to Header

**File**: `src/App.tsx`
**Location**: Near settings button in header

```tsx
import { HelpModal } from '@/components/ui/HelpModal';

// Add state:
const [isHelpOpen, setIsHelpOpen] = useState(false);

// Add button near settings (desktop):
<button
  onClick={() => setIsHelpOpen(true)}
  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
  aria-label="Help"
  title="Game Guide"
>
  <span className="text-xl">❓</span>
</button>

// Add modal:
<HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
```

#### 5.3 Add Keyboard Shortcut

**File**: `src/App.tsx`
**Location**: In keyboard handler

```tsx
// Add to existing keyboard handler:
if (event.key === '?' || (event.shiftKey && event.key === '/')) {
  setIsHelpOpen(true);
  return;
}
```

#### 5.4 Update KeyboardHelpModal

**File**: `src/components/ui/KeyboardHelpModal.tsx`
**Location**: Add to General shortcuts

```tsx
{ key: '?', description: 'Open game guide' },
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Help button visible in header
- [ ] Clicking opens modal with all sections
- [ ] Pressing `?` key opens modal
- [ ] Modal is scrollable on small screens
- [ ] Modal closes with X, Escape, or clicking outside
- [ ] Content explains all core mechanics clearly

---

## Phase 6: Prestige Recoup-Time Estimate

### Overview

Add a "Time to recoup" estimate to the AgingConfirmModal showing how long it will take to regain current production after resetting.

### Changes Required:

#### 6.1 Add Recoup Time Calculation

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Location**: Add new selector

```typescript
calculateRecoupTime: () => {
  const state = get();
  const currentCps = state.curdPerSecond;
  const currentCurds = state.curds;
  
  // Calculate what CPS will be after prestige with new rennet
  const newRennet = state.prestige.rennet + calculatePotentialRennet(currentCurds);
  const newMultiplier = calculateRennetMultiplier(newRennet);
  const currentMultiplier = calculateRennetMultiplier(state.prestige.rennet);
  
  // Estimate: if player replays at same pace, how long to reach current CPS?
  // This is an approximation - assumes linear progression
  const multiplierGain = newMultiplier / currentMultiplier;
  
  // Time to reach current curds with new multiplier
  // Rough estimate: currentCurds / (averageCps * multiplierGain)
  // Use current CPS as the "average" for simplicity
  const estimatedSeconds = currentCurds.div(currentCps.mul(multiplierGain)).toNumber();
  
  return estimatedSeconds;
},
```

#### 6.2 Add Recoup Display to AgingConfirmModal

**File**: `src/components/ui/AgingConfirmModal.tsx`
**Location**: After the multiplier comparison, before the buttons

```tsx
// Get recoup time
const recoupSeconds = useGameStore((s) => s.calculateRecoupTime());

// Format as human-readable time
function formatRecoupTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return 'instantly';
  if (seconds < 60) return 'less than a minute';
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} minutes`;
  if (seconds < 86400) return `~${(seconds / 3600).toFixed(1)} hours`;
  return `~${(seconds / 86400).toFixed(1)} days`;
}

// In the modal content, add:
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
  <p className="text-sm text-blue-800 flex items-center gap-2">
    <span>⏱️</span>
    <span>
      <strong>Time to recoup:</strong> {formatRecoupTime(recoupSeconds)}
    </span>
  </p>
  <p className="text-xs text-blue-600 mt-1">
    Estimated time to regain your current production level after resetting.
  </p>
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] AgingConfirmModal shows recoup time estimate
- [ ] Estimate is reasonable (minutes for early game, hours for late game)
- [ ] Edge cases handled: very low CPS shows "instantly" or graceful message
- [ ] Tooltip explains what the estimate means

---

## Testing Strategy

### Unit Tests:

No existing test suite. Focus on manual verification.

### Manual Testing Steps:

1. **Fresh game progression test**:
   - Start new game, verify only Generators/Upgrades/Achievements visible
   - Earn 1K curds → Combat unlocks with notification
   - Earn 10K curds → Heroes unlocks
   - Earn 100K curds → Crafting unlocks
   - Earn 1T curds → Prestige unlocks

2. **Generator reveal test**:
   - Fresh game shows 3 generators
   - Buy enough to afford generator 2 → generator 4 appears
   - "More generators" indicator visible until all revealed

3. **Hint system test**:
   - Fresh game shows cheese click hint
   - Dismiss hint → doesn't reappear on reload
   - Navigate to each new tab → see corresponding hint

4. **Help modal test**:
   - Click help button → modal opens
   - Press `?` key → modal opens
   - All sections readable, scrollable
   - Escape closes modal

5. **Recoup time test**:
   - Open Aging modal at various progression points
   - Verify estimate is shown and reasonable
   - Very early game should show short time
   - Late game should show longer time

## Performance Considerations

- `checkUnlocks()` runs every tick — uses simple comparisons, no expensive operations
- `getVisibleGenerators()` iterates 15 generators max — negligible cost
- Hint state stored in Set for O(1) lookup
- No re-renders triggered by unlock checks unless something actually unlocks

## Migration Notes

- Existing saves will start with all features unlocked (backward compatible)
- Add migration in `saveSystem.ts` to set `unlockedFeatures` to all features for saves without the field
- Fresh games will start with progressive unlock

```typescript
// In load function, handle missing unlock data:
if (!saved.unlockedFeatures) {
  // Existing save — unlock everything to preserve experience
  state.unlockedFeatures = new Set(['upgrades', 'combat', 'heroes', 'crafting', 'prestige', 'achievements']);
} else {
  state.unlockedFeatures = new Set(saved.unlockedFeatures);
}
```

## References

- World-class polish roadmap: `thoughts/shared/research/2026-06-12_14-19-23_world-class-polish-roadmap.md`
- Existing unlock patterns: `src/data/zones.ts:1110-1134`, `src/stores/slices/production/productionSlice.ts:183-210`
- A/B stub: `src/systems/abTesting.ts:23-31`
- Developer glossary: `docs/GLOSSARY.md`
- Loading tips: `src/data/loadingTips.ts`
