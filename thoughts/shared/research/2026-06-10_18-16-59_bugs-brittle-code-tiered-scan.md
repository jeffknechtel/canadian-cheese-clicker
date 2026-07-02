---
date: 2026-06-10T18:16:59Z
researcher: Claude
git_commit: 7a6761fe750abd3e4b359326026b9e0adf5de787
branch: main
repository: game
topic: "Comprehensive Bugs and Brittle Code Scan - Tiered Analysis"
tags: [research, codebase, bugs, brittle-code, technical-debt, DDD]
status: complete
last_updated: 2026-06-10
last_updated_by: Claude
---

# Research: Comprehensive Bugs and Brittle Code Scan - Tiered Analysis

**Date**: 2026-06-10T18:16:59Z
**Researcher**: Claude
**Git Commit**: 7a6761fe750abd3e4b359326026b9e0adf5de787
**Branch**: main
**Repository**: game

## Research Question

Scan the codebase for bugs and brittle code. Group defects by tier.

## Summary

This comprehensive scan identified **67 issues** across 9 codebase areas. The most severe problems are:

1. **Migration chain broken** — saves more than one version old get incomplete migrations, causing data corruption
2. **Offline progress always zero** — CPS is 0 when offline progress is calculated (runs before recalculation)
3. **Race conditions in crafting** — `startCrafting` and `spendRennet` can double-spend currency
4. **9 achievement types never implemented** — zone/boss/hero achievements are permanently locked
5. **Enemy ability effects never applied** — DoT, debuffs, self-buffs on enemy abilities are silently discarded
6. **Prestige upgrades have no effect** — cost reduction, XP multiplier, and generatorEfficiency effects are calculated but never applied

The codebase has evolved significantly since the April 2026 DDD analysis. Many prior bugs are fixed (Eh in CPS, taunt targeting, StatusEffect deep copies), but new issues have emerged around incomplete feature implementations and stale closure patterns.

---

## Tier 1: Critical (7 issues)

Issues that cause data loss, corruption, or major feature failures.

| # | System | Issue | File:Line |
|---|--------|-------|-----------|
| 1 | Save/Load | **Migration chain broken for multi-version jumps** — uses original `fromVersion` instead of tracking current version after each migration; v3 saves migrating to v8 only run v3→v4 | `migrations.ts:165-169` |
| 2 | Save/Load | **Offline progress always zero** — `calculateOfflineProgress` receives `curdPerSecond = new Decimal(0)` because CPS recalc happens AFTER offline progress calculation | `persistenceSlice.ts:29-32` |
| 3 | Crafting | **Stale closure in tickBuffs** — uses `set({...state.crafting...})` with captured state instead of callback form; concurrent modifications silently overwritten | `craftingSlice.ts:427-433` |
| 4 | Crafting | **Race condition in startCrafting** — balance check uses stale state, set() uses captured state; two rapid clicks can both pass and double-spend curds | `craftingSlice.ts:168,186-192` |
| 5 | Prestige | **Race condition in spendRennet** — same pattern as startCrafting; can result in negative rennet balance | `prestigeSlice.ts:207-218` |
| 6 | Achievements | **9 achievement requirement types never implemented** — `zoneCompleted`, `zonesCompleted`, `allProvincialZonesCompleted`, `allMythologyZonesCompleted`, `bossDefeated`, `bossesDefeated`, `heroesRecruited`, `legendaryHeroesRecruited`, `provincesRepresented` all fall through to `default: return false` | `achievementSlice.ts:103-105` |
| 7 | Prestige | **Prestige cost reduction never applied** — `calculatePrestigeCostReduction()` is computed and displayed in UI, but `calculateGeneratorCost()` never applies it; players see "Cost Reduction: X%" but pay full price | `prestigeSlice.ts:145`, `productionSlice.ts:100,124,129` |

---

## Tier 2: High (12 issues)

