---
date: 2026-06-12T14:19:23-04:00
researcher: Claude (Fable 5)
git_commit: dcdb548037b4c9d66c6f8efe5350df0f355f4493
branch: main
repository: game
topic: "What do we need to do to give this game world-class polish?"
tags: [research, codebase, polish, ux, juice, audio, performance, accessibility, onboarding, mobile]
status: complete
last_updated: 2026-06-12
last_updated_by: Claude (Fable 5)
---

# Research: What do we need to do to give this game world-class polish?

**Date**: 2026-06-12T14:19:23-04:00
**Researcher**: Claude (Fable 5)
**Git Commit**: dcdb548037b4c9d66c6f8efe5350df0f355f4493
**Branch**: main
**Repository**: game

## Research Question

What do we need to do to give The Great Canadian Cheese Quest world-class polish?

## Summary

The single most important finding: **the game has already built most of its polish infrastructure — and then never plugged it in.** A full particle engine, an entire combat-feedback component layer (damage numbers, hit flashes, screen shake, combo counter), five combat sound effects, a province ambient-audio system, a focus-trap hook, a shared modal primitive, and an offline-progress-cap setting all exist as **dead or disconnected code**. What the player experiences is dramatically flatter than what the codebase contains. Reconnecting what already exists is the highest-leverage polish work available, by a wide margin.

Beyond reconnection, the genuine gaps cluster into five areas, in priority order:

1. **Combat feels dead** — no damage numbers, no hit sounds, no shake, no death animations; plus a state bug where per-frame ATB progress is discarded on log-free frames.
2. **Zero onboarding** — all 7 tabs, 15 generators, and 30 heroes hit a brand-new player at second zero; no tutorial, no progressive unlock (an A/B stub proves it was scoped and dropped).
3. **Performance architecture flaws** — desktop and mobile layouts are *both always mounted* (two live WebGL canvases), 14 components subscribe to the whole store and re-render every 100ms, and backgrounded tabs silently earn nothing until a page reload.
4. **Idle-genre table stakes missing** — number formatting breaks past 999T ("15000.0T"), no count-up tweens, no upgrade-affordable badging, no crafting-complete celebration, silent save loss, no PWA.
5. **Design-system drift** — strong token/keyframe foundation undermined by inline-hex panels, orphaned primitives, no Button component, and no exit animations anywhere.

Notably, **accessibility is already near world-class** (colorblind filters with non-color redundancy, reduced-motion everywhere, live-region announcer, full combat keyboard scheme) — it needs targeted fixes, not a rebuild.

## Detailed Findings

### 1. Built-But-Disconnected Systems (highest-leverage fixes)

These are finished features shipping as dead weight. Wiring them up is days of work for the biggest perceptible gain.

