# Phase 1: Foundation (Core Loop) Implementation Plan

## Overview

This plan covers the implementation of Phase 1 from "The Great Canadian Cheese Quest" game design document. Phase 1 establishes the core clicker mechanics, basic Three.js scene, and fundamental game loop that all future phases will build upon.

**Goal**: Create a playable clicker game with a satisfying core loop featuring a 3D cheese wheel, basic progression system, and persistent save/load functionality.

## Current State Analysis

**Repository**: `/Users/jknechtel/dev/game`
**Starting Point**: Greenfield project - empty placeholder files exist (`game.html`, `js/`, `css/` directories) but no actual code.

### Key Constraints

- Browser-based game (desktop + mobile responsive)
- Must support both active clicking and idle progression
- Performance targets: 60 FPS desktop, 30 FPS mobile, <3s initial load
- LocalStorage persistence required

## Desired End State

A fully playable clicker game with:

1. **Vite + React + TypeScript project** properly configured
2. **React Three Fiber scene** with interactive 3D cheese wheel
3. **Tailwind CSS** styled UI with cheese/Canadian color palette
4. **Zustand store** managing all game state
5. **5 generators** with purchase and auto-production
6. **Upgrade system** for clicks and generators
7. **Save/Load system** with auto-save and offline progress

### Verification Criteria

- `pnpm dev` launches the game at localhost
- Clicking the cheese wheel produces curds with visual/audio feedback
- Generators can be purchased and produce curds automatically
- Upgrades can be purchased and affect production
- Game state persists across page reloads
- Offline progress is calculated and awarded on return

## Assumptions Made

1. **No existing code** - Starting completely fresh despite placeholder files
2. **Modern browser targets** - ES2022+, no IE11 support needed
3. **pnpm as package manager** - Standard for modern projects
4. **No backend** - Fully client-side with LocalStorage only
5. **decimal.js for big numbers** - Will be needed even in Phase 1 for proper scaling
6. **Placeholder 3D assets** - Will use simple geometric shapes initially, real assets later

## What We're NOT Doing

- Canadian theme visuals (Phase 2)
- Hero system (Phase 3)
- Combat system (Phase 4)
- Prestige system (Phase 5)
- Advanced cheese crafting (Phase 6)
- Audio beyond basic click feedback (Phase 2)
- Mobile-specific optimizations (Phase 8)
- Analytics/telemetry (Phase 8)

## Implementation Approach

We'll implement in sub-phases, each building on the previous:

1. **1.1** - Project scaffolding and tooling setup
2. **1.2** - Three.js scene with clickable cheese wheel
3. **1.3** - Core clicker mechanics (currencies, clicking)
4. **1.4** - Generator system (5 generators, purchase, production)
5. **1.5** - Upgrade system (click upgrades, generator efficiency)
6. **1.6** - Save/Load system with offline progress

---

## Phase 1.1: Project Setup

### Overview

Initialize the project with Vite, React, TypeScript, Tailwind CSS, React Three Fiber, and Zustand. Establish the folder structure and configuration files.

### Changes Required

#### 1. Initialize Project

**Action**: Create Vite + React + TypeScript project

```bash
pnpm create vite . --template react-ts
pnpm add three @react-three/fiber @react-three/drei zustand decimal.js
pnpm add -D @types/three tailwindcss postcss autoprefixer
```

#### 2. Configure Tailwind CSS

