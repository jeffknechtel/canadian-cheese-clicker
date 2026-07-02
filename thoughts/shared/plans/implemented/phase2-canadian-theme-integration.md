# Phase 2: Canadian Theme Integration Implementation Plan

## Overview

This plan covers Phase 2 of "The Great Canadian Cheese Quest" - infusing the game with rich Canadian identity through visual theming, expanded content, achievements, cultural dialogue, and audio. Phase 1 established the core clicker mechanics; Phase 2 transforms it into a distinctly Canadian experience.

**Goal**: Transform the functional clicker into a themed Canadian cheese experience with 10 additional generators, an achievement system, Canadian slang/dialogue, and foundational audio.

## Current State Analysis

**Repository**: `/Users/jknechtel/dev/game`
**Starting Point**: Phase 1 complete - functional clicker with:
- 5 generators (Milk Pail through Fromager Apprentice)
- 21 upgrades (click multipliers + generator efficiency)
- 3D cheese wheel with click feedback
- Zustand state management
- Save/load with offline progress
- Tailwind styling with cheese/Canadian color palette (cheddar, maple, cream, rind)

### Key Files to Modify

| File | Purpose |
|------|---------|
| `src/data/generators.ts` | Add generators 6-15 |
| `src/data/upgrades.ts` | Add upgrades for new generators |
| `src/types/game.ts` | Add achievement types |
| `src/data/achievements.ts` | New - achievement definitions |
| `src/data/canadianDialogue.ts` | New - dialogue/slang data |
| `src/stores/gameStore.ts` | Add achievement tracking |
| `src/components/game/GameScene.tsx` | Enhanced scene with Canadian backdrop |
| `src/components/ui/AchievementPanel.tsx` | New - achievement display |
| `src/components/ui/DialogueToast.tsx` | New - Canadian phrase popups |
| `src/systems/audioSystem.ts` | Enhanced audio with music/SFX |
| `tailwind.config.js` | Additional Canadian-themed colors |
| `src/index.css` | Wood-grain textures, maple accents |

### Existing Patterns to Follow

- Generators use `Decimal` for baseCost/baseCps with 1.15 costMultiplier
- Upgrades use `UpgradeRequirement` for milestone visibility
- UI panels follow `bg-cream/80 backdrop-blur rounded-lg shadow-lg` pattern
- Game state changes via Zustand actions with recalculation

## Desired End State

A fully themed Canadian clicker with:

1. **15 total generators** with Canadian iconography (Curling Stone, Mountie, Voyageur, Hockey, Beaver, Tim Hortons, Maple Syrup, Moose, Northern Lights, Thunderbird)
2. **Achievement system** with Canadian-themed milestones and permanent bonuses
3. **Canadian dialogue** appearing on milestones and random events
4. **Enhanced 3D scene** with Canadian landscape backdrop
5. **Audio foundation** with background music, ambient sounds, and achievement fanfares
6. **Visual polish** with wood-grain panels, maple leaf accents, Tim Hortons-inspired styling

### Verification Criteria

- All 15 generators purchasable and producing curds
- Achievements unlock at correct thresholds
- Canadian phrases display at milestones
- Background music plays (with mute option)
- UI has distinct Canadian visual identity
- `pnpm typecheck` and `pnpm build` pass

## Assumptions Made

1. **No external audio files yet** - Will use Web Audio API synthesis for placeholder sounds; real audio assets added later
2. **3D backdrop is simple** - Gradient skybox or simple geometry; detailed models deferred to polish phase
3. **Achievements are persistent** - Saved with game state
4. **Achievement bonuses are multiplicative** - Stack with existing multiplier system
5. **Dialogue is text-only** - No voice acting
6. **Tim Hortons references are parody** - "Timmy's" style naming, not trademark infringement

## What We're NOT Doing

- Hero system (Phase 3)
- Combat system (Phase 4)
- Prestige/aging mechanics (Phase 5)
- Province-specific content (Phase 7)
- Real audio assets/soundtrack (Phase 8)
- 3D model assets for generators (Phase 8)
- Detailed Canadian landscape 3D scene (Phase 8)

## Implementation Approach

Six sub-phases building incrementally:

1. **2.1** - Expanded generator tiers (6-15)
2. **2.2** - Upgrades for new generators
3. **2.3** - Achievement system core
4. **2.4** - Canadian dialogue/slang system
5. **2.5** - Audio foundation (music, ambient, fanfares)
6. **2.6** - Visual theme polish (UI skinning, scene backdrop)

---