Issues that break specific features or cause incorrect behavior.

| # | System | Issue | File:Line |
|---|--------|-------|-----------|
| 1 | Combat | **Enemy ability effects never applied** — `ability.effect` (DoT, debuffs, self-buffs) is never consumed; enemies with abilities like "Toxic Cloud" have effects silently discarded | `Battle.ts:444-488` |
| 2 | Combat | **Immunity system is non-functional** — `immunity` effect just creates a +999 defense buff, not actual immunity; `immunityType` is never checked when applying debuffs | `combatEngine.ts:922-950` |
| 3 | Combat | **dropRateBonus effect is dead code** — only logs a message; `calculateCombatRewards` doesn't check status effects | `combatEngine.ts:953-963` |
| 4 | Prestige | **Prestige XP multiplier never applied** — `calculatePrestigeXpMultiplier()` is computed but `tickHeroXp` only uses buff and event multipliers; "Aging Wisdom" upgrade has no effect | `heroSlice.ts:280-283` |
| 5 | Prestige | **generatorEfficiency effect never processed** — "Master Affineur" upgrade defines `generatorEfficiency` but `calculatePrestigeProductionMultiplier()` only handles `productionBonus` | `productionEngine.ts:304-326` |
| 6 | Prestige | **Vintage/Legacy resets incomplete** — `performAging()` properly resets production/combat/crafting, but `performVintage()` and `performLegacy()` only update prestige state, never resetting other systems | `prestigeSlice.ts:156-179,186-205` |
| 7 | Crafting | **Missing interaction validation** — live `addInteraction` lacks per-type limits (rind_wash: 3, turn: 10) and fresh cheese check that exist in dead engine; players can spam unlimited interactions | `craftingSlice.ts:379-412` |
| 8 | Save/Load | **Event activation immediately overwritten** — `checkEventActivation()` runs, then `set({...savedState,...})` overwrites `activeEvents` with stale saved version | `persistenceSlice.ts:25,34-38` |
| 9 | Save/Load | **No future version handling** — saves with `version > CURRENT_VERSION` are processed without warning, causing silent data corruption or crashes | `saveSystem.ts:201-206` |
| 10 | Achievements | **Missing checkAchievements() trigger after combat** — `endCombat` updates `zoneProgress` but never calls `checkAchievements()` | `combatSlice.ts:79-133` |
| 11 | Achievements | **Missing checkAchievements() trigger after hero recruitment** — `recruitHero` never calls `checkAchievements()` | `heroSlice.ts:29-56` |
| 12 | UI | **Stale closure in CombatPanel keyboard handlers** — `handleLimitBreak` and `handleUseSelectedAbility` capture `aliveHeroes` from render scope; can target wrong heroes when party changes mid-combat | `CombatPanel.tsx:248-273` |

---

## Tier 3: Medium (26 issues)

Issues that cause incorrect behavior in edge cases or have significant tech debt impact.