**File**: `tailwind.config.js`
**Changes**: Create with custom cheese/Canadian color palette

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cheese colors
        cheddar: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primary cheddar
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Canadian colors
        maple: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Maple red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        cream: '#fffef5',
        rind: '#8b7355',
      },
    },
  },
  plugins: [],
};
```

**File**: `src/index.css`
**Changes**: Add Tailwind directives and base styles

#### 3. Establish Folder Structure

```
src/
├── components/
│   ├── game/           # 3D game components
│   │   ├── CheeseWheel.tsx
│   │   ├── GameScene.tsx
│   │   └── ClickEffects.tsx
│   └── ui/             # Tailwind UI components
│       ├── CurrencyDisplay.tsx
│       ├── GeneratorPanel.tsx
│       ├── UpgradePanel.tsx
│       └── Layout.tsx
├── stores/
│   └── gameStore.ts    # Zustand store
├── systems/
│   ├── clickerEngine.ts
│   ├── productionEngine.ts
│   └── saveSystem.ts
├── data/
│   ├── generators.ts   # Generator definitions
│   └── upgrades.ts     # Upgrade definitions
├── types/
│   └── game.ts         # TypeScript interfaces
├── utils/
│   ├── formatNumber.ts # Big number formatting
│   └── calculations.ts # Game math
├── App.tsx
└── main.tsx
```

#### 4. Configure TypeScript

**File**: `tsconfig.json`
**Changes**: Enable strict mode, configure paths

### Success Criteria

#### Automated Verification

- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts development server
- [ ] `pnpm build` produces production build
- [ ] `pnpm tsc --noEmit` passes type checking

#### Manual Verification

- [ ] Browser shows placeholder React app at localhost:5173
- [ ] Tailwind classes apply correctly

---

## Phase 1.2: Core Clicker Mechanics

### Overview

Implement the basic clicker mechanics: currencies (Curds, Whey), click handling, and the 3D cheese wheel with visual feedback.

### Changes Required

#### 1. Game Types

**File**: `src/types/game.ts`
**Changes**: Define core game interfaces

```typescript
import Decimal from 'decimal.js';

export interface GameState {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
  generators: Record<string, number>;
  upgrades: string[];
  lastSaved: number;
  gameStarted: number;
}

export interface Generator {
  id: string;
  name: string;
  description: string;
  baseCost: Decimal;
  baseCps: Decimal; // Curds per second
  costMultiplier: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: Decimal;
  costCurrency: 'curds' | 'whey';
  effect: UpgradeEffect;
  requirement?: UpgradeRequirement;
}

export type UpgradeEffect =
  | { type: 'clickMultiplier'; value: number }
  | { type: 'generatorMultiplier'; generatorId: string; value: number }
  | { type: 'globalMultiplier'; value: number };

export interface UpgradeRequirement {
  type: 'generatorOwned';
  generatorId: string;
  count: number;
}
```

#### 2. Zustand Store

**File**: `src/stores/gameStore.ts`
**Changes**: Implement core game state management

```typescript
import { create } from 'zustand';
import Decimal from 'decimal.js';
import type { GameState } from '../types/game';

interface GameStore extends GameState {
  // Actions
  click: () => void;
  tick: (deltaMs: number) => void;
  buyGenerator: (id: string, count: number) => boolean;
  buyUpgrade: (id: string) => boolean;
  getGeneratorCost: (id: string, count: number) => Decimal;
  canAffordGenerator: (id: string, count: number) => boolean;
  canAffordUpgrade: (id: string) => boolean;
  // Persistence
  save: () => void;
  load: () => void;
  calculateOfflineProgress: (lastSaved: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  curds: new Decimal(0),
  whey: new Decimal(0),
  totalCurdsEarned: new Decimal(0),
  totalClicks: 0,
  curdPerClick: new Decimal(1),
  curdPerSecond: new Decimal(0),
  generators: {},
  upgrades: [],
  lastSaved: Date.now(),
  gameStarted: Date.now(),

  // Actions implemented in Phase 1.2-1.6
  click: () => { /* ... */ },
  tick: (deltaMs) => { /* ... */ },
  // ... etc
}));
```

#### 3. 3D Cheese Wheel Component

**File**: `src/components/game/CheeseWheel.tsx`
**Changes**: Create interactive 3D cheese wheel

- Cylindrical geometry with cheese-colored material
- Hover effect (subtle glow/scale)
- Click animation (wobble/bounce)
- Particle burst on click (cheese crumbs)

#### 4. Click Effects Component

**File**: `src/components/game/ClickEffects.tsx`
**Changes**: Floating number animations on click

- Show "+X curds" floating up from click point
- Fade out and disappear
- Pool and reuse DOM elements for performance

#### 5. Currency Display

**File**: `src/components/ui/CurrencyDisplay.tsx`
**Changes**: Show current curds with animated counter

- Smooth number transitions using CSS
- Format large numbers (K, M, B, T notation)
- Show curds per second

### Success Criteria

#### Automated Verification

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` succeeds