## Phase 2.1: Expanded Generator Tiers

### Overview

Add generators 6-15 with Canadian themes, following the exponential scaling pattern established in Phase 1.

### Changes Required

#### 1. Generator Definitions

**File**: `src/data/generators.ts`
**Changes**: Add 10 new generators

```typescript
// Continuing from Phase 1 generators...
{
  id: 'curling_stone',
  name: 'Cheese Curling Stone',
  description: 'Sweeping curds to victory, eh!',
  baseCost: new Decimal(1_400_000),
  baseCps: new Decimal(7_800),
  costMultiplier: 1.15,
},
{
  id: 'mountie_patrol',
  name: 'Mountie Milk Patrol',
  description: 'They always get their cheese',
  baseCost: new Decimal(20_000_000),
  baseCps: new Decimal(44_000),
  costMultiplier: 1.15,
},
{
  id: 'voyageur_canoe',
  name: 'Voyageur Canoe Dairy',
  description: 'Paddling curds across the nation',
  baseCost: new Decimal(330_000_000),
  baseCps: new Decimal(260_000),
  costMultiplier: 1.15,
},
{
  id: 'hockey_churner',
  name: 'Hockey Stick Churner',
  description: 'Slapshot curd production',
  baseCost: new Decimal(5_100_000_000),
  baseCps: new Decimal(1_600_000),
  costMultiplier: 1.15,
},
{
  id: 'beaver_dam',
  name: 'Beaver Dam Creamery',
  description: 'Nature\'s most industrious cheesemakers',
  baseCost: new Decimal(75_000_000_000),
  baseCps: new Decimal(10_000_000),
  costMultiplier: 1.15,
},
{
  id: 'timmys_bar',
  name: 'Timmy\'s Cheese Bar',
  description: 'Double-double the cheese production',
  baseCost: new Decimal(1_000_000_000_000),
  baseCps: new Decimal(65_000_000),
  costMultiplier: 1.15,
},
{
  id: 'maple_infuser',
  name: 'Maple Syrup Infuser',
  description: 'Sweet Canadian fusion',
  baseCost: new Decimal(14_000_000_000_000),
  baseCps: new Decimal(430_000_000),
  costMultiplier: 1.15,
},
{
  id: 'moose_mill',
  name: 'Moose-Powered Mill',
  description: 'Majestic moose power',
  baseCost: new Decimal(170_000_000_000_000),
  baseCps: new Decimal(2_900_000_000),
  costMultiplier: 1.15,
},
{
  id: 'northern_lights',
  name: 'Northern Lights Curing',
  description: 'Aurora-blessed cheese aging',
  baseCost: new Decimal(2_100_000_000_000_000),
  baseCps: new Decimal(21_000_000_000),
  costMultiplier: 1.15,
},
{
  id: 'thunderbird',
  name: 'Thunderbird Blessing',
  description: 'Mythical cheese mastery',
  baseCost: new Decimal(26_000_000_000_000_000),
  baseCps: new Decimal(150_000_000_000),
  costMultiplier: 1.15,
},
```

#### 2. Generator Icons/Emojis

**File**: `src/data/generators.ts`
**Changes**: Add `icon` field to Generator type for UI display

```typescript
// Add to Generator interface in types/game.ts
export interface Generator {
  id: string;
  name: string;
  description: string;
  baseCost: Decimal;
  baseCps: Decimal;
  costMultiplier: number;
  icon?: string; // Emoji or icon identifier
}
```

Icons mapping:
- `milk_pail`: bucket emoji or milk icon
- `cheese_vat`: pot/cauldron
- `aging_rack`: wood/shelf
- `cheese_cave`: cave/mountain
- `fromager_apprentice`: chef/person
- `curling_stone`: curling stone
- `mountie_patrol`: police/horse
- `voyageur_canoe`: canoe
- `hockey_churner`: hockey stick
- `beaver_dam`: beaver
- `timmys_bar`: coffee cup
- `maple_infuser`: maple leaf
- `moose_mill`: moose
- `northern_lights`: aurora/stars
- `thunderbird`: eagle/thunder

### Success Criteria

#### Automated Verification

- [x] Type checking passes: `pnpm typecheck`
- [x] Build succeeds: `pnpm build`

#### Manual Verification

- [ ] All 15 generators visible in GeneratorPanel
- [ ] Each generator purchasable when affordable
- [ ] Cost scaling correct (1.15^owned)
- [ ] CPS increases appropriately per tier
- [ ] Scrolling works smoothly with 15 generators

---