| # | System | Issue | File:Line |
|---|--------|-------|-----------|
| 1 | Combat | **Enemy ability selection prefers first ability** — `#selectAbilityFromCooldowns` iterates in array order and returns first available; boss phase abilities (appended) rarely selected | `Battle.ts:493-504` |
| 2 | Combat | **Enemy targetType ignored** — all enemy damage hits single target regardless of `targetType: 'all'` | `Battle.ts:457-458` |
| 3 | Combat | **Victory check in 4 locations** — duplicated across `Battle.useAbility`, `Battle.useLimitBreak`, `Battle.#checkOutcome`, and `combatEngine.executeHeroLimitBreak` | Multiple files |
| 4 | Combat | **tickHeroXp triggers CpsInputsChanged per hero** — each `grantXp` call publishes event; 4 heroes = 4 CPS recalculations per tick | `heroSlice.ts:287-289` |
| 5 | Combat | **StatusEffect mutation pattern** — `processStatusEffects` mutates `effect.duration -= 1` directly; safe only because Battle deep copies first | `combatEngine.ts:205` |
| 6 | Combat | **totalCurdsEarned double-counted** — event subscriber calls `addCurds` (which increments `totalCurdsEarned`) and also directly sets `totalCurdsEarned.plus()` | `eventSubscriber.ts:14-17` |
| 7 | Crafting | **Stale closure in collectCheese** — uses captured `job.recipeId` inside `set()` instead of looking up from fresh state | `craftingSlice.ts:290` |
| 8 | Crafting | **Notification quality mismatch** — `tickCrafting` calculates placeholder quality ignoring interactions; actual collected quality differs | `craftingSlice.ts:254` |
| 9 | Crafting | **Stale closures in unlock functions** — `unlockIngredient`, `unlockRecipe`, `unlockCave` use `set({...state.crafting...})` instead of callback | `craftingSlice.ts:70-75,90-94,117-121` |
| 10 | Prestige | **Heroes/zoneProgress not reset during aging** — may be intentional but undocumented; players keep hero levels and zone progress | `prestigeSlice.ts:73-82` |
| 11 | Prestige | **No CpsInputsChanged for Vintage/Legacy** — these reset aging upgrades but don't trigger CPS recalculation | `prestigeSlice.ts:156-205` |
| 12 | Prestige | **Eh multiplier not applied to click value** — applied to CPS but not clicks; may be intentional but inconsistent | `cpsCalculator.ts:45-51` |
| 13 | Events | **Event check only hourly** — up to 1 hour delay for seasonal event activation; no midnight boundary detection | `gameLoop.ts:72-76` |
| 14 | Events | **Event multipliers not in displayed CPS** — `computeCps` doesn't include events; events only applied at tick-time | `cpsCalculator.ts:21-39` |
| 15 | Achievements | **Type safety bypass with double cast** — `state as unknown as GameState` could fail if types diverge | `achievementSlice.ts:121` |
| 16 | Save/Load | **Prestige state duplicated in 4 locations** — no factory function; adding a field requires updating 4 files | `prestigeSlice.ts`, `saveSystem.ts`, `migrations.ts`, `persistenceSlice.ts` |
| 17 | Save/Load | **Combat state hardcoded in deserializeState** — doesn't use `createEmptyCombatState()` factory | `saveSystem.ts:156-166` |
| 18 | Dead Code | **~18 dead functions in craftingEngine.ts** — calculated but never imported; maintenance burden | `craftingEngine.ts` (multiple) |
| 19 | Magic Numbers | **Prestige thresholds not in constants** — `100` for vintage, `10` for legacy hardcoded in 4 places | `prestigeSlice.ts:153,162,167,183` |
| 20 | Magic Numbers | **Combat hardcoded values** — `0.5` boss drop threshold, `999` immunity defense, `10` fallback stats | `combatEngine.ts:638,935,777` |
| 21 | Naming | **snake_case in achievement types** — `cheese_crafted_total`, `zone_complete`, etc. vs camelCase standard | `types/game.ts:164-169,400,490-521` |
| 22 | Cross-Slice | **Crafting writes production state** — `sellCheese` directly writes `curds` and `totalCurdsEarned` | `craftingSlice.ts:367-368` |
| 23 | Cross-Slice | **Heroes writes production state** — `recruitHero` and `buyEquipment` deduct curds directly | `heroSlice.ts:46,139` |
| 24 | UI | **Non-memoized derived data in HeroPanel** — `recruitedHeroes` and `availableHeroes` computed every render | `HeroPanel.tsx:294-296` |
| 25 | UI | **Non-memoized derived data in CraftingPanel** — array selectors return new arrays each render | `CraftingPanel.tsx:22-27` |
| 26 | UI | **ParticleBurst reinitializes on parent re-render** — `onComplete` in dependency array triggers re-init | `ParticleContainer.tsx:140-154` |

---

