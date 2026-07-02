---
date: 2026-07-01T16:14:12-04:00
researcher: Claude Code
git_commit: 4c87afb68ccf1794043967a5624f211f693c70cb
branch: main
repository: game
topic: "DDD refactoring opportunities, bugs, brittle code, and fun improvements — phased roadmap"
tags: [research, codebase, ddd, combat, production, crafting, events, persistence, prestige, game-design, roadmap]
status: complete
last_updated: 2026-07-01
last_updated_by: Claude Code
---

# Research: DDD Refactoring Opportunities, Bugs, Brittle Code & Fun — Phased Roadmap

**Date**: 2026-07-01T16:14:12-04:00 (EDT)
**Researcher**: Claude Code
**Git Commit**: 4c87afb68ccf1794043967a5624f211f693c70cb
**Branch**: main
**Repository**: game

Note: file:line references reflect the working tree at research time (which includes uncommitted reduced-motion changes to 6 UI files); GitHub permalinks were intentionally omitted because pinned-commit links would mismatch the working tree.

## Research Question

Put your DDD hat on and search the codebase for high-value refactoring opportunities, look for bugs, brittle code, or even elements of the game that could be more fun. Give me a phased approach I can build plans upon.

## Summary

Six parallel research agents swept the codebase (domain/DDD, combat, production/events/crafting, persistence/store/UI, game design, historical thoughts). Headline conclusions:

1. **Prior research is significantly stale.** The big bugs from the 2026-06-09/10 scans are FIXED: enemy ability selection, StatusEffect mutation, seasonal event activation/deactivation, Eh↔CPS recalc, saveSystem CPS re-derivation. `craftingEngine.ts` is no longer "entirely dead" (6 exports live). SAVE_VERSION is now 9 (`src/systems/migrations.ts:6`), not 7. `Battle`/`Party` aggregates and a domain-event dispatcher are live and are the best patterns in the codebase.

2. **Combat is critically broken in new ways.** Defeat or fleeing softlocks the game in an infinite defeat-modal loop (`endCombat` never clears `isInCombat`). Cooldowns and status-effect durations decrement once per *animation frame* instead of per turn — every buff/debuff/taunt/DoT expires in ~50ms and cooldowns effectively don't exist. ATB pacing is ~10x slower than designed (a lost `1 +` in the fill formula). Per-tick visual feedback (damage numbers, combo, shake) is clobbered by the final `set` in `tickCombat`.

3. **The economy double-counts events.** `computeCps` bakes event multipliers into CPS AND `tick()`/`click()` re-apply them — a 2x event yields 4x online, 2x offline, with staleness at event boundaries because nothing recalculates CPS on event activation/deactivation.

4. **Huge amounts of designed content are dead.** No gameplay path unlocks any of the 48 recipes, 4 of 5 caves, or core ingredients. Seasonal-event exclusive items and 2 weekly-challenge rewards reference IDs that don't exist. ~10 achievements can never unlock (wrong zone IDs, broken boss matcher). Combat loot drops are rolled and displayed but never granted. Vintage/Legacy prestige have store logic but no UI to trigger them — and Legacy's bonus map is never written, so it would do nothing anyway. Enemy weakness/resistance is shown in UI but no damage formula reads it.

5. **The "two-models" problem is residual but real.** ~19 dead `craftingEngine` exports and 4 dead `combatEngine` exports diverge from live logic (interaction limits, ingredient cost, boss special mechanics/minion summons never wired). `CombatEnemy` persists only HP, so every stat consumer re-derives from *unscaled* catalog definitions — stage scaling only affects HP, and rewards ignore scaling entirely.

6. **Save-system risks**: save import is fully broken (beforeunload autosave clobbers the imported file before reload); a hidden-then-closed tab permanently loses offline progress; two parallel migration mechanisms with triplicated default-state literals.

The phased roadmap (§Phased Roadmap) sequences this as: **P1 combat playability → P2 economy/persistence integrity → P3 reconnect dead content → P4 DDD one-model consolidation → P5 store/UI hygiene → P6 fun loops & endgame.**

## Stale-Memory Corrections (do NOT re-fix these)

Verified fixed in the current tree — retire from any bug lists:
- Enemy/boss ability selection: `Battle.ts:490-493` + `#selectAbilityFromCooldowns` (`src/domain/aggregates/Battle.ts:682-697`); boss phase abilities via `getBossCurrentAbilities` (`Battle.ts:486`). Dead `Enemy.selectAbility` was deleted.
- StatusEffect shared-reference mutation: `processStatusEffects` immutable (`src/systems/combatEngine.ts:189-218`); `Battle.tick` deep-copies (`Battle.ts:299-317`).
- Seasonal events: activation on fresh game (`persistenceSlice.ts:27`), on load (`:43`), hourly in loop (`src/systems/gameLoop.ts:80-84`); auto-deactivation works (`eventSlice.ts:70-101`).
- Eh: tier-crossing publishes `CpsInputsChanged` (`productionSlice.ts:247-256`); saveSystem sets placeholders and load recalculates via `computeCps` including Eh (`saveSystem.ts:150-154`, `persistenceSlice.ts:39-40`, `cpsCalculator.ts:36`).
- `craftingEngine.ts` "entirely dead" — now partially live: `checkUnlockRequirement`, `calculateIngredientQualityBonus`, `calculateCheeseValue`, `calculateBuffEffect`, `getCaveAvailableSlots` (`craftingSlice.ts:20-27`) + `calculateCheeseQualityFromJob` (`domain/modules/CraftingJob.ts:1`).
- SAVE_VERSION is 9; version logic moved to `src/systems/migrations.ts` (`CURRENT_VERSION` at `migrations.ts:6`).
- Zone stage unlock math is correct post-4c87afb (`combatSlice.ts:196`, `ZoneSelectPanel.tsx:111-141`, `zones.ts:1162-1164`).

## Detailed Findings

### 1. Combat System — critical regressions

