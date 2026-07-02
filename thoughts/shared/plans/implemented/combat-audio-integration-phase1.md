# Combat Audio Integration - Phase 1: Critical Audio Quick Win

## Overview

Integrate the remaining unused combat audio functions into the combat system. The audio system (`src/systems/audioSystem.ts`) has 15+ combat-specific sound functions, with some already integrated but many still uncalled during gameplay.

## Current State Analysis

### What's Already Working

The game store (`src/stores/gameStore.ts:89-102`) already imports all audio functions:
```typescript
import {
  startCombatMusic,
  endCombatMusic,
  playVictoryFanfare,
  playDefeatJingle,
  playAbilitySound,
  playLimitBreakSound,
  playAttackSound,
  playEnemyDefeatSound,
  playHealSound,
  playBuffSound,
  playDebuffSound,
  triggerBossPhaseTransition,
} from '../systems/audioSystem';
```

And these are already called:
- `startCombatMusic(isBoss)` at `gameStore.ts:1144` (startCombat action)
- `playVictoryFanfare()` at `gameStore.ts:1213` (endCombat action)
- `playDefeatJingle()` at `gameStore.ts:1215` (endCombat action)
- `endCombatMusic(victory)` at `gameStore.ts:1218` (endCombat action)

### What's Still Missing

| Function | Where It Should Be Called | Status |
|----------|---------------------------|--------|
| `playAbilitySound()` | `gameStore.ts` useHeroSkill action | **NOT CALLED** |
| `playLimitBreakSound()` | `gameStore.ts` useLimitBreak action | **NOT CALLED** |
| `playAttackSound('physical')` | `combatEngine.ts` hero attack | **NOT CALLED** |
| `playAttackSound('physical')` | `combatEngine.ts` enemy attack | **NOT CALLED** |
| `playEnemyDefeatSound()` | `combatEngine.ts` enemy death | **NOT CALLED** |
| `playHealSound()` | `combatEngine.ts` heal effect | **NOT CALLED** |
| `playBuffSound()` | `combatEngine.ts` buff applied | **NOT CALLED** |
| `playDebuffSound()` | `combatEngine.ts` debuff applied | **NOT CALLED** |
| `triggerBossPhaseTransition()` | `combatEngine.ts` boss phase change | **NOT CALLED** |

### Key Architecture Decision

The combat engine (`combatEngine.ts`) is designed as a pure function system. However, for simplicity and directness, we'll add audio calls directly in the combat engine rather than returning audio events. The audio functions already handle muting/volume internally, and this approach is simpler than modifying the return types.

## Desired End State

Combat has full audio feedback:
1. Combat music starts on combat start, transitions on end (already working)
2. Attack sounds play when heroes or enemies attack
3. Ability and limit break activations have distinct sounds
4. Status effects (heal/buff/debuff) have audio feedback
5. Enemy defeats play a satisfying sound
6. Boss phase transitions are dramatic with audio cues

### Verification Checklist

- [ ] Start combat - hear combat music (already working)
- [ ] Hero attacks - hear attack sound
- [ ] Enemy attacks - hear attack sound
- [ ] Enemy dies - hear defeat sound
- [ ] Use ability - hear ability whoosh sound
- [ ] Use limit break - hear epic power chord
- [ ] Use heal ability - hear sparkle chimes
- [ ] Use buff ability - hear rising tone
- [ ] Use debuff ability - hear descending tone
- [ ] Trigger boss phase - hear dramatic transition
- [ ] Win combat - hear victory fanfare (already working)
- [ ] Lose combat - hear defeat jingle (already working)

## Assumptions Made

1. **Direct audio calls in combatEngine**: Rather than returning audio events and playing them in the store, we'll call audio functions directly in the combat engine. This couples audio to combat logic but is simpler.

2. **Single attack sound per attack**: We'll use `playAttackSound('physical')` for all basic attacks. Differentiating magic vs physical would require additional ability type detection.

3. **One sound per effect type**: For multi-target heals/buffs/debuffs, we play the sound once at the start of processing, not once per target.

4. **Enemy attacks use same sound as hero attacks**: Both use `playAttackSound('physical')` for simplicity.

