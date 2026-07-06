# Phase 6: Fun Maximization Implementation Plan

## Overview

This is the "fun" phase of the 2026-07-01 roadmap (P6): close the loops the data already promises and ship the decorative endgame. Four independently-shippable phases: (1) make active play matter forever, (2) close cross-system reward loops, (3) fix progression pacing, (4) ship the Vintage/Legacy endgame. The guiding principle from the research: **"the fun roadmap is largely keeping the promises the data already makes."**

## Current State Analysis

Roadmap status as of main `eb54034` (verified 2026-07-02 via git log + code inspection):

- **P1 combat playability** — merged (#48). Defeat/flee softlock fixed (`endCombat` resets on defeat/flee, `combatSlice.ts:247-251`); turn semantics, ATB, feedback fixed.
- **P2 economy/persistence** — merged (#49).
- **P3 reconnect dead content** — **planned but NOT implemented** (`thoughts/shared/plans/phase3-reconnect-dead-content.md`). This plan assumes P3 lands first.
- **P4 DDD consolidation** — merged (#50). `CombatEnemy` now carries `scaledRewards`; rewards respect stage scaling.
- **P5 store/UI hygiene** — merged (#51). `CombatState.partyStats` is snapshotted once at `startCombat` (`combatSlice.ts:74-77`) and never persisted.

### What's dead/inert that this plan brings to life (verified against current main):

**Active play:**
- Click base is the literal `new Decimal(1)` (`src/stores/slices/production/cpsCalculator.ts:69`); no CPS component anywhere in the click path. Only 3 click upgrades exist, all bought by 50K curds (`src/data/upgrades.ts:6-29`).
- `CLICK_CRIT_BASE_CHANCE = 0.05` / `CLICK_CRIT_BASE_MULTIPLIER = 2` (`src/data/constants.ts:226,229`) are consumed only by `productionSlice.click()` (`productionSlice.ts:64-70`); nothing modifies them despite the `_BASE_` naming.
- `goldenCheese.totalCollected` is persisted, survives prestige, and has **zero gameplay consumers** (only a dead effect in `GoldenCheeseNotification.tsx:188-196`).
- Golden cheese spawn cadence is a single uniform roll 3–10 min (`goldenCheeseSystem.ts:37-39`, constants at `constants.ts:240-243`); no upgrade/meta modifies delay, duration, or weights.
- `ClickEffects.tsx:43` renders raw `curdPerClick` — the floating "+N" understates crits and buffed clicks.

**Cross-system:**
- 27 `heroBuff` cheese effects across `cheeseRecipes.ts` (attack/hp/defense/speed/cheeseAffinity) are crafted, stored in `crafting.activeBuffs`, displayed in `ActiveBuffsBar` — and consumed by nothing. `getActiveBuffMultipliers` (`craftingSlice.ts:500-526`) handles only `productionBoost`/`clickBoost`/`xpBoost`.
- Weakness/resistance: nearly every enemy has `weakness`/`resistance` (`data/enemies.ts`), `EnemyDisplay.tsx:97-102` shows "Weak: X", `AbilityEffect` has an optional `damageType` field (`types/game.ts:540`) — but `calculateDamage` (`combatEngine.ts:84-93`) has no element parameter and no ability data sets `damageType`.
- Whey: earned only from bosses (10–40% of boss curds, `constants.ts:275-296`), spent only on 5 one-time synergies totaling 125 whey (`data/synergies.ts`). The `costCurrency: 'whey'` upgrade pipeline is fully functional end-to-end (`productionSlice.ts:189-196`, `UpgradePanel.tsx:152-156`) with **zero data entries using it**. Whey is invisible outside the Synergies panel.
- Combat curd rewards come from static enemy defs (stage-scaled) — they do not track player CPS, so combat pay decays into irrelevance as CPS grows.

**Pacing:**
- `BUY_MILESTONES = [25,50,100,150,200,250,300,400,500]` (`constants.ts:234-235`) is cosmetic-only: sound/haptics/fireworks in `buyGenerator` (`productionSlice.ts:146-152`), no state written, no multiplier. (Note: the "Milestone Multipliers" feature from the 2026-02-28 research never shipped — PR #35 was synergies.)
- Per-generator upgrades stop at 50 owned; last global upgrade at 1e16 while generators extend past 1e20.
- Mythology zones (`zones.ts:879-1088`) have no data-level marker, no UI distinction, and untelegraphed difficulty cliffs: `chasse_galerie` (recLv 70) unlocks after `quebec_fromagerie` (recLv 10, the second zone in the game). Locked zone cards show "🔒 Locked" with no requirement hint (`ZoneSelectPanel.tsx:87`).

**Endgame:**
- `performVintage`/`performLegacy` are complete in-store (`prestigeSlice.ts:164-276`) with **zero callers** — `PrestigePanel.tsx:416-458` renders locked progress bars with no buttons. Vintage gate is `agingResetCount >= 100 && rennet >= 100` (`prestigeSlice.ts:159-162`), far too deep.
- `performLegacy` increments scalar `prestige.legacy` but the production multiplier reads `prestige.legacyBonuses` (per-province map, `productionEngine.ts:345-346`) which **no code ever writes** — Legacy would do nothing.
- `prestige.vintageUnlocks` is write-only dead state (initialized `[]`, cleared by `performLegacy`, never read or pushed).
- Vintage-gated content is ready-made rewards: `alpine_cave`/`masters_vault` (`caves.ts:58,68`), 3 recipes (`cheeseRecipes.ts:933,954,974`), 2 ingredients (`ingredients.ts:91,143`), `vintage_pioneer`/`legacy_of_fromage` achievements (`achievements.ts:386-403`). Gates check `totalVintageWheels` and already work (`craftingEngine.ts:67-68`).
- Heroes/equipment are wiped on every prestige tier (`heroSlice.ts:361-370`), while `AgingConfirmModal.tsx:118-127` **falsely lists "Heroes & Levels", "Equipment", "Zone Progress" under "Will Be Kept"**.
- `crafting/resetFactory.ts:39-40`: Vintage/Legacy crafting reset is a `return current` stub — in-flight jobs and buffs would survive a total reset.
- `canadian_perseverance` (`agingUpgrades.ts:94-103`) promises "-25% Rennet on next reset" in its description; the effect is actually `productionBonus 0.5`.

### Verification tooling constraint

`package.json` has only `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`. **There is no test runner.** P3's Phase 8 plans a vitest ID-validation test; if vitest exists by the time this plan runs, extend that test. Otherwise automated verification = build + lint.

## Desired End State

- Clicking is worth doing at every stage of the game: click value includes a % of CPS, crits are upgradeable, and the floating numbers tell the truth.
- Golden cheese collection is a meta-progression track with visible perks and a welcome-back spawn.
- Crafted cheese measurably changes combat; elements matter; whey has a permanent per-run sink; combat pay scales with your economy.
- Generator milestones grant real multipliers; the upgrade ladder reaches late-game; mythology zones are presented as endgame "Legendary Questlines" with honest warnings.
- Vintage is a button players actually press mid-game; Legacy allocates real province bonuses; a rennet sink lets devoted players keep their favourite heroes through Aging.

### Key Discoveries:

- Recalc ordering already supports CPS-dependent clicks: `CpsInputsChanged` → `recalculateCps()` **then** `recalculateClickValue()` (`production/eventSubscriber.ts:21-25`).
- The upgrade effect union has exactly 3 variants (`types/game.ts:188-191`) consumed in `productionEngine.ts:86-133` and `domain/entities/Upgrade.ts:32-38` — the extension points for new effect types.
- `getPartyStats()` (`heroSlice.ts:344-359`) is the single canonical party-stat source, snapshotted at `combatSlice.ts:77`; but hero **HP** at combat init comes from a separate `calculateHeroStats` call inside `initializeCombat` → `createHeroCombatState` (`combatEngine.ts:358-373`) — cheese HP buffs must touch both paths.
- Milestone multipliers need **no persisted state** — derivable from `state.generators` counts at CPS-recalc time.
- `checkUnlockRequirement` gates Vintage content on `ctx.totalVintageWheels` (`craftingEngine.ts:67-68`), which `performVintage` already increments — shipping the button is genuinely just UI + gate tuning.
- Old saves need **no migration** for any of this: new upgrade IDs are additive, golden meta derives from the already-persisted `totalCollected`, `legacyBonuses` already exists (all-zeros) in every save.

## What We're NOT Doing

- **Anything in the P3 plan** (prerequisite, not overlap): granting combat drops / `ingredientInventory`, applying the aging combat bonus, consuming the event `drops` multiplier, golden cheese `rareIngredient` fallback fix, cave-unlock UI, achievement/challenge/event phantom-ID fixes, the ID-validation test.
- A full materials/inventory system beyond P3's drop→ingredient mapping.
- New generators, heroes, zones, or enemy content (data expansion here is events/challenges/upgrades only).
- Rebalancing hero costs 10–30 (the "heroes unreachable" problem) — hero retention (Phase 4.3) is the targeted mitigation; a full curve rebalance is future work.
- Auto-clickers or offline click simulation.
- Changing mythology zone unlock gates (we telegraph danger; we don't lock content away from players who want to try).
- Creating the 6 seasonal exclusive items P3 removes (still future content).

## Implementation Approach

Four phases, each an independent PR in this order (later phases read state earlier phases create, but none hard-depend on each other except where noted). All new balance numbers go in `src/data/constants.ts` per house convention. New upgrade-effect handling follows the existing accumulate-in-`productionEngine` → cache-in-slice → consume-at-action-site pipeline. **Sequencing note:** Phase 2.4 and Phase 4.2 touch `calculateCombatRewards`, which P3 Phase 7 also modifies — land P3 first to avoid a three-way merge on that function.

---

## Phase 1: Active Play Forever (click scaling, crit upgrades, golden cheese meta)

### Overview

Make the click button and the golden cheese permanently relevant: click value gains a %-of-CPS component behind a new upgrade line, crit chance/multiplier become upgradeable, and `totalCollected` drives a golden-cheese perk track with a welcome-back spawn.

---

## Phase 1.1: Click Scales With CPS

### Changes Required:

#### 1. New upgrade effect type

**File**: `src/types/game.ts` (~line 188)
**Changes**: Add a variant to `UpgradeEffect`:

```typescript
export type UpgradeEffect =
  | { type: 'clickMultiplier'; value: number }
  | { type: 'generatorMultiplier'; generatorId: string; value: number }
  | { type: 'globalMultiplier'; value: number }
  | { type: 'clickCpsPercent'; value: number }; // NEW: adds value × CPS to click value
```

#### 2. Accumulator in productionEngine

**File**: `src/systems/productionEngine.ts` (after `calculateClickMultiplier`, ~line 97)
**Changes**: New function following the `calculateClickMultiplier` pattern (lines 86-97):

```typescript
/** Sums clickCpsPercent effects across purchased upgrades (additive). */
export function calculateClickCpsPercent(purchasedUpgradeIds: string[]): number
```

Also extend `domain/entities/Upgrade.ts:32-38` (`getMultiplierValue` switch) with the new type.

#### 3. Consume in computeClickValue

**File**: `src/stores/slices/production/cpsCalculator.ts:62-70`
**Changes**: The CPS component is added **after** the multiplier product (Cookie Clicker convention — click multipliers don't compound the CPS component, or ×100 click multiplier × 15% CPS would be absurd):

```typescript
const cpsPercent = calculateClickCpsPercent(state.upgrades);
return new Decimal(1)
  .mul(totalClickMultiplier)
  .plus(state.curdPerSecond.mul(cpsPercent));
```

`curdPerSecond` is fresh here because `eventSubscriber.ts:23-24` recalcs CPS before click value. Note: `computeClickValue` must now also be re-derived when CPS changes for any reason — audit that every `recalculateCps()` call site is paired with `recalculateClickValue()` (they already are, via the shared `CpsInputsChanged` subscriber).

#### 4. Display getter parity

**File**: `src/stores/slices/production/productionSlice.ts:294-302` (`getClickMultiplier`)
**Changes**: This getter feeds the UpgradePanel click display. Either delegate it to `computeClickValue`-derived data or add a parallel `getClickCpsPercent()` getter so the UI can show "Click: ×N + M% of CPS". Do not leave it silently omitting the new component (that's bug family P-8).

#### 5. Upgrade data — new "Active Hands" line

**File**: `src/data/upgrades.ts`
**Changes**: 5 new upgrades, `costCurrency: 'curds'`, effect `clickCpsPercent` (additive, cumulative 15%):

| id | name (Canadian-flavoured) | cost | effect value |
|---|---|---|---|
| `maple_dipped_fingers` | Maple-Dipped Fingers | 1e6 | 0.01 |
| `double_double_grip` | Double-Double Grip | 1e9 | 0.02 |
| `toque_of_focus` | Toque of Focus | 1e12 | 0.03 |
| `zamboni_smooth_clicks` | Zamboni-Smooth Clicks | 1e15 | 0.04 |
| `hands_of_the_maple_spirit` | Hands of the Maple Spirit | 1e18 | 0.05 |

Descriptions must state the mechanic plainly: "Each click also earns 1% of your CPS."

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] With 1e9 CPS and `maple_dipped_fingers` owned, a click grants ≥ 1e7 curds (visible in the floating number)
- [ ] Buying a generator (CPS change) immediately changes click value without a manual click-upgrade purchase
- [ ] UpgradePanel click stat reflects the CPS component
- [ ] With zero clickCpsPercent upgrades, click value is byte-identical to pre-change behavior

---

## Phase 1.2: Upgradeable Click Crits (and honest floating numbers)

### Changes Required:

#### 1. New effect types + accumulators

**File**: `src/types/game.ts` — add to `UpgradeEffect`:

```typescript
  | { type: 'critChance'; value: number }      // additive, e.g. 0.05 = +5 pts
  | { type: 'critMultiplier'; value: number }  // additive, e.g. 1 = +1x
```

**File**: `src/systems/productionEngine.ts` — `calculateCritChance(upgradeIds)` returning `min(CLICK_CRIT_BASE_CHANCE + sum, CLICK_CRIT_CHANCE_CAP)` and `calculateCritMultiplier(upgradeIds)` returning `CLICK_CRIT_BASE_MULTIPLIER + sum`.

**File**: `src/data/constants.ts` — add `CLICK_CRIT_CHANCE_CAP = 0.5` next to the existing `_BASE_` constants (`:226-229`).

#### 2. Cache and consume

**File**: `src/stores/slices/production/productionSlice.ts`
**Changes**: Cache `clickCritChance`/`clickCritMultiplier` in state, recomputed inside `recalculateClickValue()` (same lifecycle as `curdPerClick`). `click()` (lines 64-70) uses the cached values instead of the bare constants. These fields are transient — do **not** add them to the save schema (`saveSystem.ts` load already triggers full recalc).

#### 3. Truthful click feedback

**File**: `src/stores/slices/production/productionSlice.ts` — record `lastClickValue: Decimal` (the actual post-buff, post-crit amount) alongside `lastClickWasCrit` in the `click()` set.
**File**: `src/components/game/ClickEffects.tsx:43,127-147` — render `lastClickValue` instead of raw `getClickValue()`, so crits show the doubled number and Click Storm shows the ×77 number.

#### 4. Upgrade data — crit line

**File**: `src/data/upgrades.ts`:

| id | name | cost | effect |
|---|---|---|---|
| `sharp_cheddar_reflexes` | Sharp Cheddar Reflexes | 5e7 | critChance +0.05 |
| `lucky_loonie` | Lucky Loonie | 5e10 | critChance +0.10 |
| `critical_curd_theory` | Critical Curd Theory | 5e13 | critMultiplier +1 |
| `beavers_fury` | Beaver's Fury | 5e16 | critMultiplier +2 |

Fully upgraded: 20% chance, 5× multiplier — expected click value ×1.8, and crit moments matter.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Base game still crits ~5% at 2× (no regression)
- [ ] With `lucky_loonie`, crits are visibly ~3× more frequent over ~100 clicks
- [ ] Crit floating number shows the actual multiplied amount ("+2,400 CRIT!" not "+1,200")
- [ ] During Click Storm, floating numbers show the ×77 value

---

## Phase 1.3: Golden Cheese Meta-Progression + Welcome-Back Spawn

### Changes Required:

#### 1. Perk tier table

**File**: `src/data/constants.ts` (Golden Cheese section, `:237-259`)
**Changes**:

```typescript
/** Lifetime-collection perk tiers. Cumulative; derived from goldenCheese.totalCollected. */
export const GOLDEN_CHEESE_META_TIERS = [
  { collected: 10,  perk: 'spawnWindow1' },  // max spawn delay 10 → 8 min
  { collected: 25,  perk: 'buffDuration' },  // golden buff durations ×1.25
  { collected: 50,  perk: 'spawnWindow2' },  // spawn window → 2–7 min
  { collected: 100, perk: 'goldenRush' },    // 10% chance on collect: next spawn in 15–45 s
] as const;
export const GOLDEN_RUSH_CHANCE = 0.1;
export const GOLDEN_RUSH_DELAY_MS = { min: 15_000, max: 45_000 };
export const WELCOME_BACK_SPAWN_DELAY_MS = 30_000;
export const WELCOME_BACK_MIN_OFFLINE_MS = 60 * 60 * 1000; // 1 h
```

#### 2. Apply perks in the golden cheese system

**File**: `src/systems/goldenCheeseSystem.ts`
**Changes**:
- `getRandomSpawnDelay(totalCollected)` — window narrows per tier (3–10 → 3–8 → 2–7 min).
- `createGoldenBuff(...)` — duration ×1.25 when the `buffDuration` tier is reached. Keep the hardcoded description strings in sync (`goldenCheeseSystem.ts:125-135` duplicates constants — while here, derive those strings from the constants to close the desync trap the golden-cheese audit flagged).

**File**: `src/stores/slices/goldenCheese/goldenCheeseSlice.ts`
**Changes**: `scheduleNextGoldenCheese`/`tickGoldenCheese` pass `totalCollected` into `getRandomSpawnDelay`; `collectGoldenCheese` rolls Golden Rush after incrementing `totalCollected`.

#### 3. Welcome-back spawn

**File**: `src/stores/slices/persistence/persistenceSlice.ts`
**Changes**: In `load()` and `applyOfflineProgress(offlineMs)`: `nextSpawnAt = max(nextSpawnAt, now + WELCOME_BACK_SPAWN_DELAY_MS)`. This one clamp both prevents the current jarring instant-pop on load (stale past timestamp spawns within 100 ms) **and** guarantees anyone away > the pending delay gets a golden cheese ~30 s after returning. When `offlineMs >= WELCOME_BACK_MIN_OFFLINE_MS`, the `OfflineProgressModal` (`App.tsx:931-937`) adds a "A golden cheese is on its way! 🧀✨" line.

#### 4. Make progression visible + fix the expiry-toast bug

**File**: `src/components/ui/GoldenCheeseNotification.tsx`
**Changes**: Replace the broken visibility-transition collection heuristic (`:199-220`, which also fires on natural expiry) with detection off `totalCollected` changes — the dead effect at `:188-196` becomes the real detector. Collection toast gains "N collected — next perk at M: {perk description}".

**File**: `src/components/ui/PrestigeStats.tsx` (or HelpModal) — add a "Golden Cheese" line: total collected + unlocked perks.

#### 5. Hard-reset gap

**File**: `src/stores/slices/persistence/persistenceSlice.ts:86-128` (`reset`)
**Changes**: Include golden cheese state via its `resetFactory` (currently hard reset preserves `totalCollected` and stale timers — a full wipe should wipe the meta track too).

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Set `totalCollected` to 9 via save edit, collect one → toast announces tier unlock; subsequent spawns come faster (verify `nextSpawnAt` deltas in devtools)
- [ ] Close tab ≥ 1 h → reopen → offline modal mentions golden cheese; one spawns ~30 s later
- [ ] Reload mid-session → no instant golden cheese pop within the first 30 s
- [ ] Letting a golden cheese expire no longer shows the "collected" toast
- [ ] Hard reset zeroes `totalCollected`

---

## Phase 2: Cross-System Loops (cheese→combat, elements, whey sinks, CPS-relative combat pay)

### Overview

Every system feeds another: crafted cheese buffs combat stats, elements make ability choice tactical, whey buys per-run power, and combat pay scales with your economy so battles are always worth fighting.

**Prerequisite**: P3 Phase 7 merged (it refactors `calculateCombatRewards`'s signature; 2.4 builds on that).

---

## Phase 2.1: Cheese heroBuffs Applied in Combat

### Changes Required:

#### 1. Buff totals getter

**File**: `src/stores/slices/crafting/craftingSlice.ts` (next to `getActiveBuffMultipliers`, `:500-526`)
**Changes**: New getter:

```typescript
/** Sums active heroBuff effect values per stat (quality scaling already baked into stored values). */
getActiveHeroBuffTotals: () => Partial<Record<keyof HeroStats, number>>
```

Design decision: buffs are **party-wide flat adds** — "+40 attack" applies to every party hero, matching how `ActiveBuffsBar`/`RecipeCard` already present them.

#### 2. Apply at the two combat stat entry points

**File**: `src/stores/slices/heroes/heroSlice.ts:344-359` (`getPartyStats`)
**Changes**: Add the buff totals (attack/defense/speed — and hp for display parity) to each hero's stats after `calculateHeroStats`. Because `startCombat` snapshots this (`combatSlice.ts:77`), buffs are frozen for the battle — consistent with the existing snapshot invariant (comment at `combatSlice.ts:74-76`). Eat cheese *before* battle: that's the intended ritual.

**File**: `src/systems/combatEngine.ts` (`initializeCombat` → `createHeroCombatState`, `:358-373`)
**Changes**: Hero starting/max HP is computed here from a separate `calculateHeroStats` call — pass the same buff totals in (thread from `startCombat` via `initializeCombat`'s params) so hp-buff cheeses (e.g. `moose_cheese` +100 HP, `cheeseRecipes.ts:957`) actually raise battle HP.

#### 3. cheeseAffinity buffs feed CPS

**File**: `src/systems/productionEngine.ts:191-221` (`calculateHeroCpsMultiplier`)
**Changes**: Optional `bonusAffinityPerHero: number = 0` parameter added to each party hero's affinity; `cpsCalculator.ts` passes the `cheeseAffinity` buff total. (2 recipes buff affinity; without this they'd stay dead.)

#### 4. Publish the recalc

`consumeCheese`, `tickBuffs` expiry, and buff-affecting paths must publish `CpsInputsChanged` when a `cheeseAffinity` heroBuff starts/ends (production/click buffs already work per-tick and need no recalc; affinity is baked into CPS so it does).

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Eat an attack-buff cheese → start battle → hero basic attacks hit visibly harder; party panel shows raised attack
- [ ] HP-buff cheese raises the in-battle HP bar maximum, not just displayed stats
- [ ] Buff expiring mid-battle does NOT change in-battle stats (snapshot semantics)
- [ ] Affinity-buff cheese changes CPS while active and reverts on expiry

---

## Phase 2.2: Weakness/Resistance in the Damage Formula

### Changes Required:

#### 1. Element multiplier in calculateDamage

**File**: `src/data/constants.ts` — `WEAKNESS_DAMAGE_MULTIPLIER = 1.5`, `RESISTANCE_DAMAGE_MULTIPLIER = 0.5`.

**File**: `src/systems/combatEngine.ts:84-93` (`calculateDamage`)
**Changes**: Optional params `damageType?: DamageType`, `defenderWeakness?: DamageType`, `defenderResistance?: DamageType`; multiply by the weakness/resistance constant on match. No element → ×1 (all existing call sites unchanged in behavior until they pass elements).

#### 2. Battle call sites pass elements (hero → enemy only)

**File**: `src/domain/aggregates/Battle.ts:415` (basic attack — always `'physical'`), `:570` (ability — `ability.effect.damageType`), `:622` (limit break — `damageType` if defined, else `'physical'`). Enemy definitions supply weakness/resistance via the registry the Battle already reads. Heroes have no weakness — enemy→hero damage stays element-less (documented asymmetry; heroes are not elemental sponges).

#### 3. Ability element data pass

**File**: `src/data/heroes.ts` (`HERO_ABILITIES`, `:1422+`)
**Changes**: Assign `damageType` to every damaging hero ability, thematically (fire for forge/kitchen heroes, ice for winter/north, lightning for storm, nature for farm/forest, holy for guardian, dark for trickster, physical default). Every damage ability MUST get an explicit type — enumerate all in the PR description.

#### 4. Surface it

**File**: `src/components/ui/EnemyDisplay.tsx:97-102` — also render resistance: "Weak: fire • Resists: physical".
**File**: `src/domain/aggregates/Battle.ts` feedback events — extend the damage feedback `damageType: 'crit' | 'damage'` channel with `'weak' | 'resist'`; `CombatFeedback` renders weak hits in amber with "Weak!" and resisted hits in grey. Combat log entries append "(weak)" / "(resisted)".
**File**: `src/components/ui/HeroAbilityButton.tsx` (or ability tooltip) — show the ability's element icon so the choice is informed.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Fire ability vs `mold_sprite` (weak: fire) deals ~1.5× and shows the "Weak!" treatment
- [ ] Physical attack vs a physical-resistant enemy deals ~0.5× with "(resisted)" in the log
- [ ] Element-less interactions (enemy → hero) unchanged
- [ ] Every damaging ability shows an element in its tooltip

---

## Phase 2.3: Whey Sinks + Whey Visibility

### Changes Required:

#### 1. Whey-cost upgrade branch (data-only — pipeline verified working)

**File**: `src/data/upgrades.ts` — new "Whey of Power" line, `costCurrency: 'whey'`. These reset on Aging (upgrades wipe) just as whey zeroes (`production/resetFactory.ts:41`) — an intentional per-run sink: every run, boss whey funds temporary power, and post-synergy whey income (currently permanently dead-ended after 125 whey lifetime) always has somewhere to go.

| id | name | cost (whey) | effect |
|---|---|---|---|
| `whey_of_the_warrior` | Whey of the Warrior | 25 | globalMultiplier ×1.5 |
| `curds_and_whey_protein` | Curds & Whey Protein | 60 | clickMultiplier ×5 |
| `whey_beyond_curds` | Whey Beyond Curds | 150 | globalMultiplier ×2 |
| `liquid_gold_reserves` | Liquid Gold Reserves | 400 | globalMultiplier ×2.5 |
| `whey_of_the_north` | Whey of the North | 1000 | globalMultiplier ×3 |

(Costs assume 2.4's CPS-scaled boss whey; tune down ~4× if 2.4 ships later.)

#### 2. Whey in the header HUD

**File**: header currency area (`src/components/ui/` — wherever curds render in `App.tsx`'s header)
**Changes**: Show whey (💧 icon + `formatNumber`) once `whey > 0 || totalWheyEarned > 0` — currently the balance is visible only inside the Synergies panel, so the currency reads as noise. Reuse the existing currency display primitive.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Whey upgrades appear in UpgradePanel with "whey" cost label and correct affordability gating
- [ ] Buying one deducts whey (not curds) and multiplies CPS
- [ ] After Aging, whey upgrades are purchasable again and whey is 0
- [ ] Whey appears in the header after first boss kill

---

## Phase 2.4: Combat Pay Scales With CPS

### Changes Required:

#### 1. Reward floor as seconds-of-CPS

**File**: `src/data/constants.ts`:

```typescript
/** Combat curd rewards are floored at seconds-of-CPS so battles always pay. */
export const STAGE_REWARD_CPS_SECONDS_BASE = 15;
export const STAGE_REWARD_CPS_SECONDS_PER_STAGE = 3;
export const BOSS_REWARD_CPS_SECONDS = 180;
```

**File**: `src/systems/combatEngine.ts` (`calculateCombatRewards`, `:507-593` — post-P3 signature)
**Changes**: New params `cpsFloor: Decimal` (computed by caller) applied as `totalCurds = Decimal.max(totalCurds, cpsFloor)` **after** boss multipliers, **before** P3's prestige combat multiplier (so the aging bonus visibly multiplies the floored value). Whey (`:585`) derives from the floored curds → boss whey scales with the economy too, which is what funds 2.3's sink. XP intentionally stays static-scaled — hero leveling pace shouldn't explode with CPS.

**File**: `src/stores/slices/combat/combatSlice.ts` (`claimCombatRewards`, `:336-367`)
**Changes**: Compute `cpsFloor = curdPerSecond.mul(isBoss ? BOSS_REWARD_CPS_SECONDS : STAGE_REWARD_CPS_SECONDS_BASE + stage * STAGE_REWARD_CPS_SECONDS_PER_STAGE)` and pass it. Zero-CPS early game: floor is 0, static rewards still pay (that's why it's a `max`, not a replacement).

#### 2. Show the math

**File**: `src/components/ui/CombatResultsModal.tsx` — no change needed beyond numbers being bigger, but verify the modal formats large Decimals correctly.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] At 1e12 CPS, clearing an early stage pays ≈ 15–45 s of CPS instead of trivial static curds
- [ ] Boss kill pays ≈ 180 s of CPS × boss multiplier, and whey scales proportionally
- [ ] Fresh save (CPS ~0): rewards identical to current behavior
- [ ] Aging combat bonus (from P3) multiplies the floored reward

---

## Phase 3: Progression Pacing (milestones, ladder extension, Legendary Questlines)

### Overview

Data-heavy phase: make `BUY_MILESTONES` mechanical, extend the upgrade ladder into the late game, and present mythology zones as telegraphed endgame questlines.

---

## Phase 3.1: Generator Milestones Grant Real Multipliers

### Changes Required:

#### 1. Derived milestone multiplier

**File**: `src/data/constants.ts` — `MILESTONE_MULTIPLIER = 1.5` (per milestone crossed, per generator; cumulative ×38 at 500 owned — the "just 3 more" pull without the genre's ×960k blowout, tuned against the 12–16× generator cost jumps).

**File**: `src/stores/slices/production/cpsCalculator.ts:23-28`
**Changes**: When merging generator multipliers, fold in `MILESTONE_MULTIPLIER ** milestonesReached(owned)` per generator, where `milestonesReached` counts `BUY_MILESTONES` entries ≤ owned. Pure derivation from `state.generators` — **no persisted state**. (Purchases already publish `CpsInputsChanged`, so recalc is automatic.)

#### 2. Celebration + visibility fixes

**File**: `src/stores/slices/production/productionSlice.ts:133-135` — a bulk buy crossing multiple milestones currently celebrates only the lowest; celebrate the **highest** crossed and announce the multiplier gained ("Milk Pail ×1.5 production!").
**File**: `src/components/ui/GeneratorPanel.tsx` — show next milestone progress per generator ("47/50 → ×1.5") so the pull is visible before the pop.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Buying the 25th of a generator visibly bumps CPS by ×1.5 on that generator's contribution (check CPS breakdown)
- [ ] Bulk-buy 20→120 celebrates the 100 milestone and applies ×1.5³
- [ ] Generator cards show next-milestone progress
- [ ] Save/load preserves milestone multipliers (derived, so this is automatic — verify anyway)

---

## Phase 3.2: Upgrade Ladder Extension (data-only)

### Changes Required:

**File**: `src/data/upgrades.ts`
**Changes**:
1. **Per-generator tier-4/5/6 upgrades** at `generatorOwned` 100 / 150 / 200 for each of the 15 generators (45 new entries, `generatorMultiplier` ×3 / ×4 / ×5, costs ≈ 25× the generator's cumulative cost at that count — follow the existing tier-3 cost ratios). Generate them with the same naming/description voice as existing tiers.
2. **4 new global upgrades** extending past `heritage_minute` (1e16): 1e18 ×3, 1e20 ×4, 1e22 ×5, 1e24 ×6 (Canadiana names: e.g. `great_canadian_shield`, `aurora_borealis_blessing`, `laurentian_legacy`, `polaris_of_the_north`).

No code changes — `UPGRADES` is consumed generically. Check `UpgradePanel` virtualization/scroll still performs with ~100 upgrades (it renders filtered lists; visibility gating by `generatorOwned` requirement already hides unowned tiers).

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] At 100 owned milk pails, a new upgrade appears; purchase applies ×3 to that generator
- [ ] Upgrade panel remains responsive with the expanded catalog
- [ ] Late-game (1e18+ curds) always has ≥ 1 purchasable upgrade in sight

---

## Phase 3.3: Mythology Zones as Legendary Questlines

### Changes Required:

#### 1. Data marker

**File**: `src/types/game.ts:471-481` — add `isLegendary?: boolean` to `ZoneDefinition`.
**File**: `src/data/zones.ts` — set it on `thunderbird_saga`, `wendigo_warning`, `chasse_galerie`. Fix the three descriptions that promise nonexistent mechanics (`:887` "Complete 5 provinces to unlock", `:978` hunger drain, `:1044` timed challenge) — reword to flavor that's true.

#### 2. ZoneSelectPanel treatment

**File**: `src/components/ui/ZoneSelectPanel.tsx`
**Changes**:
- Split the flat list (`:218-230`): provincial zones first, then a "⚜️ Legendary Questlines" section header.
- Legendary cards: gold/purple border variant on the card container (`:40-47`), bespoke icons (`⚡🦅` / `🐺` / `🛶`) replacing `PROVINCE_ICONS` (`:56-63`), "LEGENDARY" badge next to the name (pattern of the "✓ Complete" badge, `:69-73`).
- **Level warning** (all zones, not just legendary): when average party level < `recommendedLevel - 10`, show "⚠️ Your party may not survive (avg Lv N vs recommended Lv M)" in `--color-warning`; on clicking a stage in that state, a `ModalOverlay` confirm ("Enter anyway?") using the shared primitive.
- Locked cards: replace bare "🔒 Locked" (`:87`) with the actual requirement ("Clear Québec Fromagerie's boss") derived from `unlockRequirement` — cheap fix for every zone.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Mythology zones render in their own gold-styled section with badges
- [ ] A level-10 party sees the danger warning on `chasse_galerie` and gets a confirm dialog
- [ ] Locked zones state their unlock requirement
- [ ] No zone description promises a mechanic that doesn't exist

---

## Phase 4: Ship the Endgame (Vintage, Legacy, hero retention, content expansion)

### Overview

The decorative second and third prestige tiers become real: Vintage is reachable mid-game with a proper confirm flow, Legacy allocates province bonuses that the production engine already reads, a rennet sink retains heroes through Aging, and the event/challenge pools grow.

**Prerequisite**: P3 merged (cave-unlock UI is how Vintage's `alpine_cave`/`masters_vault` rewards get bought; the ID-validation test guards 4.4's new data).

---

## Phase 4.1: Ship Vintage

### Changes Required:

#### 1. Gate tuning

**File**: `src/data/constants.ts` — `VINTAGE_AGING_RESETS_REQUIRED = 10` (was hardcoded 100), `VINTAGE_RENNET_COST = 100` (unchanged, now named).
**File**: `src/stores/slices/prestige/prestigeSlice.ts:159-162` (`canPerformVintage`) — consume the constants. Rationale: optimal Aging happens at ~1e12–1e13 curds; 10 resets + 100 held rennet is a mid-game milestone, not a myth. `century_of_aging` (100 resets, `achievements.ts:332`) remains the long-tail achievement.

#### 2. UI: button + confirm modal

**File**: `src/components/ui/PrestigePanel.tsx:416-436`
**Changes**: Vintage section gets a real action button (enabled by `canPerformVintage()`), progress display shows **both** gate conditions (resets AND rennet — today only resets show). New `VintageConfirmModal` mirroring `AgingConfirmModal`: wheels gained (`floor(rennet/100)`), "Will Be Reset" (everything Aging resets + aging upgrades + aging reset counter; rennet keeps the `% 100` remainder), "Will Be Kept" (lifetime totals → content unlocks stay satisfied, cheese collection, achievements, synergies, golden meta). Calls `performVintage()`; celebration = existing prestige sounds + fireworks.

#### 3. Crafting reset semantics (kill the stub)

**File**: `src/stores/slices/crafting/resetFactory.ts:39-40`
**Changes**: `vintage` → same as `aging` (clear `activeJobs`/`cheeseInventory`/`activeBuffs`, preserve unlocks + `cheeseCollection`). `legacy` → reset unlocks to starter set as well, preserving only `cheeseCollection` (the permanent codex). Rationale: Vintage is "deeper Aging"; Legacy is a true rebirth, and P3's cave-unlock UI + persistent `totalRennet` gates make re-unlocking a real (short) climb rather than a dead end.

#### 4. Delete dead `vintageUnlocks`

**Files**: `src/types/game.ts:29` area, `prestigeSlice.ts:29`, `prestige/resetFactory.ts:12`, `performLegacy` (`:257`)
**Changes**: Remove the field everywhere (never read, never written meaningfully). Content gating already runs on `totalVintageWheels` — no replacement needed. Old saves carrying the key are unaffected (deserialization maps fields explicitly).

#### 5. Surface wheels

**File**: `src/components/ui/PrestigeStats.tsx` + `RennetDisplay.tsx` — show held wheels and their +5%/wheel production term once `totalVintageWheels > 0`.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Save with 10 aging resets + 150 rennet: Vintage button enables, modal previews 1 wheel + 50 rennet remainder
- [ ] Performing Vintage: run resets, aging upgrades cleared, wheel granted, CPS shows +5% wheel term
- [ ] `vintage_pioneer` achievement unlocks; `vintage_cheddar` recipe and `alpine_cave` become unlockable (via P3's UI)
- [ ] No in-flight crafting job or buff survives the Vintage reset
- [ ] Below-gate players see accurate dual-condition progress

---

## Phase 4.2: Fix Legacy (province allocation)

### Changes Required:

#### 1. performLegacy takes a province

**File**: `src/stores/slices/prestige/prestigeSlice.ts:224-276`
**Changes**: `performLegacy(province: Province)` writes `legacyBonuses[province] += legacyGained` (in addition to the existing `legacy` scalar for stats display). The production multiplier needs **zero changes** — `productionEngine.ts:345-346` already reads `sum(legacyBonuses) × LEGACY_POINT_MULTIPLIER`; it starts returning real values the moment the map is written.

#### 2. Province choice = province power

**File**: `src/systems/combatEngine.ts` / `src/stores/slices/combat/combatSlice.ts`
**Changes**: `LEGACY_PROVINCE_COMBAT_BONUS = 0.10` (constants). In `claimCombatRewards`, when the battle's zone belongs to a province with legacy points, multiply curd rewards by `1 + points × 0.10` (zone → province via `getZoneById(zoneId).province`; passed into `calculateCombatRewards` alongside 2.4's floor). This makes the allocation a real strategic choice (your legacy province pays more), not flavor.

#### 3. UI: LegacyConfirmModal with province picker

**File**: `src/components/ui/PrestigePanel.tsx:438-458`
**Changes**: Legacy section gets its button + modal: shows points to gain (= held wheels), a 13-province picker (current allocation shown per province, `PROVINCE_ICONS` reused), dual-gate progress (vintage resets AND wheels), and the full "Will Be Reset" list (the most destructive reset in the game — including crafting unlocks per 4.1's semantics). `PrestigeStats` renders the allocation map when `legacyResetCount > 0`.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Performing Legacy with 12 wheels into Québec: `legacyBonuses.quebec = 12`, global CPS gains the +12% term, Québec-zone battles pay +120% curds
- [ ] `legacy_of_fromage` achievement unlocks
- [ ] Legacy resets crafting unlocks to starter; cheese collection survives
- [ ] Stats tab shows per-province allocation

---

## Phase 4.3: Hero Retention Aging Upgrade

### Changes Required:

#### 1. New effect type + upgrade

**File**: `src/types/game.ts:52-60` — add `{ type: 'heroRetention'; value: number }` to `AgingUpgradeEffect`.
**File**: `src/data/agingUpgrades.ts` — `loyal_companions`: cost 75 rennet, `heroRetention` value 1, `maxPurchases: 3`, requirement `agingResets: 3`. "Your most devoted heroes refuse to leave (keep your N highest-level heroes through Aging)."

#### 2. Retention-aware hero reset

**File**: `src/stores/slices/heroes/heroSlice.ts:361-370` (`getPrestigeHeroReset`)
**Changes**: Accept the prestige state (or a `retainCount`); keep the N highest-level heroes' roster entries (level + XP). Retained heroes are **unequipped** (equipment inventory is still fully wiped — dangling equipped-item IDs must be cleared from the retained `HeroState`s). Party formation resets (player re-forms it). Applies to Aging only — Vintage/Legacy still wipe everything (`performVintage`/`performLegacy` call the same factory; pass retention 0 there).

#### 3. Fix the lying confirm modal

**File**: `src/components/ui/AgingConfirmModal.tsx:106-128`
**Changes**: "Will Be Kept" currently lists Heroes & Levels / Equipment / Zone Progress — **all actually wiped**. Correct both lists to the truth; when `loyal_companions` is owned, show "Top N heroes (Loyal Companions)" under kept. This is a shipped-copy bug fix independent of the feature.

#### 4. Description honesty sweep (same file family)

**File**: `src/data/agingUpgrades.ts:94-103` — `canadian_perseverance`'s description promises "-25% Rennet on next reset" but the effect is `productionBonus 0.5`. Reword the description to match the effect ("+50% production").

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] With 2 stacks of `loyal_companions`, Aging keeps the 2 highest-level heroes (levels intact, gear gone, party empty)
- [ ] Vintage still wipes all heroes
- [ ] AgingConfirmModal lists exactly what is kept/reset, including retained heroes
- [ ] Without the upgrade, Aging behaves exactly as today

---

## Phase 4.4: Event & Challenge Pool Expansion (data + one emitter)

### Changes Required:

#### 1. Two new seasonal events

**File**: `src/data/events.ts` — using existing bonus types only, **no exclusive content** (P3 removed phantom exclusives; don't reintroduce the pattern until real items exist):
- `maple_syrup_festival` 🥞 (Mar 15–25): production ×1.5 + click ×2 (first user of the dead `click` bonus type — verified consumed at `cpsCalculator.ts:67`).
- `harvest_hoedown` 🌾 (Oct 5–14): xp ×1.5 + drops ×1.5 (drops consumed post-P3).

#### 2. Six new weekly challenges (pool 6 → 12)

**File**: `src/data/challenges.ts` — mix of goal types, rewards using **verified-real IDs** (P3's validation test guards this): e.g. earnCurds 1e9 → 15 rennet; defeatEnemies 250 → equipment (real ID from `equipment.ts`); craftCheese 15 → 8 rennet; collectClicks 2500 → 2M curds; completeZoneStage 40 → ingredient (real specialty ID); consumeCheese 20 → 10 rennet. Note: rotation is `weeksSinceEpoch % pool.length` (`challenges.ts:63-67`) — growing the pool reshuffles which week maps to which challenge; harmless (rollover re-inits cleanly).

#### 3. Wire the dead `earnCurds` goal type

**File**: `src/stores/slices/production/productionSlice.ts` (`addCurds`, `:106-112`)
**Changes**: `incrementChallengeProgress('earnCurds', amount.toNumber())` — safe: the increment no-ops unless the active challenge's goal type matches (`challengeSlice.ts:40`), so the per-tick cost is one guarded early-return in normal weeks. Clamp `toNumber()` overflow to `Number.MAX_SAFE_INTEGER`.

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`
- [ ] P3's ID-validation test passes over the new data (if vitest landed)

#### Manual Verification:
- [ ] Mock date Mar 20 → Maple Syrup Festival activates; click value doubles (event `click` multiplier reaches clicks)
- [ ] `earnCurds` challenge progresses from pure idle income
- [ ] Week rollover to a new-pool challenge works; claiming grants the (real) reward

---

## Testing Strategy

### Unit Tests:

No test runner exists today (`package.json`: dev/build/lint/preview only). If P3 Phase 8 introduces vitest, add alongside its ID-validation test:
- `computeClickValue`: CPS component additive after multipliers; zero-upgrade parity with old formula
- `calculateCritChance` cap; `calculateCritMultiplier` stacking
- Milestone multiplier derivation (24→25 boundary, bulk-cross 20→120)
- `getPrestigeHeroReset` retention ordering (highest level, unequip)
- `performLegacy` province write + combined multiplier read
- Golden meta tier boundaries (9→10 collected)

If vitest has not landed, these behaviors are covered by the manual criteria above and the plan should not block on introducing a test framework.

### Integration Tests:

Manual only (no framework): full loop passes below.

### Manual Testing Steps:

1. Fresh save → click through early game → verify click/crit upgrades appear and change feel; no NaN/Infinity in any Decimal display.
2. Save-edit to mid-game (1e12 CPS, 10 aging resets, 150 rennet) → run the entire Vintage flow → verify wheel term, content gates, reset scope.
3. Eat 3 different heroBuff cheeses → fight a boss → verify stats, HP, element multipliers, and CPS-floored + legacy-province rewards compose correctly.
4. Leave tab hidden 90 min → return → offline modal + welcome-back golden cheese.
5. Export/import save across the phase boundary (no migration expected — verify old save loads clean with new upgrades absent, milestone multipliers auto-derived).

## Performance Considerations

- Milestone multipliers and click CPS percent are computed only inside `CpsInputsChanged` recalcs (purchase-frequency, not tick-frequency).
- `getActiveHeroBuffTotals` is called at combat start (snapshot) and CPS recalc — not per frame.
- `earnCurds` challenge hook adds one guarded call per tick; no `set()` unless the active challenge matches.
- UpgradePanel grows to ~110 entries — verify list rendering stays under one frame (visibility gating already hides most).

## Migration Notes

- **No save-version bump required.** New upgrade IDs are additive; `legacyBonuses` exists (all-zero) in current saves; golden meta derives from persisted `totalCollected`; crit/click caches are transient and rebuilt on load; `vintageUnlocks` removal is a type-level deletion (old saves' stray key is ignored by explicit field mapping in `deserializeState`).
- If P3's v10 migration has landed, no interaction — this plan writes no new persisted fields.

## References

- Roadmap source: `thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md` (§8 fun assessment, §Phased Roadmap P6a–6d)
- Prerequisite plan: `thoughts/shared/plans/phase3-reconnect-dead-content.md` (P3 — not yet implemented as of 2026-07-02)
- Genre benchmarks: `thoughts/shared/research/2026-06-10_23-22-43_making-the-game-more-fun-state-of-the-art-analysis.md` (golden cookie cadence 3–10 min; "mechanically different, not bigger numbers" prestige principle; milestone-pull pattern)
- Shipped foundations: PRs #48 (combat playability), #49 (economy/persistence), #50 (DDD one-model), #51 (store/UI hygiene)
- Key code anchors: `cpsCalculator.ts:62-70` (click), `constants.ts:226-259` (crit + golden), `goldenCheeseSlice.ts` (`totalCollected`), `craftingSlice.ts:500-526` (buff multipliers), `combatEngine.ts:84-93,507-593` (damage/rewards), `prestigeSlice.ts:159-276` (Vintage/Legacy), `productionEngine.ts:345-346` (legacyBonuses reader), `heroSlice.ts:361-370` (hero wipe), `ZoneSelectPanel.tsx:218-230` (zone list)