| Dead system | Location | Impact when reconnected |
|---|---|---|
| **`ParticleContainer` never mounted** | `src/components/ui/ParticleContainer.tsx:67-70` registers the global emitter; zero usages in the app | Every `emitParticles()` call silently no-ops: golden cheese collect burst + confetti (`src/components/game/GoldenCheeseWheel.tsx:122-123`), ambient golden sparkles (`GoldenCheeseWheel.tsx:102-106`), synergy purchase sparkles (`src/components/ui/SynergiesPanel.tsx:44`) |
| **Entire combat feedback layer unused** | `src/components/ui/CombatFeedback.tsx` — `DamageNumberDisplay` (:31-97), `FlashOverlay` (:106-125), `CombatResultBanner` (:134-172), `ComboCounter` (:181-206), `AttackEffect` (:215-327) — zero imports anywhere | Live combat gains floating damage/heal/CRIT/MISS numbers, hit flashes, ability effects |
| **Screen shake / flash hooks unused** | `src/hooks/useCombatFeedback.ts` — `useScreenShake` (:11-39), `useFlashEffect` (:49-67); matching orphaned keyframes `src/index.css:378-418, 422, 489` | Hit impact, boss attacks, limit breaks gain physicality |
| **5 combat SFX never called** | `playAttackSound` (`src/systems/audioSystem.ts:1168`), `playEnemyDefeatSound` (:1362), `playHealSound` (:1497), `playBuffSound` (:1533), `playDebuffSound` (:1564); `src/systems/combatEngine.ts` contains zero audio calls | Combat is currently nearly silent — only manual ability/limit-break activations make sound |
| **Province ambient audio 100% dead** | 13 province ambient configs (`audioSystem.ts:567-697`), wind layers (:847-899), chirps (:737-820), province music modifiers (:273-287); `setCurrentProvince` (:531) and `startProvinceAmbient` (:719) have no callers | Each combat zone gains a distinct soundscape — large finished investment shipping as nothing |
| **Prestige music theme unreachable** | `startPrestigeMusic` (`audioSystem.ts:2007`) never called | Prestige moment gains its own theme |
| **Click-position plumbing unused** | `CheeseWheel.tsx:10,76-78` accepts `onClickPosition`; `GameScene.tsx:270` doesn't pass it; `ClickEffects.tsx:70-73` guesses `window.innerWidth * 0.4` | Click particles spawn where the player actually clicked |
| **`useFocusTrap` used by 1 of ~8 modals** | `src/hooks/useFocusTrap.ts:11-120` (complete: trap, Escape, restore); only `KeyboardHelpModal.tsx:55` uses it | All modals gain keyboard accessibility for free if wired into `ModalOverlay` |
| **`ModalOverlay` orphaned** | `src/components/ui/shared/ModalOverlay.tsx:7-15` exported, used by zero modals — every modal hand-rolls its backdrop | Single place to fix animation, focus, Escape, aria for all dialogs |
| **Offline Progress Cap setting is a no-op** | UI at `SettingsPanel.tsx:501-512`, setting at `src/types/settings.ts:24,50`; `calculateOfflineProgress` reads only hard-coded `MAX_OFFLINE_SECONDS` (`src/data/constants.ts:154`, `src/systems/saveSystem.ts:269`) | A user-facing control that currently silently does nothing |
| **`ChangelogModal` dead code** | `ChangelogModal.tsx:25` defined, never imported | Update communication channel |
| **Dead CSS class** | `GoldenCheeseNotification.tsx:133` applies `animate-bounce-in`, which doesn't exist (only `--ease-bounce-in` at `index.css:69`) | Golden cheese banner entrance silently never animates |
| **boss phase audio** | `triggerBossPhaseTransition` (`audioSystem.ts:1952`) dead — linked to the known `availableAbilities[0]` enemy-AI bug | Boss fights gain phase drama |

### 2. Combat Presentation & Correctness

What currently renders in combat (`src/components/ui/CombatPanel.tsx`): HP bars with 300ms tweens (:127-139), ATB pulse-when-ready (`CombatATBBar.tsx:34-42`), Limit Break gradient gauge (:92-137), emoji text log (`CombatLog.tsx:5-25`), and a polished results modal (`CombatResultsModal.tsx:110-128` — staggered slide-ups, number-pops, randomized Canadian one-liners). Enemy death is an instant CSS swap to `opacity-50 grayscale` (`EnemyDisplay.tsx:56-58, 155-160`) — no animation.

**Net effect**: damage exists only as log text and a shrinking bar. No damage numbers, no flashes, no shake, no cast animations, no death effects, no hit sounds — despite all of those existing as dead code (§1).

**Correctness bug found** — `tickCombat` conditional commit (`src/stores/slices/combat/combatSlice.ts:72-79`): `set` only fires when there are logs or the result changed, but `Battle.tick` deep-copies state and advances ATB into the copy (`src/domain/aggregates/Battle.ts:156-164`). On log-free frames the advanced ATB is **discarded**, so ATB cannot accumulate smoothly between events — directly contradicting the per-frame combat tick intent stated at `src/systems/gameLoop.ts:67-68`. Needs verification + fix before any ATB visual polish lands.

