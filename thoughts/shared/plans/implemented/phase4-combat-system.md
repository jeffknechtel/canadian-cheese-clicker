# Phase 4: Combat System Implementation Plan

## Overview

This plan implements the JRPG-style auto-battle combat system for "The Great Canadian Cheese Quest." The combat system uses an ATB (Active Time Battle) inspired approach where heroes automatically attack when their gauges fill, with manual activation of special skills for strategic timing. Combat takes place in province-based zones with regular enemies and boss fights.

## Current State Analysis

**What Exists:**
- 8 heroes with complete stat definitions (HP, Attack, Defense, Speed, CheeseAffinity) in `src/data/heroes.ts`
- Hero leveling system with XP and stat growth curves in `src/stores/gameStore.ts`
- Party formation system (4 slots: frontLeft, frontRight, backLeft, backRight)
- Equipment system affecting hero stats (48 items across 4 slots)
- Production engine pattern in `src/systems/productionEngine.ts` we can follow
- Zustand store architecture with actions pattern
- Game loop running at 60 FPS in `src/systems/gameLoop.ts`

**Key Files to Reference:**
- `src/types/game.ts` - Type definitions (lines 1-150)
- `src/stores/gameStore.ts` - State management (960 lines)
- `src/systems/productionEngine.ts` - Calculation patterns (320 lines)
- `src/data/heroes.ts` - Hero definitions with special abilities

**Existing Hero Stats Structure:**
```typescript
interface HeroStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  cheeseAffinity: number;
}
```

## Desired End State

A fully functional auto-battle combat system where:
1. Players can enter combat zones organized by Canadian province
2. Combat runs automatically with ATB gauges based on hero speed
3. Heroes attack when their gauge fills, dealing damage calculated from stats
4. Special abilities can be manually triggered for strategic depth
5. Combat speed is adjustable (1x/2x/4x)
6. Enemies drop curds, whey, equipment, and hero XP
7. Boss fights have multiple phases and unique mechanics
8. Limit breaks provide powerful finisher abilities

**Verification:**
- `pnpm typecheck` passes
- `pnpm lint` passes
- Combat can be initiated from the UI
- ATB gauges fill and heroes attack automatically
- Damage numbers appear and enemies can be defeated
- Rewards are granted on victory

### Key Discoveries:

- Hero special abilities are already defined in `src/data/heroes.ts:15-95` (e.g., "Sorry Shield", "Gravy Blast")
- Party formation already tracks position (front/back rows) in store
- `calculateHeroStats()` in productionEngine.ts:180 handles base + level growth + equipment
- Game loop pattern uses `requestAnimationFrame` with delta capping at 100ms
- Decimal.js used for all currency calculations

## Assumptions Made

1. **Combat is separate from idle production** - Production continues during combat, combat rewards are additive
2. **Auto-battle is primary mode** - Manual skill activation is optional enhancement, not required
3. **No PvP** - All combat is player vs AI enemies
4. **Province progression is linear** - Must complete Ontario before unlocking Quebec, etc.
5. **Equipment provides flat stat bonuses** - No percentage-based equipment effects for simplicity
6. **Single active battle at a time** - No multi-party or parallel combat

## What We're NOT Doing

- Multiplayer/PvP combat
- Complex AI behavior trees for enemies (enemies use simple attack patterns)
- Animated 3D combat scenes (combat is UI-based with effects)
- Combat voice acting or extensive sound design
- Equipment set bonuses or complex synergies
- Skill trees or talent systems (heroes have fixed abilities)

## Implementation Approach

The combat system will be built as a modular engine (`combatEngine.ts`) that integrates with the existing Zustand store. We'll add combat-specific state slices and actions, following the established patterns. The UI will use a new CombatPanel component with ATB visualization.

**Architecture:**
```
New Files:
├── src/data/enemies.ts          # Enemy definitions
├── src/data/zones.ts            # Province zones & stages
├── src/systems/combatEngine.ts  # Combat simulation logic
├── src/components/ui/CombatPanel.tsx      # Main combat UI
├── src/components/ui/CombatATBBar.tsx     # ATB gauge display
├── src/components/ui/EnemyDisplay.tsx     # Enemy health/status
├── src/components/ui/CombatLog.tsx        # Battle event log
├── src/components/ui/ZoneSelectPanel.tsx  # Province/stage selection
```

---