## Phase 2.2: Upgrades for New Generators

### Overview

Add 3 upgrades per new generator (at 10, 25, 50 owned thresholds) plus additional global Canadian-themed upgrades.

### Changes Required

#### 1. Generator Upgrades

**File**: `src/data/upgrades.ts`
**Changes**: Add upgrades for generators 6-15 (30 new upgrades)

Pattern for each generator (example for Curling Stone):

```typescript
// Curling Stone upgrades
{
  id: 'polished_stones',
  name: 'Polished Stones',
  description: 'Cheese Curling Stones are twice as effective',
  cost: new Decimal(70_000_000),
  costCurrency: 'curds',
  effect: { type: 'generatorMultiplier', generatorId: 'curling_stone', value: 2 },
  requirement: { type: 'generatorOwned', generatorId: 'curling_stone', count: 10 },
},
{
  id: 'championship_brooms',
  name: 'Championship Brooms',
  description: 'Cheese Curling Stones are twice as effective',
  cost: new Decimal(700_000_000),
  costCurrency: 'curds',
  effect: { type: 'generatorMultiplier', generatorId: 'curling_stone', value: 2 },
  requirement: { type: 'generatorOwned', generatorId: 'curling_stone', count: 25 },
},
{
  id: 'olympic_training',
  name: 'Olympic Training',
  description: 'Cheese Curling Stones are twice as effective',
  cost: new Decimal(7_000_000_000),
  costCurrency: 'curds',
  effect: { type: 'generatorMultiplier', generatorId: 'curling_stone', value: 2 },
  requirement: { type: 'generatorOwned', generatorId: 'curling_stone', count: 50 },
},
```

#### 2. Canadian Global Upgrades

**File**: `src/data/upgrades.ts`
**Changes**: Add themed global multipliers

```typescript
{
  id: 'true_north_strong',
  name: 'True North Strong',
  description: 'All production increased by 50%',
  cost: new Decimal(1_000_000_000_000),
  costCurrency: 'curds',
  effect: { type: 'globalMultiplier', value: 1.5 },
},
{
  id: 'national_cheese_day',
  name: 'National Cheese Day',
  description: 'All production doubled!',
  cost: new Decimal(100_000_000_000_000),
  costCurrency: 'curds',
  effect: { type: 'globalMultiplier', value: 2 },
},
{
  id: 'heritage_minute',
  name: 'Heritage Minute',
  description: 'Triple all production - a part of our heritage',
  cost: new Decimal(10_000_000_000_000_000),
  costCurrency: 'curds',
  effect: { type: 'globalMultiplier', value: 3 },
},
```

### Success Criteria

#### Automated Verification

- [x] Type checking passes: `pnpm typecheck`
- [x] Build succeeds: `pnpm build`

#### Manual Verification

- [ ] Upgrades appear at correct generator thresholds
- [ ] Generator multipliers apply correctly
- [ ] Global upgrades boost all production
- [ ] Upgrade panel scrolls smoothly with many upgrades

---

## Phase 2.3: Achievement System

### Overview

Implement a Canadian-themed achievement system with permanent bonuses.

### Changes Required

#### 1. Achievement Types

**File**: `src/types/game.ts`
**Changes**: Add achievement interfaces

```typescript
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: 'production' | 'clicking' | 'collection' | 'canadian' | 'hidden';
  requirement: AchievementRequirement;
  reward?: AchievementReward;
}

export type AchievementRequirement =
  | { type: 'totalCurds'; amount: Decimal }
  | { type: 'totalClicks'; count: number }
  | { type: 'generatorOwned'; generatorId: string; count: number }
  | { type: 'allGeneratorsOwned'; count: number }
  | { type: 'cps'; amount: Decimal }
  | { type: 'upgradesPurchased'; count: number };

export interface AchievementReward {
  type: 'globalMultiplier' | 'clickMultiplier';
  value: number;
}
```

#### 2. GameState Update

**File**: `src/types/game.ts`
**Changes**: Add achievements to state

```typescript
export interface GameState {
  // ... existing fields
  achievements: string[]; // IDs of unlocked achievements
}
```

#### 3. Achievement Definitions

**File**: `src/data/achievements.ts` (new file)
**Changes**: Define Canadian-themed achievements