Also: `Battle.toState()` deep-copies every hero/enemy each commit (`Battle.ts:69-89`), defeating the `memo` on `HeroCombatCard` (`CombatPanel.tsx:20`) — every card re-renders every combat frame.

### 3. Onboarding & Guidance — the biggest genuine gap

- **No tutorial component exists.** The only evidence onboarding was ever considered is a commented-out A/B experiment stub `'onboarding_flow'` with variants `['control', 'tutorial_tips', 'video_intro']` at `src/systems/abTesting.ts:23-31`.
- **No progressive unlock**: all 7 mobile tabs render unconditionally (`App.tsx:642-767`), all 6 desktop panel buttons too (`App.tsx:488-556`), all 15 generators listed from tick zero (`GeneratorPanel.tsx:169-170`), all 30 heroes in Recruit (`HeroPanel.tsx:295`). The genre-standard "tabs appear as you reach them" pattern is absent.
- The only existing progressive reveals: upgrades gated by generator ownership (`productionSlice.ts:201-210`), combat zones (`ZoneSelectPanel.tsx:83,212`), prestige tiers (`PrestigePanel.tsx:438-480`).
- The only teaching surfaces: 40 loading-screen tips visible ~1.5s (`src/data/loadingTips.ts:9-57`, `LoadingScreen.tsx:9,18-24`) and bare empty-state hints (`UpgradePanel.tsx:257`, `HeroPanel.tsx:390`).
- **No in-game mechanics help**: only native `title=` attributes (32 occurrences), no Tooltip component, no glossary surfaced to players (`docs/GLOSSARY.md` is dev-only); the only help modal is keyboard shortcuts (`KeyboardHelpModal.tsx:13-52`).
- **Prestige flow is the strongest existing UX**: `AgingConfirmModal.tsx:53-95` previews Rennet gain, multiplier before→after, and explicit Reset/Kept columns — though it recomputes the multiplier formula locally (:22) instead of asking the store, and offers no "recoup time" estimate.

### 4. Performance & Architecture

**Strong foundation**: rAF accumulator loop with 100ms logic ticks / per-frame combat only when fighting (`src/systems/gameLoop.ts:38-95`), frame-budget warnings (:84-92), lazy-loaded panels (`App.tsx:35-38`), vendor chunk splitting (`vite.config.ts:23-46`), `useShallow` helpers (`src/utils/zustandOptimization.ts`), pixel-ratio caps and mobile geometry budgets (`GameScene.tsx:18-49, 210-225`).

**Problems**:
- **Duplicate mounted layouts**: desktop `hidden md:flex` (`App.tsx:589`) and mobile `md:hidden` (`App.tsx:635`) are both always in the DOM — `GameScene` (and its WebGL context) is mounted **twice** (`App.tsx:597, 637`), as is GeneratorPanel etc. All subscriptions and re-renders are doubled; phones pay for the hidden desktop tree.
- **14 whole-store subscriptions** re-render every 100ms tick: `UpgradePanel.tsx:163` (which also re-filters all 48 upgrades per render), `RennetDisplay.tsx:10` and `crafting/ActiveBuffsBar.tsx:6` (both in the header), `CaveCard.tsx:73`, `AgingConfirmModal.tsx:14`, `CheeseCollectionView.tsx:23`, `CheeseInventoryCard.tsx:13`, `RecipeCard.tsx:23`, `PrestigeStats.tsx:22`, `PrestigePanel.tsx:69,181`, `CraftingPanel.tsx:104`, `HeroPanel.tsx:174`, `AchievementPanel.tsx:97`.
- **`App.tsx:121`** subscribes to the entire `combat` slice — the whole App tree re-renders on every combat frame; `App.tsx:117` then calls `getUnlockedAchievements()` on each of those renders.
- **Background time silently dropped**: the loop pauses on `visibilitychange` and `resumeGameLoop` resets `lastTime` with no catch-up tick (`gameLoop.ts:125-149`); offline progress only runs at startup `load()` (`App.tsx:137-152`). Tab away an hour, return → zero production until reload. World-class idle games run the offline calculation on visibility-resume.
- Three.js: no `frameloop="demand"`; manually-created textures/geometries never disposed (`GameScene.tsx:52-111`); no context-loss recovery.
- `ClickEffects` animates floaters via 50ms `setInterval` state mutation (`ClickEffects.tsx:88-98`) — 20fps stepped motion instead of CSS/rAF.