#### Manual Verification

- [ ] 3D cheese wheel renders in scene
- [ ] Clicking wheel increments curd counter
- [ ] Click shows visual feedback (wobble, particles)
- [ ] Floating numbers appear on click
- [ ] Currency display updates smoothly

---

## Phase 1.3: Basic Generator System

### Overview

Implement the first 5 generators with purchasing, ownership tracking, and automatic curd production.

### Changes Required

#### 1. Generator Data

**File**: `src/data/generators.ts`
**Changes**: Define 5 initial generators

```typescript
import Decimal from 'decimal.js';
import type { Generator } from '../types/game';

export const GENERATORS: Generator[] = [
  {
    id: 'milk_pail',
    name: 'Milk Pail',
    description: 'A humble pail for collecting fresh milk',
    baseCost: new Decimal(15),
    baseCps: new Decimal(1),
    costMultiplier: 1.15,
  },
  {
    id: 'cheese_vat',
    name: 'Cheese Vat',
    description: 'A proper vat for curdling milk',
    baseCost: new Decimal(100),
    baseCps: new Decimal(8),
    costMultiplier: 1.15,
  },
  {
    id: 'aging_rack',
    name: 'Aging Rack',
    description: 'Wooden racks for aging your curds',
    baseCost: new Decimal(1100),
    baseCps: new Decimal(47),
    costMultiplier: 1.15,
  },
  {
    id: 'cheese_cave',
    name: 'Cheese Cave',
    description: 'A cool cave perfect for aging cheese',
    baseCost: new Decimal(12000),
    baseCps: new Decimal(260),
    costMultiplier: 1.15,
  },
  {
    id: 'fromager_apprentice',
    name: 'Fromager Apprentice',
    description: 'A budding cheese master learning the craft',
    baseCost: new Decimal(130000),
    baseCps: new Decimal(1400),
    costMultiplier: 1.15,
  },
];
```

#### 2. Production Engine

**File**: `src/systems/productionEngine.ts`
**Changes**: Calculate and apply production

- `calculateCps()` - Sum all generator contributions
- `calculateGeneratorCost()` - Apply cost scaling formula
- `tick()` - Add production based on delta time

#### 3. Store Updates

**File**: `src/stores/gameStore.ts`
**Changes**: Implement generator actions

- `buyGenerator(id, count)` - Purchase generators
- `getGeneratorCost(id, count)` - Calculate cost for N generators
- `canAffordGenerator(id, count)` - Check affordability
- Update `tick()` to apply production

#### 4. Generator Panel UI

**File**: `src/components/ui/GeneratorPanel.tsx`
**Changes**: Create generator purchase interface

- List all generators with name, description, cost
- Show owned count for each
- Buy buttons (1, 10, 100, max)
- Disable when can't afford
- Visual feedback on purchase

#### 5. Game Loop

**File**: `src/systems/gameLoop.ts`
**Changes**: Implement tick-based game loop

- requestAnimationFrame-based loop
- Calculate delta time
- Call store.tick() each frame
- Handle tab visibility (pause/resume)

### Success Criteria

#### Automated Verification

- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm build` succeeds

#### Manual Verification

- [x] All 5 generators display in panel
- [x] Can purchase generators when affordable
- [x] Cost increases with each purchase
- [x] Curds accumulate automatically based on owned generators
- [x] CPS display updates when generators purchased
- [x] Bulk buy (10, 100, max) works correctly

---

## Phase 1.4: Upgrade System

### Overview

Implement upgrades for click power and generator efficiency, including milestone-based unlocks.

### Changes Required

#### 1. Upgrade Data

**File**: `src/data/upgrades.ts`
**Changes**: Define initial upgrades

```typescript
import Decimal from 'decimal.js';
import type { Upgrade } from '../types/game';