```typescript
import Decimal from 'decimal.js';
import type { Achievement } from '../types/game';

export const ACHIEVEMENTS: Achievement[] = [
  // Production milestones
  {
    id: 'first_curd',
    name: 'First Curd',
    description: 'Earn your first curd',
    category: 'production',
    requirement: { type: 'totalCurds', amount: new Decimal(1) },
  },
  {
    id: 'loonie',
    name: 'Loonie',
    description: 'Earn 1,000 curds',
    category: 'production',
    requirement: { type: 'totalCurds', amount: new Decimal(1_000) },
    reward: { type: 'globalMultiplier', value: 1.01 },
  },
  {
    id: 'toonie',
    name: 'Toonie',
    description: 'Earn 2,000 curds',
    category: 'production',
    requirement: { type: 'totalCurds', amount: new Decimal(2_000) },
    reward: { type: 'globalMultiplier', value: 1.01 },
  },

  // Canadian-themed
  {
    id: 'double_double',
    name: 'Double-Double',
    description: 'Own 22 of any generator',
    category: 'canadian',
    requirement: { type: 'generatorOwned', generatorId: '*', count: 22 }, // * means any
    reward: { type: 'globalMultiplier', value: 1.05 },
  },
  {
    id: 'the_great_one',
    name: 'The Great One',
    description: 'Reach 99 billion curds (Gretzky\'s number)',
    category: 'canadian',
    requirement: { type: 'totalCurds', amount: new Decimal(99_000_000_000) },
    reward: { type: 'globalMultiplier', value: 1.99 },
  },
  {
    id: 'sorry_eh',
    name: 'Sorry, Eh?',
    description: 'Click 10,000 times',
    category: 'clicking',
    requirement: { type: 'totalClicks', count: 10_000 },
    reward: { type: 'clickMultiplier', value: 2 },
  },
  {
    id: 'true_patriot_love',
    name: 'True Patriot Love',
    description: 'Own at least one of every generator',
    category: 'collection',
    requirement: { type: 'allGeneratorsOwned', count: 1 },
    reward: { type: 'globalMultiplier', value: 1.15 },
  },
  {
    id: 'coast_to_coast',
    name: 'Coast to Coast',
    description: 'Own 10 of every generator',
    category: 'collection',
    requirement: { type: 'allGeneratorsOwned', count: 10 },
    reward: { type: 'globalMultiplier', value: 1.5 },
  },
  // ... more achievements
];
```

#### 4. Store Integration

**File**: `src/stores/gameStore.ts`
**Changes**: Add achievement checking and unlocking

```typescript
// New actions
checkAchievements: () => void;
getAchievementMultiplier: () => number;
getAchievementClickMultiplier: () => number;
isAchievementUnlocked: (id: string) => boolean;
getUnlockedAchievements: () => Achievement[];
```

Achievement checking should run:
- After each click
- After each generator purchase
- After each upgrade purchase
- On game tick (periodic check)

#### 5. Achievement Panel UI

**File**: `src/components/ui/AchievementPanel.tsx` (new file)
**Changes**: Create achievement display

- Grid of achievement icons
- Locked achievements shown dimmed/grayed
- Tooltip on hover showing name/description/reward
- "New!" indicator for recently unlocked
- Category tabs for filtering

#### 6. Achievement Toast Notification

**File**: `src/components/ui/AchievementToast.tsx` (new file)
**Changes**: Celebration popup on unlock

- Slide-in notification from corner
- Achievement icon, name, description
- Reward description if applicable
- Auto-dismiss after 5 seconds

### Success Criteria

#### Automated Verification

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`

#### Manual Verification

- [ ] First curd achievement unlocks immediately on first click
- [ ] Achievements unlock at correct thresholds
- [ ] Toast notification appears on unlock
- [ ] Achievement rewards apply (check multiplier increase)
- [ ] Achievements persist after save/load
- [ ] Achievement panel shows all achievements

---

## Phase 2.4: Canadian Dialogue System

### Overview

Add Canadian phrases and slang that appear at milestones and randomly during gameplay.

### Changes Required

#### 1. Dialogue Data

**File**: `src/data/canadianDialogue.ts` (new file)
**Changes**: Define dialogue pools

```typescript
export interface DialogueEntry {
  text: string;
  trigger: 'random' | 'milestone' | 'achievement' | 'purchase';
  weight?: number; // For random selection
}

