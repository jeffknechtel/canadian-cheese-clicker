# UI Consistency Phase 3: Button Contrast and Text Accessibility

## Overview

Fix WCAG accessibility violations in disabled button contrast and add native tooltips to truncated text elements so users can view full content. This phase addresses the highest-priority accessibility issues identified in the UI consistency research.

## Current State Analysis

**Disabled Button Contrast Issue:**
- Current: `bg-gray-300 text-gray-500` = ~2.62:1 contrast ratio
- WCAG AA minimum: 4.5:1 for normal text
- **Status**: Fails WCAG AA compliance

**Affected Components (10+ instances):**

| Component | File:Line | Button Purpose |
|-----------|-----------|----------------|
| GeneratorPanel | [GeneratorPanel.tsx:109](src/components/ui/GeneratorPanel.tsx#L109) | Buy generator |
| HeroPanel (combat) | [HeroPanel.tsx:150](src/components/ui/HeroPanel.tsx#L150) | Add to party when in combat |
| HeroPanel (recruit) | [HeroPanel.tsx:264](src/components/ui/HeroPanel.tsx#L264) | Recruit hero |
| RecipeCard | [RecipeCard.tsx:227](src/components/ui/crafting/RecipeCard.tsx#L227) | Craft item |
| PrestigePanel | [PrestigePanel.tsx:431](src/components/ui/PrestigePanel.tsx#L431) | Age button |
| EquipmentModal (equip) | [EquipmentModal.tsx:119](src/components/ui/EquipmentModal.tsx#L119) | Equip item |
| EquipmentModal (buy) | [EquipmentModal.tsx:134](src/components/ui/EquipmentModal.tsx#L134) | Buy equipment |
| HeroAbilityButton (disabled) | [HeroAbilityButton.tsx:49](src/components/ui/HeroAbilityButton.tsx#L49) | Use ability |
| HeroAbilityButton (limit break) | [HeroAbilityButton.tsx:113](src/components/ui/HeroAbilityButton.tsx#L113) | Limit break |
| CombatATBBar | [CombatATBBar.tsx:124](src/components/ui/CombatATBBar.tsx#L124) | Limit break gauge |

**Text Truncation Without Full-Text Access:**

| File:Line | Content Truncated | CSS Class |
|-----------|-------------------|-----------|
| [GeneratorPanel.tsx:88](src/components/ui/GeneratorPanel.tsx#L88) | Generator name | `truncate` |
| [GeneratorPanel.tsx:93](src/components/ui/GeneratorPanel.tsx#L93) | Generator description | `truncate` |
| [HeroPanel.tsx:63](src/components/ui/HeroPanel.tsx#L63) | Hero name (roster) | `truncate` |
| [HeroPanel.tsx:74](src/components/ui/HeroPanel.tsx#L74) | Hero title | `truncate` |
| [HeroPanel.tsx:208](src/components/ui/HeroPanel.tsx#L208) | Hero name (recruit) | `truncate` |
| [HeroPanel.tsx:229](src/components/ui/HeroPanel.tsx#L229) | Ability description | `line-clamp-2` |
| [UpgradePanel.tsx:111](src/components/ui/UpgradePanel.tsx#L111) | Upgrade name | `truncate` |
| [RecipeCard.tsx:110](src/components/ui/crafting/RecipeCard.tsx#L110) | Recipe description | `line-clamp-1` |

## Desired End State

After this phase:
1. All disabled buttons have `bg-gray-200 text-gray-700` styling (~7.5:1 contrast ratio, WCAG AAA)
2. All truncated text elements have `title` attributes showing full content
3. Cost display opacity on GeneratorPanel is removed for better contrast

**Verification:**
- Visual inspection confirms disabled buttons are readable
- Hovering over truncated text shows full content via native tooltip
- WCAG contrast checker confirms AAA compliance on disabled buttons

## What We're NOT Doing

- **Custom tooltip component** - Native `title` attribute is sufficient for this phase. Custom tooltips can be added in a future enhancement.
- **UpgradePanel card styling** - Uses `bg-white/40` opacity pattern which is different from button disabled states. Changing this would require broader visual design review.
- **Adding border to all disabled buttons** - Some components (HeroPanel combat state) use borders, but we won't standardize this to avoid visual inconsistency.

---

## Phase 3.1: Update GeneratorPanel Disabled Button and Add Tooltips

### Overview

Fix the buy button contrast and add title attributes to truncated generator name/description.

### Changes Required:

#### 1. GeneratorPanel.tsx - Disabled Button

**File**: `src/components/ui/GeneratorPanel.tsx`

**Line 109** - Update disabled button styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

#### 2. GeneratorPanel.tsx - Truncated Name

**Line 88** - Add title attribute to generator name:

**Current:**
```tsx
<span className="font-semibold text-rind truncate">{generator.name}</span>
```

**New:**
```tsx
<span className="font-semibold text-rind truncate" title={generator.name}>{generator.name}</span>
```

#### 3. GeneratorPanel.tsx - Truncated Description

**Line 93** - Add title attribute to generator description:

**Current:**
```tsx
<p className="text-xs text-gray-600 truncate">{generator.description}</p>
```

**New:**
```tsx
<p className="text-xs text-gray-600 truncate" title={generator.description}>{generator.description}</p>
```

#### 4. GeneratorPanel.tsx - Cost Display Opacity (Optional Enhancement)

**Line 115** - Remove opacity from cost display for better contrast:

**Current:**
```tsx
<div className="text-xs opacity-80 tabular-nums">{formatNumber(cost)}</div>
```

**New:**
```tsx
<div className="text-xs tabular-nums">{formatNumber(cost)}</div>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Disabled "Buy" button text is clearly readable (gray on lighter gray)
- [ ] Hovering over truncated generator name shows full name in tooltip
- [ ] Hovering over truncated generator description shows full description in tooltip
- [ ] Cost display is still readable on both enabled and disabled buttons

---

## Phase 3.2: Update HeroPanel Disabled Buttons and Add Tooltips

### Overview

Fix disabled button contrast for "Add to Party" (combat locked) and "Recruit" buttons, and add tooltips to truncated hero names/titles/abilities.

### Changes Required:

#### 1. HeroPanel.tsx - Combat-Locked Add to Party Button

**File**: `src/components/ui/HeroPanel.tsx`

**Line 150** - Update disabled styling (combat state):

**Current:**
```tsx
? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
```

**New:**
```tsx
? 'bg-gray-200 text-gray-700 border border-gray-300 cursor-not-allowed'
```

#### 2. HeroPanel.tsx - Recruit Button

**Line 264** - Update disabled styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

#### 3. HeroPanel.tsx - Hero Name (Roster Card)

**Line 63** - Add title attribute:

**Current:**
```tsx
<span className="font-semibold text-timber-700 truncate">{hero.name}</span>
```

**New:**
```tsx
<span className="font-semibold text-timber-700 truncate" title={hero.name}>{hero.name}</span>
```

#### 4. HeroPanel.tsx - Hero Title

**Line 74** - Add title attribute:

**Current:**
```tsx
<p className="text-xs text-gray-500 italic truncate">{hero.title}</p>
```

**New:**
```tsx
<p className="text-xs text-gray-500 italic truncate" title={hero.title}>{hero.title}</p>
```

#### 5. HeroPanel.tsx - Hero Name (Recruit Card)

**Line 208** - Add title attribute:

**Current:**
```tsx
<span className={`font-semibold truncate ${canAfford ? 'text-timber-700' : 'text-gray-500'}`}>
  {hero.name}
</span>
```

**New:**
```tsx
<span className={`font-semibold truncate ${canAfford ? 'text-timber-700' : 'text-gray-500'}`} title={hero.name}>
  {hero.name}
</span>
```

#### 6. HeroPanel.tsx - Special Ability Description

**Line 229** - Add title attribute to line-clamped ability description:

**Current:**
```tsx
<p className="text-gray-600 mt-0.5 line-clamp-2">{hero.specialAbility.description}</p>
```

**New:**
```tsx
<p className="text-gray-600 mt-0.5 line-clamp-2" title={hero.specialAbility.description}>{hero.specialAbility.description}</p>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] "In Combat" locked button text is readable
- [ ] "Sorry, not enough curds" recruit button text is readable
- [ ] Hovering over hero name shows full name
- [ ] Hovering over hero title shows full title
- [ ] Hovering over ability description shows full description

---

## Phase 3.3: Update RecipeCard Disabled Button and Add Tooltip

### Overview

Fix the craft button contrast and add tooltip to truncated recipe description.

### Changes Required:

#### 1. RecipeCard.tsx - Disabled Craft Button

**File**: `src/components/ui/crafting/RecipeCard.tsx`

**Line 227** - Update disabled styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

#### 2. RecipeCard.tsx - Recipe Description

**Line 110** - Add title attribute to line-clamped description:

**Current:**
```tsx
<p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{recipe.description}</p>
```

**New:**
```tsx
<p className="text-xs text-gray-600 mt-0.5 line-clamp-1" title={recipe.description}>{recipe.description}</p>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] "Cannot Craft" / "Need Curds" / "Unlock Ingredients" button text is readable
- [ ] Hovering over truncated recipe description shows full description

---

## Phase 3.4: Update PrestigePanel Disabled Button

### Overview

Fix the "Age Your Empire" button contrast when disabled.

### Changes Required:

#### 1. PrestigePanel.tsx - Age Button

**File**: `src/components/ui/PrestigePanel.tsx`

**Line 431** - Update disabled styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] "Not Enough Curds" text on Age button is clearly readable

---

## Phase 3.5: Update UpgradePanel Add Tooltip

### Overview

Add tooltip to truncated upgrade name. Note: UpgradePanel uses a different disabled pattern (`bg-white/40`) which we are not changing in this phase.

### Changes Required:

#### 1. UpgradePanel.tsx - Upgrade Name

**File**: `src/components/ui/UpgradePanel.tsx`

**Line 111** - Add title attribute:

**Current:**
```tsx
<span className="font-semibold text-timber-700 truncate">{upgrade.name}</span>
```

**New:**
```tsx
<span className="font-semibold text-timber-700 truncate" title={upgrade.name}>{upgrade.name}</span>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Hovering over truncated upgrade name shows full name

---

## Phase 3.6: Update EquipmentModal Disabled Buttons

### Overview

Fix both equip button (when item equipped by another hero) and buy button contrast.

### Changes Required:

#### 1. EquipmentModal.tsx - Equip Button (Equipped by Other)

**File**: `src/components/ui/EquipmentModal.tsx`

**Line 119** - Update disabled styling:

**Current:**
```tsx
? 'bg-gray-200 text-gray-400 cursor-not-allowed'
```

**New:**
```tsx
? 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

#### 2. EquipmentModal.tsx - Buy Button

**Line 134** - Update disabled styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] "Equipped by [Hero]" button text is readable
- [ ] "Cannot afford" buy button text is readable

---

## Phase 3.7: Update HeroAbilityButton and CombatATBBar Disabled Buttons

### Overview

Fix disabled button contrast in combat-related ability buttons.

### Changes Required:

#### 1. HeroAbilityButton.tsx - Disabled Ability Button

**File**: `src/components/ui/HeroAbilityButton.tsx`

**Line 49** - Update disabled styling:

**Current:**
```tsx
? 'bg-gray-200 text-gray-400 cursor-not-allowed'
```

**New:**
```tsx
? 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

#### 2. HeroAbilityButton.tsx - Limit Break Button

**Line 113** - Update disabled styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

#### 3. CombatATBBar.tsx - Limit Break Gauge Button

**File**: `src/components/ui/CombatATBBar.tsx`

**Line 124** - Update disabled styling:

**Current:**
```tsx
: 'bg-gray-300 text-gray-500 cursor-not-allowed'
```

**New:**
```tsx
: 'bg-gray-200 text-gray-700 cursor-not-allowed'
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Disabled ability buttons in combat are readable
- [ ] Disabled limit break button is readable

---

## Testing Strategy

### Unit Tests:
- No unit test changes needed - these are CSS class changes and HTML attribute additions

### Integration Tests:
- Verify all affected components render without console errors

### Manual Testing Steps:

1. **GeneratorPanel**:
   - Load game without enough curds to buy anything
   - Verify "Buy" buttons have readable disabled text
   - Hover over generator names and descriptions to see tooltips

2. **HeroPanel**:
   - Start combat, verify "In Combat" button is readable
   - Go to Recruit tab, verify unaffordable hero buttons are readable
   - Hover over hero names, titles, and ability descriptions

3. **RecipeCard**:
   - Open crafting without enough curds
   - Verify disabled craft button text is readable
   - Hover over recipe descriptions

4. **PrestigePanel**:
   - Open with less than 1 trillion curds
   - Verify "Not Enough Curds" button is readable

5. **EquipmentModal**:
   - Open equipment modal for a slot where item is equipped by another hero
   - Verify disabled buttons are readable

6. **Combat Abilities**:
   - Enter combat
   - Verify disabled ability/limit break buttons are readable

### Accessibility Testing:

Run a WCAG contrast checker on the new `bg-gray-200 text-gray-700` combination to confirm it passes WCAG AA (4.5:1) and AAA (7:1).

Expected results:
- `#e5e7eb` (gray-200) background
- `#374151` (gray-700) text
- Calculated contrast: ~7.5:1 (WCAG AAA compliant)

---

## Performance Considerations

No performance impact - these are simple CSS class changes and HTML attribute additions.

---

## References

- Research document: [2026-01-30_ui-consistency-cleanup.md](thoughts/shared/research/2026-01-30_ui-consistency-cleanup.md)
- Phase 1 plan: [ui-consistency-phase1-dialog-backgrounds.md](thoughts/shared/plans/ui-consistency-phase1-dialog-backgrounds.md)
- Phase 2 plan: [ui-consistency-phase2-zindex-overlay.md](thoughts/shared/plans/ui-consistency-phase2-zindex-overlay.md)
- WCAG Contrast Requirements: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
