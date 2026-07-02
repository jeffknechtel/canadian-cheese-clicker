---
date: 2026-02-03T02:11:38Z
researcher: Claude
git_commit: 2f58703e5508e4da3c0f574432dc3f2cf00634ce
branch: main
repository: game
topic: "Combat UX Analysis: Bugs, Inconsistencies, and Improvement Opportunities"
tags: [research, combat, ux, accessibility, audio, visual-feedback, state-management]
status: complete
last_updated: 2026-02-02
last_updated_by: Claude
---

# Research: Combat UX Analysis - Multi-Phase Improvement Plan

**Date**: 2026-02-03T02:11:38Z
**Researcher**: Claude
**Git Commit**: 2f58703e5508e4da3c0f574432dc3f2cf00634ce
**Branch**: main
**Repository**: game

## Research Question

Analyze the combat flow for UX bugs, inconsistencies, and ways to improve gameplay. Create a multi-phase research document that can serve as a foundation for building implementation plans.

## Executive Summary

The combat system has a solid mechanical foundation with ATB (Active Time Battle) gauges, hero abilities, limit breaks, boss phases, and comprehensive state management. However, there are significant gaps in **visual feedback**, **audio integration**, **accessibility**, and **user flow** that reduce gameplay immersion and clarity.

### Key Findings

| Category | Severity | Issues Found |
|----------|----------|--------------|
| Visual Feedback | High | 12 animation/effect systems defined but unused |
| Audio Integration | Critical | 15+ combat audio functions exist but none are called |
| State Management | Medium | 6 race conditions or validation gaps |
| Accessibility | Medium | 8 components missing proper ARIA attributes |
| User Flow | High | No pre-combat preview, abrupt transitions |
| UI Consistency | Low-Medium | Inconsistent button styles, animation durations |

---

## Phase 1: Critical Audio Integration (Quick Win)

### Problem
The audio system (`src/systems/audioSystem.ts`) has 15+ combat-specific sound functions fully implemented, but they are **never called** during combat gameplay.

### Impact
Combat feels silent and unresponsive. Players have no audio feedback for actions.

### Files to Modify

| Function | Location | Call Site Needed |
|----------|----------|------------------|
| `startCombatMusic(isBoss)` | audioSystem.ts:1820 | gameStore.ts:1129 (after combat init) |
| `playAttackSound('physical')` | audioSystem.ts:1168 | combatEngine.ts:690 (hero attack log) |
| `playAttackSound('physical')` | audioSystem.ts:1168 | combatEngine.ts:784 (enemy attack log) |
| `playEnemyDefeatSound()` | audioSystem.ts:1362 | combatEngine.ts:702 (enemy death) |
| `playAbilitySound()` | audioSystem.ts:1258 | gameStore.ts:1230 (after useHeroSkill) |
| `playLimitBreakSound()` | audioSystem.ts:1297 | gameStore.ts:1262 (after useLimitBreak) |
| `playHealSound()` | audioSystem.ts:1497 | combatEngine.ts:1170 (heal effect) |
| `playBuffSound()` | audioSystem.ts:1533 | combatEngine.ts:1196 (buff applied) |
| `playDebuffSound()` | audioSystem.ts:1564 | combatEngine.ts:1226 (debuff applied) |
| `playVictoryFanfare()` | audioSystem.ts:1392 | combatEngine.ts:884 (victory detected) |
| `playDefeatJingle()` | audioSystem.ts:1454 | combatEngine.ts:895 (defeat detected) |
| `endCombatMusic(victory)` | audioSystem.ts:1829 | gameStore.ts:1199 (endCombat) |
| `triggerBossPhaseTransition(phase)` | audioSystem.ts:1845 | combatEngine.ts:721 (phase change) |

### Estimated Effort
Low - Only requires adding import and function calls at existing event points.

---

## Phase 2: Visual Feedback System Integration

### Problem
Multiple CSS animations and a particle system are defined but not triggered during combat.

### 2.1 Unused CSS Animations

| Animation | CSS Location | Intended Use |
|-----------|--------------|--------------|
| `.animate-attack-effect` | index.css:286-302 | Attack burst effect |
| `.animate-hit-flash` | index.css:304-310 | Target flash on hit |
| `.animate-shake-light/medium/heavy` | index.css:308-350 | Screen shake on damage |
| `.animate-result-banner` | index.css:362-383 | Victory/defeat entrance |
| `.animate-limit-glow` | index.css:445-460 | Limit break ready glow |

