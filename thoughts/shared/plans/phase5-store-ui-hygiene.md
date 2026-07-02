# Phase 5: Store & UI Hygiene Implementation Plan

## Overview

This plan implements Phase 5 of the 2026-07-01 roadmap (`thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md`, §Phased Roadmap → Phase 5). It fixes React/Zustand rendering correctness and performance issues, adopts the existing-but-unused shared UI primitives, consolidates color tokens and behavior constants, and clears a batch of small UI bugs (U-1 through U-7, C-14 subset, C-15).

None of this changes game logic or balance. It makes the UI render *correctly* (no stale displays), *efficiently* (bounded re-renders during combat), and *consistently* (one source for button/bar/tab/modal styling and semantic colors).

## Current State Analysis

### Stale-getter renders (U-1)
Components select stable getter **functions** from the store and call them in render. Zustand subscribes to the function reference (which never changes), so the component never re-renders when the underlying data changes — it only refreshes when a parent happens to re-render. Verified instances:

| File | Lines | Stale getters |
|------|-------|---------------|
| `src/components/ui/UpgradePanel.tsx` | 164-171 | `getAvailableUpgrades`, `getPurchasedUpgrades`, `getClickMultiplier` |
| `src/App.tsx` | 122-126, 141-142 | `getUnlockedAchievements`, `getPotentialRennet` (header badges) |
| `src/components/ui/CraftingPanel.tsx` | 15-23, 104 | `getUnlockedRecipes`, `getUnlockedCaves`, `getCheeseInventory`, `getActiveJobs`, `getCaveAvailableSlots` |
| `src/components/ui/PartyFormationPanel.tsx` | 113-116 | `getHeroMultiplier` |
| `src/components/ui/HeroPanel.tsx` | 290-296 | `getHeroMultiplier` |
| `src/components/ui/RennetDisplay.tsx` | 12-15 | `getPotentialRennet`, `getPrestigeMultipliers` |
| `src/components/ui/shared/FirstTimeHint.tsx` | 34-37 | `isHintShown` |
| `src/components/ui/CurrencyDisplay.tsx` | 26-30 | `getPotentialRennet` |
| `src/components/ui/AgingConfirmModal.tsx` | 24 | whole-store destructure incl. `getPotentialRennet`, `getPrestigeMultipliers` |
| `src/components/ui/PrestigeStats.tsx` | 22-23 | whole-store destructure incl. `getPrestigeMultipliers` |
| `src/components/ui/crafting/CaveCard.tsx` | 74 | whole-store destructure incl. `getJobProgress` |

`GeneratorPanel.tsx` is explicitly NOT in scope — its selector pattern was fixed in PR #45; do not touch it.

### Per-frame combat subscriptions (U-2, C-15)
`gameLoop.ts:86-89` calls `tickCombat` every animation frame while in combat; `combatSlice.ts:164-170` writes a new `combat` object each tick. Components subscribing to `state.combat` as a whole re-render at ~60fps:

- `CombatPanel.tsx:233` — `const combat = useGameStore((state) => state.combat)` (must re-render per frame for ATB, but drags its whole subtree with it)
- `HeroAbilityButton.tsx:15` (`HeroAbilityButton`) — only reads `combat.battleResult`
- `HeroAbilityButton.tsx:83` (`LimitBreakButton`) — only reads `combat.battleResult`
- `HeroAbilityButton.tsx:134` (`HeroAbilityPanel`) — needs `heroStates` + `limitBreakGauge`
- `combatSlice.ts:100` — `getPartyStats()` (Party aggregate construction + `calculateHeroStats` per hero) recomputed 60×/sec, though party composition, levels, and equipment cannot change mid-battle (XP is granted at victory)

The sanctioned fix exists: `useGameStoreShallow` (`src/utils/zustandOptimization.ts:18-20`) is adopted in only 4 files (`GeneratorPanel`, `ChallengeIndicator`, `CurrencyDisplay`, `CpsBreakdownPanel`). The 5 prebuilt helpers (`useCurrencyState`, `useCombatState`, `usePartyState`, `usePrestigeState`, `useCraftingCounts`) and `createGameSelector` (`zustandOptimization.ts:28-107`) have zero callers.

### Primitive adoption gaps (U-4)
Eight primitives exist in `src/components/ui/shared/` but adoption is minimal:

| Primitive | Imports today | Hand-rolled duplicates |
|-----------|---------------|------------------------|
| `TabButton` | 0 | 10 (UpgradePanel ×4, HeroPanel ×2, PrestigePanel ×3, CraftingPanel ×1 dynamic) |
| `ProgressBar` | 1 (CaveCard) | 7 (CombatATBBar ×2, HeroPanel XP, EnemyDisplay HP, CombatPanel HP, ChallengeIndicator, ZoneSelectPanel) |
| `ModalOverlay` | 4 | 7 (SettingsPanel, BetaAgreement, CombatResultsModal, KeyboardHelpModal, ChangelogModal, ChallengeIndicator, PrivacyConsent) |
| `PanelContainer` | 0 | 8 (UpgradePanel, HeroPanel, GeneratorPanel, CraftingPanel, PrestigePanel, ZoneSelectPanel, CombatPanel ×2) |
| `Button` (disabled style) | 2 | 14 copy-pasted `bg-gray-200 text-gray-700 cursor-not-allowed` combos |