export const UPGRADES: Upgrade[] = [
  // Click upgrades
  {
    id: 'reinforced_fingers',
    name: 'Reinforced Fingers',
    description: 'Double your clicking power',
    cost: new Decimal(100),
    costCurrency: 'curds',
    effect: { type: 'clickMultiplier', value: 2 },
  },
  {
    id: 'carpal_tunnel_prevention',
    name: 'Carpal Tunnel Prevention',
    description: 'Proper ergonomics, 5x click power',
    cost: new Decimal(5000),
    costCurrency: 'curds',
    effect: { type: 'clickMultiplier', value: 5 },
  },
  {
    id: 'bionic_hand',
    name: 'Bionic Hand',
    description: '10x click power with cybernetic enhancement',
    cost: new Decimal(50000),
    costCurrency: 'curds',
    effect: { type: 'clickMultiplier', value: 10 },
  },
  // Generator efficiency upgrades (milestone-based)
  {
    id: 'bigger_pails',
    name: 'Bigger Pails',
    description: 'Milk Pails are twice as effective',
    cost: new Decimal(1000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'milk_pail', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'milk_pail', count: 10 },
  },
  {
    id: 'insulated_vats',
    name: 'Insulated Vats',
    description: 'Cheese Vats are twice as effective',
    cost: new Decimal(5000),
    costCurrency: 'curds',
    effect: { type: 'generatorMultiplier', generatorId: 'cheese_vat', value: 2 },
    requirement: { type: 'generatorOwned', generatorId: 'cheese_vat', count: 10 },
  },
  // ... more upgrades for each generator at 10, 25, 50, 100 owned
];
```

#### 2. Store Updates

**File**: `src/stores/gameStore.ts`
**Changes**: Implement upgrade logic

- `buyUpgrade(id)` - Purchase upgrade
- `canAffordUpgrade(id)` - Check affordability
- `isUpgradeVisible(id)` - Check if requirements met
- `getClickMultiplier()` - Calculate total click multiplier
- `getGeneratorMultiplier(id)` - Calculate generator multiplier

#### 3. Upgrade Panel UI

**File**: `src/components/ui/UpgradePanel.tsx`
**Changes**: Create upgrade purchase interface

- Show available upgrades (requirements met)
- Display cost, name, effect
- Purchased upgrades section
- Visual distinction for affordable vs not

### Success Criteria

#### Automated Verification

- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm build` succeeds

#### Manual Verification

- [ ] Click upgrades appear and can be purchased
- [ ] Click power increases after buying click upgrades
- [ ] Generator milestone upgrades appear at correct thresholds
- [ ] Generator production increases after buying efficiency upgrades
- [ ] Purchased upgrades show in "owned" section
- [ ] Upgrade effects persist after page reload (after Phase 1.5)

---

## Phase 1.5: Save/Load System

### Overview

Implement persistent game state with LocalStorage, auto-save, and offline progress calculation.

### Changes Required

#### 1. Save System

**File**: `src/systems/saveSystem.ts`
**Changes**: Implement save/load logic

```typescript
import Decimal from 'decimal.js';
import type { GameState } from '../types/game';

const SAVE_KEY = 'canadian_cheese_quest_save';
const SAVE_VERSION = 1;

interface SaveData {
  version: number;
  state: SerializedGameState;
}

// Decimal.js values need serialization
interface SerializedGameState {
  curds: string;
  whey: string;
  totalCurdsEarned: string;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: string[];
  lastSaved: number;
  gameStarted: number;
}

export function saveGame(state: GameState): void {
  const data: SaveData = {
    version: SAVE_VERSION,
    state: serializeState(state),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  const data: SaveData = JSON.parse(raw);
  // Handle version migrations here
  return deserializeState(data.state);
}

export function calculateOfflineProgress(
  state: GameState,
  now: number
): { curds: Decimal; seconds: number } {
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60; // 8 hours max
  const elapsed = Math.min(
    (now - state.lastSaved) / 1000,
    MAX_OFFLINE_SECONDS
  );

  const curdsEarned = state.curdPerSecond.mul(elapsed);
  return { curds: curdsEarned, seconds: elapsed };
}
```

#### 2. Store Integration

**File**: `src/stores/gameStore.ts`
**Changes**: Add persistence actions