**C-1 (CRITICAL) Defeat/flee softlock.** `endCombat` (`src/stores/slices/combat/combatSlice.ts:169-244`) never sets `isInCombat: false`; only `claimCombatRewards` resets combat (`combatSlice.ts:356`) and it's victory-gated (`:330`). The App modal effect (`src/App.tsx:445-455`) re-opens the defeat modal forever after "Return to Zone Select" (`App.tsx:362-373`); "Try Again" silently fails because `startCombat` early-returns on `isInCombat` (`combatSlice.ts:66`). Losing or fleeing any battle bricks combat until page reload. Flee also double-runs `endCombat` (double jingle/analytics, `combatSlice.ts:220-236`).

**C-2 (CRITICAL) Turn-based durations decrement per animation frame.** `#decrementCooldowns` runs every rAF tick (`Battle.ts:207, 839-858`); `processStatusEffects` decrements duration per tick (`combatEngine.ts:207`) — but data semantics are turns: hero cooldowns 5-14 turns (`types/game.ts:516`, `data/heroes.ts:1428+`), effect durations 2-4 turns (`data/enemies.ts:73-123`). At 60fps: an 8-turn cooldown lasts ~0.13s; a 3-turn buff dies in ~50ms; DoTs deal full value per frame for `duration` frames; taunts never survive to influence an enemy action; `dropRateBonus` buffs can never survive to reward time (`combatEngine.ts:641-644`).