### 2.2 Unused Particle Presets

Located in `src/systems/particleSystem.ts:142-182`:
- `healingSparkles` - Green particles for healing
- `damageImpact` - Red particles for damage
- `limitBreakExplosion` - Gold/orange explosion

### 2.3 Missing Visual Feedback

| Event | Current Behavior | Recommended |
|-------|------------------|-------------|
| Hero attack | Log message only | Attack line + target hit-flash |
| Enemy attack | Log message only | Attack line + hero hit-flash |
| Damage dealt | HP bar changes | Floating damage number + shake |
| Healing | HP bar changes | Floating heal number + sparkles |
| Enemy death | Instant grayscale | Fade out + collapse animation |
| Hero death | Instant grayscale | Fade + "Down" overlay |
| Limit break ready | Pulse on button | Limit glow aura on hero card |
| Limit break activate | Log message | Screen flash + explosion particles |
| Victory | Modal appears | Banner animation + confetti |
| Defeat | Modal appears | Banner animation + screen fade |

### Recommended Implementation

Create a `CombatEffects.tsx` component (similar to existing `ClickEffects.tsx`) that:
1. Subscribes to combat state changes
2. Triggers appropriate animations/particles
3. Renders floating damage numbers

### Files to Create/Modify
- `src/components/ui/CombatEffects.tsx` (new)
- `src/components/ui/CombatPanel.tsx` (add CombatEffects)
- `src/components/ui/EnemyDisplay.tsx` (add hit-flash classes)
- `src/components/ui/CombatATBBar.tsx` (add limit-glow class)

---

## Phase 3: State Management Hardening

### 3.1 Race Condition in useHeroSkill/useLimitBreak

**Location**: `src/stores/gameStore.ts:1217-1218`

```typescript
// Current - potential stale state
const partyStats = get().getPartyStats();
const result = executeHeroAbility(state.combat, heroId, partyStats, targetId);
```

**Fix**: Compute partyStats inside the set() callback or use the same snapshot.

### 3.2 Missing endCombat Validation

**Location**: `src/stores/gameStore.ts:1150-1152`

```typescript
// Current - only checks isInCombat
if (!state.combat.isInCombat) return;

// Should also check
if (state.combat.battleResult !== 'ongoing') return;
```

**Impact**: Prevents duplicate victory tracking and analytics pollution.

### 3.3 Boss timesCompleted Double-Increment

**Location**: `src/stores/gameStore.ts:1173`

```typescript
timesCompleted: isBoss ? currentProgress.timesCompleted + 1 : currentProgress.timesCompleted,
```

If `endCombat` is called multiple times (due to missing validation), boss completion count increments incorrectly.

### 3.4 Multiple set() Calls in claimCombatRewards

**Location**: `src/stores/gameStore.ts:1324-1327`

```typescript
for (const [heroId, xpAmount] of Object.entries(rewards.xp)) {
  get().grantXp(heroId, xpAmount);  // Each triggers separate set()
}
```

**Fix**: Batch XP grants into a single set() call for performance.

### 3.5 Auto-Victory Not Triggering Full Combat End Flow

**Location**: `src/stores/gameStore.ts:1233-1236`

When ability/tick detects victory, it sets `battleResult: 'victory'` but doesn't:
- Update zone progress
- Track analytics
- Call `endCombat()`

**Clarification Needed**: Document the expected flow - should auto-victory trigger `endCombat()` or rely on `claimCombatRewards()` to handle it?

### 3.6 Combat State Reset Inconsistency

Two different patterns exist:
- `claimCombatRewards`: Uses `createEmptyCombatState()`
- `performAging`: Manual object construction

**Fix**: Always use `createEmptyCombatState()` for consistency.

---

## Phase 4: Accessibility Improvements

### 4.1 Missing ARIA Attributes

| Component | Issue | Fix |
|-----------|-------|-----|
| `CombatATBBar.tsx:39-78` | No role, no aria-valuenow | Add `role="progressbar"` with values |
| `LimitBreakGauge:87-131` | Gauge div lacks ARIA | Add progressbar role |
| `LimitBreakGauge:117` | Button lacks aria-label | Add descriptive label |
| `EnemyDisplay:50-160` | No role/aria on cards | Add listitem role, status label |
| `EnemyDisplay HP bar` | No progressbar role | Add role with value attributes |
| `HeroAbilityButton:42` | Uses title (inaccessible) | Use aria-label instead |
| `CombatLog:93` | Missing aria-expanded | Add expansion state |
| `CompactCombatLog` | Missing list semantics | Add role="list" |