export const CANADIAN_PHRASES: DialogueEntry[] = [
  // Random/Milestone phrases
  { text: "Beauty, eh!", trigger: 'random' },
  { text: "That's a real beaut!", trigger: 'random' },
  { text: "Give'r!", trigger: 'random' },
  { text: "Take off, ya hoser!", trigger: 'random' },
  { text: "Toque's on tight, let's go!", trigger: 'random' },
  { text: "Out for a rip, are ya bud?", trigger: 'random' },
  { text: "Keep your stick on the ice!", trigger: 'random' },
  { text: "Just gonna send it!", trigger: 'random' },

  // Milestone phrases
  { text: "Holy smokes, that's a lot of curds!", trigger: 'milestone' },
  { text: "You're a real keener, eh!", trigger: 'milestone' },
  { text: "Now that's what I call a haul!", trigger: 'milestone' },

  // Achievement phrases
  { text: "Way to go, bud!", trigger: 'achievement' },
  { text: "That's somethin' to write home aboot!", trigger: 'achievement' },

  // Purchase phrases
  { text: "Good choice, eh!", trigger: 'purchase' },
  { text: "Now we're cookin' with gas!", trigger: 'purchase' },
  { text: "That's gouda be good!", trigger: 'purchase' },
];

export const ERROR_MESSAGES = {
  notEnoughCurds: "Sorry, you don't have enough curds, eh!",
  alreadyOwned: "You already got that one, bud!",
  generic: "Oops, something went sideways there, sorry aboot that!",
};

export const WELCOME_BACK_MESSAGES = [
  "Welcome back, eh! Here's what you earned while you were out:",
  "Oh hey there bud! Your cheese empire kept churning:",
  "You're back! The curds kept coming:",
];
```

#### 2. Dialogue Toast Component

**File**: `src/components/ui/DialogueToast.tsx` (new file)
**Changes**: Canadian phrase popup

- Appears in corner or above game
- Canadian-styled speech bubble
- Fades in/out
- Queue system for multiple messages

#### 3. Store Integration

**File**: `src/stores/gameStore.ts`
**Changes**: Add "eh counter" for bonus

```typescript
// Add to GameState
ehCount: number; // Tracks Canadian phrase triggers

// Bonus: Every 100 "eh"s gives +1% production
getEhBonus: () => number;
incrementEh: () => void;
```

#### 4. Trigger Points

Integrate dialogue triggers:
- Random phrase every 60-120 seconds
- Milestone phrase on curd thresholds (1M, 1B, 1T, etc.)
- Achievement phrase on unlock
- Purchase phrase on bulk buy (10+)

### Success Criteria

#### Automated Verification

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`

#### Manual Verification

- [ ] Random phrases appear periodically
- [ ] Milestone phrases trigger at thresholds
- [ ] Error messages use Canadian variants
- [ ] Welcome back modal uses Canadian message
- [ ] "Eh" counter visible somewhere in UI

---

## Phase 2.5: Audio Foundation

### Overview

Establish the audio system with background music, ambient sounds, and achievement fanfares using Web Audio API synthesis.

### Changes Required

#### 1. Enhanced Audio System

**File**: `src/systems/audioSystem.ts`
**Changes**: Expand from basic click sound to full audio system

```typescript
// Existing
playClickSound(): void;
playPurchaseSound(): void;

// New
playAchievementFanfare(): void;
playMilestoneChime(): void;
startBackgroundMusic(): void;
stopBackgroundMusic(): void;
startAmbientSounds(): void;
stopAmbientSounds(): void;
setMusicVolume(volume: number): void;
setSfxVolume(volume: number): void;
getMusicVolume(): number;
getSfxVolume(): number;
```

Background music: Simple procedural ambient loop using oscillators
- Low pad chord progression
- Subtle melody
- Seamless loop

Achievement fanfare: Triumphant chord progression (C-E-G-C)

Ambient sounds: Subtle nature sounds (wind through trees, distant bird)

#### 2. Audio Controls UI

**File**: `src/components/ui/AudioControls.tsx`
**Changes**: Enhanced audio settings

- Master volume slider
- Music on/off toggle
- SFX on/off toggle
- Separate volume controls for music/sfx

#### 3. Audio State Persistence

**File**: `src/systems/saveSystem.ts`
**Changes**: Persist audio preferences

```typescript
interface AudioPreferences {
  masterVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}
```

### Success Criteria

#### Automated Verification

- [x] Type checking passes: `pnpm typecheck`
- [x] Build succeeds: `pnpm build`

#### Manual Verification

- [ ] Background music plays and loops
- [ ] Music can be toggled on/off
- [ ] Click/purchase sounds play
- [ ] Achievement fanfare plays on unlock
- [ ] Volume controls work
- [ ] Audio preferences persist after reload

---

## Phase 2.6: Visual Theme Polish

### Overview

Apply Canadian visual theme to UI with wood-grain panels, maple accents, and enhanced scene backdrop.

