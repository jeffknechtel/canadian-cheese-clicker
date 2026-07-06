# UX Phase 1: Foundation & Consistency Implementation Plan

## Overview

Unify the design system and ensure all primitives are consistently adopted. This phase establishes the foundation for AAA-level polish by standardizing Button/TabButton usage, adding proper ARIA tab semantics, and ensuring mobile touch target compliance.

## Current State Analysis

**Button Primitive**: Well-designed with variant/size API, but only 2 components use it. 96 raw `<button>` elements exist across 33 files. `DISABLED_BUTTON_CLASSES` is used in 11 files but 5 files have competing disabled patterns.

**TabButton Primitive**: Good variant system (timber/amber/cheddar) but lacks ARIA tab semantics entirely. No `role="tab"`, `aria-selected`, or `aria-controls`. Three components duplicate its styling inline instead of importing it.

**Semantic Colors**: `--color-success/error/warning` defined in CSS with high-contrast overrides, but many components use raw Tailwind colors (`text-red-*`, `text-green-*`) bypassing accessibility features.

**Touch Targets**: TabButton sizes yield ~28-30px height. Button `sm` is 36px. Many bespoke buttons are 20-28px. Mobile minimum is 44px.

## Desired End State

1. **Button primitive adopted** in priority components (modals, main panels) with consistent disabled styling
2. **TabButton enhanced** with full ARIA tab semantics (`role="tab"`, `aria-selected`, `aria-controls`)
3. **All tab containers** wrapped with `role="tablist"` and content areas marked as `role="tabpanel"`
4. **Semantic colors** used for true error/success/warning states (not themed areas like Vintage purple)
5. **Touch targets** meet 44px minimum on mobile, allowed smaller on desktop for dense UIs

### Verification:

```bash
# No competing disabled button patterns in priority components
grep -r "cursor-not-allowed" src/components/ui/*.tsx | grep -v DISABLED_BUTTON_CLASSES

# All TabButton usages have aria-selected
grep -rn "TabButton" src/components/ui/*.tsx

# Touch targets have responsive min-height
grep -rn "min-h-\[44px\]" src/components/ui/
```

## What We're NOT Doing

- **DebugPanel button adoption** — Debug-only, not user-facing
- **Dense combat grid buttons** — HeroAbilityButton gets responsive treatment, not full 44px desktop
- **New semantic tokens** for themed areas (Vintage purple, Legacy yellow, Canadian red) — these are intentional theming, not state colors
- **Exit animations** — Phase 2 scope
- **Celebration moments** — Phase 2 scope

---

## Phase 1.1: Design System Consolidation

### Overview

Adopt Button primitive in priority components, standardize disabled styling, and migrate true error/success/warning states to semantic tokens.

### Changes Required:

#### 1. Button Primitive Adoption — Priority Components

These components have action buttons that should use `<Button>`:

**File**: `src/components/ui/EquipmentModal.tsx`
**Lines**: 109-135 (Equip/Unequip/Buy buttons)
**Changes**: Replace bespoke buttons with `<Button variant="primary|secondary|danger">`

```tsx
// Before (line 109-115):
<button
  onClick={() => onEquip(item)}
  className="w-full py-1.5 rounded text-sm font-medium bg-cheddar-600 text-white hover:bg-cheddar-700"
>
  Equip
</button>

// After:
<Button onClick={() => onEquip(item)} className="w-full">
  Equip
</Button>
```

**File**: `src/components/ui/HeroPanel.tsx`
**Lines**: 156-165 (Add to Party), 270-280 (Recruit)
**Changes**: Replace with `<Button>`, using `DISABLED_BUTTON_CLASSES` pattern for disabled state

**File**: `src/components/ui/ZoneSelectPanel.tsx`
**Lines**: 186-196 (Retreat button), 353-361 (Enter Zone button)
**Changes**: Replace with `<Button variant="danger">` for retreat, `<Button>` for enter

**File**: `src/components/ui/LegacyConfirmModal.tsx`
**Lines**: 125-135 (Confirm/Cancel buttons)
**Changes**: Replace with `<Button variant="danger">` and `<Button variant="secondary">`

**File**: `src/components/ui/AgingConfirmModal.tsx`
**Lines**: Similar pattern to LegacyConfirmModal
**Changes**: Replace with `<Button>`

**File**: `src/components/ui/VintageConfirmModal.tsx`
**Lines**: Similar pattern
**Changes**: Replace with `<Button>`

**File**: `src/components/ui/crafting/CaveCard.tsx`
**Lines**: 163, 172 (Turn/Collect buttons)
**Changes**: Replace with `<Button size="sm">`