- `save()` - Persist current state
- `load()` - Restore from LocalStorage
- Auto-save every 30 seconds
- Call `load()` on store initialization

#### 3. Offline Progress Modal

**File**: `src/components/ui/OfflineProgressModal.tsx`
**Changes**: Show welcome back screen

- Display time away
- Show curds earned while offline
- "Welcome back, eh!" message
- Dismiss button

#### 4. App Integration

**File**: `src/App.tsx`
**Changes**: Initialize game loop and persistence

- Load saved game on mount
- Start game loop
- Set up auto-save interval
- Handle visibility change (save on tab hide)

### Success Criteria

#### Automated Verification

- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm build` succeeds

#### Manual Verification

- [ ] Game state persists after page reload
- [ ] Generators, upgrades, currencies all restored correctly
- [ ] Closing and reopening shows offline progress modal
- [ ] Offline curds calculated correctly based on CPS
- [ ] Manual save (if exposed) works
- [ ] Corrupted save data handled gracefully (fresh start)

---

## Phase 1.6: Layout and Polish

### Overview

Create the responsive game layout, integrate all components, and add visual polish.

### Changes Required

#### 1. Main Layout

**File**: `src/components/ui/Layout.tsx`
**Changes**: Create responsive game layout

```
Desktop Layout:
┌─────────────────────────────────────────────────────┐
│ [Currency Display - Curds: XXX | CPS: XXX]          │
├─────────────┬───────────────────────┬───────────────┤
│  Generator  │                       │   Upgrade     │
│   Panel     │    3D Scene           │    Panel      │
│   (left)    │   (Cheese Wheel)      │   (right)     │
│             │                       │               │
└─────────────┴───────────────────────┴───────────────┘

Mobile Layout:
┌─────────────────────┐
│ [Currency Display]  │
├─────────────────────┤
│    3D Scene         │
│  (Cheese Wheel)     │
├─────────────────────┤
│ [Tabs: Gen | Upg]   │
│ [Active Panel]      │
└─────────────────────┘
```

#### 2. Visual Polish

- Smooth panel transitions
- Loading state for initial render
- Hover states on all interactive elements
- Subtle background gradient (cream to warm)

#### 3. Basic Audio (Placeholder)

**File**: `src/systems/audioSystem.ts`
**Changes**: Simple click sound

- Web Audio API for click feedback
- Volume control
- Mute toggle

### Success Criteria

#### Automated Verification

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` passes (if configured)

#### Manual Verification

- [ ] Desktop layout renders correctly
- [ ] Mobile layout renders correctly (responsive)
- [ ] All panels accessible and functional
- [ ] Click sound plays on cheese wheel click
- [ ] No visual glitches or layout overflow
- [ ] Performance: 60 FPS on desktop

---

## Testing Strategy

### Unit Tests (Future Enhancement)

For Phase 1, manual testing is sufficient. Unit tests can be added in later phases for:

- `calculateGeneratorCost()` - Verify cost scaling formula
- `calculateCps()` - Verify production calculations
- `calculateOfflineProgress()` - Verify offline gains
- Save/load serialization round-trip

### Manual Test Checklist

1. **Fresh Start**: Clear localStorage, verify game starts fresh
2. **Click Loop**: Click wheel, verify curds increment, visual feedback
3. **Generator Purchase**: Buy each generator, verify cost, production
4. **Bulk Buy**: Test 1/10/100/max for each generator
5. **Upgrade Purchase**: Buy upgrades, verify effects apply
6. **Save/Load**: Reload page, verify all state restored
7. **Offline Progress**: Close tab 5 minutes, reopen, verify curds awarded
8. **Mobile**: Test on phone/tablet, verify responsive layout
9. **Performance**: Play for 10 minutes, verify no FPS drops

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Phase 1 section: Lines 117-156
- Technical architecture: Lines 66-112
- Generator data: Lines 137-143
- Save data structure: Lines 606-623
- Big number handling: Lines 626-631
- Offline progress formula: Lines 634-645

---

*This plan covers Phase 1 (Foundation/Core Loop) only. Subsequent phases will be planned separately as each phase completes.*
