---
date: 2026-06-09T14:45:00-0400
researcher: Claude
git_commit: 49eec115e69cfacee60c7d38d0338f6c6a1180bc
branch: phase6-domain-events-boundaries
repository: game
topic: "UX Display Issues, Contrast, React Hygiene, and Delight Opportunities"
tags: [research, codebase, ux, accessibility, contrast, react, animation, delight]
status: complete
last_updated: 2026-06-09
last_updated_by: Claude
---

# Research: UX Display Issues, Contrast, React Hygiene, and Delight Opportunities

**Date**: 2026-06-09T14:45:00-0400
**Researcher**: Claude
**Git Commit**: 49eec115e69cfacee60c7d38d0338f6c6a1180bc
**Branch**: phase6-domain-events-boundaries
**Repository**: game

## Research Question

Review the UX for potential display issues, contrast issues, and React hygiene. Find ways to make it even more delightful. Provide a phased approach.

## Summary

This comprehensive review analyzed 40+ components across contrast/accessibility, React hygiene, layout/display, and delight patterns. The codebase has strong foundations (accessibility modes, particle system, audio system) but specific issues need addressing:

| Category | Severity | Issues Found | Recommended Phase |
|----------|----------|--------------|-------------------|
| WCAG Contrast Failures | Critical | 12+ color combinations failing AA | Phase 1 |
| React Key Anti-patterns | High | 3 components using index as key | Phase 2 |
| Missing Memoization | High | 6+ expensive computations unmemoized | Phase 2 |
| Layout Overflow Issues | Medium | 5+ overflow/truncation problems | Phase 3 |
| Z-Index Fragmentation | Medium | 6 different modal z-index values | Phase 3 |
| Missing Delight | Low | 12+ opportunities for micro-interactions | Phase 4 |
| Duplicate Intervals | Low | CaveCard runs 2 intervals | Phase 2 |

**Builds on**: `2026-02-02_ux-best-practices-review.md` (Phases 4-8 still relevant)

---

## Phase 1: Critical Contrast Fixes (WCAG AA Compliance)

**Priority**: Critical - Legal/accessibility requirement
**Effort**: 2-3 hours
**Files**: ~10 components

### 1.1 Disabled Button Contrast Failures

The worst offenders use similar hues for background and text:

| File:Line | Combination | Ratio | Fix |
|-----------|-------------|-------|-----|
| `BetaAgreement.tsx:135` | `text-cheddar-400` on `bg-cheddar-200` | ~1.4:1 | Use `text-cheddar-700` or `text-gray-600` |
| `FeedbackWidget.tsx:239` | `text-cheddar-400` on `bg-cheddar-200` | ~1.4:1 | Same fix |
| `BetaAgreement.tsx:114` | `text-cheddar-500` on `bg-cheddar-100` | ~2.8:1 | Use `text-cheddar-700` |

**Pattern to apply**:
```tsx
// Before
'bg-cheddar-200 text-cheddar-400 cursor-not-allowed'
// After
'bg-gray-200 text-gray-600 cursor-not-allowed'
```

### 1.2 Gray Text on Light Backgrounds