## Tier 4: Low (22 issues)

Minor issues, dead weight, or style inconsistencies.

| # | System | Issue | File:Line |
|---|--------|-------|-----------|
| 1 | Combat | **XP integer division loses XP** — 5 XP / 4 heroes = 1 XP lost to floor | `combatEngine.ts:664` |
| 2 | Combat | **endCombat doesn't check battleResult** — can re-trigger victory effects | `combatSlice.ts:79-133` |
| 3 | Combat | **Equipment slot silent overwrite** — no explicit unequip before re-equip | `heroSlice.ts:170-175` |
| 4 | Crafting | **Only first buff published** — cheese with multiple effects only fires one event | `craftingSlice.ts:341-342` |
| 5 | Crafting | **Currency type divergence** — dead engine handles whey, live slice hardcodes curds | `craftingSlice.ts:157-167` |
| 6 | Events | **No event overlap handling** — Poutine Week and Winterlude overlap Feb 1-7 | `events.ts:42-47,83-86` |
| 7 | Events | **Unused isActive field** — all events have `isActive: false`, never read | `events.ts:13,33,49,69` |
| 8 | Save/Load | **No localStorage quota handling** — error only logged, no user notification | `saveSystem.ts:188-190` |
| 9 | Save/Load | **CraftingState default duplicated in 3 places** — resetFactory exists but unused | `saveSystem.ts`, `migrations.ts`, `resetFactory.ts` |
| 10 | Dead Code | **Dead methods in Modifier value object** — `combine()`, `apply()`, etc. never called | `Modifier.ts:27-69` |
| 11 | Dead Code | **Dead methods in Stats value object** — `zero()`, `scale()`, `floor()`, `min()` unused | `Stats.ts:24-96` |
| 12 | Type Safety | **Multiple `any` casts in migrations** — necessary but fragile | `migrations.ts:11,112,130` |
| 13 | Type Safety | **Non-null assertion in dispatcher** — `handlers.get(eventType)!` | `dispatcher.ts:61` |
| 14 | Magic Numbers | **XP constants inline** — `0.1` base XP, `1000` CPS divisor | `productionEngine.ts:272,274` |
| 15 | Magic Numbers | **Event check interval inline** — `60 * 60 * 1000` | `gameLoop.ts:12` |
| 16 | Magic Numbers | **Bug report cap inline** — `50` MAX_STORED_REPORTS | `bugReporter.ts:83` |
| 17 | UI | **CombatLog key collision risk** — uses `timestamp` which may not be unique | `CombatLog.tsx:124,147` |
| 18 | UI | **CaveCard interval restart** — `getJobProgress` identity change restarts interval | `CaveCard.tsx:83-91` |
| 19 | UI | **Excessive store selectors in GeneratorRow** — 5 separate subscriptions | `GeneratorPanel.tsx:25-30` |
| 20 | Prestige | **Click multiplier duplicate calculation** — `getClickMultiplier` and `computeClickValue` overlap | `productionSlice.ts:253-258`, `cpsCalculator.ts:45-51` |
| 21 | Prestige | **Combat multiplier usage unclear** — calculated but hard to verify if used | `prestigeSlice.ts:147` |
| 22 | Heroes | **Stale state reference in grantXp** — uses captured `state.heroes` in set() | `heroSlice.ts:223-256` |

---

## Verified Fixed Since Prior Research