### 4.2 Missing Focus Management

| Issue | Location | Fix |
|-------|----------|-----|
| No focus trap in combat | CombatPanel.tsx | Add useFocusTrap hook |
| No auto-focus on combat start | App.tsx:308-315 | Focus combat panel after start |
| No focus restoration | App.tsx | Return focus to zone select after modal |

### 4.3 Color Contrast Issues

Verify these combinations meet WCAG 4.5:1 ratio:
- `text-gray-400` on white (defeated heroes)
- `text-gray-500` on light backgrounds (labels)
- `amber-400 to amber-600` gradient (medium HP)
- ATB ready pulse (reduces effective contrast)

### 4.4 Missing Keyboard Features

| Feature | Current | Recommended |
|---------|---------|-------------|
| Enemy targeting | Auto (random) | Arrow keys to select target |
| Combat log scroll | Not accessible | Up/Down in log area |
| Boss phase info | Not queryable | Key to announce phase |

---

## Phase 5: Combat Flow & User Experience

### 5.1 Pre-Combat Preview (High Priority)

**Current**: Clicking stage immediately starts combat with no preview.

**Recommended**: Add a "Battle Preview" modal showing:
- Enemies to face (icons, names, count)
- Enemy weaknesses/resistances
- Recommended level vs party average level
- Party formation summary
- "Start Battle" / "Go Back" buttons

**Files**:
- `src/components/ui/BattlePreviewModal.tsx` (new)
- `src/components/ui/ZoneSelectPanel.tsx` (trigger modal instead of direct combat)

### 5.2 Transition Animations

| Transition | Current | Recommended |
|------------|---------|-------------|
| Zone Select -> Combat | Instant swap | Fade/slide transition |
| Final blow -> Modal | Instant | 500ms pause, then modal slides in |
| Victory claim | Numbers update | Animated counters + particles |
| Modal close | Instant | Fade out |

### 5.3 Combat End Navigation

**Current**: After modal closes, player stays on zone select.

**Recommended**: Add contextual buttons:
- After victory: "Continue" / "Go to Heroes" (if level up)
- After defeat: "Retry" / "Go to Heroes" (to upgrade)

### 5.4 Stage Difficulty Communication

**Current**: Only zone-level "Recommended Lv. X" shown.

**Recommended**:
- Color-code stages by difficulty (green/yellow/red)
- Show enemy level modifier (1.0x to 1.6x)
- Warning icon if party is underleveled
- Tooltip with enemy composition on hover

---

## Phase 6: UI Consistency Polish

### 6.1 Inconsistent Ready State Indicators

| Component | Current Pattern |
|-----------|-----------------|
| CombatATBBar | Color change + animate-pulse |
| EnemyCard | ring-2 ring-red-400 |
| HeroCombatCard | Badge + animate-pulse |
| HeroAbilityButton | Background change only |

**Recommendation**: Create a unified "ready" visual language:
1. Primary: Color shift (charging -> ready color)
2. Secondary: Pulse/glow animation
3. Tertiary: Ring highlight

### 6.2 Inconsistent Animation Durations

| Component | Duration |
|-----------|----------|
| CombatATBBar | 100ms |
| LimitBreakGauge | 200ms |
| EnemyCard HP bar | 300ms |
| HeroAbilityButton | 200ms |

**Recommendation**: Establish timing constants:
- `--duration-fast`: 100ms (micro-interactions)
- `--duration-normal`: 200ms (standard transitions)
- `--duration-slow`: 300ms (emphasis transitions)

### 6.3 Inconsistent Disabled Button Styles

| Button | Disabled Style |
|--------|---------------|
| HeroAbilityButton | bg-gray-200 text-gray-700 |
| LimitBreakButton | bg-gray-200 text-gray-700 |
| LimitBreakGauge | bg-gray-200 text-gray-700 |
| Flee Button | bg-gray-100 text-gray-400 |

**Recommendation**: Standardize to `bg-gray-200 text-gray-500 cursor-not-allowed`.

### 6.4 Cooldown Display Redundancy

**Location**: `HeroAbilityButton.tsx:56-69`

