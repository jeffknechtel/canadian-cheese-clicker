---
date: 2026-06-09T14:34:02-04:00
researcher: Claude
git_commit: aa0c31c86846261d465ac93ba9f3549a266625c9
branch: main
repository: game
topic: "Eric Evans DDD Assessment & Phased Refactoring Roadmap"
tags: [research, codebase, DDD, bounded-contexts, aggregates, value-objects, domain-events, refactoring-roadmap]
status: complete
last_updated: 2026-06-09
last_updated_by: Claude
---

# Research: Eric Evans DDD Assessment & Phased Refactoring Roadmap

**Date**: 2026-06-09T14:34:02-04:00
**Researcher**: Claude
**Git Commit**: aa0c31c86846261d465ac93ba9f3549a266625c9
**Branch**: main
**Repository**: game

## Research Question

Put on the Eric Evans DDD hat and come up with a phased approach to refactor the project.

## Summary

Since the April 2026 DDD analysis (`2026-04-19_brittle-code-ddd-analysis.md`), the codebase has completed four major refactors: the 2,367-line god-object store is now **8 Zustand slices** (`src/stores/slices/`), a **domain layer** with 8 entity classes + registries exists (`src/domain/`), **constants are centralized** (`src/data/constants.ts`), and the **ubiquitous language was standardized** (`docs/GLOSSARY.md`). The old "Known Bugs" list is mostly fixed: Eh bonus is wired into `computeCps`, taunt targeting works, `tickCrafting` does real work, all 16 boss reward multipliers exist.