| Issue | Status | Evidence |
|-------|--------|----------|
| Eh bonus not in CPS | **Fixed** | `cpsCalculator.ts:25` includes Eh |
| `incrementEh` no recalc | **Fixed** | `productionSlice.ts:221-224` publishes `CpsInputsChanged` on tier boundary |
| Taunt ignored in targeting | **Fixed** | `selectHeroTarget` prioritizes taunters |
| `tickCrafting` no-op | **Fixed** | Real completion notifications |
| StatusEffect shared-reference mutation | **Fixed** | `Battle.ts:282` does deep copies |
| `abilityCooldowns` never consulted | **Fixed** | `#selectAbilityFromCooldowns` checks them |
| Events never auto-deactivate | **Fixed** | `eventSlice.ts:67-82` properly sets active set |
| checkEventActivation after early-return | **Fixed** | `persistenceSlice.ts:25` calls before return |
| saveSystem re-derives CPS | **Fixed** | Now returns placeholder and publishes recalc event |
| `computeClickValue` helper missing | **Fixed** | Created at `cpsCalculator.ts:45-51` |
| Dead `Enemy.selectAbility` method | **Fixed** | Removed from entity |
| Dead `Recipe.calculateQuality` method | **Fixed** | Removed from entity |
| 2,367-line god-object store | **Fixed** | Split into 8 slices |

---

## Architecture Insights

1. **Two-models problem largely resolved** — Domain entities are now thin data wrappers with active calculation methods that are actually used. The dangerous diverged implementations have been removed.

2. **Stale closure pattern persists** — The callback-form `set((s) => {...})` pattern is not consistently used. Several slices capture state outside `set()` and use it inside, creating race conditions.

3. **Cross-slice mutations widespread** — Crafting and heroes directly write production state (curds). The prestige reset delegates to factories (good pattern), but currency manipulation does not.

4. **Feature implementations incomplete** — Prestige upgrades, enemy ability effects, achievement requirements, and immunity system have the data structures but not the runtime behavior.

5. **Magic numbers partially centralized** — Most combat constants are in `constants.ts`, but prestige thresholds and some XP/balance values remain inline.

---

## Recommendations by Priority

### Immediate (Tier 1 fixes)
1. Fix migration chain to track current version
2. Reorder offline progress calculation after CPS recalc
3. Convert crafting/prestige currency operations to callback-form `set()`
4. Implement missing achievement requirement handlers

### Short-term (Tier 2 fixes)
1. Wire enemy ability effects into Battle aggregate
2. Apply prestige cost/XP multipliers
3. Implement generatorEfficiency effect
4. Add checkAchievements() calls after combat/recruitment
5. Fix event activation ordering in persistence

### Medium-term (Tier 3 improvements)
1. Standardize stale closure patterns across all slices
2. Centralize remaining magic numbers
3. Implement domain events for cross-slice currency changes
4. Delete dead craftingEngine functions

---

## Code References

### Critical Bug Locations
- `src/systems/migrations.ts:165-169` — Migration chain bug
- `src/stores/slices/persistence/persistenceSlice.ts:29-32` — Offline progress bug
- `src/stores/slices/crafting/craftingSlice.ts:168,186-192` — Double-spend race
- `src/stores/slices/achievements/achievementSlice.ts:103-105` — Missing requirement handlers

### High-Priority Unimplemented Features
- `src/domain/aggregates/Battle.ts:444-488` — Enemy effects never applied
- `src/stores/slices/prestige/prestigeSlice.ts:145` — Cost reduction unused
- `src/stores/slices/heroes/heroSlice.ts:280-283` — XP multiplier unused
- `src/systems/productionEngine.ts:304-326` — generatorEfficiency unhandled

### Key Constants File
- `src/data/constants.ts` — Centralized balance constants (needs prestige thresholds)

---

## Historical Context (from thoughts/)

- `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md` — DDD roadmap, ~70% of Phase 1 now complete
- `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md` — Prior analysis, most findings fixed
- `thoughts/shared/plans/code-quality-bugfixes-antipatterns.md` — Bugfix plan, largely implemented

---

## Related Research

- `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`

---

## Open Questions

1. Are heroes/zoneProgress intentionally preserved across aging resets?
2. Should Eh multiplier apply to clicks as well as CPS?
3. Is the hourly event check interval adequate, or should it be more frequent?
4. Should vintage/legacy reset more state when those systems are fully implemented?