`text-gray-400` (#9ca3af) fails WCAG AA on white/cream backgrounds (~2.9:1 ratio):

| File:Line | Context | Fix |
|-----------|---------|-----|
| `ZoneSelectPanel.tsx:72` | Recommended level | Use `text-gray-500` or `text-gray-600` |
| `HeroPanel.tsx:240-257` | Stat labels | Use `text-gray-600` |
| `AchievementToast.tsx:197` | "Click to dismiss" | Use `text-gray-500` |
| `CombatLog.tsx` (multiple) | Timestamps, meta | Use `text-gray-500` |

### 1.3 Yellow/Amber on Light Backgrounds

Combat feedback uses extremely light yellows:

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `CombatFeedback.tsx:201` | `text-yellow-200` "MAX!" label | Use `text-yellow-600` or add text shadow |
| `App.tsx:534` | `text-amber-200` potential rennet | Use `text-amber-500` |
| `ClickEffects.tsx:137-138` | Floating numbers | Already has text shadow (OK) |

### 1.4 Tooltip/Popover Contrast

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `RennetDisplay.tsx:32-46` | `text-gray-200` on `bg-rind` (~3.8:1) | Use `text-white` |

### 1.5 Hardcoded Colors Bypassing High-Contrast Mode

These inline styles don't respond to high-contrast mode:

| File:Line | Issue |
|-----------|-------|
| `GeneratorPanel.tsx:105-175` | Multiple `style={{ color: '#...' }}` |
| `SettingsPanel.tsx:85-127` | Hardcoded backgrounds |

**Fix**: Replace with Tailwind classes that have high-contrast overrides.

### Success Criteria
- [ ] All text passes WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Disabled states use `gray-200 + gray-600` or `opacity-50` pattern
- [ ] High-contrast mode works on all text

---

## Phase 2: React Hygiene Fixes

**Priority**: High - Performance and correctness
**Effort**: 3-4 hours
**Files**: ~8 components

### 2.1 Index-as-Key Anti-pattern

Using array index as key breaks React reconciliation on reorder:

| File:Line | Context | Fix |
|-----------|---------|-----|
| `CombatLog.tsx:121` | Log entries (uses `timestamp-index`) | Use `entry.timestamp` or add unique ID |
| `RecipeCard.tsx:199-205` | Recipe effects | Use `effect.type` or unique effect ID |
| `CaveCard.tsx:199-209` | Job interactions | Use `interaction.type` |

### 2.2 Missing useMemo for Expensive Computations

These filter/sort operations run every render:

| File:Line | Computation | Fix |
|-----------|-------------|-----|
| `AchievementPanel.tsx:99-115` | Filter + sort 30+ achievements | Wrap in `useMemo([unlockedAchievements, categoryFilter])` |
| `EquipmentModal.tsx:181-201` | Filter + sort equipment | Wrap in `useMemo([filter, slotEquipment])` |
| `CraftingPanel.tsx:115-120` | Group recipes by category | Wrap in `useMemo([recipes])` |

### 2.3 Missing useCallback for Handler Props

Handlers recreated every render, passed to child components:

| File:Line | Handler | Fix |
|-----------|---------|-----|
| `HeroPanel.tsx:315-320` | `handleAddToParty` | Wrap in `useCallback` |
| `HeroPanel.tsx:323-327` | `handleEquipmentClick` | Wrap in `useCallback` |
| `EquipmentModal.tsx:289-291` | `onBuy`, `onEquip` | Refactor to pass ID to child |

### 2.4 Components Missing React.memo

These components receive stable props but re-render with parent:

| Component | File:Line | Props |
|-----------|-----------|-------|
| `HeroCombatCard` | `CombatPanel.tsx:13-186` | Hero data, handlers |
| `AchievementCard` | `AchievementPanel.tsx:27-88` | Achievement, isUnlocked |
| `SpeedControl` | `CombatPanel.tsx:193-218` | Speed, onChange |
| `EnemyCard` | `EnemyDisplay.tsx:41-161` | Enemy state |
| `ZoneCard` | `ZoneSelectPanel.tsx:28-159` | Zone data |
| `PartySlot` | `PartyFormationPanel.tsx:23-103` | Slot data |

**Positive examples**: `GeneratorRow` and `UpgradeCard` already use `React.memo`.

### 2.5 Duplicate Intervals

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `CaveCard.tsx:79-87, 109-120` | Two 1-second intervals | Combine into single interval |

### Success Criteria
- [ ] No index-as-key warnings in dev tools
- [ ] React Profiler shows fewer re-renders
- [ ] No duplicate timers

---

## Phase 3: Layout and Display Fixes

**Priority**: Medium - Visual polish
**Effort**: 4-5 hours
**Files**: ~12 components

### 3.1 Overflow Handling Issues

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `Layout.tsx:9` | `overflow-hidden` on root blocks scroll | Use `overflow-x-hidden overflow-y-auto` |
| `DebugPanel.tsx:226, 338` | Nested scroll containers | Flatten to single scroll |
| `CombatLog.tsx:159` | Truncated messages with no tooltip | Add title attribute or expand-on-click |

### 3.2 Text Truncation Causing Layout Shift

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `GeneratorPanel.tsx:103-109` | Hover switches `truncate` → `whitespace-normal` | Use tooltip instead, or fixed-height container |
| `CheeseInventoryCard.tsx:60` | Description has no line-clamp | Add `line-clamp-2` |

### 3.3 Z-Index Standardization

Current chaos:

| Modal | Current Z | Target Z |
|-------|-----------|----------|
| Base `ModalOverlay` | z-50 | z-50 |
| `AgingConfirmModal` | z-50 | z-50 |
| `OfflineProgressModal` | z-50 | z-50 |
| `EquipmentModal` | z-60 | z-60 |
| `CombatResultsModal` | z-60 | z-60 |
| `ChangelogModal` | z-70 | z-70 |
| `KeyboardHelpModal` | z-70 | z-70 |
| `SettingsPanel` | z-100 | z-80 (normalize) |

**Action**: Document hierarchy in `index.css`:
```css
/* Z-Index Hierarchy
 * 10-19: Panel overlays (prestige animation)
 * 50: Base modals
 * 60: Secondary modals (equipment, results)
 * 70: System modals (changelog, help)
 * 80: Settings
 */
```

### 3.4 Responsive Breakpoint Gaps

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `SettingsPanel.tsx:109-124` | 5 tabs cramped on mobile | Add horizontal scroll or dropdown |
| `HeroPanel.tsx:119-145` | Equipment slots too small | Increase padding on mobile |
| `ZoneSelectPanel.tsx:108` | Fixed 4-col grid for stages | Add `sm:grid-cols-4 grid-cols-2` |

### 3.5 Fixed Width Panel Issues

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `App.tsx:583` | `w-72 lg:w-80` no flex | Add `lg:w-80 xl:w-96` progressive widths |
| `EquipmentModal.tsx:228` | No min-width | Add `min-w-[320px]` |

### Success Criteria
- [ ] No nested scroll containers
- [ ] No layout shift on hover
- [ ] Consistent z-index hierarchy documented
- [ ] Panels usable at all breakpoints

---

## Phase 4: Delight Enhancements

**Priority**: Low - Polish and engagement
**Effort**: 6-8 hours
**Files**: Various

### 4.1 Universalize Button Micro-interactions

`btn-ripple` and `btn-scale` classes exist but aren't universally applied:

| Component | Current | Add |
|-----------|---------|-----|
| `TabButton.tsx` | `transition-colors` only | Add `btn-scale` |
| `HeroAbilityButton.tsx` | Inline `hover:scale-[1.02]` | Use `btn-scale` class |
| All purchase buttons | Inconsistent | Add `btn-ripple` |

### 4.2 Number/Value Change Animations

`animate-number-pop` and `animate-value-highlight` exist but are underused:

| Opportunity | Location | Animation |
|-------------|----------|-----------|
| Curds counter | `CurrencyDisplay.tsx` | `animate-number-pop` on change |
| CPS display | `App.tsx` | `animate-value-highlight` on buff |
| Rennet counter | `RennetDisplay.tsx` | Shimmer already exists (good) |

### 4.3 Progress Bar Enhancement

| Opportunity | Location | Addition |
|-------------|----------|----------|
| Near completion | `ProgressBar.tsx` | Add pulse/glow when >90% |
| Crafting progress | `CaveCard.tsx` | Add milestone markers |

### 4.4 Tooltip Entrance Animations

| Issue | Fix |
|-------|-----|
| Tooltips appear instantly | Add `animate-fade-in` with 100ms delay |
| No exit animation | Add `animate-fade-out` on unmount |

### 4.5 Panel Transition Animations

| Opportunity | Implementation |
|-------------|----------------|
| Tab content switch | Crossfade with `animate-fade-in` |
| Panel open/close | `animate-slide-up/down` |

### 4.6 Idle Animations

| Opportunity | Location | Animation |
|-------------|----------|-----------|
| Cheese wheel | `CheeseWheel.tsx` | Subtle idle rotation when not clicking |
| Generator icons | `GeneratorPanel.tsx` | Subtle pulse for active generators |

### 4.7 Audio Feedback Gaps

Currently silent interactions that could use audio:

| Interaction | Suggested Sound |
|-------------|-----------------|
| Tab switching | Soft click (like purchase but quieter) |
| Slider/toggle changes | Subtle tick |
| Panel open/close | Soft whoosh |
| Tooltip appearance | Very subtle ping (optional) |

### 4.8 New Particle Opportunities

| Event | Particle Preset |
|-------|-----------------|
| Generator purchase | `cheeseCrumbs` burst at generator row |
| 10/50/100 milestone | `confetti` or `goldenSparkles` |
| Zone completion | Province-themed particles |
| First hero recruited | `mapleLeaves` |

### Success Criteria
- [ ] All interactive elements have hover/active feedback
- [ ] Value changes are animated
- [ ] Transitions feel smooth and intentional
- [ ] Audio enhances without annoying

---

## Implementation Order

```
Phase 1: Contrast Fixes          [Critical, 2-3h]
    └─> Phase 2: React Hygiene   [High, 3-4h]
         └─> Phase 3: Layout     [Medium, 4-5h]
              └─> Phase 4: Delight [Low, 6-8h]
```

**Phase 1 first** because contrast failures are accessibility violations.
**Phase 2 before Phase 3** because hygiene fixes may affect render behavior.
**Phase 4 last** because delight is polish, not correctness.

---

## Relation to Existing Plans

| Existing Plan | Status | Relation |
|---------------|--------|----------|
| `ui-consistency-phase1-dialog-backgrounds.md` | Implemented | N/A |
| `ui-consistency-phase2-zindex-overlay.md` | Implemented | Phase 3 adds documentation |
| `ui-consistency-phase3-accessibility.md` | Implemented | Phase 1 extends with new findings |
| `ux-best-practices-review.md` Phases 4-8 | Not started | Complementary - focus traps, mobile targets, error boundaries |

This research adds **new contrast findings** not covered by Phase 3 (disabled states, gray-400, yellow text) and **new React hygiene issues** not previously documented.

---

## Code References

### Contrast Issues (Phase 1)
- `src/components/ui/BetaAgreement.tsx:114,135`
- `src/components/ui/FeedbackWidget.tsx:239`
- `src/components/ui/ZoneSelectPanel.tsx:72`
- `src/components/ui/HeroPanel.tsx:240-257`
- `src/components/ui/CombatFeedback.tsx:201`
- `src/components/ui/RennetDisplay.tsx:32-46`
- `src/components/ui/GeneratorPanel.tsx:105-175`

### React Hygiene Issues (Phase 2)
- `src/components/ui/CombatLog.tsx:121`
- `src/components/ui/crafting/RecipeCard.tsx:199-205`
- `src/components/ui/crafting/CaveCard.tsx:79-87,109-120,199-209`
- `src/components/ui/AchievementPanel.tsx:27-88,99-115`
- `src/components/ui/CombatPanel.tsx:13-186,193-218`
- `src/components/ui/HeroPanel.tsx:315-327`
- `src/components/ui/EquipmentModal.tsx:181-201,289-291`

### Layout Issues (Phase 3)
- `src/components/ui/Layout.tsx:9`
- `src/components/ui/DebugPanel.tsx:226,338`
- `src/components/ui/SettingsPanel.tsx:109-124`
- `src/App.tsx:583`

### Animation System (Phase 4)
- `src/index.css:79-1066`
- `src/systems/particleSystem.ts:43-373`
- `src/systems/audioSystem.ts:928-1812`

---

## Historical Context

- `2026-02-02_ux-best-practices-review.md` - First comprehensive UX review; Phases 1-3 implemented
- `2026-01-30_ui-consistency-cleanup.md` - Initial UI consistency findings (implemented)
- `2026-01-29_codebase-bugs-display-issues.md` - Memory leaks, accessibility gaps (partially addressed)

---

## Open Questions

1. **Reduced motion**: Should `animate-pulse` on "Fighting" badges be removed entirely, or replaced with static indicator?
2. **Number animations**: Should value changes animate on every tick, or only significant changes (>10%)?
3. **Audio**: Is adding tab-switch audio too noisy? User testing needed.
4. **Z-index**: Should we use CSS custom properties for z-index scale?