The z-index hierarchy comment in `index.css:99-116` is intentional (z-50 → z-100 by modal priority); `ModalOverlay` hardcodes `z-50`, which is one reason modals skipped it.

### Token/constant bypasses (U-5)
- Semantic state tokens (`--color-success`, `--color-error`, `--color-warning`) exist ONLY inside the `.high-contrast` block (`index.css:786-792`). All components use raw Tailwind (`text-green-600`, `text-red-600`, `text-amber-600`, …).
- `#8b7355` (= `--color-rind`, `index.css:49`) duplicated as a literal in `Layout.tsx:22` and `LoadingScreen.tsx:53`. `GameScene.tsx:60-65,156-187` has 11 canvas/Three.js hex literals, several matching existing tokens (`#f5e6d3` = timmys-cream, `#fcd34d` = cheddar-300, `#c9a875` = timber-300).
- Behavior magic numbers outside `data/constants.ts`: `gameLoop.ts:12,16` (event/achievement check intervals), `gameLoop.ts:49` (delta cap `100`), `combatSlice.ts:41-53` (feedback grid positions), `craftingSlice.ts:415-422` (`INTERACTION_LIMITS`), `goldenCheeseSystem.ts:7-22` (13 golden-cheese balance constants — roadmap P4.6 flagged these for `constants.ts` but Phase 4 didn't move them), `App.tsx:54-56` (dialogue/milestone timing).

### Small fixes (U-6, U-7, C-14 subset)
- `CombatATBBar.tsx:52` — `animate-bounce` not gated on `reducedMotion` (lines 34/66/114 in the same file ARE gated; `reducedMotion` is already subscribed at line 25).
- `CombatLog.tsx:124,154` — `key={entry.timestamp}` collides when entries share a millisecond (multi-target abilities). `:58-60` — heals render red with a `-` prefix. `:88-89` — comment says "last 3 entries" but `newEntryThreshold = entries.length - 1` marks only the last.
- `combatEngine.ts:740,771,829` — all-ally buff/debuff/immunity StatusEffect IDs are `` `${stat}_buff_${Date.now()}` `` — identical for every ally in the same synchronous loop. Line 856 shows the correct pattern (includes `heroId`).
- `ActiveBuffsBar.tsx:7-16` and `CaveCard.tsx:80-92` — duplicate 1s `setInterval` clocks.
- `HeroPanel.tsx:174` — `HeroRecruitCard` destructures from `useGameStore()` with no selector (re-renders on every store change).
- `analyticsService.ts:62-68` — anonymous `visibilitychange`/`beforeunload` listeners registered in the constructor, unremovable.
- `App.tsx:164-179` — `load()`, `initializeSettingsAudio()`, and `analytics.startSession()` run inside a `useState` initializer; under StrictMode the initializer runs twice (duplicate analytics session events in dev).

### Uncommitted work precondition
The working tree has 6 modified UI files (`CombatATBBar`, `CombatLog`, `HeroAbilityButton`, `HeroPanel`, `shared/AnimatedTabContent`, `shared/ProgressBar`) — completed reduced-motion accessibility work the research doc reviewed as coherent and safe (U-6). This must be committed (on the current Phase 4 branch or its own commit) BEFORE starting this plan, since this plan edits five of those six files.

## Desired End State

- Every component that displays derived data subscribes to the state that drives it; no display depends on accidental parent re-renders to refresh.
- During combat, only components that render per-frame data (ATB bars, HP bars, feedback layers) re-render per frame; ability buttons and static chrome re-render only on turn-level changes.
- `getPartyStats()` runs once per battle, not 60×/sec.
- Tab buttons, progress bars, modals, and panels each have exactly one styling source (the shared primitive); the disabled-button combo exists only in `Button.tsx`/`TabButton.tsx`.
- `text-success`/`text-danger`-style utilities exist via root `@theme` tokens, high-contrast mode overrides them by cascade, and clear semantic state usages are migrated.
- Behavior constants live in `data/constants.ts`; scene colors live in one theme module.
- The CombatLog, status-effect ID, `useNow`, analytics-listener, and StrictMode-load fixes are in.

### Key Discoveries:
- `useGameStoreShallow` (`src/utils/zustandOptimization.ts:18-20`) is the sanctioned narrow-subscription tool; `useCombatState` (`:40-49`) selects exactly the low-frequency combat fields.
- Party stats cannot change mid-battle (XP/level-ups apply at victory via `claimCombatRewards`; equipment and party slots are not editable in combat) — safe to snapshot at `initializeCombat`.
- Tailwind v4 `@theme` utilities compile to `var(--color-*)` references, so defining `--color-success/error/warning` at `@theme` makes the existing `.high-contrast` overrides (`index.css:786-792`) apply automatically — provided we reuse the SAME token names (`error`, not `danger`).
- The z-index hierarchy (`index.css:99-116`) is documented and intentional; `ModalOverlay` needs a z-level prop rather than modals needing to conform to `z-50`.
- Consent modals (`BetaAgreement`, `PrivacyConsent`) must NOT close on backdrop click/Escape — `ModalOverlay` needs a `dismissible` prop.
- Getters like `getClickMultiplier` return fresh `Decimal` instances each call; `useShallow` on a Decimal always sees a new object. The fix pattern is to subscribe to the getter's *inputs* (or a primitive projection), not to shallow-compare the Decimal.

## What We're NOT Doing

- **No game-logic or balance changes.** Moving constants to `constants.ts` preserves values exactly. The `gameLoop.ts:49` delta-cap *behavior* (S-6, Phase 2 scope) is not changed here — only the magic number is named.
- **Not touching `GeneratorPanel.tsx` selectors** — fixed in PR #45; re-working it risks regressing the infinite-loop fix.
- **Not migrating `particleSystem.ts` palettes or `CheeseWheelTextures.ts`** to tokens — those are per-preset visual data, not semantic state colors. (GameScene's scene colors do get centralized because `#8b7355`/`#f5e6d3`/etc. duplicate existing tokens.)
- **Not converting every raw green/red/amber class** — only clear semantic state usages (damage/heal/error/warning/success states) in the files listed in Phase 4.1. Decorative color choices stay as-is.
- **Not consolidating the three `visibilitychange` handlers into one** — ordering redesign is out of scope; we only make the analytics listeners removable.
- **Not fixing `getHeroMultiplier`/`getClickMultiplier` formula divergence** (P-8) — that was Phase 4 scope (display getters delegating to canonical calculators). Here we only fix *when components re-render*, not *what the getters compute*.
- **Not adding a test framework.** No vitest/jest exists; verification is `pnpm build`, `pnpm lint`, and manual testing.
- **Not redesigning `EnemyDisplay`/`CombatPanel` HP-gradient logic** — hand-rolled bars migrate to `ProgressBar` only where the primitive fits without losing the gradient behavior (fillColor accepts gradient classes).

## Implementation Approach

Five phases, each independently shippable and verifiable. Order: correctness first (stale getters), then performance (combat subscriptions), then consolidation (primitives, tokens/constants), then small fixes. Each phase compiles and lints clean on its own so it can land as its own commit/PR.

**Pre-flight (before Phase 1):** commit the 6 dirty reduced-motion UI files as-is (message: "Commit reduced-motion accessibility gating for combat/hero UI"). Do not bundle them with plan changes.

**Standard fix patterns used throughout:**

```typescript
// Pattern A — getter returns array/object of stable references:
// call it inside a useShallow selector
const availableUpgrades = useGameStoreShallow((s) => s.getAvailableUpgrades());

// Pattern B — getter returns Decimal (fresh instance per call):
// subscribe to the getter's inputs; keep the getter as the single computation source
const upgrades = useGameStore((s) => s.upgrades);
const ehCount = useGameStore((s) => s.ehCount);
const getClickMultiplier = useGameStore((s) => s.getClickMultiplier);
const clickMultiplier = useMemo(() => getClickMultiplier(), [upgrades, ehCount, /* …all inputs */]);

// Pattern C — getter with args returning a primitive:
// call it inside a plain selector (primitive result → default strict-equality works)
const shouldShow = useGameStore((s) => !s.isHintShown(hintId));
```

Pattern B is preferred whenever the getter returns a `Decimal` or an object rebuilt per call from non-stable parts. The getter stays the single source of truth for the math (Phase 4's consolidation is preserved); we only add subscriptions to its inputs.

---

## Phase 1: Fix Stale-Getter Renders (U-1)

### Overview
Make every component that displays store-derived data actually subscribe to the data driving it. No visual changes — only *when* components re-render changes.

### Changes Required:

#### 1. UpgradePanel
**File**: `src/components/ui/UpgradePanel.tsx` (lines 164-171)
**Changes**: 
- `getAvailableUpgrades()` / `getPurchasedUpgrades()` return arrays of stable upgrade-definition references → Pattern A (`useGameStoreShallow((s) => s.getAvailableUpgrades())`).
- `getClickMultiplier()` returns a Decimal → Pattern B: subscribe to `upgrades`, `achievements`, `prestige`, `ehCount` (check `productionSlice.getClickMultiplier` for the exact input list) and `useMemo` the call.

#### 2. App header badges
**File**: `src/App.tsx` (lines 122-126, 141-142)
**Changes**:
- Achievement badge: `const unlockedCount = useGameStore((s) => s.getUnlockedAchievements().length);` — primitive result, Pattern C.
- Rennet badge: `getPotentialRennet()` returns a Decimal; the badge only needs a display primitive. Subscribe to a primitive projection: `useGameStore((s) => s.getPotentialRennet().toNumber())` if only compared/displayed as a number, else Pattern B on `totalCurdsEarned` + `prestige`.
- Verify no other component was silently depending on App's badge-driven tree re-render (UpgradePanel was — fixed by change #1).

#### 3. CraftingPanel
**File**: `src/components/ui/CraftingPanel.tsx` (lines 15-23, 104)
**Changes**: All four getters return arrays → Pattern A for each. `getCaveAvailableSlots` (RecipesTab, line 104) takes an arg and returns a number → Pattern C.

#### 4. Hero multiplier displays
**Files**: `src/components/ui/HeroPanel.tsx` (290-296), `src/components/ui/PartyFormationPanel.tsx` (113-116)
**Changes**: `getHeroMultiplier()` returns a Decimal → Pattern B, subscribing to `heroes`, `party`, and synergy state (check `heroSlice.getHeroMultiplier` for exact inputs).

#### 5. Rennet/prestige displays
**Files**: `src/components/ui/RennetDisplay.tsx` (12-15), `src/components/ui/CurrencyDisplay.tsx` (26-30), `src/components/ui/AgingConfirmModal.tsx` (24), `src/components/ui/PrestigeStats.tsx` (22-23)
**Changes**: 
- `getPotentialRennet` → Pattern B on `totalCurdsEarned` + `prestige` (or primitive projection where display-only).
- `getPrestigeMultipliers` returns an object of Decimals → Pattern B on `prestige`.
- AgingConfirmModal and PrestigeStats also stop destructuring the whole store: replace `useGameStore()` with individual selectors for each field they actually read.

#### 6. FirstTimeHint
**File**: `src/components/ui/shared/FirstTimeHint.tsx` (34-37)
**Changes**: `const shouldShow = useGameStore((s) => !s.isHintShown(hintId));` (Pattern C). Keep `markHintShown` as a plain function selection (actions are stable; selecting them is correct).

#### 7. CaveCard store access
**File**: `src/components/ui/crafting/CaveCard.tsx` (line 74)
**Changes**: Replace whole-store destructure with individual selectors: `collectCheese`/`addInteraction` are actions (plain selection fine); `getJobProgress` is only called inside the interval callback — select it as a function deliberately, with a comment noting it reads fresh state via `get()` at call time.

### Success Criteria:

#### Automated Verification:
- [x] Type check + build passes: `pnpm build`
- [x] Lint passes: `pnpm lint`
- [x] No remaining select-then-call getter pattern in the touched files: `grep -n "useGameStore((s\(tate\)\?) => s\(tate\)\?\.get" src/components src/App.tsx` output reviewed — every hit is either inside a `useShallow`, returns a primitive, or is an interval/callback-only function selection with a comment

#### Manual Verification:
- [ ] Buy an upgrade → the Available/Owned lists and counts update immediately (previously only refreshed via App badge re-render)
- [ ] Cross an achievement threshold → header badge count updates without clicking anything else
- [ ] Recruit/level a hero → hero CPS multiplier text in HeroPanel and PartyFormationPanel updates immediately
- [ ] Earn curds past a rennet threshold → RennetDisplay and header rennet badge update while idle
- [ ] Collect a cheese / start a job → CraftingPanel tab counts update immediately

---

## Phase 2: Narrow Per-Frame Combat Subscriptions (U-2, C-15)

### Overview
Bound combat re-renders: per-frame renders only where per-frame data is displayed; ability buttons stop re-rendering 60×/sec; `getPartyStats` runs once per battle.

### Changes Required:

#### 1. HeroAbilityButton / LimitBreakButton battleResult subscriptions
**File**: `src/components/ui/HeroAbilityButton.tsx` (lines 15, 83)
**Changes**: Replace `const combat = useGameStore((state) => state.combat)` with `const battleResult = useGameStore((state) => state.combat.battleResult)` in both components. Update the `combat.battleResult !== 'ongoing'` reads accordingly.

#### 2. HeroAbilityPanel narrowed subscription
**File**: `src/components/ui/HeroAbilityButton.tsx` (line 134)
**Changes**: Replace whole-combat subscription with `useGameStoreShallow((s) => ({ heroStates: s.combat.heroStates, limitBreakGauge: s.combat.limitBreakGauge }))`. Note: `heroStates` identity changes per tick, so the panel still re-renders per frame — that is acceptable for this pass (it renders cooldown numbers). Additionally wrap `HeroAbilityButton` and `LimitBreakButton` in `React.memo` so per-frame panel renders don't cascade when their props (`hero`, cooldown values, `disabled`) are unchanged. Verify props passed to the memoized buttons are primitives or stable references; destructure needed scalars in the panel if not.

#### 3. CombatPanel split subscription
**File**: `src/components/ui/CombatPanel.tsx` (line 233)
**Changes**: Adopt `useCombatState()` from `src/utils/zustandOptimization.ts:40-49` for the low-frequency fields (`isInCombat`, `currentZone`, `currentStage`, `battleResult`, `combatSpeed`, `limitBreakGauge`). Subscribe to the per-frame fields (`heroStates`, `enemies`, `feedback`, `combatLog`) via a separate `useGameStoreShallow` call. CombatPanel itself still re-renders per frame (it renders ATB/HP bars), but child components receiving only stable fields stop re-rendering via memoized children where cheap wins exist. Do not restructure the component tree beyond what the narrowed subscriptions require.

#### 4. Snapshot party stats at battle start
**File**: `src/stores/slices/combat/combatSlice.ts` (lines ~77, 100)
**Changes**: 
- In `initializeCombat`, compute `const partyStats = get().getPartyStats()` once and store it on the combat state (add `partyStats: Record<string, HeroStats>` to the combat state type — it is not persisted; `saveSystem.ts:174-193` resets combat on load, so no migration needed).
- In `tickCombat` (line 100), read `state.combat.partyStats` instead of calling `state.getPartyStats()`.
- Add a comment stating the invariant: party composition/levels/equipment cannot change mid-battle (XP applies at `claimCombatRewards`), so the snapshot is safe. If any other per-tick call sites of `getPartyStats` exist in the combat path (`grep -n "getPartyStats" src/stores/slices/combat/`), point them at the snapshot too.

#### 5. Reconcile the zustandOptimization module
**File**: `src/utils/zustandOptimization.ts`
**Changes**: After steps 1-3: `useCombatState` is now live. Delete the still-dead helpers (`useCurrencyState`, `usePartyState`, `usePrestigeState`, `useCraftingCounts`, `createGameSelector`) unless Phase 1 adopted any — reconciliation ends in deletion, not coexistence (per the roadmap's Architecture Insights). Keep `useGameStoreShallow` and `useCombatState`.

### Success Criteria:

#### Automated Verification:
- [x] Type check + build passes: `pnpm build`
- [x] Lint passes: `pnpm lint`
- [x] No whole-combat subscriptions remain: `grep -rn "=> state.combat)" src/components/` returns nothing (all narrowed to fields or shallow objects)
- [x] `grep -n "getPartyStats" src/stores/slices/combat/combatSlice.ts` shows no call inside `tickCombat`

#### Manual Verification:
- [ ] Start a battle with React DevTools Profiler recording: `HeroAbilityButton` instances do NOT re-render on ATB-only frames (only when cooldowns/hp/battleResult change)
- [ ] Combat plays identically: abilities fire, limit break charges, victory/defeat flow unchanged
- [ ] ATB bars and HP bars still animate smoothly at 60fps
- [ ] Idle (non-combat) screens show no combat-driven re-renders in the Profiler

---

## Phase 3: Primitive Adoption Sweep (U-4)

### Overview
Make the shared primitives the single styling source for tabs, bars, modals, and panels. Extend primitives minimally where real usage needs a knob (size, z-level, dismissibility, transition), then migrate all hand-rolled duplicates.

### Changes Required:

#### 1. Extend TabButton with a size prop
**File**: `src/components/ui/shared/TabButton.tsx`
**Changes**: Add `size?: 'sm' | 'md'` (md = current `px-3 py-1.5 text-sm`, sm = `px-2 py-1.5 text-xs` to match CraftingPanel's tighter tabs).

#### 2. Migrate the 10 hand-rolled tab buttons
**Files**: `src/components/ui/UpgradePanel.tsx` (177-198, 219-240), `src/components/ui/HeroPanel.tsx` (345-367), `src/components/ui/PrestigePanel.tsx` (357-390), `src/components/ui/CraftingPanel.tsx` (51-61)
**Changes**: Replace each hand-rolled `<button>` with `<TabButton active={...} onClick={...} variant={...}>`, choosing the variant (`timber`/`amber`/`cheddar`) that matches each panel's current palette. Pixel-diff intent: active/inactive colors may shift within the same hue family to the primitive's canonical values — that is the point; flag any *hue* change for design review in the PR description.

#### 3. Extend ModalOverlay with z-level and dismissibility
**File**: `src/components/ui/shared/ModalOverlay.tsx`
**Changes**: 
- Add `zIndexClass?: string` (default `'z-50'`) so callers keep their documented hierarchy level (`index.css:99-116`).
- Add `dismissible?: boolean` (default `true`); when `false`, backdrop click does nothing and the focus trap's Escape handling passes a noop close (check `useFocusTrap`'s signature in `src/hooks/useFocusTrap.ts` and thread accordingly).
- Add optional `backdropClass?: string` (default current `bg-black/50 backdrop-blur-sm`) for the darker consent backdrops (`bg-black/70`).

#### 4. Migrate the 7 hand-rolled modals
**Files/levels**:
- `SettingsPanel.tsx:81-90` → `zIndexClass="z-100"`
- `BetaAgreement.tsx:34` → `zIndexClass="z-100"`, `dismissible={false}`
- `PrivacyConsent.tsx:55-61` → `zIndexClass="z-80"`, `dismissible={false}` (remove its bespoke Escape handler)
- `KeyboardHelpModal.tsx:59-68` → `zIndexClass="z-70"`
- `ChangelogModal.tsx:57-59` → `zIndexClass="z-70"`
- `CombatResultsModal.tsx:59` → `zIndexClass="z-60"` (victory/defeat modal: `dismissible={false}` — closing it must go through the Continue button so `endCombat`/`claimCombatRewards` run; note this interacts with the C-1 softlock fix from Phase 1 of the roadmap, already landed)
- `ChallengeIndicator.tsx:51-57` → default `z-50`
**Changes**: Each gains the focus trap and aria-modal semantics from `ModalOverlay` for free. Preserve each modal's inner panel markup unchanged.

#### 5. Extend ProgressBar for combat use
**File**: `src/components/ui/shared/ProgressBar.tsx`
**Changes**: Add `transitionClass?: string` (default current `transition-all duration-300`) so ATB bars can pass `transition-all duration-100 ease-linear`. Add `role="progressbar"` + `aria-valuenow/min/max` (the high-contrast CSS at `index.css:843-845` already targets `[role="progressbar"]`).

#### 6. Migrate the 7 hand-rolled bars
**Files**: `CombatATBBar.tsx:72-80,109-120` (ATB + limit break), `HeroPanel.tsx:84-89` (XP), `EnemyDisplay.tsx:117-130` (enemy HP), `CombatPanel.tsx:126-142` (hero HP), `ChallengeIndicator.tsx:76-84`, `ZoneSelectPanel.tsx:91-100`
**Changes**: Replace each with `<ProgressBar percent={...} height={...} fillColor={...gradient classes...} transitionClass={...}/>`. The HP bars' conditional gradient logic stays in the call site (computed `fillColor` string); only the bar shell/fill markup is replaced.

#### 7. Adopt PanelContainer
**Files**: `UpgradePanel.tsx:174`, `HeroPanel.tsx:324`, `GeneratorPanel.tsx:186`, `CraftingPanel.tsx:35`, `PrestigePanel.tsx:308`, `ZoneSelectPanel.tsx:189`, `CombatPanel.tsx:381,410`
**Changes**: Replace the duplicated `p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain` wrappers with `<PanelContainer className={...extras...}>`. CombatPanel's combat state passes its `relative`, focus-ring, and shake classes via `className`. (GeneratorPanel: wrapper div only — do not touch its selectors.)

#### 8. Kill the copy-pasted disabled combo
**Files**: the 14 sites listed in Current State (BetaAgreement:135, EquipmentModal:119,134, RecipeCard:230, GeneratorPanel:148, HeroPanel:156,270, CombatATBBar:130, PrestigePanel:433, ZoneSelectPanel:124,148, HeroAbilityButton:51,116, FeedbackWidget:245)
**Changes**: Where the element is a plain action button, migrate to `<Button>` with the `disabled` prop (its base styles carry the disabled treatment). Where migrating to `Button` would fight bespoke layouts (e.g., `HeroAbilityButton`'s dense grid buttons, ZoneSelectPanel's card buttons), extract one shared constant `DISABLED_BUTTON_CLASSES` exported from `src/components/ui/shared/Button.tsx` and reference it — one definition either way.

### Success Criteria:

#### Automated Verification:
- [x] Type check + build passes: `pnpm build`
- [x] Lint passes: `pnpm lint`
- [x] `grep -rn "cursor-not-allowed" src/components --include="*.tsx" | grep -v shared/` returns no raw copies (only primitive usages/`DISABLED_BUTTON_CLASSES` references; remaining hits are intentionally distinct styles: ZoneCard container, flee button's lighter gray, ability button's maple cooldown state)
- [x] `grep -rn "fixed inset-0" src/components/ui --include="*.tsx" | grep -v shared/ModalOverlay` returns no modal-backdrop duplicates (non-modal overlays like LoadingScreen may remain)

#### Manual Verification:
- [ ] Every migrated tab set (Upgrades, Heroes, Prestige, Crafting) looks equivalent and switches correctly
- [ ] Every migrated modal opens/closes correctly; Escape and backdrop-click close dismissible modals only; BetaAgreement/PrivacyConsent/CombatResultsModal cannot be dismissed except via their buttons
- [ ] Focus is trapped inside every migrated modal (Tab cycles within)
- [ ] ATB bars animate as smoothly as before (transition override works); HP bars keep their green→amber→red behavior
- [ ] All panels keep the wood-grain look; combat shake still works on the combat panel

---

## Phase 4: Semantic Color Tokens & Constants Consolidation (U-5)

### Overview
Give semantic state colors real tokens that high-contrast mode overrides by cascade; deduplicate hex literals; move behavior magic numbers into `data/constants.ts`.

### Changes Required:

#### 1. Root semantic tokens
**File**: `src/index.css` (`@theme` block, lines 3-78)
**Changes**: Add to `@theme`:
```css
/* Semantic state colors — .high-contrast overrides these (index.css high-contrast block) */
--color-success: #16a34a; /* green-600 */
--color-error:   #dc2626; /* red-600 */
--color-warning: #d97706; /* amber-600 */
```
Token names MUST match the `.high-contrast` block (`success`/`error`/`warning`, `index.css:786-792`) so its overrides cascade into the generated utilities. Tailwind v4 will generate `text-success`, `bg-error`, `border-warning`, etc.

#### 2. Migrate clear semantic usages
**Files**: `CombatLog.tsx:8-11,58-60` (entry colors; coordinates with Phase 5 heal fix), `CombatFeedback.tsx:47-49` (damage/heal text), `CombatPanel.tsx:118` + `EnemyDisplay.tsx:111` (HP threshold colors), `PrestigePanel.tsx:139` (requirement error text), `ZoneSelectPanel.tsx:147,204-205` (no-party warnings), `SettingsPanel.tsx:593` (import error text)
**Changes**: Swap `text-green-600` → `text-success`, `text-red-600` → `text-error`, `text-amber-600`/`text-yellow-*` → `text-warning` where the usage is a semantic state (success/failure/warning/heal/damage). Shade variants (e.g. `green-500` fills vs `green-600` text) map to the single token; if a migrated spot becomes visually too dark/light, keep the raw class and leave a `/* intentional shade */` comment rather than adding token variants in this pass.

#### 3. Hex-literal dedup
**Files**: `Layout.tsx:22`, `LoadingScreen.tsx:53`
**Changes**: Replace `#8b7355` in the inline radial-gradient strings with `var(--color-rind)` (inline styles resolve CSS variables).

**File**: NEW `src/components/game/sceneColors.ts`
**Changes**: Export a named `SCENE_COLORS` object for `GameScene.tsx:60-65,156-187` (sky gradient stops, mountains, pines, ground, aurora) — canvas/Three.js APIs can't read CSS variables, so these become named constants in one module with comments cross-referencing the matching tokens (`#f5e6d3` = timmys-cream, `#fcd34d` = cheddar-300, `#c9a875` = timber-300, `#8b7355` = rind). `GameScene.tsx` imports from it; no rendered color changes.

#### 4. Behavior constants to constants.ts
**File**: `src/data/constants.ts` + call sites
**Changes** (move verbatim, no value changes):
- From `gameLoop.ts:12,16`: `EVENT_CHECK_INTERVAL_MS`, `ACHIEVEMENT_CHECK_INTERVAL_MS` → "Game Loop" section.
- From `gameLoop.ts:49`: name the delta cap `MAX_TICK_DELTA_MS = 100` with a comment referencing the S-6 accumulate-before-clamp issue (behavior unchanged here).
- From `combatSlice.ts:41-53`: extract the feedback grid positions into a `COMBAT_FEEDBACK_GRID` const in constants.ts ("Combat UI" section) — hero/enemy column x-offsets, stagger, row heights.
- From `craftingSlice.ts:415-422`: `INTERACTION_LIMITS` → "Cheese Crafting" section. (Phase 4/K-3 reconciliation of interaction *rules* may relocate this later; a named export in constants.ts is strictly better than an inline literal today.)
- From `goldenCheeseSystem.ts:7-22`: all 13 spawn/duration/multiplier constants → new "Golden Cheese" section (roadmap P4.6 called for exactly this). Keep re-exports from `goldenCheeseSystem.ts` if other modules import them from there (`grep -rn "from.*goldenCheeseSystem" src/`).
- From `App.tsx:54-56`: `RANDOM_DIALOGUE_MIN_MS`, `RANDOM_DIALOGUE_MAX_MS`, `MILESTONE_CHECK_INTERVAL_MS` → "UI Timing" section.

### Success Criteria:

#### Automated Verification:
- [ ] Type check + build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] `grep -rn "8b7355" src/ --include="*.tsx" --include="*.ts" | grep -v index.css | grep -v sceneColors` returns nothing
- [ ] `grep -n "MIN_SPAWN_DELAY\|FRENZY\|TSUNAMI" src/data/constants.ts` shows the golden-cheese constants landed

#### Manual Verification:
- [ ] Normal mode: migrated text/fills look unchanged (same hues)
- [ ] High-contrast mode (Settings → accessibility): success/error/warning text now renders in the high-contrast palette (#006600/#cc0000/#996600) in the migrated spots — this is an *improvement* over before, where raw Tailwind classes ignored high-contrast
- [ ] Game scene (sky, mountains, ground, aurora) renders identically
- [ ] Golden cheese still spawns on the same cadence; dialogue bubbles still appear on the same cadence

---

## Phase 5: Small Fixes (U-6, U-7, C-14 subset)

### Overview
The remaining independent one-file fixes.

### Changes Required:

#### 1. Reduced-motion gate for ATB icon bounce
**File**: `src/components/ui/CombatATBBar.tsx` (line 52)
**Changes**: `${isReady ? 'animate-bounce' : ''}` → `${isReady && !reducedMotion ? 'animate-bounce' : ''}` (`reducedMotion` already subscribed at line 25). If Phase 3's ProgressBar migration restructured this block, apply the gate wherever the icon landed.

#### 2. CombatLog fixes
**File**: `src/components/ui/CombatLog.tsx`
**Changes**:
- Lines 124, 154: `key={entry.timestamp}` → `key={`${entry.timestamp}-${index}`}` in both `CombatLog` and `CompactCombatLog`. (Entries are append-only within a battle and the list is cleared between battles, so index-composite keys are stable here.)
- Lines 58-60: heal entries render green with `+`: `` <span className={`shrink-0 font-bold ${entry.type === 'heal' ? 'text-success' : 'text-error'}`}>{entry.type === 'heal' ? '+' : '-'}{entry.value}</span> `` (uses Phase 4 tokens; if Phase 4 hasn't landed, use `text-green-600`/`text-red-600` and let Phase 4 migrate).
- Lines 88-89: make code match the comment: `const newEntryThreshold = Math.max(0, entries.length - 3);` (the "last 3 entries" comment states the intent; the highlight animation was designed for the recent batch, not a single line).

#### 3. Status-effect ID collisions
**File**: `src/systems/combatEngine.ts` (lines 740, 771, 829)
**Changes**: Append the target's identity to each generated ID, matching the existing correct pattern at line 856: `` id: `${effect.stat}_buff_${Date.now()}_${ally.heroId}` `` (and equivalently for debuffs with the enemy's instance id and for immunity effects). Confirm nothing parses these IDs structurally (`grep -rn "_buff_" src/ --include="*.ts"`) — they are used as unique keys only.

#### 4. Shared useNow hook
**File**: NEW `src/hooks/useNow.ts`
**Changes**:
```typescript
/** Returns a timestamp refreshed every `intervalMs` (default 1000). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```
Adopt in `ActiveBuffsBar.tsx:7-16` (replaces its interval wholesale) and `CaveCard.tsx:80-92` (replaces the `currentTime` half; the `setProgress(getJobProgress(job.id))` refresh keeps its own effect keyed on `now`, or computes progress in render from `now` — keep whichever reads cleaner without changing the 1s cadence or the `isComplete` early-exit).

#### 5. HeroRecruitCard narrow selectors
**File**: `src/components/ui/HeroPanel.tsx` (line 174)
**Changes**: Replace `const { recruitHero, canAffordHero } = useGameStore();` with individual selectors. Note `canAffordHero` is a getter whose result depends on `curds` — the card's affordability display needs a real subscription: `const canAfford = useGameStore((s) => s.canAffordHero(hero.id));` (primitive boolean, Pattern C), plus `const recruitHero = useGameStore((s) => s.recruitHero);`.

#### 6. Analytics listener hygiene
**File**: `src/systems/analyticsService.ts` (lines 62-68)
**Changes**: Bind the two handlers to named instance fields (`this.handleBeforeUnload`, `this.handleVisibilityChange`), register those, and add a `destroy()` method that removes them. No caller changes required (singleton lifetime unchanged); this makes teardown possible and the handler identity explicit.

#### 7. StrictMode-safe app initialization
**File**: `src/App.tsx` (lines 164-179)
**Changes**: Move the side effects (`initializeSettingsAudio()`, `load()`, `analytics.startSession(...)`) out of the `useState` initializer into a mount effect guarded against double-invocation:
```typescript
const [loadState, setLoadState] = useState<{ isLoaded: boolean; offlineProgress: OfflineProgress | null }>({ isLoaded: false, offlineProgress: null });
const didInit = useRef(false);
useEffect(() => {
  if (didInit.current) return;
  didInit.current = true;
  initializeSettingsAudio();
  const progress = load();
  analytics.startSession(progress !== null, progress?.secondsAway ? progress.secondsAway * 1000 : undefined);
  setLoadState({ isLoaded: true, offlineProgress: progress && progress.secondsAway > 0 ? progress : null });
}, []);
```
Verify the brief `isLoaded: false` first paint renders the existing loading state (LoadingScreen) rather than a flash of empty UI; if App already branches on `isLoaded`, this is automatic.

### Success Criteria:

#### Automated Verification:
- [ ] Type check + build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] `grep -n "key={entry.timestamp}" src/components/ui/CombatLog.tsx` returns nothing
- [ ] `grep -rn "setInterval" src/components/ui/crafting/` shows no bespoke 1s clocks (only `useNow` usage)

#### Manual Verification:
- [ ] No duplicate-key warnings in the console during a multi-target ability battle
- [ ] A healer's heal shows green `+N` in the combat log; damage still shows red `-N`
- [ ] With reduced motion ON, the ATB ready icon does not bounce
- [ ] Buff countdown timers in ActiveBuffsBar and CaveCard still tick once per second
- [ ] Dev server with StrictMode: exactly one "session start" analytics event on load (check the analytics debug output/network); game loads with saved state and offline progress modal still appears when due
- [ ] Casting an all-ally buff applies a working effect to every ally (inspect state: each ally's status effect has a distinct id)

---

## Testing Strategy

### Unit Tests:
No test framework exists in this project (no vitest/jest in package.json); this plan does not introduce one. Verification is compile + lint + targeted greps + manual passes per phase.

### Manual Testing Steps:
1. **Stale-getter regression pass (after Phase 1)**: With the game idle (no clicking), watch the header badges and panel counts as CPS accrues past achievement/rennet thresholds — everything must update without interaction.
2. **Combat perf pass (after Phase 2)**: React DevTools Profiler during a full battle; confirm ability buttons render only on turn-level changes; confirm no jank regression in ATB animation.
3. **Visual sweep (after Phases 3-4)**: Walk every tab (Generators, Upgrades, Heroes, Combat, Crafting, Prestige, Achievements), open every modal, in normal + high-contrast + reduced-motion modes. Compare against `main` side-by-side for unintended visual drift.
4. **Full loop smoke (after Phase 5)**: Fresh save → click → buy generators → recruit hero → win a battle → craft a cheese → age → reload page. No console errors/warnings throughout.

## Performance Considerations

- Phase 2 is a pure win: fewer components re-render per frame and `getPartyStats` drops from ~60 calls/sec to 1 per battle.
- Phase 1 slightly *increases* re-render frequency for previously-stale components (they now update when they should). `UpgradePanel`'s availability recompute runs on `upgrades`/`generators` changes — infrequent user actions, negligible cost.
- Pattern A selectors (`useShallow` over getter results) execute the getter on every store notification to compare. For the array getters used here (filters over ≤48-item catalogs) this is cheap at the 10Hz game tick. Do NOT use Pattern A for anything called in the 60fps combat path.

## Migration Notes

- No save-format changes. `combat.partyStats` (Phase 2.4) is never serialized — `saveSystem.ts` resets combat on load.
- Pre-flight commit of the 6 dirty reduced-motion files must happen first; Phases 3 and 5 edit five of those files.
- Each phase should land as its own commit (or PR) in order 1→5; Phase 5 item 2 (CombatLog heal colors) references Phase 4's tokens but has a stated fallback if phases land out of order.

## References

- Roadmap source: `thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md` — §7 (Store & UI Brittleness, U-1..U-7), §1 C-14/C-15, §Phased Roadmap Phase 5
- Sanctioned selector utilities: `src/utils/zustandOptimization.ts`
- Shared primitives: `src/components/ui/shared/` (`Button.tsx`, `ProgressBar.tsx`, `TabButton.tsx`, `ModalOverlay.tsx`, `PanelContainer.tsx`)
- Z-index hierarchy: `src/index.css:99-116`; high-contrast tokens: `src/index.css:786-792`
- Correct narrow-selector precedent: `src/components/ui/GeneratorPanel.tsx` (PR #45), `CurrencyDisplay.tsx`, `CpsBreakdownPanel.tsx`
- Correct status-effect ID precedent: `src/systems/combatEngine.ts:856`