**C-3 (HIGH) Tick feedback clobbered.** In `tickCombat` (`combatSlice.ts:96-167`), feedback events call `addDamageNumber`/`incrementCombo`/`triggerFlash`/`triggerShake` (`:127-159`), but the final `set` (`:161-166`) writes `updated.toState()` whose `feedback` was snapshotted pre-tick (`Battle.ts:209-216`). React only renders the final state — auto-attack damage numbers/combo/flash/shake never appear (audio/haptics still fire). The Tier 1 "juice reconnection" (PRs #39-40) is visually dead on the tick path.

**C-4 (HIGH) Stage scaling only affects HP.** `initializeCombat` scales stats (`combatEngine.ts:575`, `scaleEnemyStats` at `data/enemies.ts:3564-3579`) but `createCombatEnemy` persists only HP (`combatEngine.ts:509-529`). Attack (`Battle.ts:476-479,497`), defense (`Battle.ts:397-398`; `combatEngine.ts:819-820`), speed (`Battle.ts:347-350`), and rewards (`combatEngine.ts:651-664`) all re-read the *unscaled* registry definition. Stage 10 (1.6x) enemies are HP sponges with stage-1 damage and stage-1 rewards.

**C-5 (HIGH) Status processing clamps scaled HP to base HP.** `#processEnemyStatusEffects` prefers unscaled registry HP (`Battle.ts:757-758`); `processStatusEffects` clamps `newHp = min(maxHp, ...)` (`combatEngine.ts:216`). Applying any debuff to a scaled enemy instantly cuts its HP to base (e.g. 160 → 100, a free 37% cut).

**C-6 (HIGH) ATB ~10x slower than design.** Live formula `BASE_ATB_RATE * (speed/100) * combatSpeed` (`combatEngine.ts:65-69`, `BASE_ATB_RATE=10` at `constants.ts:80`) vs design `baseRate * (1 + speed/100) * ...` (`thoughts/shared/plans/implemented/phase4-combat-system.md:287-291`). Actual speeds are 4-15, not ~100 → 67-250s per action at 1x speed.

**C-7 (MED-HIGH) Enemy `targetType: 'self'` abilities still attack a hero; `damage: 0` coerces to full damage.** Branch only handles `'all'` (`Battle.ts:500`); `ability?.damage || 1.0` (`Battle.ts:494`) turns `damage: 0` self-buffs (`regenerate` enemies.ts:114-118, `production_boost` :290-294, `howl` :577-581, `battle_cry` :1046-1050) into full-strength attacks.

**C-8 (MEDIUM) Hero crits mathematically unreachable.** `isCrit = damage > effectiveAttack * 1.5` (`Battle.ts:418`) but max damage ≈ 1.375 × attack (variance ≤1.1 `constants.ts:101-104` × synergy ≤1.25 `constants.ts:143`). Crit visuals/haptics (`Battle.ts:424-429`, `combatSlice.ts:141-143`) never fire for heroes.

**C-9 (MEDIUM) Boss phase transitions only checked after hero basic attacks** (`Battle.ts:453-455`) — not after abilities, limit breaks, or DoT ticks. Phase heals/messages/abilities are delayed or skipped when a limit break kills through a phase boundary.

**C-10 (MEDIUM) Boss special mechanics are dead code.** `processBossSpecialMechanics` (`combatEngine.ts:392-447`) and `removeFlavourBuffs` (`:453-482`) have zero callers — the Bland Baron's minion summons never happen; `BossDefinition.specialMechanics` is decorative.

**C-11 (MEDIUM) Weakness/resistance unimplemented.** `EnemyDisplay` renders "Weak: X" (`EnemyDisplay.tsx:98-100`) but `calculateDamage` (`combatEngine.ts:94-103`) has no element parameter; zero references to weakness/resistance in combat code.

**C-12 (LOW-MED) Rewards/progress only commit on modal click.** `endCombat`/`claimCombatRewards` run only from the Continue button (`App.tsx:362-373`); closing the tab after victory loses the stage clear and rewards (save load resets combat, `saveSystem.ts:174-193`).

**C-13 (LOW-MED) `claimCombatRewards` uses the CURRENT party** (`combatSlice.ts:338-345`) not battle participants; empty party → division by zero → Infinity XP (`combatEngine.ts:699`).

**C-14 (LOW) Log/feedback details**: duplicate React keys `key={entry.timestamp}` (`CombatLog.tsx:124,154`); heals render as red negatives (`CombatLog.tsx:58-60`); status-effect IDs from bare `Date.now()` collide for all-ally buffs (`combatEngine.ts:888,919,977`); feedback slot indices count dead enemies while rendering is alive-first (`Battle.ts:417` vs `EnemyDisplay.tsx:170-199`); `startCombat` performs no unlock validation (`combatSlice.ts:63-94`); victory fanfare plays on Continue click, not at victory (`combatSlice.ts:228-231`); `battle_hardened_vats` bonuses are never assigned retroactively for zones cleared before purchase (`combatSlice.ts:211-213`, `synergySlice.ts:144-164`).

**C-15 (PERF) Whole-`combat` subscriptions re-render at 60fps**: `CombatPanel.tsx:233`, `HeroAbilityButton.tsx:15,83,134`; `getPartyStats()` recomputed every frame (`combatSlice.ts:100`).

### 2. Production & Economy

**P-1 (HIGH) Event multipliers double-applied.** `computeCps` includes `eventMultipliers.production` (`cpsCalculator.ts:37,44-52`) and `tick()` multiplies again (`productionSlice.ts:93-95`); same for clicks (`cpsCalculator.ts:67-68` vs `productionSlice.ts:64-67`). A 2x event → 4x actual online production while the display shows 2x; offline uses 1x-baked CPS — three inconsistent rates. Contrast: crafting/golden buffs are correctly tick-only.

**P-2 (MEDIUM) No CPS recalc at event boundaries.** `checkEventActivation` publishes `SeasonalEventActivated/Deactivated` (`eventSlice.ts:76,97`) but no subscriber recalcs CPS (`production/eventSubscriber.ts:21-25` handles only `CpsInputsChanged`). Load order compounds it: `recalculateCps()` (`persistenceSlice.ts:39`) runs BEFORE `checkEventActivation()` (`:43`), then offline progress (`:48-50`) uses the stale-event CPS.

**P-3 (MEDIUM) `spendRennet` skips recalc** (`prestigeSlice.ts:278-293`) while CPS grants +1% per *held* rennet (`productionEngine.ts:327-331`); caller is cave unlock (`craftingSlice.ts:115`). Contrast `purchaseAgingUpgrade` which publishes (`prestigeSlice.ts:124`).

**P-4 (MEDIUM) Challenge rennet reward skips recalc AND bypasses the owning slice** — `claimChallengeReward` writes `prestige.rennet`/`totalRennet`/`equipmentInventory`/`unlockedIngredients` via raw `set()` (`challengeSlice.ts:73-103`).

**P-5 (MEDIUM) Combat curds double-count `totalCurdsEarned`**: `production/eventSubscriber.ts:13-18` re-adds what `addCurds` already added (`productionSlice.ts:106-112`).

**P-6 (LOW-MED) No periodic `checkAchievements`** — pure-idle players crossing totalCurds/CPS thresholds get neither the achievement nor its multiplier until their next click/purchase (call sites only in action paths: `productionSlice.ts:85,148,197`, `heroSlice.ts:56`, `combatSlice.ts:216`, `craftingSlice.ts:126,323`).

**P-7 (MEDIUM) Golden cheese `rareIngredient` silently no-ops with false success text** — ignores `unlockIngredient`'s boolean (`goldenCheeseSystem.ts:93-102`); every specialty item has an unlock requirement (`data/ingredients.ts:200-298`), so early-game players get "Rare Find!" and nothing.

**P-8 (LOW) Display divergences ship to players**: `getHeroMultiplier` omits the synergy formation bonus (`heroSlice.ts:336-341` vs `cpsCalculator.ts:33-34`; shown at `HeroPanel.tsx:290-296`, `PartyFormationPanel.tsx:113-116`); `getClickMultiplier` omits Eh and event multipliers (`productionSlice.ts:287-293` vs `cpsCalculator.ts:62-70`; shown at `UpgradePanel.tsx:166-171`); `getGlobalMultiplier` (`productionSlice.ts:301-309`) is a dead-but-trap variant.

### 3. Persistence & Save System

**S-1 (CRITICAL) Save import is broken.** `handleImportSave` writes the imported JSON then `window.location.reload()` (`SettingsPanel.tsx:49-67`); reload fires `beforeunload` → `save()` (`App.tsx:317-319`) which overwrites the import with in-memory state. Import silently no-ops. Also hardcoded save-key strings (`SettingsPanel.tsx:33,57` vs unexported `SAVE_KEY` `saveSystem.ts:12`).

**S-2 (MEDIUM) Hidden-then-closed tab permanently loses offline progress.** Loop pauses on hidden (`gameLoop.ts:143-145`) while background autosave keeps advancing `lastSaved` (`App.tsx:252-254`); offline credit only applies on visibility resume (`App.tsx:234-239` → `persistenceSlice.ts:144-168`). Hide 2h → close → relaunch computes ≈0 offline.

**S-3 (HIGH, maintainability) Two parallel migration mechanisms + triplicated defaults.** Ladder v1→v9 is contiguous (`migrations.ts:20-168`) but `goldenCheese`/`challenge`/`unlockedFeatures`/`zoneProgress` are defaulted only in `deserializeState` (`saveSystem.ts:195-227`) while `synergy` has both a migration AND a duplicate default. Crafting defaults exist in 3 places (`migrations.ts:86-94`, `saveSystem.ts:111-119`, `crafting/resetFactory.ts`); the 13-province prestige default in 3 places (`migrations.ts:51-77`, `saveSystem.ts:122-148`, `persistenceSlice.ts:83-109`).

**S-4 (MEDIUM) Missing-field hard crash treats old saves as corrupted**: `new Decimal(serialized.curds/whey/totalCurdsEarned)` with no fallback (`saveSystem.ts:157-159`) → catch labels save corrupted, starts fresh (`saveSystem.ts:279-288`); nothing ever restores backups. A save with `version: undefined` bypasses the entire migration ladder (`saveSystem.ts:256,271,278`). Corrupt-save backups accumulate under new keys per failed load (`saveSystem.ts:283`), never pruned.

**S-5 (MEDIUM) Offline formula excludes buffs that online tick includes** (`saveSystem.ts:313` vs `productionSlice.ts:93-95`) and uses the save-time event set (see P-2 ordering). Hero XP doesn't accrue offline (only in loop, `gameLoop.ts:62`) — undocumented asymmetry. Crafting jobs and buff expiry are timestamp-based and correct.

**S-6 (MEDIUM) Game-loop delta cap loses time on slow devices**: `Math.min(deltaMs, 100)` BEFORE accumulation (`gameLoop.ts:49`) — sustained 200ms frames run the whole game at 50% real-time. Magic `100` doesn't match `MOBILE_TICK_INTERVAL_MS` (150).

### 4. Crafting & Content Unlocks — the dead-end problem

**K-1 (HIGH) Crafting progression dead-ends at starter content.** `unlockRecipe` (`craftingSlice.ts:81`) is called only by eventSlice with phantom IDs; `unlockCave` (`craftingSlice.ts:102`) has ZERO callers — the UI even taunts "Gain Rennet to unlock your first cave!" (`CraftingPanel.tsx:194-195`) with no button; `unlockIngredient` is called only by golden cheese for specialty items — milk/culture/rennet upgrade ingredients (`ingredients.ts:43-186`) have NO unlock path. Every player is permanently stuck with 3 starter recipes / 1 cave / 3 ingredients (`crafting/resetFactory.ts:8-10`). Also `RecipeCard.tsx:70` always passes `specialtyItems: []` (`// TODO`), so even golden-cheese-unlocked items are unusable.

**K-2 (HIGH) `province_complete` recipe gates can never unlock.** `checkUnlockRequirement` looks up `ctx.zoneProgress[req.provinceId]` (`craftingEngine.ts:75-77`) but `zoneProgress` is keyed by ZONE ids (`combatSlice.ts:201-206`, `data/zones.ts`), never province values. Affects recipes at `cheeseRecipes.ts:253,273,292,350,469,489,509`. A branded ZoneId/ProvinceId type would have made this uncompilable.

**K-3 (MEDIUM) Interaction system half-wired and diverged.** Live `INTERACTION_LIMITS` inline in `addInteraction` (`craftingSlice.ts:414-439`) includes types (`brine`, `smoke`, `press`) that can't exist per the `CraftingInteraction` union (`types/game.ts:625-630`); dead `canAddInteraction` (`craftingEngine.ts:582-616`) has different rules. `addInteraction` trusts a caller-supplied `qualityEffect` (`craftingSlice.ts:405,441-444`); the only caller hardcodes `{type:'turn', qualityEffect:1}` (`CaveCard.tsx:105-108`) so rind_wash/flavor_addition are unreachable, and the dead `getInteractionQualityEffect` (`craftingEngine.ts:558-577`) is the orphaned source of truth.

**K-4 (LOW) Latent cost bug**: `startCrafting` sums all ingredient costs as curds (`craftingSlice.ts:159-169,205`), ignoring `costCurrency`; currency-aware dead code at `craftingEngine.ts:112-161`. First whey-priced ingredient will mischarge silently. Cost math also triplicated in `RecipeCard.tsx:47-49`.

**K-5 (LOW) Duplicate/inaccurate `CheeseCollected` events**: `tickCrafting` publishes a placeholder-quality cheese (`craftingSlice.ts:272-279`) and `collectCheese` publishes the real one (`:319`); the only subscriber hook `useCraftingEvents.ts` is itself dead (imported by no component) — a landmine for future subscribers. Store-level recipe/ingredient validation doesn't exist (dead `validateRecipeIngredients`/`hasRequiredIngredients`, `craftingEngine.ts:418,469`) — enforcement is UI-only.

### 5. Phantom & Broken Content (data-mismatch families)

**D-1 (HIGH) Seasonal-event exclusive content references IDs that don't exist**: `maple-firework-curd`, `festival-poutine-supreme`, `ice-sculpture-aged`, `canada-day-cape`, `stanley-cup-replica`, `winterlude-toque` (`data/events.ts:22-23,42,61,80-81`) appear nowhere in `cheeseRecipes.ts`/`equipment.ts`. Recipes silently fail to unlock; phantom equipment IDs are appended unvalidated to `equipmentInventory` (`eventSlice.ts:85-93`) and persist into saves — playing on Canada Day pollutes your save forever.

**D-2 (HIGH) ~10 achievements can never unlock**: `PROVINCIAL_ZONES` uses six wrong zone IDs (`achievementSlice.ts:14-28` — e.g. `ontario_cheese_trail` vs real `ontario_cheese_caves`, `zones.ts:23`); the boss matcher `zoneId.includes(bossId.replace('_boss',''))` (`achievementSlice.ts:146-154`) is never true for any of the 8 boss achievements (`achievements.ts:611-649`).

**D-3 (MEDIUM) Weekly challenge rewards use phantom IDs**: `'truffle'` → real `specialty_truffle` (`ingredients.ts:216`), `'explorers_compass'` → real `cheesemakers_compass` (`equipment.ts:359`), in `challenges.ts:25,33`.

**D-4 (HIGH) Combat loot drops are a black hole**: rolled per drop table (`combatEngine.ts:668-689`), displayed (`CombatResultsModal.tsx:158-165`), but `BattleWon` subscribers consume only curds/whey/XP (`production/eventSubscriber.ts:9-19`, `heroes/eventSubscriber.ts:9-16`). No materials inventory exists. All loot tables across the 3,603-line enemies.ts are cosmetic. The `+20% combat rewards` aging upgrade (`agingUpgrades.ts:85-93`) is never applied in `calculateCombatRewards` (used only by display components). The Winterlude `drops` event bonus (`events.ts:75`) is never consumed.

**D-5 (HIGH) Vintage/Legacy endgame is decorative.** `performVintage`/`performLegacy` exist (`prestigeSlice.ts:164-217,224-276`) but no UI calls them — `PrestigePanel.tsx:440-482` renders locked progress bars with no action button. Vintage gate is 100 aging resets + 100 rennet (`prestigeSlice.ts:159-162`). Legacy increments scalar `prestige.legacy` (`:255`) but the multiplier reads `prestige.legacyBonuses` (per-province map) which is never written anywhere (`productionEngine.ts:345`). `vintageUnlocks` is never populated or read. Downstream Vintage-gated content is dead: 2 of 5 caves (`caves.ts:58,68`), 3 recipes, 2 ingredients, the vintage/legacy achievements (`achievements.ts:389-401`). Vintage/legacy prestige resets also don't reset crafting (`crafting/resetFactory.ts:39-40` returns state unchanged — stub inconsistency).

### 6. DDD / Architecture Assessment

The architecture is now a **hybrid** — substantially improved from the 2026-04 baseline:

**Live and good**: `Battle` aggregate owns the tick pipeline and the single victory/defeat invariant (`Battle.ts:162-224,782-813`) and returns feedback/audio events as data for the slice to execute (`combatSlice.ts:107-159`) — the best pattern in the codebase. `Party` enforces formation invariants (`Party.ts:71-111`). Domain-event dispatcher heavily used (`domain/events/dispatcher.ts`; publish from 8+ slices). `Quality` and `Stats` value objects live. `EntityRegistry` O(1) lookups pervasive. `UnlockContext` makes crafting's upstream reads explicit (`craftingEngine.ts:49-56`).

**Residual two-models problem**:
- ~19 dead `craftingEngine` exports + 4 dead `combatEngine` exports (incl. `processBossSpecialMechanics`, `removeFlavourBuffs`, `createEmptyCombatState` duplicate) as divergence traps. Key diverged pairs: interaction limits (`craftingEngine.ts:582-616` vs `craftingSlice.ts:415-439`), ingredient cost (`craftingEngine.ts:112-161` vs `craftingSlice.ts:159-169`), interaction quality effect (`craftingEngine.ts:558-577` vs hardcoded in `CaveCard.tsx:105-108`).
- `CombatEnemy` persists only HP → all stat consumers re-derive from unscaled definitions (root cause of C-4/C-5). Bosses never wrapped in an entity (`domain/registry/enemies.ts:9`); `getAnyEnemy` returns `toJSON()` DTOs (`enemies.ts:15-19`).
- Empty combat state ×3 (`combat/resetFactory.ts:10-30` live, `combatEngine.ts:721-741` dead, `saveSystem.ts:175-193` inline); initial prestige state ×3; level-up loop duplicated within heroSlice (`heroSlice.ts:239-249` vs `:303-313`); buff scaling formula duplicated in UI (`CheeseInventoryCard.tsx:118-144` vs `craftingEngine.ts:379-403`).

**Anemic remnants**: Enemy/Recipe/Zone entities are pure getter wrappers; behavior lives in the data layer (`isZoneUnlocked` `zones.ts:1119`, `scaleEnemyStats` `enemies.ts:3564`, `getXpForLevel`/`HERO_ABILITIES` `heroes.ts:12,1422`) and in slices (interaction rules, crit roll `productionSlice.ts:70-75`, Eh tier math `:258-264`, 150-line achievement switch `achievementSlice.ts:34-189`).

**Boundary violations (worst first)**:
1. `challengeSlice.claimChallengeReward` raw-writes prestige/crafting/heroes state (`challengeSlice.ts:73-103`) — newest and worst.
2. `persistenceSlice.reset` re-enumerates every slice inline; only 3 slices delegate to factories (`persistenceSlice.ts:61-142`).
3. `eventSlice.checkEventActivation` writes `equipmentInventory` directly (`eventSlice.ts:88-90`).
4. Direct `curds`/`whey` writes from heroes/crafting/synergy slices vs the event-based `addCurds` convention — two competing conventions.
5. ~39 cross-slice `get().action()` sites; `checkAchievements` casts the whole store (`achievementSlice.ts:204`); no slice is testable alone.
6. Domain layering inverted: `Battle.ts:25-42` imports 15 functions from `systems/combatEngine`; `Quality.toColorClass()` returns Tailwind classes (`Quality.ts:54-67`).
7. Tier 4/5 presentation (haptics/particles/audio) imported directly INTO slices (~20 call sites; `productionSlice.ts:29-32`, `combatSlice.ts:18-39`); `tickCrafting` reads `window.innerWidth` (`craftingSlice.ts:281`).

**Value-object opportunities**: branded `Multiplier`/`Bonus` types exist but are 100% dead (`domain/valueObjects/Modifier.ts` — zero call sites); raw-string IDs enabled the K-2 bug and the fragile achievement matcher; currency as bare Decimal/number enabled K-4; ms-vs-turns duration confusion enabled C-2. Newer features got IDs right (`FeatureId`, `SynergyId`, `Province` unions in `types/game.ts:5-19,64-69,249-258`) — the core catalog never did.

### 7. Store & UI Brittleness

**U-1 (HIGH) Stale-getter renders**: components select stable getter functions then call them in render — derived data with no subscription, refreshed only by accidental parent re-renders. Worst: `UpgradePanel.tsx:164-171` (upgrade availability works only because App's badge selector re-renders the tree); `App.tsx:126,142` (achievement/rennet badges); also `CraftingPanel.tsx:15-23`, `PartyFormationPanel.tsx:113-116`, `HeroPanel.tsx:290-296`, `RennetDisplay.tsx:12-15`, `FirstTimeHint.tsx:34-37`.

**U-2 (MEDIUM) Whole-object subscriptions on per-frame state** (see C-15). The sanctioned fix `useGameStoreShallow` exists (`utils/zustandOptimization.ts:18-20`) but is adopted in only 4 files; the 5 prebuilt selector helpers (`zustandOptimization.ts:28-107`) are entirely dead — `useCombatState` is exactly what `HeroAbilityButton` needs.

**U-3 (LOW) 33001ff leftover**: `getVisibleGenerators` (`productionSlice.ts:323-345`) is now dead, duplicating the inlined logic in `GeneratorPanel.tsx:171-181` (both hardcode `minVisible = 3`).

**U-4 (MEDIUM) Primitive adoption gaps**: `shared/Button.tsx` imported by 2 files; `shared/ProgressBar.tsx` by 1; `shared/TabButton.tsx` ~0; ModalOverlay skipped by SettingsPanel (hand-rolled overlay, magic `z-100`, `SettingsPanel.tsx:81-88`) and 4 other modals. Disabled-state gray combo copy-pasted 5+ times; tab-button styling triplicated; hand-rolled bars in `CombatATBBar.tsx:72-80,109-120`, `HeroPanel.tsx:84-89`.

**U-5 (LOW-MED) Token bypasses**: semantic state colors are raw Tailwind everywhere (no `--color-success/danger/warning` tokens outside high-contrast block `index.css:786-792`); hex literals in `GameScene.tsx:60-65,156-187`, `Layout.tsx:22`+`LoadingScreen.tsx:53` (duplicated `#8b7355` = `--color-rind`); behavior magic numbers outside constants.ts (`gameLoop.ts:49`, `combatSlice.ts:41-53`, `craftingSlice.ts:415-422`, `goldenCheeseSystem.ts:7-22`, `App.tsx:54-56`).

**U-6 (uncommitted work)**: the 6 dirty UI files are coherent, completed reduced-motion accessibility work — safe to commit, with two nits: ungated `animate-bounce` at `CombatATBBar.tsx:52`; `CombatLog.tsx` has the duplicate-key bug (C-14) and `newEntryThreshold = entries.length - 1` (`:89`) contradicting its own "last 3 entries" comment.

**U-7 (LOW)**: `ActiveBuffsBar.tsx:7-11`/`CaveCard.tsx:85` duplicate 1s-interval clocks (a shared `useNow()` hook wanted); `HeroRecruitCard` subscribes to the ENTIRE store (`HeroPanel.tsx:174`); three separate visibilitychange handlers with implicit ordering (`gameLoop.ts:156`, `App.tsx:321`, `analyticsService.ts:64` — the last on `window`, never removed); `load()` runs in an impure `useState` initializer under StrictMode (`App.tsx:164-179`).

### 8. Game-Design / Fun Assessment

**Pacing & activity**:
- Clicking dies mid-game: click base is flat `Decimal(1)` (`cpsCalculator.ts:62-70`); only 3 click upgrades, all bought by 50K curds (`upgrades.ts:6-29`); no click-scales-with-CPS mechanic. Click crits are named `_BASE_` (`constants.ts:192-195`) but nothing modifies them.
- Upgrade drought: per-generator upgrades stop at 50 owned; last global upgrade at 1e16 (`upgrades.ts:466-506`) while generators extend past 1e20. Generator cost jumps (12-16x) outpace CPS jumps (5.5-7x) (`generators.ts:11-141`).
- `BUY_MILESTONES` celebrate with confetti but grant nothing mechanical (`constants.ts:200`, `productionSlice.ts:126-145`).
- Golden cheese framework is clean (`goldenCheeseSystem.ts:7-32`) but static — `totalCollected` is tracked (`goldenCheeseSlice.ts:91`) and drives nothing; `clickStorm` (15% weight) multiplies worthless clicks.
- Whey: earned only from bosses (`combatEngine.ts:705-706`), spent only on 5 one-time synergies (125 whey total); `costCurrency: 'whey'` upgrade support exists (`productionSlice.ts:182-190`) with zero upgrades using it.
- Heroes 10-30 unreachable in practice: costs to 25 quintillion (`heroes.ts:991`) vs full roster wipe every aging reset (`heroSlice.ts:360-369`) and optimal aging at ~1e12-1e13.
- Mythology zone trap: `chasse_galerie` unlocks right after zone 2 (`zones.ts:1045-1046`) with ~4x stronger enemies (recommendedLevel 70 vs 10) — untelegraphed.
- Cheese `heroBuff` effects (attack/hp/speed on recipes, `cheeseRecipes.ts:957,998-999`) are display-only — `getActiveBuffMultipliers` handles only production/click/xp (`craftingSlice.ts:508-534`). The crafting→combat fantasy the data promises doesn't exist (except the flat +25% synergy).
- Tier 5 features (PR #44) are genuinely wired: cheese wheel evolution, click crits (visuals), buy-milestone celebrations, province ambient audio (combat-only).

**Top fun opportunities ranked (payoff/effort)**:
1. Make clicking matter forever — "+X% of CPS per click" upgrade line + scalable crit chance/multiplier (very high / low).
2. Ship Vintage properly + fix Legacy (province-choice `legacyBonuses`) — an entire decorative endgame becomes real (very high / medium).
3. Close combat→economy loop — CPS-relative stage rewards, grant drops as specialty ingredients, apply the aging combat bonus (high / medium).
4. Fix the four data-mismatch families (D-1..D-4) — ~10 achievements, 2 challenge rewards, 4 events' exclusives start working (medium-high / trivial).
5. Make cheese heroBuffs real in combat (medium-high / low-medium).
6. Give whey a life — whey-cost upgrade branch, consume the event `drops` bonus (medium / low).
7. Extend upgrade ladder late-game + make BUY_MILESTONES grant +5% per generator (medium / trivial, data-only).
8. Golden cheese meta-progression off `totalCollected` + welcome-back spawn after >1h offline (medium / low).
9. Hero retention aging upgrade ("keep N heroes through Aging") (medium / medium).
10. Telegraph mythology zones as "Legendary Questlines" with level warnings (low effort delight).
11. More events/challenges — pure data in `events.ts`/`challenges.ts` (only 6 weekly challenges exist).

## Phased Roadmap

Sequencing rationale: restore playability first (combat is semi-broken), then make the economy/persistence trustworthy, then reconnect the mountain of already-built dead content (cheapest fun wins), then consolidate to one-model DDD so features stop diverging, then UI hygiene, then build new fun on the solid base. Each phase is scoped to be one implementation plan (P6 splits into sub-plans).

### Phase 1 — Combat Playability (critical bugs)
The game's combat half is currently unshippable. Fix in one plan:
1. Defeat/flee softlock: `endCombat` resets combat state (or sets `isInCombat: false` + clears `battleResult` on modal continue); make retry work; dedupe double `endCombat` on flee (C-1).
2. Turn-time semantics: decrement cooldowns and status-effect durations on unit ACTIONS (turns), not frames — decide the rule (on actor's turn vs global turn counter) and apply in `Battle.#decrementCooldowns` + status processing (C-2). This single fix revives taunts, DoTs, buffs, cooldowns, and drop-rate abilities.
3. ATB pacing: restore `1 + speed/100` or rebalance `BASE_ATB_RATE` to the actual 4-15 speed range (C-6).
4. Feedback clobbering: merge feedback mutations into the final `set` (or apply feedback events AFTER the state write) so damage numbers/combo/flash/shake render (C-3); fix slot-index mapping (C-14e) while there.
5. `targetType: 'self'` branch + `ability.damage ?? 1.0` instead of `||` (C-7).
6. Boss phase check after abilities/limit breaks/DoTs (C-9); wire or delete `processBossSpecialMechanics` (C-10 — wiring it is a fun win: minion summons).
7. Reachable hero crits: real crit roll (ties into P6 crit upgrades) or lower threshold (C-8).
8. Commit rewards at victory time, not modal click; claim XP from battle participants (C-12, C-13).
Exit criteria: lose→retry→win loop works repeatedly; a 3-turn buff survives 3 turns; auto-attacks show damage numbers; stage 10 pays more than stage 1 (needs P4.1 or interim fix).

### Phase 2 — Economy & Persistence Integrity
1. Event multipliers applied exactly once: remove from `tick()`/`click()` (keep in `computeCps`, matching the breakdown UI) and subscribe `SeasonalEventActivated/Deactivated` → `CpsInputsChanged`; reorder load so `checkEventActivation` precedes CPS recalc and offline calc (P-1, P-2).
2. Missed recalcs: `spendRennet`, challenge rennet (P-3, P-4 — route through owner actions while there).
3. `totalCurdsEarned` combat double-count (P-5).
4. Save import: skip the beforeunload save when importing (flag or remove listener before reload); export/import round-trip test; share `SAVE_KEY` (S-1).
5. Offline-progress loss on hidden-close: compute offline from a monotonic "last simulated" timestamp rather than `lastSaved`, or stop autosave advancing `lastSaved` while paused (S-2). Include offline/online buff consistency decision (S-5).
6. Migration consolidation: one default-state source per slice (resetFactories) consumed by `deserializeState`, `reset`, and migrations; Decimal fallbacks; handle unversioned saves; prune corrupt-save backups (S-3, S-4).
7. Periodic `checkAchievements` in the loop (P-6). Game-loop delta-cap fix (accumulate before clamping) (S-6).
Exit criteria: one effective rate per event online/offline/display; import works; no data-loss path; single source for slice defaults.

### Phase 3 — Reconnect Dead & Phantom Content (cheap, huge payoff)
Mostly data + small wiring; consider a dev-time validation test asserting every ID referenced by events/challenges/achievements/drops exists in a registry.
1. Achievement fixes: 6 zone IDs + bossId→zoneId lookup table (D-2).
2. Challenge reward IDs (D-3).
3. Seasonal exclusives: create the 6 items or repoint to existing ones; validate IDs at grant time; migration to strip phantom IDs already in saves (D-1).
4. `province_complete` unlocks: Province→zones mapping (or branded IDs — see P4.5) (K-2).
5. Crafting unlock paths: rennet-cost cave unlock UI calling `unlockCave`; unlock progression for recipes and core ingredients (rennet costs / zone completion / achievement grants — design choice); fix `RecipeCard` specialtyItems TODO (K-1).
6. Golden cheese `rareIngredient` fallback to curds when unlock fails (P-7).
7. Combat rewards: use scaled definitions, apply the aging combat bonus, consume the event `drops` multiplier, and grant drops — cheapest version maps drop itemIds to specialty ingredients (D-4; full inventory system can wait for P6).
Exit criteria: zero phantom IDs (validated by test); every recipe/cave/ingredient reachable through play; boss/province achievements unlockable.

### Phase 4 — One Model: DDD Consolidation
The structural phase — do after P1-P3 so it's consolidating *correct* behavior.
1. `CombatEnemy` carries full scaled stats (attack/defense/speed/rewards), consumers stop re-deriving from the registry; wrap bosses consistently (fixes C-4/C-5 root; supersedes interim fixes).
2. Kill-or-reconcile the ~19 dead craftingEngine + 4 dead combatEngine exports. Reconcile interaction rules into ONE home (limits + timing + quality effects in the engine; store derives `qualityEffect` — closes the caller-supplied-quality hole, K-3); currency-aware ingredient cost (K-4); single `CheeseCollected` per cheese (K-5).
3. Display getters delegate to canonical calculators (`getHeroMultiplier`, `getClickMultiplier`); delete `getGlobalMultiplier`, `getVisibleGenerators`, dead `useCraftingEvents` (P-8, U-3).
4. Boundary enforcement: challengeSlice/eventSlice route grants through owner actions or domain events; single currency-write convention (`addCurds`/`spend*`); `persistenceSlice.reset` fully factory-delegated; extract the achievement-requirement switch into a domain evaluator (also enables P-6 cheaply).
5. Value objects where they'd have prevented real bugs: branded `ZoneId`/`ProvinceId` (K-2), `CurrencyAmount` (K-4, challenge rewards), turn-vs-ms duration types (C-2). Adopt or delete the dead `Modifier.ts` branded types.
6. Presentation out of the domain/slices: extend Battle's feedback-event pattern to production/crafting slices (haptics/particles/audio driven by subscribers); `Quality.toColorClass` → UI mapping; golden-cheese balance constants → `data/constants.ts`; consider inverting `Battle` → `combatEngine` dependency (move pure combat math into domain).
Exit criteria: grep-clean dead exports; every formula has exactly one home; no slice writes another's state; slices constructible for tests.

### Phase 5 — Store & UI Hygiene
1. Fix stale-getter renders: derive-and-subscribe (useShallow selectors on inputs) for UpgradePanel, App badges, hero/rennet displays (U-1).
2. Narrow per-frame combat subscriptions (adopt or replace the dead `zustandOptimization` helpers); memoize `getPartyStats` per tick (C-15, U-2).
3. Primitive adoption sweep: Button, ProgressBar, TabButton, ModalOverlay everywhere; kill the copy-pasted disabled-state combos (U-4).
4. Semantic color tokens (`--color-success/danger/warning`) + hex-literal cleanup; move behavior magic numbers to constants (U-5).
5. Small fixes: CombatLog keys + heal rendering + "last 3" threshold; ungated `animate-bounce`; shared `useNow()` hook; `HeroRecruitCard` selector; commit the reduced-motion work (U-6, U-7, C-14).
Exit criteria: no component depends on accidental re-renders; combat renders bounded; one source for button/bar/tab/modal styling.

### Phase 6 — Fun: Close the Loops & Ship the Endgame
Build on the now-solid base; splits into 3-4 plans:
- **6a Active play**: click scales with CPS (+% CPS per click upgrade line); crit chance/multiplier upgrades (uses P1.7's real crit roll); golden cheese meta off `totalCollected` (spawn rate/duration upgrades, welcome-back spawn after >1h offline).
- **6b Cross-system loops**: cheese `heroBuff` effects applied to party stats at Battle init; implement weakness/resistance in `calculateDamage` (data + UI already exist, C-11); whey-cost upgrade branch (support already exists); combat stage rewards as seconds-of-CPS.
- **6c Progression pacing**: upgrade tiers at 100/150/200 owned + globals past 1e16 (data-only); BUY_MILESTONES grant +5% per generator; mythology zones telegraphed as "Legendary Questlines" with level warnings.
- **6d Endgame**: Vintage shipped (UI button, gate lowered to ~10-15 aging resets, `vintageUnlocks` spendable — Vintage-gated caves/recipes are ready-made rewards); Legacy fixed (province-choice writes `legacyBonuses` so `productionEngine.ts:345` reads real values); hero-retention aging upgrade; vintage/legacy crafting reset semantics (K-5 stub); more seasonal/dynamic events + weekly challenge pool expansion (data-only).

## Code References

Highest-priority anchors (full references inline above):
- `src/stores/slices/combat/combatSlice.ts:169-244` — endCombat never clears isInCombat (softlock)
- `src/domain/aggregates/Battle.ts:207,839-858` + `src/systems/combatEngine.ts:207` — per-frame cooldown/duration decrement
- `src/systems/combatEngine.ts:65-69` — ATB formula missing `1 +`
- `src/stores/slices/combat/combatSlice.ts:96-167` — tick feedback clobbered by final set
- `src/systems/combatEngine.ts:509-529,651-664` — CombatEnemy persists only HP; unscaled stats/rewards
- `src/stores/slices/production/cpsCalculator.ts:37,44-52,67-68` vs `productionSlice.ts:64-67,93-95` — event multiplier double-application
- `src/components/ui/SettingsPanel.tsx:49-67` + `src/App.tsx:317-319` — save import clobbered
- `src/stores/slices/crafting/craftingSlice.ts:81,102` — unlockRecipe/unlockCave with no live callers
- `src/systems/craftingEngine.ts:75-77` — province_complete keyed against zone-id map
- `src/stores/slices/achievements/achievementSlice.ts:14-28,146-154` — wrong zone IDs, broken boss matcher
- `src/data/events.ts:22-23,42,61,80-81` — phantom exclusive content IDs
- `src/stores/slices/prestige/prestigeSlice.ts:164-276` + `productionEngine.ts:345` — Vintage/Legacy unreachable; legacyBonuses never written
- `src/stores/slices/challenge/challengeSlice.ts:73-103` — worst cross-slice writes
- `src/systems/migrations.ts:6,20-168` + `src/systems/saveSystem.ts:111-227` — dual migration mechanisms

## Architecture Insights

- The **Battle-aggregate pattern** (pure aggregate returns state + feedback/audio events; slice executes side effects) is the codebase's best idea and should be the template for extracting presentation from production/crafting slices.
- The **two-models problem has a lifecycle**: it was wholesale (dead engines vs live slices), was partially fixed by re-importing engine functions, and now persists as *residual divergence traps* — the lesson is that reconciliation must end in deletion, not coexistence.
- **Data-mismatch bugs cluster where strings cross context boundaries** (events→crafting/heroes, achievements→zones/bosses, challenges→ingredients/equipment). A dev-time registry-validation test would have caught all four families; branded ID types would prevent them at compile time.
- **New features regress boundaries**: the newest slice (challenge) has the worst cross-slice writes; Tier 4/5 polish imported presentation into slices. Boundary conventions need enforcement (lint rule or P4.6 event pattern), not just precedent.
- **Celebration without consequence**: milestones, drops, weakness display, and crit constants are all UI promises the mechanics don't keep — the fun roadmap is largely "keep the promises the data already makes."

## Historical Context (from thoughts/)

- `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md` — prior 6-phase DDD roadmap; its Phases 1-2 (reconcile dead/live, single-source calculations) are partially done (Battle/Party/dispatcher live); this document's P4 supersedes its remaining scope.
- `thoughts/shared/research/2026-06-10_18-16-59_bugs-brittle-code-tiered-scan.md` — bug scan now largely stale (see Stale-Memory Corrections).
- `thoughts/shared/research/2026-06-10_23-22-43_making-the-game-more-fun-state-of-the-art-analysis.md` and `2026-02-28_3-ways-to-make-the-game-more-fun.md` — fun research; Golden Cheese/synergies shipped (PRs #34-36); this doc's §8 refreshes the fun backlog post-Tier-5.
- `thoughts/shared/research/2026-06-12_14-19-23_world-class-polish-roadmap.md` — source of tier1-5 polish plans, all five implemented (PRs #39-44) though plan files were never moved to `implemented/`.
- `thoughts/shared/plans/implemented/phase4-combat-system.md:287-291` — design source proving the ATB formula regression (C-6).
- `thoughts/shared/plans/anemic-domain-model-refactoring.md` — stalled behavior-migration plan; P4 replaces it.
- Housekeeping: ~13 completed plans still sit at `thoughts/shared/plans/` top level (god-object-store-refactor, magic-numbers-consolidation, brittle-code-remaining-fixes, code-quality-bugfixes-antipatterns, golden-cheese-events, tier1-golden-cheese-events, tier2-cross-system-synergies, dynamic-events-and-qol-features, tier1-tier5 polish plans) and should move to `implemented/`.

## Related Research

- `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md` — earliest DDD analysis (~70%+ resolved)
- `thoughts/shared/research/2026-06-09_ux-display-contrast-hygiene-review.md` — UX/React hygiene (ux-phase1-4 plans)
- `thoughts/shared/research/implemented/2026-02-02_combat-ux-analysis-multi-phase.md` — combat UX history

## Open Questions

1. **Turn semantics for C-2**: should cooldowns/durations tick on the *acting unit's* action, on *any* unit's action, or on a global turn counter? Affects balance data meaning; needs a design decision before P1.2.
2. **Event multiplier home** (P-1): keep in `computeCps` (display-accurate, chosen in the roadmap) or tick-only like buffs (display then needs an "event" line separately)? The breakdown UI (`cpsBreakdown.ts:85-87`) suggests in-CPS is intended.
3. **Crafting unlock economy** (K-1): what should recipes/caves/ingredients cost — rennet, curds, zone completion, achievements? Needs a progression design pass before P3.5.
4. **Materials inventory** (D-4): minimal mapping of drops→specialty ingredients vs a real inventory context (prior DDD roadmap Phase 3 territory)?
5. **Vintage gate tuning** (D-5): 100 aging resets is clearly wrong; what's the intended mid-game cadence — ~10-15 resets?
6. **Whether `combatSpeed` settings (1x/2x/4x) should also scale status-effect real-time perception** once C-2 fixes turn semantics.