**File**: `src/components/ui/crafting/CheeseInventoryCard.tsx`
**Lines**: 87, 94 (Consume/Sell buttons)
**Changes**: Replace with `<Button size="sm">`

#### 2. Standardize Disabled Button Patterns

Replace competing disabled styles with `DISABLED_BUTTON_CLASSES`:

**File**: `src/components/ui/CombatPanel.tsx`
**Line**: 538
**Current**: `'bg-gray-100 text-gray-400 cursor-not-allowed'`
**Change**: Import and use `DISABLED_BUTTON_CLASSES`

**File**: `src/components/ui/LegacyConfirmModal.tsx`
**Line**: 131
**Current**: `'bg-gray-200 text-gray-400 cursor-not-allowed'`
**Change**: Use `DISABLED_BUTTON_CLASSES`

#### 3. Semantic Color Migration — True States Only

Migrate error/success/warning *states* (not themed areas) to semantic tokens:

**File**: `src/components/ui/CombatPanel.tsx`
**Lines**: 171, 427, 453, 464, 501
**Changes**:
- `bg-red-600 text-white` (debuff badge) → keep (not an error state, it's a debuff indicator)
- `text-red-600` (flee cooldown) → `text-error` (this IS an error/unavailable state)
- `bg-red-100 text-red-700` (In-Combat badge) → keep (status indicator, not error)

**File**: `src/components/ui/SaveToast.tsx`
**Lines**: 30, 32
**Changes**:
- `bg-green-600` (success) → `bg-success`
- `bg-red-600` (error) → `bg-error`

**File**: `src/components/ui/crafting/RecipeCard.tsx`
**Line**: 219
**Current**: `text-red-500` (cannot afford)
**Change**: `text-error`

**File**: `src/components/ui/crafting/CaveCard.tsx`
**Lines**: 143, 172
**Changes**:
- `bg-green-500` (complete progress bar) → keep (visual indicator)
- `bg-green-500 hover:bg-green-600` (Collect button) → `bg-success hover:bg-success/90`

**Files NOT to change** (intentional theming):
- `VintageConfirmModal.tsx` — purple theming is intentional
- `LegacyConfirmModal.tsx` — yellow theming is intentional
- `PrestigePanel.tsx:516-552` — Legacy section yellow theming
- `GeneratorPanel.tsx:124,136,157` — Canadian tier red theming
- Role badges in `HeroPanel.tsx` — colored by role type

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] No unused imports after refactor

#### Manual Verification:
- [ ] Equipment modal buttons render correctly with proper hover/disabled states
- [ ] Hero recruitment flow works with new button styling
- [ ] Zone selection buttons match existing visual design
- [ ] Prestige modals (Aging/Vintage/Legacy) confirm buttons work
- [ ] High-contrast mode still applies to semantic color usages

---

## Phase 1.2: ARIA Tab Semantics

### Overview

Enhance TabButton with proper ARIA tab widget semantics and ensure all tab containers have correct roles.

### Changes Required:

#### 1. Enhance TabButton Component

**File**: `src/components/ui/shared/TabButton.tsx`
**Changes**: Add ARIA props to interface and implementation

```tsx
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'timber' | 'amber' | 'cheddar';
  size?: 'sm' | 'md';
  // New ARIA props
  id?: string;
  controls?: string; // aria-controls value
}

export function TabButton({
  active,
  onClick,
  children,
  className = '',
  variant = 'timber',
  size = 'md',
  id,
  controls,
}: TabButtonProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      id={id}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`
        flex-1 ${SIZE_STYLES[size]} rounded font-medium transition-colors border btn-scale
        ${active ? styles.active : styles.inactive}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
```

#### 2. Add Tablist Containers and Tabpanel Roles

**File**: `src/components/ui/UpgradePanel.tsx`
**Changes**: Wrap TabButton group with `role="tablist"`, add tabpanel to content

```tsx
// Tab container (around line 181-210)
<div role="tablist" aria-label="Upgrade categories" className="flex gap-2 mb-4">
  <TabButton
    id="tab-upgrades"
    controls="panel-upgrades"
    active={view === 'upgrades'}
    onClick={() => setView('upgrades')}
  >
    Upgrades
  </TabButton>
  <TabButton
    id="tab-synergies"
    controls="panel-synergies"
    active={view === 'synergies'}
    onClick={() => setView('synergies')}
  >
    Synergies
  </TabButton>
</div>

// Content area
<div
  role="tabpanel"
  id={view === 'upgrades' ? 'panel-upgrades' : 'panel-synergies'}
  aria-labelledby={view === 'upgrades' ? 'tab-upgrades' : 'tab-synergies'}
