---
date: 2026-06-10T23:22:43Z
researcher: Claude
git_commit: d94fafaeff0824026b6f207eb8ed3dd01690e6db
branch: main
repository: game
topic: "How to Make the Game More Fun - State of the Art Clicker Game Analysis"
tags: [research, game-design, engagement, clicker-games, idle-games, psychology, state-of-the-art]
status: complete
last_updated: 2026-06-10
last_updated_by: Claude
---

# Research: How to Make the Game More Fun - State of the Art Clicker Game Analysis

**Date**: 2026-06-10T23:22:43Z
**Researcher**: Claude
**Git Commit**: d94fafaeff0824026b6f207eb8ed3dd01690e6db
**Branch**: main
**Repository**: game

## Research Question

How can we make The Great Canadian Cheese Quest more fun? What does state of the art look like in clicker games?

## Summary

This analysis compares the current game implementation against industry best practices and state-of-the-art clicker/idle game design. Findings are organized into **three tiers** by impact and implementation complexity. The game has strong foundations (15 generators, 3-tier prestige, ATB combat, crafting, achievements) but is missing several high-impact engagement mechanics that define modern clicker games.

**Critical Gap**: The game has **zero stochastic reward events** — entirely predictable gameplay. This is the single biggest opportunity for improvement.

---

## Tier 1: High Impact, Ready to Implement

These features have the highest engagement ROI and existing plans/specifications ready for implementation.

### 1.1 Golden Cheese Events (Variable Ratio Reinforcement)

**State of the Art**: Cookie Clicker's Golden Cookies are the gold standard — random clickable objects spawn every 3-10 minutes, grant powerful temporary bonuses, and create what psychologists call "variable ratio reinforcement" (the slot machine principle). This is the #1 engagement driver in successful clicker games.

**Current State**: ❌ NOT IMPLEMENTED. The game is entirely predictable with no random reward moments.

**Plan Exists**: `thoughts/shared/plans/golden-cheese-events.md` has a complete 4-phase specification:

| Event | Weight | Effect |
|-------|--------|--------|
| Cheese Frenzy | 40% | 7x CPS for 77 seconds |
| Lucky Curds | 25% | Instant 15 min CPS grant |
| Click Storm | 15% | 77x click value for 13 seconds |
| Rare Ingredient | 10% | Free legendary crafting ingredient |
| Hero Rally | 7% | 5x XP for 60 seconds |
| Curd Tsunami | 3% | 777x CPS for 7 seconds |

**Why It Works**: Variable ratio reinforcement creates anticipation-resistant-to-extinction behavior. Players keep the tab visible hoping for the next spawn. The unpredictability triggers dopamine responses similar to how slot machines maintain engagement.

**Implementation Complexity**: Medium — needs visual component, state management, timer system, reward application.

**Priority**: 🔴 CRITICAL — This is the single highest-impact missing feature.

---

### 1.2 Generator Milestone Multipliers (Bumpy Progression Curve)

**State of the Art**: Modern idle games use "milestone spikes" — dramatic multiplier jumps at specific ownership thresholds — to create the "just 3 more" hook. Realm Grinder, NGU Idle, and Antimatter Dimensions all use this pattern.

**Current State**: ❌ NOT IMPLEMENTED. All 15 generators use identical `costMultiplier: 1.15` with copy-paste "2x at 10/25/50" upgrades. Progression feels linear and predictable.

**Proposed Specification** (from existing research):

| Milestone | Multiplier | Cumulative |
|-----------|-----------|------------|
| 25 owned | x2 | 2x |
| 50 owned | x2 | 4x |
| 100 owned | x3 | 12x |
| 150 owned | x2 | 24x |
| 200 owned | x4 | 96x |
| 250 owned | x2 | 192x |
| 300 owned | x5 | 960x |
| 400 owned | x10 | 9,600x |
| 500 owned | x100 | 960,000x |

