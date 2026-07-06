---
date: 2026-07-06T09:30:00-07:00
researcher: Claude
git_commit: cb6ae0cbdaf91a08f7bd624dd3c5531fd85e3c54
branch: main
repository: simyl
topic: "Tutorial and Story Revelation System Audit"
tags: [research, onboarding, tutorial, story, progressive-unlock]
status: complete
last_updated: 2026-07-06
last_updated_by: Claude
---

# Research: Tutorial and Story Revelation System Audit

**Date**: 2026-07-06T09:30:00-07:00
**Researcher**: Claude
**Git Commit**: cb6ae0cbdaf91a08f7bd624dd3c5531fd85e3c54
**Branch**: main
**Repository**: simyl

## Research Question

What happened to the initial tutorial and explanation of the interface to new users? The idea was to have a gradual tutorial (and revelation of the story) when users play and new elements become available (including party, battle, and crafting concepts).

## Summary

**A full tutorial and story revelation system was never implemented.** What exists is a minimal "progressive onboarding" system added in PR #42 (2026-06-12). The plan explicitly scoped out a scripted tutorial flow and story/narrative system:

1. **What was built**: Progressive unlock of tabs + 4 dismissible first-time hints
2. **What was explicitly NOT built**: Scripted tutorial sequences, video intro, story revelation, mascot/narrator
3. **Key gap found**: The `firstClick` hint was defined but never wired up to the cheese wheel
4. **No story system**: No narrative, lore progression, or mascot/narrator exists anywhere in the codebase

## Detailed Findings

### What Currently Exists

#### Progressive Unlock System (Working)
- [constants.ts:188-196](src/data/constants.ts#L188-L196) — Unlock thresholds: upgrades (0), achievements (100), combat (1K), heroes (10K), crafting (100K), prestige (1T curds)
- [unlockSlice.ts](src/stores/slices/unlock/unlockSlice.ts) — `checkUnlocks()` runs each tick, emits `FeatureUnlocked` domain event
- [useUnlockedTabs.ts](src/hooks/useUnlockedTabs.ts) — Hook that gates tab visibility

#### First-Time Hint System (Partially Working)
- [FirstTimeHint.tsx](src/components/ui/shared/FirstTimeHint.tsx) — Dismissible tooltip component with 5 defined hints
- **Hints that ARE wired up:**
  - `firstGenerator` — [GeneratorPanel.tsx:230](src/components/ui/GeneratorPanel.tsx#L230)
  - `firstCombat` — [ZoneSelectPanel.tsx:279](src/components/ui/ZoneSelectPanel.tsx#L279)
  - `firstPrestige` — [PrestigePanel.tsx:365](src/components/ui/PrestigePanel.tsx#L365)
- **Hints that ARE NOT wired up:**
  - `firstClick` — Defined in [FirstTimeHint.tsx:11-14](src/components/ui/shared/FirstTimeHint.tsx#L11-L14) but never used
  - `firstCraft` — Defined in [FirstTimeHint.tsx:27-30](src/components/ui/shared/FirstTimeHint.tsx#L27-L30) but never used

#### Other Teaching Surfaces
- [loadingTips.ts](src/data/loadingTips.ts) — 57 tips shown during loading screen (categories: gameplay, canadian_facts, humor, strategy)
- [HelpModal.tsx](src/components/ui/HelpModal.tsx) — Game guide modal accessible via `?` key
- [BetaAgreement.tsx](src/components/ui/BetaAgreement.tsx) — First-visit gate (not tutorial-related)

### What Was Explicitly Scoped Out

From [tier3-onboarding-progressive-unlock.md](thoughts/shared/plans/implemented/tier3-onboarding-progressive-unlock.md), section "What We're NOT Doing":

> - Full tutorial system with scripted sequences (the A/B `video_intro` variant)
> - Forced tutorial that blocks gameplay

The A/B testing stub at [abTesting.ts:23-31](src/systems/abTesting.ts) contains commented-out code for `onboarding_flow` with variants `['control', 'tutorial_tips', 'video_intro']` — this was a placeholder that was never implemented.

### Story/Narrative System

**Does not exist.** Grep for `story`, `narrator`, `mascot`, `lore`, `narrative` found:
- Only flavor text in enemy descriptions and zone flavor
- An enemy ability called `story_twist` in [enemies.ts:2758](src/data/enemies.ts#L2758)
- No progressive story revelation, no mascot character, no narrator system

### Git History Confirmation

- **Initial commit (f434509, 2026-01-29)**: Only A/B stub references to tutorial
- **Onboarding PR (#42, 6d96bbb, 2026-06-12)**: Added current progressive unlock + hint system
- **No deleted files**: No tutorial or story files were ever created and later deleted

## Code References

- `src/data/constants.ts:188-196` — UNLOCK_THRESHOLDS definition
- `src/stores/slices/unlock/unlockSlice.ts` — Unlock state and actions
- `src/components/ui/shared/FirstTimeHint.tsx` — Hint component with 5 hints (only 3 wired)
- `src/components/ui/GeneratorPanel.tsx:230` — firstGenerator hint usage
- `src/components/ui/ZoneSelectPanel.tsx:279` — firstCombat hint usage
- `src/components/ui/PrestigePanel.tsx:365` — firstPrestige hint usage
- `src/types/game.ts:13-17` — HintId type definition
- `src/systems/abTesting.ts:23-31` — Commented-out tutorial A/B stub

## Architecture Insights

The current system is designed for **discovery through play**, not guided instruction:

1. **Tab gating** — Features appear when thresholds are met (automatic, no instruction)
2. **Generator reveal** — Shows ~2 generators ahead of affordable (anticipation)
3. **First-time hints** — Brief tooltips, one per system, dismissible
4. **Help modal** — Player-initiated reference, not proactive teaching

There is no infrastructure for:
- Sequential tutorial steps
- Story/narrative progression
- Character/mascot dialogue
- Achievement-gated lore reveals
- "What's new" system when features unlock

## Gaps to Address

### Immediate (Low Effort)
1. Wire up `firstClick` hint to cheese wheel in [GameScene.tsx](src/components/game/GameScene.tsx) or [CheeseWheel.tsx](src/components/game/CheeseWheel.tsx)
2. Wire up `firstCraft` hint to crafting panel

### Medium Effort (New Features Required)
3. Add "What's New" toasts when features unlock (beyond current notification)
4. Add contextual explanation when Combat/Heroes/Crafting tabs first open

### Large Effort (New Systems Required)
5. Story revelation system with progressive lore unlocks
6. Mascot/narrator character for guided tutorial
7. Achievement-gated story chapters
8. Zone completion → lore reveal pattern

## Historical Context (from thoughts/)

- [tier3-onboarding-progressive-unlock.md](thoughts/shared/plans/implemented/tier3-onboarding-progressive-unlock.md) — The implemented onboarding plan (explicitly scoped out full tutorial)
- [2026-06-12_14-19-23_world-class-polish-roadmap.md](thoughts/shared/research/implemented/2026-06-12_14-19-23_world-class-polish-roadmap.md) — Identified "Zero onboarding" as gap #2

## Open Questions

1. **Design decision**: Should we implement a scripted tutorial, or enhance the existing discovery-based system?
2. **Story scope**: What story is there to tell? The Canadian cheese theme has flavor but no explicit narrative arc defined.
3. **Character**: Should there be a mascot (e.g., a beaver, a moose, a cheese wheel with a face) to guide players?
4. **Technical**: Should hints be modal (blocking) or floating (current approach)?