>
  {/* existing content */}
</div>
```

**File**: `src/components/ui/CraftingPanel.tsx`
**Lines**: 46-62
**Changes**: Same pattern — `role="tablist"` wrapper, `role="tabpanel"` content

**File**: `src/components/ui/PrestigePanel.tsx`
**Lines**: 410-420
**Changes**: Same pattern for Aging/Upgrades/Stats tabs

**File**: `src/components/ui/HeroPanel.tsx`
**Lines**: 351-356
**Changes**: Same pattern for Roster/Recruit tabs

**File**: `src/components/ui/SettingsPanel.tsx`
**Lines**: 111-127
**Changes**: The settings tabs need tablist wrapper and tabpanel roles

#### 3. Adopt TabButton in Components with Inline Patterns

**File**: `src/components/ui/EquipmentModal.tsx`
**Lines**: 250-267
**Changes**: Replace inline tab buttons with `<TabButton variant="timber" size="sm">`

```tsx
// Before:
<button
  onClick={() => setFilter(f)}
  className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors capitalize border
    ${filter === f
      ? 'bg-timber-500 text-white border-timber-600'
      : 'bg-timber-100 text-timber-700 border-timber-300 hover:bg-timber-200'
    }`}
>
  {f}
</button>

// After:
<TabButton
  active={filter === f}
  onClick={() => setFilter(f)}
  variant="timber"
  size="sm"
  id={`tab-equip-${f}`}
  controls="panel-equipment-list"
>
  {f}
</TabButton>
```

**File**: `src/components/ui/AchievementPanel.tsx`
**Lines**: 156-172
**Changes**: Replace inline filter buttons with `<TabButton variant="cheddar" size="sm">`

**File**: `src/components/ui/ChangelogModal.tsx`
**Lines**: 122-136
**Changes**: Replace with `<TabButton variant="cheddar" size="sm">`

#### 4. Add aria-pressed to Toggle Buttons

**File**: `src/components/ui/AchievementPanel.tsx`
**Lines**: 158-170 (if not converted to TabButton, add aria-pressed)
**Changes**: Add `aria-pressed={categoryFilter === cat.value}`

#### 5. Replace Manual Progress Bar in SynergiesPanel

**File**: `src/components/ui/SynergiesPanel.tsx`
**Lines**: 155-159
**Changes**: Replace manual div-based progress bar with `<ProgressBar>`