### Changes Required

#### 1. Tailwind Theme Expansion

**File**: `tailwind.config.js`
**Changes**: Add Canadian-themed utilities

```javascript
extend: {
  colors: {
    // Existing cheddar, maple, cream, rind
    // Add:
    timber: {
      50: '#faf5f0',
      100: '#f0e6d8',
      200: '#e0ccb0',
      300: '#c9a875',
      400: '#b18a4a',
      500: '#8b6914', // Primary timber
      600: '#755812',
      700: '#5f4810',
      800: '#4a380d',
      900: '#35280a',
    },
    snow: '#f8fafc',
    ice: '#e0f2fe',
  },
  backgroundImage: {
    'wood-grain': "url('/textures/wood-grain.svg')", // Or CSS pattern
    'maple-pattern': "url('/textures/maple-pattern.svg')",
  },
},
```

#### 2. Global Styles

**File**: `src/index.css`
**Changes**: Add themed utility classes

```css
@layer components {
  /* Wood panel styling */
  .panel-wood {
    background: linear-gradient(
      135deg,
      rgba(139, 105, 20, 0.1) 0%,
      rgba(139, 105, 20, 0.05) 50%,
      rgba(139, 105, 20, 0.1) 100%
    );
    border: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 4px 6px rgba(139, 115, 85, 0.2);
  }

  /* Maple leaf decoration */
  .maple-accent::before {
    content: '';
    position: absolute;
    /* maple leaf SVG or character */
  }
}
```

#### 3. UI Component Updates

**File**: Multiple UI components
**Changes**: Apply Canadian styling

GeneratorPanel:
- Wood-grain background
- Generator icons with Canadian themes
- Maple leaf separators between tiers

UpgradePanel:
- Similar wood-grain styling
- Canadian flag colors on hover states

Header:
- Tim Hortons-inspired color scheme (dark red/brown)
- Maple leaf in logo area

Currency Display:
- Loonie/Toonie icons for currency
- Canadian-styled typography

#### 4. Scene Backdrop

**File**: `src/components/game/GameScene.tsx`
**Changes**: Add Canadian landscape backdrop

Simple backdrop options (pick one based on performance):
1. Gradient skybox with Canadian colors (red/white fade to blue)
2. Simple mountain silhouette geometry
3. Low-poly pine tree ring around scene

```tsx
// Simple gradient backdrop
<mesh position={[0, 0, -10]}>
  <planeGeometry args={[50, 30]} />
  <meshBasicMaterial>
    {/* Gradient shader or texture */}
  </meshBasicMaterial>
</mesh>
```

#### 5. Currency Icons

**File**: `public/icons/` (new directory)
**Changes**: Add SVG icons

- `loonie.svg` - Gold coin icon
- `toonie.svg` - Two-tone coin icon
- `maple-syrup.svg` - Syrup bottle (future premium currency)
- Generator icons (Canadian symbols)

### Success Criteria

#### Automated Verification

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification

- [ ] UI has distinct wood-grain Canadian feel
- [ ] Maple accents visible throughout
- [ ] Scene backdrop shows Canadian landscape
- [ ] Currency icons display correctly
- [ ] No visual regressions from Phase 1
- [ ] Responsive layout still works on mobile
- [ ] Performance maintained (60 FPS desktop)

---

## Testing Strategy

### Unit Tests (Future)

- Achievement requirement checking
- Dialogue trigger conditions
- Audio state management

### Manual Test Checklist

1. **Generators**: Purchase all 15 generators, verify CPS scaling
2. **Upgrades**: Buy upgrades at milestones, verify multipliers
3. **Achievements**: Unlock various achievements, verify rewards apply
4. **Dialogue**: Play for 5+ minutes, observe random phrases
5. **Audio**: Test all sound types, verify mute/volume controls
6. **Theme**: Verify Canadian visual elements throughout UI
7. **Save/Load**: Verify all new state persists (achievements, eh count)
8. **Performance**: Play for 10 minutes with high generator counts

### Integration Checks

- Achievements interact correctly with existing multiplier system
- Audio doesn't block game loop
- New generators display in existing GeneratorPanel
- New upgrades appear correctly in UpgradePanel

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Phase 2 specification: Lines 160-205
- Generator definitions: Lines 171-185
- Achievement examples: Lines 187-198
- Canadian content reference: Lines 686-737

---

*This plan covers Phase 2 (Canadian Theme Integration) only. Phase 3 (JRPG Hero System) will be planned after Phase 2 completion.*