**Why It Works**: Creates visible goals that constantly pull players forward. Prevents the "mid-game slog" where progress feels meaningless. The dramatic 500-owned milestone (960,000x) creates a satisfying long-term target.

**Implementation Complexity**: Low-Medium — modify `generators.ts`, add milestone UI indicators, integrate with CPS calculation.

**Priority**: 🟠 HIGH — Solves mid-game pacing issues with relatively low effort.

---

### 1.3 Fix Offline Progression Mechanics

**State of the Art**: Best-in-class games (Clicker Heroes, AdVenture Capitalist, Realm Grinder) simulate idle runs accounting for all active effects, not just base CPS. Some add "catch-up bonuses" or "welcome back" rewards to make returning feel exciting.

**Current State**: ⚠️ PARTIAL — Offline progress exists but has bugs:
- `saveSystem.ts:142-157` re-derives CPS omitting Eh multiplier
- Crafting time doesn't progress offline
- No "welcome back" celebration or catch-up bonus

**Improvements Needed**:
1. Fix Eh multiplier in offline CPS calculation
2. Add crafting slot progress during offline time
3. Add "Welcome Back" modal showing time away + earnings with satisfying animation
4. Consider adding small catch-up multiplier (1.1x for first 10 minutes of offline earnings)

**Why It Works**: Creates "lost opportunity" feeling when limit is reached, driving players to check back. Welcome back celebrations create positive associations with returning.

**Implementation Complexity**: Low — mostly fixes to existing systems plus UI polish.

**Priority**: 🟠 HIGH — Retention driver, fixes existing bugs.

---

## Tier 2: High Impact, Requires Design Work

These features are proven engagement drivers but need additional design work before implementation.

### 2.1 Cross-System Synergy Upgrades

**State of the Art**: Realm Grinder's faction system, Antimatter Dimensions' reality glyphs, and NGU Idle's quirks all create meaningful interactions between previously isolated systems. This transforms "5 separate games" into "1 interconnected system."

**Current State**: ❌ NOT IMPLEMENTED. The 5 game systems (generators, upgrades, heroes, combat, crafting) operate in complete silos with no meaningful interactions.

**Proposed Synergy Examples** (from existing research):

| Synergy | Effect | Systems Connected |
|---------|--------|-------------------|
| Cheese-Fueled Warriors | Cheese buffs grant +25% combat damage | Crafting ↔ Combat |
| Battle-Hardened Vats | Each zone completed gives +5% to one generator | Combat ↔ Production |
| Fromage Affinity | Hero cheese affinity reduces crafting time | Heroes ↔ Crafting |
| Artisan's Inspiration | Legendary cheese has 10% chance for free prestige point | Crafting ↔ Prestige |
| Combat Harmony | Full party formation bonus increases to +25% CPS | Combat ↔ Production |
| Provincial Pride | Clearing province boss unlocks province-specific generator bonus | Combat ↔ Production |
| The Canadian Way | Every 100 Eh count grants +2% CPS | Eh System ↔ Production |
| Vintage Cellar Master | Cheese quality bonuses doubled in first hour after prestige | Crafting ↔ Prestige |

**Why It Works**: Creates meaningful build choices, makes systems feel interconnected, gives whey currency purpose, rewards engagement with all systems rather than just one.

**Implementation Complexity**: High — touches all 5 systems, requires careful balance testing.

**Prerequisite**: Fix Eh bonus bug, consolidate CPS calculation pipeline first.

**Priority**: 🟡 MEDIUM-HIGH — Adds depth but requires significant cross-cutting work.

---

### 2.2 Layered Meta-Progression (Beyond Current Prestige)

**State of the Art**: Top idle games in 2026 have 3-5+ prestige layers, each with distinct currencies and mechanics:
- **Antimatter Dimensions**: Infinity → Eternity → Reality → Celestials
- **Revolution Idle**: Ascension → Prestige → Promotion (permanent)
- **Leaf Blower Revolution**: Multiple meta-currencies with readable progression