```tsx
// Before:
<div className="flex-1 bg-gray-200 rounded-full h-2">
  <div className="bg-timber-500 rounded-full h-2..." style={{ width: `${percent}%` }} />
</div>

// After:
import { ProgressBar } from './shared/ProgressBar';
// ...
<ProgressBar
  percent={percent}
  variant="timber"
  size="sm"
  ariaLabel={`${synergy.name} progress`}
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] Grep confirms all TabButton usages have aria-selected:
  ```bash
  grep -rn "role=\"tab\"" src/components/ui/
  ```

#### Manual Verification:
- [ ] Screen reader announces tab selection state correctly
- [ ] Keyboard navigation works: Tab focuses tablist, Arrow keys move between tabs
- [ ] Focus ring visible on active tab
- [ ] VoiceOver/NVDA can navigate all tab interfaces

---

## Phase 1.3: Mobile Touch Target Polish

### Overview

Ensure all interactive elements meet the 44px minimum touch target on mobile while allowing smaller sizes on desktop for dense UIs.

### Changes Required:

#### 1. Update TabButton Sizes

**File**: `src/components/ui/shared/TabButton.tsx`
**Lines**: 25-28
**Changes**: Add responsive min-height

```tsx
const SIZE_STYLES = {
  sm: 'px-2 py-1.5 text-xs min-h-[44px] md:min-h-[28px]',
  md: 'px-3 py-1.5 text-sm min-h-[44px] md:min-h-[32px]',
};
```

#### 2. Update Button Small Variant

**File**: `src/components/ui/shared/Button.tsx`
**Line**: 28
**Changes**: Make sm responsive

```tsx
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-sm min-h-[44px] md:min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};
```

#### 3. Fix AchievementPanel Filter Touch Targets

**File**: `src/components/ui/AchievementPanel.tsx`
**Lines**: 162-168
**Changes**: If using TabButton, gets fix automatically. If keeping inline, add:

```tsx
className={`
  px-2 py-1 text-xs rounded font-medium transition-colors border btn-scale
  min-h-[44px] md:min-h-[28px]
  ${categoryFilter === cat.value ? ... : ...}
`}
```

#### 4. Fix RecipeCard Dropdown Touch Targets

**File**: `src/components/ui/crafting/RecipeCard.tsx`
**Lines**: 143, 163, 183
**Changes**: Add min-height to select elements

```tsx
className="w-full text-xs bg-white border border-timber-200 rounded px-2 py-1.5 min-h-[44px] md:min-h-[28px]"
```

#### 5. Fix HeroAbilityButton Touch Targets (Responsive)

**File**: `src/components/ui/HeroAbilityButton.tsx`
**Lines**: 63-67
**Changes**: Add responsive min-height to size classes

```tsx
const sizeClasses = {
  sm: 'px-2 py-1 text-xs min-h-[44px] md:min-h-[24px]',
  md: 'px-3 py-1.5 text-sm min-h-[44px] md:min-h-[28px]',
  lg: 'px-4 py-2 text-base min-h-[44px] md:min-h-[36px]',
};
```

#### 6. Fix EquipmentModal Action Buttons

**File**: `src/components/ui/EquipmentModal.tsx`
**Lines**: 109, 118, 132
**Changes**: If adopting Button primitive (Phase 1.1), gets fix automatically

#### 7. Fix CaveCard and CheeseInventoryCard Buttons

**File**: `src/components/ui/crafting/CaveCard.tsx`
**Lines**: 163, 172
**Changes**: If adopting Button primitive (Phase 1.1), add `size="sm"` for responsive treatment

**File**: `src/components/ui/crafting/CheeseInventoryCard.tsx`
**Lines**: 87, 94
**Changes**: Same — adopt Button or add responsive min-height

#### 8. Fix HeroPanel Action Buttons

**File**: `src/components/ui/HeroPanel.tsx`
**Lines**: 160, 274
**Changes**: If adopting Button primitive (Phase 1.1), gets fix automatically

#### 9. Fix ZoneSelectPanel Stage Buttons

**File**: `src/components/ui/ZoneSelectPanel.tsx`
**Lines**: 165, 189
**Changes**: Add responsive min-height (these are dense grid buttons)

```tsx
className="py-2 px-1 rounded text-xs font-medium transition-all duration-200 btn-scale min-h-[44px] md:min-h-[28px]"
```

#### 10. Fix ChangelogModal Filter Buttons

**File**: `src/components/ui/ChangelogModal.tsx`
**Line**: 127
**Changes**: If adopting TabButton (Phase 1.2), gets fix automatically

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] Grep confirms responsive min-height patterns:
  ```bash
  grep -rn "min-h-\[44px\]" src/components/ui/ | wc -l
  # Should be significantly higher than before
  ```

#### Manual Verification:
- [ ] Test on mobile device (or Chrome DevTools mobile emulation)
- [ ] All buttons/tabs comfortable to tap with finger
- [ ] Desktop layout remains compact (not oversized)
- [ ] Combat UI still fits on screen with responsive ability buttons

---

## Testing Strategy

### Unit Tests:
- None required for styling changes

### Integration Tests:
- None exist in this project

### Manual Testing Steps:

1. **Desktop Walkthrough**:
   - Open all panels (Upgrades, Heroes, Crafting, Prestige, Achievements, Settings)
   - Click through all tab interfaces
   - Verify buttons maintain expected styling
   - Enter combat, verify ability buttons are compact

2. **Mobile Walkthrough** (Chrome DevTools → iPhone SE):
   - Same panel walkthrough
   - Verify all touch targets are comfortably tappable
   - Verify no horizontal scroll introduced
   - Test combat with enlarged ability buttons

3. **Accessibility Testing**:
   - Tab through interface with keyboard
   - Verify screen reader announces tab selection states
   - Enable high-contrast mode, verify semantic colors apply
   - Enable reduced motion, verify animations respect preference

4. **Cross-Browser**:
   - Test in Chrome, Firefox, Safari
   - Verify consistent rendering

---

## Performance Considerations

- No performance impact expected — these are styling/attribute changes
- Responsive min-height uses standard Tailwind responsive prefixes (no JS overhead)

---

## Migration Notes

- No data migration required
- No breaking changes to component APIs
- TabButton adds optional `id` and `controls` props (backwards compatible)

---

## References

- Research document: `thoughts/shared/research/2026-07-05_22-26-04_aaa-ux-polish-roadmap.md`
- Button primitive: `src/components/ui/shared/Button.tsx`
- TabButton primitive: `src/components/ui/shared/TabButton.tsx`
- Semantic colors: `src/index.css:53-56`
- WCAG touch target guidelines: 44x44px minimum for Level AAA