## Phase 4.1: Combat Type Definitions & Data Structures

### Overview

Define all TypeScript interfaces for combat mechanics and create enemy/zone data files.

### Changes Required:

#### 1. Extend Type Definitions

**File**: `src/types/game.ts`
**Changes**: Add combat-related interfaces

```typescript
// Combat State
interface CombatState {
  isInCombat: boolean;
  currentZone: string | null;
  currentStage: number;
  enemies: CombatEnemy[];
  heroStates: Record<string, HeroCombatState>;
  combatLog: CombatLogEntry[];
  combatSpeed: 1 | 2 | 4;
  limitBreakGauge: number; // 0-100
  battleResult: 'ongoing' | 'victory' | 'defeat' | null;
}

interface HeroCombatState {
  heroId: string;
  currentHp: number;
  maxHp: number;
  atbGauge: number; // 0-100
  isAlive: boolean;
  statusEffects: StatusEffect[];
}

interface CombatEnemy {
  id: string;
  instanceId: string; // Unique per battle instance
  currentHp: number;
  maxHp: number;
  atbGauge: number;
  isAlive: boolean;
  statusEffects: StatusEffect[];
}

interface StatusEffect {
  id: string;
  type: 'buff' | 'debuff';
  stat: keyof HeroStats | 'damage_over_time' | 'heal_over_time';
  value: number;
  duration: number; // Remaining ticks
}

interface CombatLogEntry {
  timestamp: number;
  type: 'attack' | 'skill' | 'damage' | 'heal' | 'status' | 'defeat' | 'victory';
  source: string;
  target: string;
  value?: number;
  message: string;
}

// Enemy Definitions
interface EnemyDefinition {
  id: string;
  name: string;
  type: EnemyType;
  stats: HeroStats;
  weakness?: DamageType;
  resistance?: DamageType;
  skills: EnemySkill[];
  drops: EnemyDrop[];
  xpReward: number;
  curdReward: Decimal;
}

type EnemyType = 'fungal' | 'artificial' | 'mechanical' | 'demon' | 'undead' | 'beast' | 'boss';
type DamageType = 'physical' | 'fire' | 'ice' | 'lightning' | 'nature' | 'holy' | 'dark';

interface EnemySkill {
  id: string;
  name: string;
  damage: number;
  cooldown: number; // Ticks between uses
  effect?: StatusEffect;
}

interface EnemyDrop {
  itemId: string;
  chance: number; // 0-1
}

// Zone Definitions
interface ZoneDefinition {
  id: string;
  name: string;
  province: string;
  description: string;
  stages: StageDefinition[];
  bossStage: BossStageDefinition;
  unlockRequirement: ZoneUnlockRequirement;
}

interface StageDefinition {
  stageNumber: number;
  enemies: string[]; // Enemy IDs
  background?: string;
}

interface BossStageDefinition {
  bossId: string;
  phases: number;
  specialMechanics: string[];
}

interface ZoneUnlockRequirement {
  type: 'zone_complete' | 'curds' | 'achievement';
  value: string | number;
}

// Zone Progress
interface ZoneProgress {
  zoneId: string;
  highestStageCleared: number;
  bossDefeated: boolean;
  timesCompleted: number;
}
```

#### 2. Create Enemy Data File

**File**: `src/data/enemies.ts` (new file)
**Changes**: Define all regular enemies and bosses

```typescript
// Regular enemies organized by zone theme
// 5 enemy types as specified in research doc:
// - Mold Sprite (Fungal) - Caves
// - Processed Cheese Slime (Artificial) - Factories
// - Cheese Grater Golem (Mechanical) - Industrial
// - Lactose Intolerant Imp (Demon) - Everywhere
// - Wax Wraith (Undead) - Aging Cellars

// Province bosses:
// - The Bland Baron (Ontario) - 3 phases
// - Le Fromage Fantome (Quebec) - 4 phases
// - Oil Slick Sally (Alberta) - 3 phases
// - Wheat Witch (Saskatchewan) - 2 phases
// - Pacific Rim Crab (BC) - 3 phases
```

#### 3. Create Zone Data File