### 5. Audio Quality & Robustness

The synthesis is above-average (ADSR envelopes everywhere, layered sounds, 6-theme procedural music state machine with crossfades — `audioSystem.ts:181-526`), but:

- **No voice management**: every sound creates fresh nodes connected directly to `ctx.destination`; no shared SFX bus, no `DynamicsCompressorNode` limiter, no per-sound cooldowns — click spam and buy-max sprees get harsh.
- **Music loops via `setInterval`** (`audioSystem.ts:420`), not Web Audio lookahead scheduling — timing drifts, and background-tab throttling (≥1s) makes hidden-tab music stutter.
- **Dual desynced settings stores**: header widget persists to `canadian_cheese_quest_audio` (`AudioControls.tsx`, `saveSystem.ts:292-317`) while the Settings panel uses `settingsStore.ts:49-81` — both mutate the same module globals but persist independently and never sync each other.
- **Autoplay handling drops sounds**: play functions silently return when the context is suspended (e.g. `audioSystem.ts:934`) — no queued resume-then-play, so first interactions can be silent.
- **No negative-feedback sound exists at all** (can't-afford buzz), no crafting-complete sound (only craft *start*, `RecipeCard.tsx:71`), no distinct hero level-up (reuses milestone chime, `App.tsx:270`).

### 6. Idle-Genre Table Stakes Missing

- **Number formatting breaks at late game**: `src/utils/formatNumber.ts:4-11` stops at `T` — beyond 999T prints `"15000.0T"`, and `Decimal.toNumber()` overflows to `Infinity` past ~1.8e308. No scientific/named-illion options despite a "number format" setting existing. This breaks the core "bigger numbers" fantasy.
- **No count-up tweens anywhere**; `animate-number-pop` on the currency counter only triggers on manual click/buy (`productionSlice.ts:67,112,161` via `CurrencyDisplay.tsx:41-42`) — never on passive income, golden cheese, combat, or offline gains (matches the open `currency-animation-triggers.md` plan).
- **No affordability badging**: the Upgrades button/tab shows nothing when an upgrade becomes affordable — the core idle dopamine signal is absent. Same for crafting-complete, recruitable heroes, claimable challenges. (Combat and Prestige *do* badge well — `App.tsx:490-501, 527-544`.)
- **No crafting-complete celebration** — no sound, particles, or toast when a craft finishes (craftingSlice has zero audio/particle calls).
- **Silent save loss**: newer-version saves and parse failures start a fresh game with only a `console.error` (`saveSystem.ts:234-255`); write failures swallowed (:221-223); no backup copy of a rejected save. Manual save feedback is `alert('Game saved!')` (`SettingsPanel.tsx:175`); no autosave indicator.
- **Offline progress covers curds only** — no crafting progress, hero XP, or event handling while away; the modal's "Collect" button is cosmetic (curds already added at `persistenceSlice.ts:50-53`).
- The cosmetic fake "CRIT!" on clicks (`ClickEffects.tsx:40-43`, `Math.random() < 0.1`, comment says "for demo") shows a juicy effect with no gameplay behind it — either make crits real or remove.

### 7. Mobile & PWA

- **No safe-area handling**: zero `env(safe-area-inset-*)` usage; `index.html:6` lacks `viewport-fit=cover` — UI collides with notches/home indicators.
- **No PWA**: no manifest, service worker, `theme-color`, or `apple-touch-icon` (`public/` has only `cheese.svg`, `vite.svg`). Installability is a major win for an idle game.
- Sub-44px touch targets: buy-amount selector (`GeneratorPanel.tsx:185`), combat speed buttons (`CombatPanel.tsx:207-208`), header icon buttons (`App.tsx:561,570`).
- UA-sniffing mobile detection (`gameLoop.ts:27`) — iPadOS gets desktop budgets; should be capability-based (`pointer: coarse`).
- **Events/challenges invisible on mobile**: `EventIndicator`/`ChallengeIndicator` wrapped in `hidden lg:flex` (`App.tsx:478-481`).
- **No haptics**: zero `navigator.vibrate` despite mobile-tuned loop.

### 8. Accessibility — strong base, targeted gaps

**Already near world-class**: colorblind SVG filters + non-color redundant indicators (hatched bars, shapes — `index.html:12-40`, `index.css:867-954`), reduced-motion via both setting and media query (`index.css:818-865`), high-contrast mode (:748-816), font scaling with 48px tap targets (:693-746), queued live-region announcer (`src/systems/accessibilityAnnouncer.ts:35-134`), skip links, full combat keyboard scheme with `role="application"` (`CombatPanel.tsx:276-367`), keyboard-focusable proxy over the 3D wheel (`GameScene.tsx:244-260`).

**Gaps**:
- Focus trap + `role="dialog"`/`aria-modal` missing on 5 of 8 modals (only `ChangelogModal`, `KeyboardHelpModal`, `PrivacyConsent` declare them).
- **Live-region spam**: curd counter is `role="status" aria-live="polite"` and changes every 100ms (`CurrencyDisplay.tsx:43-47`) — screen readers attempt to announce a perpetually-changing number. Combat log is also double-announced (`CombatPanel.tsx:507` + announcer).
- `reducedMotion` never seeded from `matchMedia('(prefers-reduced-motion: reduce)')` (no `matchMedia` in `src/` at all) — JS-driven motion (Three.js wobble, particles, rAF toasts) ignores the OS preference.
- Invalid ARIA: `aria-selected` on `role="listitem"` (`CombatPanel.tsx:58-59`).

### 9. Design System Consistency

**Foundation is good**: full `cheddar`/`maple`/`timber` palettes + thematic layer (`panel-wood`, `header-timmys`, `coin-loonie` — `index.css:3-70, 191-353`), 13 `@theme` animations + ~30 keyframes, documented z-index scale (`index.css:73-90`), exemplary reduced-motion gating.

**Drift**:
- **SettingsPanel is entirely inline-hex styled** (`SettingsPanel.tsx:86-131` — `#FFFEF5`, `#8B7355`, `#D4A853`, none in the token set) and has no entrance animation.
- `cheddar-*` is byte-identical to `amber-*`, `maple-*` to `red-*` — components mix them freely (`AgingConfirmModal.tsx:41-107` uses `amber`, `EquipmentModal.tsx:120` uses `cheddar`).
- **No Button primitive** — ~14 distinct ad-hoc hover-button recipes.
- **No exit animations anywhere** — all modals/tabs unmount instantly; `AnimatedTabContent.tsx:9-20` is fade-only remount.
- Modal animation inconsistent: 4 modals use canonical `animate-modal-in`; `AgingConfirmModal.tsx:28-41` hand-rolls a `setTimeout(10)` transition; SettingsPanel has none.
- No skeleton screens; empty states are bare text (`UpgradePanel.tsx:254-258`, `EquipmentModal.tsx:292`); no brand/display typography (system stack only, `index.css:94`); inline `<style>` tags at `GoldenCheeseNotification.tsx:235-244`.
- The 3D scene never evolves with progress — the cheese wheel is an untextured amber cylinder (`CheeseWheel.tsx:92-97`); shadows configured but never render (`GameScene.tsx:266-268` — no `shadows` prop on Canvas). The best-juiced object in the game is `GoldenCheeseWheel.tsx:42-108` (scale-in, spin, bob, panic-pulse, fade warning) — the model the rest should follow.

## Prioritized Roadmap

**Tier 1 — Reconnect what's already built (days, transformative)**
1. Mount `ParticleContainer` in `App.tsx` → golden cheese bursts, synergy sparkles instantly work.
2. Fix the `tickCombat` conditional-commit ATB bug (`combatSlice.ts:72-79`) — prerequisite for combat polish.
3. Wire `CombatFeedback` components + the 5 dead combat SFX into the combat loop (damage numbers, flashes, shake, hit/death/heal sounds).
4. Make `ModalOverlay` the real modal base (focus trap, Escape, `aria-modal`, `animate-modal-in`) and migrate all modals onto it.
5. Honor the Offline Progress Cap setting; pass `onClickPosition` through `GameScene`; fix/remove `animate-bounce-in`.

**Tier 2 — Core feel & correctness (1-2 weeks)**
6. Single layout mount via a `matchMedia` breakpoint hook (halves WebGL contexts and re-renders).
7. Replace the 14 whole-store subscriptions + `App.tsx:121` combat subscription with selectors.
8. Offline catch-up on `visibilitychange → visible`.
9. Number formatting past T (scientific/named-illions, wire the existing setting); count-up tweens; passive-income animation triggers (existing plan: `currency-animation-triggers.md`).
10. Save-loss messaging + backup copy of rejected saves; replace `alert()` with a toast; autosave indicator.
11. Crafting-complete celebration (sound + particles + badge); upgrade-affordable badging.
12. SFX bus with compressor + per-sound cooldowns; unify the two audio settings stores.

**Tier 3 — Onboarding (the biggest genuine gap)**
13. Progressive unlock: tabs/panels appear as systems become relevant; generators revealed ~2 ahead of affordable.
14. Contextual first-time hints (first click, first generator, first combat, first prestige) + an in-game mechanics help modal (player-facing glossary for Rennet/Whey/Eh/quality).
15. Prestige recoup-time estimate in `AgingConfirmModal`.

**Tier 4 — Platform & system polish**
16. PWA manifest + service worker + icons; `viewport-fit=cover` + safe-area insets; 44px touch-target audit; show event/challenge indicators on mobile; haptics on click/crit/limit-break.
17. Seed `reducedMotion` from `matchMedia`; throttle the curd-counter live region; fix invalid ARIA.
18. Design-system consolidation: Button primitive, retokenize SettingsPanel, collapse `amber`↔`cheddar`, exit animations, designed empty states.

**Tier 5 — Aspirational delight**
19. Cheese wheel visual evolution with production scale (texture, holes, wedge, scene density — the Cookie Clicker "world reflects progress" effect); enable shadows.
20. Wire province ambient audio + prestige music theme; lookahead-scheduled music.
21. Make click crits real gameplay; buy-milestone (25/50/100) celebrations; brand display font.

## Code References

- `src/components/ui/ParticleContainer.tsx:67-70` — global particle emitter, never mounted
- `src/components/ui/CombatFeedback.tsx:31-327` — complete unused combat juice layer
- `src/hooks/useCombatFeedback.ts:11-67` — unused screen shake/flash hooks
- `src/systems/audioSystem.ts:1168,1362,1497,1533,1564` — dead combat SFX; `:567-719` dead ambient system; `:420` setInterval music loop
- `src/stores/slices/combat/combatSlice.ts:72-79` — conditional commit discarding ATB progress
- `src/App.tsx:121,589,635` — whole-combat subscription; duplicate desktop/mobile mounts
- `src/systems/gameLoop.ts:125-149` — no catch-up on tab resume
- `src/utils/formatNumber.ts:4-11` — formatter stops at T
- `src/systems/saveSystem.ts:234-255,269` — silent save loss; hard-coded offline cap
- `src/systems/abTesting.ts:23-31` — commented-out onboarding experiment stub
- `src/hooks/useFocusTrap.ts:11-120` / `src/components/ui/shared/ModalOverlay.tsx:7-15` — complete but orphaned a11y primitives
- `src/components/ui/SettingsPanel.tsx:86-131,175,501-512` — inline hexes; `alert()`; no-op offline cap UI
- `src/components/game/ClickEffects.tsx:40-43,70-73,88-98` — fake crit; guessed positions; setInterval animation
- `src/index.css:53-90,358-535,818-954` — animation tokens, orphaned combat keyframes, accessibility layer

## Architecture Insights

- **The "two-models problem" extends to polish**: just as domain entities diverged from live formulas (per MEMORY.md), the juice layer was built (components, hooks, keyframes, SFX) and the integration step was skipped. A recurring delivery pattern: infrastructure lands, wiring doesn't.
- **Accessibility-first paid off**: the reduced-motion/colorblind/announcer infrastructure is the most consistently applied system in the UI — evidence the team can ship cross-cutting polish when it's treated as a system rather than per-component effort.
- **`ModalOverlay` + `useFocusTrap` + a Button primitive would convert ~6 per-modal/per-button inconsistencies into single-point fixes** — the design-system drift is shallow, not structural.
- The duplicate desktop/mobile mount is the single decision with the widest blast radius (perf, battery, WebGL, subscription count).

## Historical Context (from thoughts/)

- `thoughts/shared/plans/ux-phase4-delight-enhancements.md` — overlaps Tier 1/2 here (btn-scale universalization, shimmer, value highlights, currency animation); independently confirms "animation infrastructure is robust but underused"
- `thoughts/shared/plans/currency-animation-triggers.md` — open plan matching finding §6 (passive-income triggers)
- `thoughts/shared/plans/ux-phase1-contrast-fixes.md`, `ux-phase2-react-hygiene.md`, `ux-phase3-layout-display-fixes.md` — prior UX phases from the 2026-06-09 review
- `thoughts/shared/research/2026-06-09_ux-display-contrast-hygiene-review.md` — source of the ux-phase plans
- `thoughts/shared/research/2026-06-10_23-22-43_making-the-game-more-fun-state-of-the-art-analysis.md` — genre state-of-the-art analysis (fun mechanics; complements this polish-focused doc)
- `thoughts/shared/research/2026-06-10_18-16-59_bugs-brittle-code-tiered-scan.md` + `critical-bugs-tier1-fixes.md` / `tier2-...` / `tier3-...` — bug backlog; the `tickCombat` ATB-discard finding here appears to be new
- `thoughts/shared/plans/implemented/combat-audio-integration-phase1.md` — prior combat-audio quick win; the 5 dead SFX show phase 2 never happened
- `thoughts/shared/research/implemented/2026-02-02_combat-ux-analysis-multi-phase.md` — earlier combat UX analysis; `CombatFeedback.tsx` likely originated here and was never integrated
- `thoughts/shared/plans/implemented/phase8-polish-and-launch.md` — original launch-polish plan (marked implemented; this research shows what it missed)

## Related Research

- `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md` — code-quality roadmap; its Phase 1 ("reconcile dead/live dual implementations") is the engineering mirror of this document's Tier 1
- `thoughts/shared/research/2026-02-02_ux-best-practices-review.md` — earlier UX review
- `thoughts/shared/research/2026-02-28_3-ways-to-make-the-game-more-fun.md` — engagement features (all three since implemented)

## Open Questions

- Is the `tickCombat` conditional commit (`combatSlice.ts:72-79`) intentional batching with an off-screen ATB accumulator I missed, or a genuine state-progression bug? Needs a runtime check of whether ATB bars actually fill smoothly between log events.
- Was `CombatFeedback.tsx` abandoned mid-integration or deliberately deferred? (Check git history before deleting vs wiring.)
- Should the two audio-settings stores be merged into `settingsStore` (and the header widget become a view over it), or is the standalone localStorage key load-bearing for pre-settings-store saves?
- For onboarding: progressive unlock thresholds need design decisions (which curd/click milestones gate Combat, Crafting, Prestige tabs?).