The dominant DDD problem **today** is different from April's: the codebase now has **two models** — a rich domain model that is largely *dead code*, and a live procedural model in slices/engines that has *already diverged* from it. In Evans' terms, the MODEL-DRIVEN DESIGN binding between model and implementation was never completed, leaving competing sources of truth (worse than honest anemia). Secondary problems: slice boundaries are organizational, not enforced (any slice can write any other's state); runtime state (combat, crafting jobs, party) has no aggregates guarding invariants; there are zero value objects; cross-context integration is direct mutation rather than domain events; and persistence carries its own divergent copy of the CPS pipeline.

The proposed roadmap is 6 phases, ordered to (1) restore one-model honesty first, (2) deepen the model where logic churns most (crafting), (3) introduce value objects and aggregates where invariants actually break, and only then (4) enforce strategic boundaries with domain events — each phase shippable independently.

## Current State: What Was Fixed Since April 2026

| April 2026 finding | Status today | Evidence |
|---|---|---|
| 2,367-line god-object `gameStore.ts` | **Split into 8 slices**; old file deleted | `src/stores/index.ts:14-23`, `src/stores/slices/` |
| CPS copy-pasted 15× | **One helper** `computeCps`, 13 call sites | `src/stores/slices/production/cpsCalculator.ts:18-36` |
| Eh bonus never applied | **Wired** into `computeCps` (gaps remain, see below) | `cpsCalculator.ts:25` |
| Taunt ignored in targeting | **Fixed** — `selectHeroTarget` prioritizes taunters | `src/systems/combatEngine.ts:151-178` |
| `tickCrafting` no-op | **Real work** (completion notifications) | `src/stores/slices/crafting/craftingSlice.ts:293-334` |
| Only 5/13 boss reward multipliers | **All 16 bosses** + default fallback | `combatEngine.ts:966-986` |
| Magic numbers scattered | **Centralized** in `src/data/constants.ts` (residue remains) | `constants.ts:9-110` |
| snake_case/camelCase effect chaos | **Standardized** + save migration; `docs/GLOSSARY.md` | `saveSystem.ts:215-254` |
| 133 `getXxxById()` scattered calls | **Registries adopted**; 1 transitive legacy call remains | `data/zones.ts:1207` via `combatEngine.ts:538` |

Plans verified implemented but still sitting in `thoughts/shared/plans/` (should move to `implemented/`): `god-object-store-refactor.md`, `brittle-code-remaining-fixes.md`, `magic-numbers-consolidation.md`, and (largely) `code-quality-bugfixes-antipatterns.md`. Only `golden-cheese-events.md` is genuinely unimplemented.

## Detailed Findings

### 1. The Two-Models Problem (most serious — model/implementation divergence)

The domain entities are a "Smart Catalog over an Anemic Runtime." Of all entity methods, only **six are ever called** outside the domain layer:

- `Generator.getCost/.getCps/.getMaxAffordable` — `src/systems/productionEngine.ts:31,49,62`
- `Upgrade.getMultiplierValue` — `productionEngine.ts:74,110`
- `Hero.getFullStats` — `productionEngine.ts:166`

Everything else is dead — and several dead methods have **diverged from the live formulas**, creating two competing models:

| Concept | Dead domain version | Live procedural version | Diverged? |
|---|---|---|---|
| Enemy stat scaling | `Enemy.getScaledStats` (`Enemy.ts:58-67`): `1 + (zoneLevel-1)*0.15` | `scaleEnemyStats` (`data/enemies.ts:3578-3594`): multiplicative `levelScale` | **Yes — different formulas** |
| Enemy damage | `Enemy.calculateDamage` (`Enemy.ts:86-90`): no variance, no ability multiplier | `calculateDamage` (`combatEngine.ts:91-100`): variance + mitigation | **Yes** |
| Enemy ability choice | `Enemy.selectAbility` (`Enemy.ts:73-81`): cooldown-aware — implements exactly what the TODO at `combatEngine.ts:796` asks for | `availableAbilities[0]` hardcoded (`combatEngine.ts:797`) | Live version is the bug |
| Cheese quality | `Recipe.calculateQuality` (`Recipe.ts:85-93`): returns tier strings | `calculateCheeseQuality` (`craftingEngine.ts:131-167`): 1–100 number | **Yes — different domain concept** |
| Upgrade gating | `Upgrade.isUnlocked/canAfford` (`Upgrade.ts:36-53`): zero callers | reimplemented inline (`productionSlice.ts:27-36, 171-194`) | Duplicate |
| Hero leveling | `Hero.canLevelUp` + static `getXpForLevel` (`Hero.ts:88-98`) | procedural loop in `heroSlice.ts:243-259` using `data/heroes.getXpForLevel` | Duplicate |
| CPS pipeline | dead `recalculateCpsFromState` (`productionEngine.ts:442-460`) — **omits Eh multiplier** | `computeCps` (`cpsCalculator.ts:18-36`) | **Yes — using the dead one would reintroduce a fixed bug** |

Also: `BaseEntity.withData()` (`BaseEntity.ts:19`) is dead scaffolding in all 7 subclasses; bosses never become entities at all (`registry/enemies.ts:9,17` strips entities back to plain JSON via `toJSON()`).

### 2. The Crafting Context Is the Worst Offender

`craftingEngine.ts` (684 lines of pure calculation functions) is **imported nowhere** — grep finds only a comment reference at `data/caves.ts:112`. Meanwhile the 605-line `craftingSlice.ts` re-implements the same logic inline, a third copy in some cases:

- Quality math: `craftingEngine.ts:131-167` (dead) vs `craftingSlice.ts:225-233` (job start) vs `craftingSlice.ts:348-354` (collection clamp)
- Sale value `0.5 + (quality/100)*1.5`: `craftingEngine.ts:208` (dead) vs `craftingSlice.ts:457-458`
- Buff scaling `0.5 + quality/100`: `craftingEngine.ts:421` (dead) vs `craftingSlice.ts:404-423`
- Cave slots: `craftingEngine.ts:561-570` (dead) vs `craftingSlice.ts:280-290`
- Aging progress: `craftingEngine.ts:229-242` (dead) vs `craftingSlice.ts:590-604`
- Unlock-requirement switch (reads prestige/achievements/combat) copy-pasted **4×** within the slice: `craftingSlice.ts:57-76, 95-111, 135-148, 178-191` — and again in the dead engine (`craftingEngine.ts:299-311, 329-338, 354-367`)

### 3. Bounded Contexts: Files, Not Boundaries

The slices share one flat namespace. `SliceCreator<T> = StateCreator<GameStore, [], [], T>` (`src/stores/types.ts:20`) means every slice's `get()`/`set()` operates on the **whole** store — nothing enforces context isolation. Observed cross-context writes:

- Crafting **spends prestige currency**: `unlockCave` deducts `prestige.rennet` (`craftingSlice.ts:150-154`); spends/adds production curds (`craftingSlice.ts:249, 468-469`)
- Achievements **write production state**: `checkAchievements` recomputes `curdPerClick`/`curdPerSecond` (`achievementSlice.ts:141-153`); also `state as unknown as GameState` double-cast at `achievementSlice.ts:131`
- Combat **pays rewards directly**: `claimCombatRewards` calls `addCurds`, sets `whey`, calls `grantXp` per hero (`combatSlice.ts:224-259`)
- Prestige resets production **inline** (`prestigeSlice.ts:78-87`) — though combat/crafting resets properly delegate to owner factories (`resetFactory.ts` pattern, `prestigeSlice.ts:75-76`) — the one good context-boundary pattern in the codebase
- `persistenceSlice.reset()` rebuilds all 8 contexts with **duplicated initial-state literals** (`persistenceSlice.ts:42-112`), duplicating `prestigeSlice.ts:24-50`

### 4. No Aggregates for Runtime State

Domain entities wrap immutable *catalog* data only. All runtime state is plain DTOs mutated externally:

- **Combat**: `tickCombat` is a ~350-line, 8-phase transaction script (`combatEngine.ts:607-959`). The "all enemies dead → victory" invariant is checked in **three places** (`combatEngine.ts:907-930`, `combatSlice.ts:165-167`, `combatSlice.ts:195-197`). No `Battle` aggregate.
- **Genuine mutation bug**: the tick's shallow copies share `StatusEffect` object references with the previous Zustand state, and `processStatusEffects` mutates them in place (`effect.duration -= 1` at `combatEngine.ts:202` vs shallow copies at `:621-634`) — each tick corrupts the prior immutable snapshot.
- **Crafting**: `CraftingJob` built inline (`craftingSlice.ts:236-246`); completion invariant lives in the slice (`craftingSlice.ts:343`).
- **Heroes**: no `Party`/`Roster` aggregate; 4-slot record manipulated field-wise (`heroSlice.ts:93-132`).

### 5. No Value Objects

Raw `Decimal` imported in 32 files including UI components; bare arithmetic like `state.curds.minus(finalCost)` (`craftingSlice.ts:249`). Quality is a raw number clamped ad hoc in two places (`craftingEngine.ts:166`, `craftingSlice.ts:354`). `HeroStats` composition is field-by-field addition repeated in 3 entities (`Equipment.ts:52-58`, `Hero.ts:58-64`, `Enemy.ts:60-66`).

### 6. No Domain Events

Cross-context flows are direct calls (`combatSlice.ts:244-253`, explicitly commented "Cross-slice"). The closest event mechanism is module-level single-subscriber callbacks for UI toasts (`heroSlice.ts:18-23`, `craftingSlice.ts:34-39`, `achievementSlice.ts:17-22`). CPS recalculation is the de facto event system: `set({ curdPerSecond: computeCps(get()) })` hand-placed at 12 sites instead of reacting to state changes.

### 7. Persistence Is Not an Anti-Corruption Layer

`SerializedGameState` mirrors `GameState` field-for-field (`saveSystem.ts:31-55`) — every new field touches three places. Version mismatch only logs a warning (`saveSystem.ts:264-267`); migration is ad-hoc `??` defaults. Worst: `deserializeState` re-derives CPS with a **third hand-rolled copy** of the pipeline (`saveSystem.ts:142-157`) that **omits the Eh multiplier** — CPS is wrong after load until the next recompute fires.

### 8. Live Bugs Found During This Research

1. **Enemy ability selection still broken** — `availableAbilities[0]` (`combatEngine.ts:796-798`); boss *phase* abilities are appended (`combatEngine.ts:321-340`) but never selected; `abilityCooldowns` decremented (`:942-948`) but never consulted. (MEMORY's claim this was fixed is wrong; commit #16 fixed taunt, not this.)
2. **StatusEffect shared-reference mutation** (`combatEngine.ts:202`) — corrupts previous Zustand state each tick.
3. **Seasonal events: fresh games never activate them** — `checkEventActivation` is only called in `persistenceSlice.load()` *after* the no-save early-return (`persistenceSlice.ts:22, 37`); no periodic re-check; events **never auto-deactivate** (union-only merge at `eventSlice.ts:66`).
4. **Eh multiplier gaps** — `incrementEh` (`productionSlice.ts:216-218`) and its callers (`App.tsx:231, 254`) never trigger `recalculateCps`; load-path CPS omits Eh (`saveSystem.ts:142-157`).
5. **Click-value pipeline copy-pasted 3×** (no `computeClickValue` analog): `productionSlice.ts:150-154`, `achievementSlice.ts:141-145`, `productionSlice.ts:246-252`.

### 9. Ubiquitous Language Residue

Mostly standardized (see `docs/GLOSSARY.md`), but: `AbilityEffect` union mixes `'damage_reduction'`/`'drop_rate_bonus'` with `'damageOverTime'` (`types/game.ts:446-451`); target types snake_case (`'all_allies'`, `:431`); `CombatLogEntry.type: 'skill'` survives the ability rename (`:314`, used at `combatEngine.ts:1171, 1422, 1525`); Bonus(+X%) vs Boost/Multiplier(×) semantics differ silently across contexts (`types/game.ts:36-43` vs `:525-527`).

---

## The Phased Refactoring Roadmap (Evans hat on)

**Strategic framing.** The CORE DOMAIN of an idle game is the *economy* — production/CPS math and the prestige loop are what players optimize. Combat, crafting, heroes are SUPPORTING SUBDOMAINS. Evans' first rule is MODEL-DRIVEN DESIGN: the model and the code must be the same thing. Today they are not — there are two models, one dead. So the roadmap starts not with new abstractions but with **restoring a single model**, then deepens the model only where invariants actually break, and defers the most expensive structural work (aggregates, events) until the cheap honesty work has de-risked it. Every phase is independently shippable with no behavior change except where a phase explicitly fixes a bug.

### Phase 1 — One Model: Reconcile or Kill the Dead Code (low risk, highest leverage)

*Evans principle: Model-Driven Design — a model that isn't executed is documentation that lies.*

For each dual implementation, pick the live formula as truth, then either **wire the entity method to it** or **delete the entity method**:

1. Wire `Enemy.selectAbility` into `combatEngine.ts:796-798` — this *fixes the enemy/boss ability bug* by replacing `availableAbilities[0]` with the cooldown-aware selection that already exists. Rewrite `Enemy.getScaledStats`/`calculateDamage` to delegate to the live formulas (`data/enemies.ts:3578`, `combatEngine.ts:91`) or delete them.
2. Delete dead methods with no near-term call site: `Recipe.calculateQuality` (models the wrong concept), `Zone.*` unused methods, `Equipment.getRarityColor`/`Hero.getRoleDescription` (UI concerns — move to components), `BaseEntity.withData` scaffolding.
3. Wire the cheap duplicates: `productionSlice` affordability/visibility → `Upgrade.canAfford/isUnlocked`; `heroSlice.recruitHero` → `Hero.canRecruit`; `heroSlice.grantXp` loop → `Hero.canLevelUp` + `Hero.getXpForLevel`.
4. Delete `recalculateCpsFromState` (`productionEngine.ts:442-460`) — dead and dangerous (omits Eh).
5. Retire the last legacy lookup path: `getStage` (`data/zones.ts:1207`) → `Zone.getStage` via registry; remove the 8 `@deprecated` `getXxxById` exports.
6. Fix the **StatusEffect mutation bug**: deep-copy status effects in `tickCombat`'s copy step (`combatEngine.ts:621-634`) or make `processStatusEffects` return new objects.

**Exit criteria**: zero entity methods with no callers; zero `@deprecated` lookups; enemy ability variety observable in combat; `npm run typecheck && npm run lint && npm run build` green.

### Phase 2 — One Source of Truth per Calculation (the economy core)

*Evans principle: protect the CORE DOMAIN — the CPS/click pipeline is the game's heart and currently exists in 3 (CPS) and 3 (click) copies.*

1. Make `computeCps` the **only** CPS pipeline: `saveSystem.deserializeState` (`saveSystem.ts:142-157`) stops deriving CPS itself — after hydration, call the store's `recalculateCps`. Fixes the load-path Eh omission.
2. Create `computeClickValue` beside `computeCps`; replace the 3 inline copies.
3. Make `incrementEh` trigger recalculation when crossing a 100-eh threshold (`productionSlice.ts:216-222`).
4. Replace the 12 raw `set({ curdPerSecond: computeCps(get()) })` sites with the single `recalculateCps()` action.
5. Sweep residual magic numbers into `constants.ts`: cheese value/buff formulas, interaction quality values, `BOSS_REWARD_MULTIPLIERS` (and make `calculateCombatRewards` use the exported default rather than its inline re-declaration at `combatEngine.ts:1007`), Eh formula, XP rate, offline caps, combat-log cap.

**Exit criteria**: `grep` finds exactly one definition each for the CPS pipeline, click pipeline, cheese-value formula, buff-scaling formula.

### Phase 3 — Rebuild the Crafting Context (delete the dead engine *or* make it the only logic)

*Evans principle: a Bounded Context must have one model inside it; crafting currently has two and a half.*

Recommended direction: the slice becomes thin orchestration; logic consolidates in `craftingEngine.ts` (it's already pure and well-factored) plus `Recipe`:

1. `craftingSlice` delegates: quality → `calculateCheeseQuality`, value → `calculateCheeseValue`, buffs → `calculateBuffEffect`, slots → engine capacity fns, progress → `calculateAgingProgress`. Delete the inline copies (`craftingSlice.ts:225-233, 280-290, 348-354, 404-423, 457-458, 590-604`).
2. Extract a single `UnlockRequirementService` (domain service) replacing the 4 copy-pasted switches in the slice and the 3 in the engine. Its input is an explicit read-only view (`{ prestige, achievements, zoneProgress }`), making crafting's upstream dependencies *declared* rather than ambient — a lightweight ANTI-CORRUPTION seam.
3. Introduce a `CraftingJob` module owning job lifecycle invariants (`start/isComplete/collect` with the `now >= endTime` and `notificationSent` rules) — function module over plain state is fine; a class is not the point, the invariant ownership is.

**Exit criteria**: `craftingEngine.ts` has real importers; `craftingSlice.ts` under ~300 lines; one unlock-requirement implementation.

### Phase 4 — Value Objects Where Units Get Confused

*Evans principle: VALUE OBJECTS make implicit concepts explicit. Scope deliberately small — full Currency wrappers over Decimal in 32 files is not worth the churn.*

1. `Quality` value object (clamp 1–100, tier derivation, `applyBonus`) — replaces the two ad-hoc clamps and the tier logic.
2. `Stats` value object with `add(other)`/`scale(f)` — replaces the field-by-field addition triplicated in `Equipment.applyTo`, `Hero.getStatsAtLevel`, enemy scaling.
3. `Multiplier` vs `Bonus` types (even just branded types or constructor helpers `Multiplier.of(1.5)` / `Bonus.ofPercent(5)`) — encodes the GLOSSARY's neutral-element distinction (×1 vs +0) in the type system, addressing the silent semantic difference between `clickBonus` (+X%) and `clickMultiplier` (×).
4. Finish language residue while touching these types: `AbilityEffect` casing, `CombatLogEntry.type 'skill'` → `'ability'` (with save-migration entry), target-type casing. Update `docs/GLOSSARY.md`.

### Phase 5 — Aggregates for Runtime State (the expensive one)

*Evans principle: AGGREGATES exist to enforce invariants at one place. Do combat first — it's where invariants are demonstrably triplicated.*

1. **`Battle` aggregate** wrapping `CombatState`: decompose the 350-line `tickCombat` into the 8 phases as private steps (`advanceAtb`, `executeHeroActions`, `executeEnemyActions`, `processStatusEffects`, `checkOutcome`...). The victory/defeat invariant lives in exactly one method; `combatSlice` and the engine stop re-checking it independently (`combatEngine.ts:907-930`, `combatSlice.ts:165-167, 195-197`). Immutable-update or copy-on-write internally — which also structurally prevents regressions of the StatusEffect aliasing bug.
2. **`Party`/`Roster`** for heroes: slot assignment/swap invariants (`heroSlice.ts:93-132`), level-up rules.
3. Keep Zustand as the persistence/render projection: slices hold plain snapshots; aggregates are constructed from state, operated on, and serialized back (`Battle.from(state.combat)` → `battle.tick(delta)` → `battle.toState()`). This preserves React compatibility — answering the April research's open question #2.

### Phase 6 — Strategic Design: Enforced Boundaries & Domain Events

*Evans principle: CONTEXT MAP with explicit relationships; PUBLISHED LANGUAGE between contexts. Last because it's pure structure — do it after the models inside each context are worth protecting.*

1. **Typed slice boundaries**: narrow `SliceCreator` so each slice's `set` is typed to its own keys; cross-context effects go through explicit published actions (`addCurds`, `spendRennet`, `grantXp`) — the only sanctioned doors. Generalize the existing `resetFactory` pattern (the codebase's one good boundary idiom, `prestigeSlice.ts:75-76`) to production (`performAging`'s inline reset at `prestigeSlice.ts:78-87`) and to `persistenceSlice.reset()`'s duplicated literals.
2. **Domain events** (a tiny synchronous dispatcher is enough): `BattleWon{rewards}`, `CheeseCollected{quality}`, `HeroLeveledUp`, `PrestigePerformed`, `CpsInputsChanged`. Combat stops paying rewards itself (`combatSlice.ts:224-259`); achievements become a subscriber instead of being invoked from production/crafting and writing production state (`achievementSlice.ts:141-153`); CPS recalculation subscribes to `CpsInputsChanged` instead of 12 hand-placed call sites; the three module-level UI callbacks become subscribers. Events also fix the seasonal-event lifecycle naturally: a periodic `checkEventActivation` in the game loop (activate *and* deactivate, fixing `eventSlice.ts:66` union-only merge and the fresh-game gap at `persistenceSlice.ts:22,37`).
3. **Persistence ACL**: each slice owns `serialize/deserialize/migrate` for its keys; `saveSystem` composes them and runs a real versioned migration ladder (replacing warn-and-load at `saveSystem.ts:264-267`). Persistence stops importing nine production-formula functions (`saveSystem.ts:3-14`).

### Sequencing rationale & effort

| Phase | Theme | Risk | Effort | Why this order |
|---|---|---|---|---|
| 1 | One model (kill/wire dead code) | Low | S–M | Divergent dead code is actively dangerous; also fixes 2 real bugs free |
| 2 | One source of truth per calc | Low | S | Protects the core domain (economy); fixes Eh gaps |
| 3 | Crafting context rebuild | Medium | M | Worst context; Phase 1–2 patterns make it mechanical |
| 4 | Value objects + language finish | Low | S–M | Types that make Phases 5–6 safer to write |
| 5 | Runtime aggregates (Battle, Party) | Medium-High | L | Needs the honesty + VO groundwork; biggest structural change |
| 6 | Boundaries + domain events + ACL | Medium | L | Pure strategy; only worth enforcing once intra-context models are sound |

Bugs to fix opportunistically regardless of phasing: enemy ability selection (Ph 1), StatusEffect mutation (Ph 1), event activation lifecycle (Ph 6, or hotfix anytime), Eh recalc gaps (Ph 2).

## Code References

- `src/stores/index.ts:14-23` — slice composition into one flat store
- `src/stores/types.ts:20` — `SliceCreator` typed over full `GameStore` (no boundary enforcement)
- `src/stores/slices/production/cpsCalculator.ts:18-36` — canonical CPS pipeline (incl. Eh)
- `src/systems/productionEngine.ts:442-460` — dead divergent CPS copy (omits Eh)
- `src/systems/saveSystem.ts:142-157` — third CPS copy in persistence (omits Eh)
- `src/systems/combatEngine.ts:607-959` — 350-line tick transaction script
- `src/systems/combatEngine.ts:796-798` — enemy ability selection still `[0]` (live bug)
- `src/systems/combatEngine.ts:202` vs `:621-634` — StatusEffect shared-reference mutation (live bug)
- `src/domain/entities/Enemy.ts:73-81` — dead `selectAbility` that would fix the above
- `src/systems/craftingEngine.ts` — 684-line engine, zero importers
- `src/stores/slices/crafting/craftingSlice.ts:57-191` — unlock switch copy-pasted 4×
- `src/stores/slices/crafting/craftingSlice.ts:225-233, 348-354, 404-423, 457-458` — inline domain logic duplicating dead engine
- `src/stores/slices/achievements/achievementSlice.ts:131, 141-153` — `GameState` double-cast; achievements writing production state
- `src/stores/slices/combat/combatSlice.ts:224-259` — combat paying rewards cross-context
- `src/stores/slices/prestige/prestigeSlice.ts:75-87` — factory delegation (good) vs inline production reset (bad)
- `src/stores/slices/events/eventSlice.ts:61-72`, `src/stores/slices/persistence/persistenceSlice.ts:22,37` — event activation gaps
- `src/data/constants.ts` — centralized balance constants
- `docs/GLOSSARY.md` — adopted ubiquitous language

## Architecture Insights

1. **The refactor stalled exactly at the model-binding step.** Structure (slices, entity classes, registries) was built, but behavior migration completed only for the production context. The result — speculative richness diverging from live code — is the textbook failure mode Evans warns about when the model isn't the implementation.
2. **The `resetFactory` pattern is the codebase's native boundary idiom** ("owner defines its reset shape; orchestrator composes"). Phase 6 should generalize this rather than import a foreign architecture.
3. **Catalog entities vs runtime state is a real and reasonable split** — the catalog registries (immutable definitions, O(1) lookup) are working well. The gap is purely on the runtime side (no aggregates). Don't unify them; deepen the runtime side.
4. **Zustand is compatible with aggregates** via the construct→operate→serialize-back pattern; the store remains the render projection and persistence source.

## Historical Context (from thoughts/)

- `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md` — prior DDD analysis; ~70% of its findings now fixed
- `thoughts/shared/plans/god-object-store-refactor.md` — **implemented** (verified; should move to implemented/)
- `thoughts/shared/plans/brittle-code-remaining-fixes.md` — **implemented** (matches commit 24f3a57)
- `thoughts/shared/plans/magic-numbers-consolidation.md` — **implemented**
- `thoughts/shared/plans/code-quality-bugfixes-antipatterns.md` — largely implemented/superseded
- `thoughts/shared/plans/anemic-domain-model-refactoring.md` — structurally implemented (entities/registries exist) but behavior-migration phases only partially landed — the root of the two-models problem
- `thoughts/shared/plans/implemented/ubiquitous-language-standardization.md` — fully implemented; standards in `docs/GLOSSARY.md`
- `thoughts/shared/plans/golden-cheese-events.md` — only genuinely unimplemented feature plan; needs remapping to slice architecture + camelCase effect types before implementation

## Related Research

- `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- `thoughts/shared/research/2026-02-02_ux-best-practices-review.md`
- `thoughts/shared/research/2026-02-28_3-ways-to-make-the-game-more-fun.md`

## Open Questions

1. Phase 3 direction: consolidate crafting logic into the (currently dead) `craftingEngine.ts`, or into `Recipe`/`CraftingJob` domain objects and delete the engine? (Roadmap recommends the engine — it's pure and already well-factored — with `Recipe` keeping definition-level behavior.)
2. Should `whey`, `rennet`, and `curds` eventually get currency value objects, or is the Phase 4 minimal scope (Quality, Stats, Multiplier/Bonus) the permanent stopping point?
3. Is a synchronous in-process event dispatcher sufficient (Phase 6), or does the 100ms tick cadence justify batching events per tick?
4. Vintage/Legacy prestige tiers are still stubs (`crafting/resetFactory.ts:39-40`) — should their reset semantics be designed before Phase 6 locks in boundary contracts?