**File**: `src/data/zones.ts` (new file)
**Changes**: Define province zones with 10 stages + boss each

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc -b`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] All interfaces properly extend existing types
- [x] Enemy data covers all provinces mentioned in research
- [x] Zone progression makes logical sense

---

## Phase 4.2: Combat Engine Core

### Overview

Implement the combat simulation engine that handles ATB filling, damage calculation, and battle resolution.

### Changes Required:

#### 1. Create Combat Engine

**File**: `src/systems/combatEngine.ts` (new file)
**Changes**: Core combat logic

Key functions to implement:

```typescript
// ATB Calculation
function calculateAtbFillRate(speed: number, combatSpeed: 1 | 2 | 4): number {
  // Base rate modified by speed stat and combat speed setting
  const baseRate = 10; // 10% per second at speed 100
  return baseRate * (1 + speed / 100) * combatSpeed;
}

// Damage Calculation (from research doc)
function calculateDamage(
  attacker: { attack: number },
  defender: { defense: number },
  skillMultiplier: number = 1
): number {
  const baseDamage = attacker.attack * skillMultiplier;
  const defenseFactor = 1 - (defender.defense / (defender.defense + 100));
  const variance = 0.9 + Math.random() * 0.2; // 0.9-1.1
  return Math.floor(baseDamage * defenseFactor * variance);
}

// Combat Tick (called from game loop)
function tickCombat(
  state: CombatState,
  deltaMs: number,
  partyStats: Record<string, HeroStats>
): CombatTickResult {
  // 1. Update ATB gauges for all heroes and enemies
  // 2. Process any actions for units at 100% ATB
  // 3. Apply status effects
  // 4. Check for victory/defeat conditions
  // 5. Return state updates and log entries
}

// Target Selection
function selectTarget(
  enemies: CombatEnemy[],
  targetType: 'random' | 'lowest_hp' | 'highest_hp'
): CombatEnemy | null;

// Limit Break Gauge
function updateLimitBreakGauge(
  currentGauge: number,
  damageDealt: number,
  damageTaken: number
): number {
  // Gauge fills from dealing and taking damage
  const gainFromDealt = damageDealt * 0.01;
  const gainFromTaken = damageTaken * 0.05;
  return Math.min(100, currentGauge + gainFromDealt + gainFromTaken);
}
```

#### 2. Combat State Slice for Store

**File**: `src/stores/gameStore.ts`
**Changes**: Add combat state and actions

New state properties:
```typescript
combat: CombatState;
zoneProgress: Record<string, ZoneProgress>;
```

New actions:
```typescript
// Combat lifecycle
startCombat: (zoneId: string, stageNumber: number) => void;
tickCombat: (deltaMs: number) => void;
endCombat: (result: 'victory' | 'defeat' | 'flee') => void;

// Combat controls
setCombatSpeed: (speed: 1 | 2 | 4) => void;
useHeroSkill: (heroId: string, skillId: string, targetId?: string) => void;
useLimitBreak: (heroId: string) => void;

// Rewards
claimCombatRewards: () => void;
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] ATB gauges fill at expected rates
- [x] Damage calculation matches formula from research doc
- [x] Combat can reach victory/defeat states

---

## Phase 4.3: Combat UI Components

### Overview

Build the UI components for displaying and interacting with combat.

### Changes Required:

#### 1. Zone Selection Panel

**File**: `src/components/ui/ZoneSelectPanel.tsx` (new file)
**Changes**: Province/zone/stage selection UI

- World map visualization (simplified)
- Province cards showing progress
- Stage list with completion status
- Boss stage indicator
- Unlock requirements display

#### 2. Main Combat Panel

**File**: `src/components/ui/CombatPanel.tsx` (new file)
**Changes**: Active combat display

- Party display (left side) with ATB bars
- Enemy display (right side) with HP bars
- Combat log (bottom)
- Speed controls (1x/2x/4x buttons)
- Limit break gauge
- Flee button

#### 3. ATB Bar Component

**File**: `src/components/ui/CombatATBBar.tsx` (new file)
**Changes**: Animated ATB gauge

- Horizontal fill bar
- Speed-based animation
- Flash effect when full
- Hero portrait/icon integration

#### 4. Enemy Display Component

**File**: `src/components/ui/EnemyDisplay.tsx` (new file)
**Changes**: Enemy health and status

- Enemy sprite/icon
- HP bar with current/max
- Status effect icons
- Damage number popups

#### 5. Combat Log Component

**File**: `src/components/ui/CombatLog.tsx` (new file)
**Changes**: Scrolling battle event log