## What We're NOT Doing

- Adding new audio assets or sounds
- Differentiating magic vs physical attack sounds
- Adding visual effects (covered in separate Phase 2 research)
- Adding audio event queuing or batching
- Modifying the `CombatTickResult` interface to return audio events

---

## Phase 1: Game Store Audio Calls (useHeroSkill & useLimitBreak)

### Overview

Add audio calls to the two game store actions that are missing them.

### Changes Required

#### 1. Add playAbilitySound to useHeroSkill

**File**: `src/stores/gameStore.ts`
**Location**: After line ~1247 (after success check, before state updates)

**Current code** (lines 1238-1253):
```typescript
useHeroSkill: (heroId: string, _skillId: string, targetId?: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = get().getPartyStats();
    const result = executeHeroAbility(state.combat, heroId, partyStats, targetId);

    if (!result.success) {
      return false;
    }

    // Apply state updates
    set((s) => {
```

**Insert after `if (!result.success) return false;`**:
```typescript
    // Play ability activation sound
    playAbilitySound();
```

#### 2. Add playLimitBreakSound to useLimitBreak

**File**: `src/stores/gameStore.ts`
**Location**: After line ~1279 (after success check, before state updates)

**Current code** (lines 1270-1285):
```typescript
useLimitBreak: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = get().getPartyStats();
    const result = executeHeroLimitBreak(state.combat, heroId, partyStats);

    if (!result.success) {
      return false;
    }

    // Apply state updates
    set((s) => {
```

**Insert after `if (!result.success) return false;`**:
```typescript
    // Play limit break sound
    playLimitBreakSound();
```

### Success Criteria