The current game has Aging → Vintage → Legacy but Vintage/Legacy are stubs.

**Current State**: ⚠️ PARTIAL — Three tiers defined but only Aging is functional:
- Aging: Works, grants Rennet
- Vintage: Unlock condition exists but rewards minimal
- Legacy: Unlock condition exists but rewards minimal

**Improvements Needed**:
1. Make Vintage feel dramatically different (not just bigger numbers)
2. Add Vintage-specific upgrades/mechanics (e.g., unlock new generator tier, new zones)
3. Make Legacy provide permanent unlocks (new game modes, cosmetics, mechanics)
4. Add "permanent" unlock tier beyond all resets (like Revolution Idle's Promotion)

**Why It Works**: "When should I reset?" transforms passive play into active optimization. Multiple layers extend playtime dramatically while keeping each cycle fresh.

**Implementation Complexity**: High — significant new content and balance work.

**Priority**: 🟡 MEDIUM — Important for long-term retention but Tier 1 items more urgent.

---

### 2.3 Combat Strategic Depth

**State of the Art**: Crusaders of the Lost Idols combines idle mechanics with tactical formation strategy. Players manage hero positioning for synergies. Mythic Heroes offers both idle auto-battle and active 5v5 arenas.

**Current State**: ⚠️ BASIC — ATB combat works but has issues:
- Known bug: Enemies always use `availableAbilities[0]`, boss phase abilities never trigger
- Formation bonuses exist but are minimal (+5-10%)
- Combat feels more like watching than playing

**Improvements Needed**:
1. Fix enemy ability selection (use `Enemy.selectAbility` logic)
2. Add formation synergy bonuses (specific hero combinations grant bonuses)
3. Add "active ability" option for player to trigger hero abilities manually
4. Add boss mechanics that require player response (interrupt windows, damage phases)
5. Consider adding player-designable auto-battle rules (attack priority, ability usage conditions)

**Why It Works**: Shifts gameplay from watching to strategic management. Manual skill activation creates burst moments without abandoning idle design.

**Implementation Complexity**: Medium-High — combat engine changes, UI for manual abilities.

**Priority**: 🟡 MEDIUM — Combat is a differentiator but core loop matters more.

---

## Tier 3: Polish & Long-Term Engagement

These features add polish and support long-term engagement but are lower priority than Tier 1-2.

### 3.1 Social Features & Competition

**State of the Art**: Leaderboards, multiplayer elements, friend challenges, guilds. Social competition drives players to keep playing to climb ranks.

**Current State**: ❌ NOT IMPLEMENTED — Single player only.

**Potential Features**:
- Global/friend leaderboards (total curds, fastest prestige, combat achievements)
- Weekly challenges with rewards
- "Share your run" screenshot/summary feature

**Why It Works**: Social comparison triggers competitive engagement. Leaderboards create extrinsic motivation alongside intrinsic progress.

**Implementation Complexity**: High — requires backend infrastructure.

**Priority**: 🟢 LOW for core fun, HIGH if targeting multiplayer/viral growth.

---

### 3.2 Dynamic Events & Content Rotation

**State of the Art**: Limited-time events, rotating challenges, seasonal content create urgency and freshness.

**Current State**: ⚠️ BASIC — 4 seasonal events exist (Canada Day, Poutine Week, Hockey Season, Winterlude) but:
- Bug: `checkEventActivation` only called on load after no-save early-return — fresh games never activate events
- Events never auto-deactivate
- No rotating challenges or limited-time content

**Improvements Needed**:
1. Fix event activation bug
2. Add auto-deactivation when event period ends
3. Add weekly rotating "challenge" mode (e.g., "Hardcore Monday" - no prestige bonuses)
4. Add limited-time exclusive rewards during events

**Why It Works**: Creates FOMO (fear of missing out), drives regular check-ins, keeps content fresh.

**Implementation Complexity**: Medium — event system exists, needs fixes and expansion.

**Priority**: 🟢 LOW-MEDIUM — Polish, but Tier 1 items more impactful.

---

### 3.3 Achievement Depth & Meta-Achievements

**State of the Art**: Layered achievement systems with "meta-achievements" (achievements for achievements), secret achievements, and achievement-based unlocks.

**Current State**: ✅ SOLID — ~40+ achievements with permanent multiplier rewards.

**Improvements**:
- Add secret/hidden achievements for discovery
- Add meta-achievements ("Complete 10 achievements" → unlock special bonus)
- Add achievement tiers (Bronze/Silver/Gold versions)
- Add achievement-gated content (special heroes, zones, recipes)

**Why It Works**: Creates discovery moments, rewards exploration, extends content.

**Implementation Complexity**: Low-Medium — achievement system exists, add content.

**Priority**: 🟢 LOW — System works, improvements are polish.

---

### 3.4 Quality-of-Life & Accessibility

**State of the Art**: Time-to-afford calculators, contribution breakdowns, scientific notation options, keyboard shortcuts, accessibility compliance.

**Current State**: ⚠️ PARTIAL — Per UX research:
- Missing: time-to-afford calculator
- Missing: contribution breakdown (what's producing how much)
- Missing: keyboard shortcuts for common actions
- Some accessibility gaps (modal focus management)

**Improvements Needed**:
1. Add time-to-afford display for generators/upgrades
2. Add CPS breakdown panel showing each source's contribution
3. Add keyboard shortcuts (1-9 for generators, space for click, etc.)
4. Fix remaining accessibility issues

**Why It Works**: Reduces friction, helps optimization-minded players, improves accessibility.

**Implementation Complexity**: Low-Medium — UI additions, no core mechanics changes.

**Priority**: 🟢 LOW — Quality of life, not engagement driver.

---

## State of the Art Summary: What Top Games Do

| Feature | Cookie Clicker | Realm Grinder | Antimatter Dimensions | Clicker Heroes | This Game |
|---------|---------------|---------------|----------------------|----------------|-----------|
| Random Reward Events | ✅ Golden Cookies | ✅ Random bonuses | ✅ Various | ✅ Clickables | ❌ None |
| Milestone Multipliers | ✅ | ✅ | ✅ | ✅ | ❌ |
| Prestige Layers | ✅ 1 layer | ✅ 3+ layers | ✅ 4+ layers | ✅ 2 layers | ⚠️ 1 working |
| System Synergies | ⚠️ Basic | ✅ Factions | ✅ Glyphs | ⚠️ Basic | ❌ None |
| Offline Progression | ✅ | ✅ | ✅ | ✅ | ⚠️ Buggy |
| Combat/RPG Elements | ❌ | ❌ | ❌ | ✅ ATB | ✅ ATB |
| Social Features | ❌ | ⚠️ Basic | ❌ | ❌ | ❌ |
| Crafting | ❌ | ❌ | ❌ | ❌ | ✅ |

**This game's unique differentiators**: ATB combat with heroes, crafting system, Canadian theme. These are rare in the genre and should be leveraged.

---

## Recommended Implementation Order

Based on impact/effort analysis:

### Phase 1: Quick Wins (1-2 weeks)
1. **Golden Cheese Events** — Plan exists, highest engagement ROI
2. **Fix Offline Progression** — Bug fixes + welcome back modal
3. **Fix Event Activation** — Bug fix

### Phase 2: Core Engagement (2-4 weeks)
4. **Generator Milestone Multipliers** — Solves mid-game pacing
5. **Fix Combat AI** — Enemy ability selection bug

### Phase 3: Depth (4-8 weeks)
6. **Cross-System Synergies** — Requires CPS consolidation first
7. **Vintage/Legacy Prestige Expansion** — New content + balance
8. **Combat Strategic Depth** — Manual abilities, formation synergies

### Phase 4: Polish (Ongoing)
9. Quality-of-life improvements
10. Achievement expansion
11. Dynamic events expansion

---

## Code References

- [generators.ts](src/data/generators.ts) - Generator definitions, milestone multipliers would go here
- [productionSlice.ts](src/stores/slices/production/productionSlice.ts) - Core production loop
- [cpsCalculator.ts](src/stores/slices/production/cpsCalculator.ts) - CPS pipeline (consolidation needed)
- [prestigeSlice.ts](src/stores/slices/prestige/prestigeSlice.ts) - Prestige system (Vintage/Legacy stubs)
- [combatEngine.ts](src/systems/combatEngine.ts) - Combat system (enemy AI bug at lines 796-798)
- [eventSlice.ts](src/stores/slices/events/eventSlice.ts) - Event activation bug (line 66)
- [saveSystem.ts](src/systems/saveSystem.ts) - Offline progression (Eh omission at lines 142-157)
- [constants.ts](src/data/constants.ts) - Balance constants

---

## Historical Context

- `thoughts/shared/research/2026-02-28_3-ways-to-make-the-game-more-fun.md` — Original research proposing Golden Cheese Events, Milestone Multipliers, and Synergy Upgrades. None implemented.
- `thoughts/shared/plans/golden-cheese-events.md` — Complete 4-phase implementation plan ready for development.
- `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md` — DDD roadmap addressing code quality issues that should be considered alongside feature work.

---

## Psychology of Fun: Key Principles

From the research, the core psychological drivers in successful clicker games:

1. **Variable Ratio Reinforcement** — Random rewards at unpredictable intervals (Golden Cheese Events)
2. **Visible Goals** — Always know what you're working toward (Milestone Multipliers)
3. **Progress Sensation** — Constant feeling of advancement (Number animations, celebrations)
4. **Offline FOMO** — Fear of missing accumulated rewards drives return (Offline progression limits)
5. **Optimization Puzzle** — "When should I prestige?" turns passive into active (Layered prestige)
6. **System Mastery** — Understanding interconnected systems (Synergies)
7. **Social Comparison** — Leaderboards, sharing (Future consideration)

The game currently has #3 and partially #5. Adding #1, #2, and #6 would dramatically improve engagement.

---

## Open Questions

1. Should Golden Cheese Events interact with synergies? (e.g., Synergy that increases spawn rate)
2. What's the right balance for milestone multipliers to avoid trivializing late game?
3. Should Vintage/Legacy unlock entirely new mechanics vs. just bigger numbers?
4. Is social/multiplayer in scope for this project?

---

## Sources

### Web Research
- [The Psychology Behind Idle Game Addictiveness – Artifex Terra](https://artifexterra.com/the-psychology-behind-idle-game-addictiveness/)
- [Idle Games Best Practices: Design and Strategy - GridInc Blog](https://gridinc.co.za/blog/idle-games-best-practices)
- [Idle Game Design: Systems, Mechanics, and Progression | Missions Zanx Online](https://missionszanx.com/guides/idle-game-design-systems-mechanics-and-progression)
- [Progression and Scaling in Incremental Games | Missions Zanx Online](https://missionszanx.com/guides/progression-and-scaling-in-incremental-games)
- [Best Idle Game in 2026 - Clicker Heroes Blogs](https://blog.clickerheroes.com/best-idle-game-2025/)
- [When To Ascend, Prestige, Or Promote In Revolution Idle - GameRant](https://gamerant.com/revolution-idle-ascension-prestige-promotion-guide/)
- [How Automatic Combat Works in Idle RPGs | Missions Zanx Online](https://missionszanx.com/guides/how-automatic-combat-works-in-idle-rpgs)
- [Offline Progression in Clicker Heroes - Clicker Heroes Blogs](https://blog.clickerheroes.com/offline-progression-in-clicker-heroes/)
- [Wikipedia: Incremental game](https://en.wikipedia.org/wiki/Incremental_game)