- Auto-scroll to latest
- Color-coded by event type
- Timestamp display
- Compact/expanded toggle

#### 6. Combat Results Modal

**File**: `src/components/ui/CombatResultsModal.tsx` (new file)
**Changes**: Victory/defeat screen

- Result banner (Victory!/Defeat)
- XP gained per hero
- Curds/whey earned
- Items dropped
- Continue/retry buttons

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Zone selection navigates properly
- [ ] Combat panel displays all party members
- [ ] ATB bars animate smoothly
- [ ] Combat log updates in real-time
- [ ] Results modal shows correct rewards

---

## Phase 4.4: Combat Integration & Game Loop

### Overview

Integrate combat into the main game loop and connect all systems.

### Changes Required:

#### 1. Update Game Loop

**File**: `src/systems/gameLoop.ts`
**Changes**: Add combat tick to loop

```typescript
// In tick function, after production tick:
if (store.combat.isInCombat) {
  store.tickCombat(cappedDelta);
}
```

#### 2. Update Main App Layout

**File**: `src/App.tsx`
**Changes**: Add combat panel to UI tabs

- Add "Combat" or "Battle" tab
- Conditional render: ZoneSelectPanel when not in combat, CombatPanel when fighting
- Connect combat results to reward claiming

#### 3. Hero Panel Combat Integration

**File**: `src/components/ui/HeroPanel.tsx`
**Changes**: Add combat-ready indicator

- Show which heroes are in party
- Link to party formation from hero cards
- Disable recruitment during combat

#### 4. Production Engine Updates

**File**: `src/systems/productionEngine.ts`
**Changes**: Add combat stat calculations