Cooldown is shown both as inline text AND as overlay, causing visual clutter.

**Recommendation**: Show overlay only OR inline only, not both.

---

## Code References

### Combat Engine
- `src/systems/combatEngine.ts:576-928` - Main tickCombat loop
- `src/systems/combatEngine.ts:499-569` - initializeCombat
- `src/systems/combatEngine.ts:951-1019` - calculateCombatRewards
- `src/systems/combatEngine.ts:1339-1415` - executeHeroAbility
- `src/systems/combatEngine.ts:1448-1529` - executeHeroLimitBreak

### State Management
- `src/stores/gameStore.ts:1104-1129` - startCombat action
- `src/stores/gameStore.ts:1132-1148` - tickCombat action
- `src/stores/gameStore.ts:1150-1201` - endCombat action
- `src/stores/gameStore.ts:1212-1242` - useHeroSkill action
- `src/stores/gameStore.ts:1244-1274` - useLimitBreak action
- `src/stores/gameStore.ts:1296-1333` - claimCombatRewards action

### UI Components
- `src/components/ui/CombatPanel.tsx:224-530` - Main combat UI
- `src/components/ui/CombatATBBar.tsx:12-132` - ATB gauges
- `src/components/ui/EnemyDisplay.tsx:40-200` - Enemy rendering
- `src/components/ui/HeroAbilityButton.tsx:11-177` - Ability buttons
- `src/components/ui/CombatLog.tsx:69-165` - Combat log
- `src/components/ui/ZoneSelectPanel.tsx:166-242` - Zone selection

### Audio System
- `src/systems/audioSystem.ts:1168-1600` - Combat SFX functions
- `src/systems/audioSystem.ts:1820-1916` - Combat music functions

### Visual Effects (Unused)
- `src/index.css:286-460` - Combat animations
- `src/systems/particleSystem.ts:142-182` - Combat particle presets

---

## Implementation Priority Matrix

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| Phase 1: Audio Integration | Low | High | P0 - Do First |
| Phase 2: Visual Feedback | Medium | High | P1 |
| Phase 3: State Hardening | Low | Medium | P2 |
| Phase 4: Accessibility | Medium | Medium | P2 |
| Phase 5: UX Flow | High | High | P1 |
| Phase 6: UI Polish | Low | Low | P3 |

### Recommended Order

1. **Phase 1** (Audio) - Quick win, immediate impact
2. **Phase 3** (State) - Prevents bugs before adding features
3. **Phase 5.1** (Battle Preview) - Major UX improvement
4. **Phase 2** (Visual) - Enhances combat feel
5. **Phase 4** (Accessibility) - Important for inclusivity
6. **Phase 5.2-5.4** (Flow polish)
7. **Phase 6** (UI consistency)

---

## Open Questions

1. **Victory Detection Flow**: Should auto-victory (detected in tick/ability) trigger `endCombat()` automatically, or rely on player dismissing modal to call it?

2. **Damage Number Style**: Should floating damage numbers match the cookie-clicker click feedback style, or have a more JRPG feel?

3. **Screen Shake Intensity**: Should screen shake be configurable via settings for motion-sensitive users?

4. **Combat Log Persistence**: Should the combat log expand state persist across battles?

5. **Enemy Targeting**: Is manual enemy targeting a desired feature, or should it remain automatic?

---

## Related Research

- `thoughts/shared/research/2026-02-02_ux-best-practices-review.md` - UX patterns
- `thoughts/shared/research/2026-01-30_ui-consistency-cleanup.md` - UI consistency analysis
- `thoughts/shared/plans/ui-consistency-phase3-accessibility.md` - Accessibility plan

---

## Appendix: Complete Issue Inventory

### Critical (Blocks Core Experience)
1. Audio functions defined but never called (15+ functions)
2. No pre-combat enemy preview

### High (Degrades Experience)
3. Attack/damage animations unused
4. Limit break activation has no visual impact
5. Victory/defeat transitions are abrupt
6. Screen shake animations unused
7. Particle effects unused in combat

### Medium (Causes Confusion)
8. State validation gap in endCombat
9. Boss completion counter can double-increment
10. Missing ARIA on 8+ components
11. No focus management during combat
12. Cooldown display redundancy

### Low (Polish Items)
13. Inconsistent animation durations
14. Inconsistent disabled button styles
15. ATB transition too fast (100ms)
16. Status effect badges not keyboard accessible