#### Automated Verification

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`

#### Manual Verification

- [ ] Use a hero ability in combat - hear whoosh/sparkle sound
- [ ] Use a limit break in combat - hear epic power chord sound

---

## Phase 2: Combat Engine Audio - Imports and Attack Sounds

### Overview

Add audio imports to the combat engine and integrate attack sounds for hero and enemy attacks.

### Changes Required

#### 1. Add Audio Imports

**File**: `src/systems/combatEngine.ts`
**Location**: Top of file with other imports

**Add**:
```typescript
import {
  playAttackSound,
  playEnemyDefeatSound,
  playHealSound,
  playBuffSound,
  playDebuffSound,
  triggerBossPhaseTransition,
} from './audioSystem';
```

#### 2. Hero Attack Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~690 (after damage is applied, before log entry)

**Context** (lines 685-697):
```typescript
    const damage = calculateDamage(effectiveAttack, effectiveDefense);
    target.currentHp = applyDamage(target.currentHp, damage);
    totalDamageDealt += damage;

    // Log the attack
    newLogEntries.push({
```

**Insert after `totalDamageDealt += damage;`**:
```typescript
    // Play attack sound
    playAttackSound('physical');
```

#### 3. Enemy Attack Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~784 (after damage is applied, before log entry)

**Context** (lines 777-791):
```typescript
    const damage = calculateDamage(effectiveAttack, effectiveDefense, skillMultiplier);
    target.currentHp = applyDamage(target.currentHp, damage);
    totalDamageTaken += damage;

    const heroDef = getHeroById(target.heroId);

    // Log the attack
```

**Insert after `totalDamageTaken += damage;`**:
```typescript
    // Play attack sound
    playAttackSound('physical');
```

### Success Criteria

#### Automated Verification

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`

#### Manual Verification

- [ ] Hero auto-attacks play attack sound
- [ ] Enemy attacks play attack sound
- [ ] Sounds don't overlap annoyingly during rapid combat

---

## Phase 3: Combat Engine Audio - Enemy Death and Boss Phase

### Overview

Add audio for enemy defeats and boss phase transitions.

### Changes Required

#### 1. Enemy Death Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~702 (after setting isAlive = false)

**Context** (lines 700-709):
```typescript
    // Check for enemy defeat
    if (target.currentHp <= 0) {
      target.isAlive = false;
      newLogEntries.push({
        timestamp: Date.now(),
        type: 'defeat',
```

**Insert after `target.isAlive = false;`**:
```typescript
      playEnemyDefeatSound();
```

#### 2. Boss Phase Transition Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~721 (after phase change is confirmed, before applying transition)

**Context** (lines 714-726):
```typescript
        const phaseResult = checkBossPhaseTransition(target, bossDef);
        if (phaseResult.phaseChanged && phaseResult.newPhase) {
          // Apply the phase transition
          const updatedBoss = applyBossPhaseTransition(target, phaseResult.newPhase, bossDef);
```

**Insert after `if (phaseResult.phaseChanged && phaseResult.newPhase) {`**:
```typescript
          // Play boss phase transition sound
          triggerBossPhaseTransition(phaseResult.newPhase);
```

### Success Criteria

#### Automated Verification

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`

#### Manual Verification

- [ ] Killing an enemy plays defeat sound
- [ ] Boss phase transition plays dramatic sound
- [ ] Multiple enemy deaths in quick succession sound acceptable

---

## Phase 4: Combat Engine Audio - Status Effects (Heal/Buff/Debuff)

### Overview

Add audio for heal, buff, and debuff effects in the `applyAbilityEffect` function.

### Changes Required

#### 1. Heal Effect Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~1144 (at the start of the heal case block)

**Context** (lines 1144-1148):
```typescript
    case 'heal': {
      // Apply healing to allies
      const allyTargets = targetType === 'all_allies'
```

**Insert after `case 'heal': {`**:
```typescript
      // Play heal sound once for the action
      playHealSound();
```

#### 2. Buff Effect Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~1175 (at the start of the buff case block)

**Context** (lines 1175-1179):
```typescript
    case 'buff': {
      // Apply buff to allies
      const buffTargets = targetType === 'all_allies'
```

**Insert after `case 'buff': {`**:
```typescript
      // Play buff sound once for the action
      playBuffSound();
```

#### 3. Debuff Effect Sound

**File**: `src/systems/combatEngine.ts`
**Location**: Line ~1206 (at the start of the debuff case block)

**Context** (lines 1206-1210):
```typescript
    case 'debuff': {
      // Apply debuff to enemies
      const debuffTargets = targetType === 'all_enemies'
```

**Insert after `case 'debuff': {`**:
```typescript
      // Play debuff sound once for the action
      playDebuffSound();
```

### Success Criteria

#### Automated Verification

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`

#### Manual Verification

- [ ] Healing abilities play gentle sparkle sound
- [ ] Buff abilities play rising power-up sound
- [ ] Debuff abilities play descending sound
- [ ] Multi-target effects only play sound once (not per target)

---

## Testing Strategy

### Manual Testing Checklist

1. **Combat Start/End** (already working, verify no regression):
   - Start combat in a regular zone - combat music plays
   - Start combat in a boss zone - boss music plays
   - Win combat - victory fanfare plays, music transitions
   - Lose combat - defeat jingle plays

2. **Attack Sounds** (Phase 2):
   - Let hero ATB fill and auto-attack - attack sound plays
   - Let enemy ATB fill and attack - attack sound plays
   - Rapid combat with multiple units - sounds don't become annoying

3. **Ability Sounds** (Phase 1):
   - Use any hero ability - whoosh sound plays
   - Use limit break - epic power chord plays

4. **Status Effect Sounds** (Phase 4):
   - Use a healing ability - sparkle chimes play
   - Use a buff ability - rising tone plays
   - Use a debuff ability - descending tone plays

5. **Special Events** (Phase 3):
   - Kill an enemy - defeat sound plays
   - Trigger boss phase transition - dramatic sound plays

### Edge Cases

- Audio muted via settings - all sounds should be silent
- Volume at 0 - all sounds should be silent
- Rapid ability spam - sounds may overlap, should not cause errors
- Combat flee - should play defeat jingle (already working)

---

## References

- Source research: `thoughts/shared/research/2026-02-02_combat-ux-analysis-multi-phase.md`
- Audio system: `src/systems/audioSystem.ts:1168-1895`
- Game store imports: `src/stores/gameStore.ts:89-102`
- Game store combat actions: `src/stores/gameStore.ts:1118-1300`
- Combat engine: `src/systems/combatEngine.ts:576-1234`