```typescript
// Get fully calculated hero stats for combat
function getHeroCombatStats(
  heroState: HeroState,
  heroDefinition: HeroDefinition,
  equipment: Record<EquipmentSlot, EquipmentItem | null>
): HeroStats {
  // Combine base + growth + equipment
}
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] Combat tab appears in navigation
- [x] Can start combat from zone selection
- [x] Combat runs alongside idle production
- [x] Rewards properly credited to account

---

## Phase 4.5: Special Abilities & Limit Breaks

### Overview

Implement hero special abilities and the limit break system.

### Changes Required:

#### 1. Ability System

**File**: `src/systems/combatEngine.ts`
**Changes**: Add ability processing

Each hero's special ability (from `src/data/heroes.ts`):
- **Maple Knight** - "Sorry Shield": Absorb damage, taunt enemies
- **Poutine Mage** - "Gravy Blast": AoE damage + slow effect
- **Mountie Ranger** - "Always Get My Cheese": Increase drop rates
- **Hockey Enforcer** - "Slapshot": High single-target damage
- **Voyageur Bard** - "Paddle Song": Party attack/speed buff
- **Toque Monk** - "Cold Resistance": Party freeze immunity + defense
- **West Coast Druid** - "Cedar Healing": Party HP regeneration
- **Maritime Fisher** - "Lobster Trap": DoT effect on target

#### 2. Ability UI

**File**: `src/components/ui/HeroAbilityButton.tsx` (new file)
**Changes**: Manual ability activation button

- Cooldown indicator
- Mana/resource cost (if applicable)
- Tooltip with ability description
- Target selection for single-target abilities

#### 3. Limit Break Implementation

**File**: `src/systems/combatEngine.ts`
**Changes**: Add limit break logic

Limit breaks (100% gauge required):
- **Maple Knight** - "Coast to Coast Charge": Invincible rush, hits all enemies
- **Poutine Mage** - "Festival of Flavor": Massive AoE + party full heal
- **Hockey Enforcer** - "Gordie Howe Hat Trick": 3 consecutive max-damage attacks

#### 4. Limit Break UI

**File**: `src/components/ui/LimitBreakGauge.tsx` (new file)
**Changes**: Prominent limit break meter

- Large gauge display
- Pulsing effect when full
- Character portrait highlight
- Activation button

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Each hero's ability works as described
- [ ] Cooldowns prevent spam
- [ ] Limit break gauge fills from combat
- [ ] Limit breaks deal significant damage

---

## Phase 4.6: Boss Fights & Victory Rewards

### Overview

Implement boss battle mechanics and the complete reward system.

### Changes Required:

#### 1. Boss Phase System

**File**: `src/systems/combatEngine.ts`
**Changes**: Multi-phase boss logic

Boss phases trigger at HP thresholds:
- Phase 2: 66% HP
- Phase 3: 33% HP
- Phase 4 (if applicable): 15% HP

Phase transitions:
- Heal a portion of HP
- Gain new abilities
- Change attack patterns
- Summon minions (some bosses)

#### 2. Boss Data

**File**: `src/data/enemies.ts`
**Changes**: Detailed boss definitions

Each boss with unique mechanics:
- **The Bland Baron** (Ontario): Removes flavor buffs, generic attack patterns
- **Le Fromage Fantome** (Quebec): French-only damage phase (requires Quebec hero?)
- **Oil Slick Sally** (Alberta): Oil puddles reduce speed
- **Wheat Witch** (Saskatchewan): Summons grain minion swarm
- **Pacific Rim Crab** (BC): High defense shell, must break first

#### 3. Reward Distribution

**File**: `src/stores/gameStore.ts`
**Changes**: Combat reward processing

```typescript
function processCombatRewards(
  enemies: EnemyDefinition[],
  isBoss: boolean,
  partyHeroes: string[]
): CombatRewards {
  return {
    curds: calculateCurdReward(enemies),
    whey: isBoss ? calculateWheyReward(enemies) : new Decimal(0),
    xp: distributeXp(enemies, partyHeroes),
    drops: rollDrops(enemies),
  };
}
```

#### 4. Zone Completion

**File**: `src/stores/gameStore.ts`
**Changes**: Track zone progress

- Mark stages as completed
- Unlock next zone when boss defeated
- Track completion count for repeatable farming

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Boss phases trigger at correct HP thresholds
- [ ] Each boss has distinct mechanics
- [ ] Rewards scale appropriately with difficulty
- [ ] Zone progression unlocks correctly

---

## Phase 4.7: Combat Balance & Polish

### Overview

Balance combat numbers and add polish for game feel.

### Changes Required:

#### 1. Balance Pass

**Files**: `src/data/enemies.ts`, `src/data/zones.ts`
**Changes**: Tune all numeric values

Balance targets:
- Stage 1 beatable with 1 level-1 hero
- Stage 10 requires full party of level 10+ heroes
- Boss requires level 15+ party with good equipment
- Combat length: 30-60 seconds per stage at 1x speed

#### 2. Combat Feedback

**File**: `src/components/ui/CombatPanel.tsx`
**Changes**: Visual/audio feedback

- Damage numbers floating up
- Screen shake on big hits
- Flash effects on crits
- Victory/defeat animations

#### 3. Combat Audio

**File**: `src/systems/audioSystem.ts`
**Changes**: Combat sound effects

- Attack sounds (per weapon type)
- Ability activation sounds
- Enemy defeat sounds
- Victory fanfare
- Defeat jingle

#### 4. Canadian Flavor

**File**: `src/data/canadianDialogue.ts`
**Changes**: Combat-specific dialogue

- Battle start phrases ("Let's give 'er, eh!")
- Victory phrases ("Beauty! That was gouda!")
- Defeat phrases ("Sorry about that, folks")
- Limit break callouts

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Combat feels appropriately challenging
- [ ] Feedback is satisfying and clear
- [ ] Audio enhances the experience
- [ ] Canadian humor is present throughout

---

## Testing Strategy

### Unit Tests

Create tests for:
- `combatEngine.ts` damage calculation
- ATB fill rate calculation
- Target selection logic
- Reward calculation

### Integration Tests

- Combat flow from start to victory
- Combat flow from start to defeat
- Zone progression and unlocking
- Reward crediting to account

### Manual Testing Checklist

- [ ] Start combat from zone selection
- [ ] Watch ATB bars fill correctly
- [ ] Heroes auto-attack when gauge full
- [ ] Manually trigger special abilities
- [ ] Build and use limit break
- [ ] Defeat regular enemies
- [ ] Challenge and defeat a boss
- [ ] Receive rewards on victory
- [ ] Flee from combat
- [ ] Combat works at all speed settings (1x/2x/4x)
- [ ] Zone unlocks after boss defeat
- [ ] Combat alongside idle production works

---

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Combat formulas: Research doc lines 745-772
- Enemy definitions: Research doc lines 264-300
- Hero abilities: `src/data/heroes.ts`
- Existing production patterns: `src/systems/productionEngine.ts`
- Game store patterns: `src/stores/gameStore.ts`
