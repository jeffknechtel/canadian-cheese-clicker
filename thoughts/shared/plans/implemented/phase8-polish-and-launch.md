# Phase 8: Polish & Launch Implementation Plan

## Overview

This plan covers the final polish, optimization, accessibility, and launch preparation for "The Great Canadian Cheese Quest." Phase 8 transforms the content-complete game from Phases 1-7 into a polished, performant, accessible, and launch-ready product. The focus is on visual/audio refinement, performance optimization, accessibility features, and the infrastructure needed for a successful launch.

## Current State Analysis

**What Exists:**
- Complete game with all 13 provinces, 30+ heroes, 50+ cheese recipes
- Working combat system with ATB battles, boss fights, and mythology questlines
- Three-tier prestige system (Aging, Vintage, Legacy)
- Full crafting system with aging caves
- Event framework shell (Canada Day, Poutine Week, Hockey Season, Winterlude)
- Basic audio system with procedural Web Audio API sounds (`src/systems/audioSystem.ts`)
- Responsive layout with desktop/mobile views (`src/App.tsx`)
- React Three Fiber 3D scene with cheese wheel and click effects
- Zustand state management with LocalStorage persistence
- 55+ TypeScript/TSX source files

**What's Missing for Launch-Ready:**
- Visual polish: Loading screen, settings menu, UI animations, particle effects for abilities
- Audio polish: Full Canadian-inspired soundtrack, province-specific ambient audio, combat music transitions
- Performance optimization: Asset compression (KTX2/Draco), LOD system, lazy loading, mobile optimizations
- Accessibility: Screen reader support, colorblind modes, reduced motion, keyboard navigation
- Analytics: Anonymous usage tracking, progression bottleneck detection, A/B testing framework
- Launch prep: Beta testing infrastructure, community setup guidance, press kit/trailer specs

**Key Constraints:**
- Must maintain 60 FPS on desktop, 30 FPS on mobile
- Initial load target: < 3 seconds
- No backend changes - client-side only
- Must preserve save compatibility with existing player data
- Accessibility features must not impact performance

## Desired End State

A launch-ready game featuring:
- **Polished visuals**: Smooth animations, loading screens, settings menu, particle effects
- **Full audio experience**: Canadian-inspired soundtrack, ambient sounds, combat music with phase transitions
- **Optimized performance**: < 3 second load, 60/30 FPS desktop/mobile, efficient asset delivery
- **Full accessibility**: Screen reader support, colorblind modes, reduced motion, keyboard navigation
- **Analytics infrastructure**: Tracking for progression analysis and A/B testing
- **Launch readiness**: Beta testing complete, community channels ready, press assets prepared

### Verification Criteria:
- Lighthouse performance score > 80 on mobile
- All WCAG 2.1 AA accessibility criteria met
- No console errors or warnings in production build
- Game loads in < 3 seconds on mid-tier mobile device
- All UI elements keyboard navigable
- Settings persist across sessions

## Assumptions Made

1. **No New Game Content**: Phase 8 is polish only; all gameplay content exists from Phases 1-7
2. **Client-Side Analytics**: Using lightweight client-side analytics (no backend required)
3. **Procedural Audio Preferred**: Continuing with Web Audio API rather than prerecorded audio files (smaller bundle)
4. **Browser-Based Deployment**: No app store deployment in initial launch
5. **Community Self-Hosted**: Discord/Reddit setup is documentation, not implementation
6. **Beta via Feature Flags**: Beta testing uses existing save system with version flags

## What We're NOT Doing

- Backend services or server infrastructure
- App store submissions (iOS/Android)
- Multiplayer or social features
- Additional game content (heroes, zones, cheeses)
- Monetization implementation (prepared but not active)
- Localization/translations
- Native app builds

## Implementation Approach

Phase 8 is organized by functional area rather than strict sequence, allowing parallel development streams. Each sub-phase delivers independently testable improvements.

**Strategy:**
1. Visual polish first (most visible user impact)
2. Audio polish (enhances experience)
3. Performance optimization (technical foundation)
4. Accessibility (compliance and inclusivity)
5. Analytics (data collection)
6. Launch preparation (final steps)

---

## Phase 8.1: Visual Polish - Loading & Settings

### Overview

Create a professional loading experience and comprehensive settings menu that gives players control over their experience.

### Changes Required:

#### 1. Loading Screen Component

**File**: `src/components/ui/LoadingScreen.tsx` (new)
**Changes**: Create loading screen with Canadian theme

```typescript
interface LoadingScreenProps {
  progress: number; // 0-100
  tip: string;
}
```

Features:
- Animated cheese wheel logo (CSS animation, not 3D)
- Progress bar with maple leaf accents
- Random Canadian tips/facts cycling
- "Loading, eh..." text with animated ellipsis
- Smooth fade-out transition when complete

#### 2. Loading Tips Data

**File**: `src/data/loadingTips.ts` (new)
**Changes**: Create array of 30+ loading tips

Categories:
- Gameplay tips ("Aged cheese gives better buffs!")
- Canadian facts ("Canada produces over 350 varieties of cheese")
- Humor ("Sorry for the wait, eh!")
- Strategy hints ("Balance your party with Tank, DPS, and Healer")

#### 3. Settings Panel Component

**File**: `src/components/ui/SettingsPanel.tsx` (new)
**Changes**: Create comprehensive settings menu

Settings categories:
- **Audio**: Master volume, Music volume, SFX volume, Music on/off, SFX on/off
- **Graphics**: Quality preset (Low/Medium/High/Ultra), Particle effects toggle, Animations toggle
- **Accessibility**: Colorblind mode, Reduced motion, High contrast, Font size
- **Game**: Auto-save interval, Offline progress cap, Number format (Standard/Scientific)
- **Data**: Export save, Import save, Reset progress (with confirmation)

#### 4. Settings Store Slice

**File**: `src/stores/gameStore.ts`
**Changes**: Add settings state and persistence

```typescript
interface SettingsState {
  audio: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    musicEnabled: boolean;
    sfxEnabled: boolean;
  };
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    particlesEnabled: boolean;
    animationsEnabled: boolean;
  };
  accessibility: {
    colorblindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  game: {
    autoSaveInterval: number; // seconds
    offlineProgressCap: number; // hours
    numberFormat: 'standard' | 'scientific';
  };
}
```

#### 5. Settings Button in Header

**File**: `src/App.tsx`
**Changes**: Add settings button and modal trigger

- Gear icon in header near audio controls
- Opens settings panel as modal
- Settings persist to LocalStorage

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Build succeeds: `pnpm build`

#### Manual Verification:
- [ ] Loading screen displays during initial load
- [ ] Tips cycle every 3 seconds
- [ ] Settings modal opens and closes smoothly
- [ ] All settings changes apply immediately
- [ ] Settings persist after page reload

---

## Phase 8.2: Visual Polish - UI Animations

### Overview

Add smooth animations and transitions throughout the UI for a polished feel.

### Changes Required:

#### 1. CSS Animation Utilities

**File**: `src/index.css`
**Changes**: Add Tailwind animation extensions

```css
/* Custom animations */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 20px currentColor; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes number-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

#### 2. Panel Transition Animations

**File**: `src/components/ui/Layout.tsx`
**Changes**: Add enter/exit animations for panels

- Panels slide in from sides on tab change
- Smooth opacity transitions
- Staggered child element animations
- Respect `reducedMotion` setting

#### 3. Currency Counter Animations

**File**: `src/components/ui/CurrencyDisplay.tsx`
**Changes**: Enhance number animations

- Smooth counting animation on value change
- Scale pulse on significant increases
- Color flash on milestone reaches
- Particle burst effect on prestige currency gains

#### 4. Button Feedback Animations

**File**: `src/components/ui/GeneratorPanel.tsx`, `UpgradePanel.tsx`, etc.
**Changes**: Add button interaction feedback

- Hover scale effect
- Click ripple effect
- Disabled state visual feedback
- Success/failure shake animations

#### 5. Modal Animations

**File**: `src/components/ui/OfflineProgressModal.tsx`, `CombatResultsModal.tsx`, `EquipmentModal.tsx`, `AgingConfirmModal.tsx`
**Changes**: Add modal enter/exit animations

- Backdrop fade in
- Modal scale and fade from center
- Staggered content reveal
- Smooth exit on close

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No animation-related console warnings

#### Manual Verification:
- [ ] All panel transitions are smooth (no jank)
- [ ] Reduced motion setting disables animations
- [ ] Currency display animates on change
- [ ] Buttons provide tactile feedback
- [ ] Modals animate smoothly

---

## Phase 8.3: Visual Polish - Particle Effects

### Overview

Add particle effects for abilities, achievements, and special events using the existing Three.js scene.

### Changes Required:

#### 1. Particle System Utility

**File**: `src/systems/particleSystem.ts` (new)
**Changes**: Create reusable particle system

```typescript
interface ParticleConfig {
  count: number;
  color: string | string[];
  size: number;
  lifetime: number;
  velocity: { x: number; y: number; z: number };
  spread: number;
  gravity?: number;
}

export function createParticleBurst(
  scene: THREE.Scene,
  position: THREE.Vector3,
  config: ParticleConfig
): void;

export function createParticleTrail(
  scene: THREE.Scene,
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  config: ParticleConfig
): void;
```

#### 2. Cheese Wheel Click Particles

**File**: `src/components/game/ClickEffects.tsx`
**Changes**: Enhance click effects

- Cheese crumb particles burst outward
- Color varies by current cheese type equipped
- Critical clicks show golden burst
- Prestige multiplier affects particle count

#### 3. Achievement Unlock Effects

**File**: `src/components/ui/AchievementToast.tsx`
**Changes**: Add particle celebration

- Confetti burst on achievement unlock
- Maple leaf particles for Canadian achievements
- Golden sparkles for rare achievements

#### 4. Prestige Visual Effects

**File**: `src/components/ui/PrestigePanel.tsx`
**Changes**: Add prestige activation effects

- Swirling cheese particles during aging reset
- Golden Rennet particles floating up
- Screen-wide celebration for Vintage/Legacy unlocks

#### 5. Combat Ability Effects

**File**: `src/components/ui/CombatFeedback.tsx`
**Changes**: Add ability-specific particles

- Per-hero ability particle colors
- Limit break dramatic particle explosions
- Healing particles (green sparkles)
- Damage particles (red impacts)

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No Three.js errors in console

#### Manual Verification:
- [ ] Click particles appear on cheese wheel
- [ ] Achievement particles celebrate unlocks
- [ ] Prestige effects feel impactful
- [ ] Combat abilities have visual flair
- [ ] Particles can be disabled in settings

---

## Phase 8.4: Audio Polish - Soundtrack

### Overview

Expand the procedural audio system to include a full Canadian-inspired soundtrack with multiple themes.

### Changes Required:

#### 1. Music Theme System

**File**: `src/systems/audioSystem.ts`
**Changes**: Add themed music generation

New music themes:
- **Main Theme**: Warm folk-inspired melody (existing chord progression enhanced)
- **Combat Theme**: Faster tempo, more tension
- **Boss Theme**: Epic, dramatic with building intensity
- **Victory Theme**: Triumphant fanfare (existing, enhanced)
- **Prestige Theme**: Ethereal, transformative feel
- **Province Themes**: Subtle variations per province

#### 2. Music State Management

**File**: `src/systems/audioSystem.ts`
**Changes**: Add music state machine

```typescript
type MusicState = 'idle' | 'combat' | 'boss' | 'victory' | 'defeat' | 'prestige';

export function setMusicState(state: MusicState): void;
export function crossfadeTo(state: MusicState, duration: number): void;
```

Features:
- Smooth crossfade between themes
- Combat music intensity scales with battle progress
- Boss phase transitions trigger music changes

#### 3. Province Ambient Sounds

**File**: `src/systems/audioSystem.ts`
**Changes**: Add province-specific ambient audio

Province ambient sound characteristics:
- **Ontario**: Urban hum, distant traffic
- **Quebec**: Accordion hints, cafe ambiance
- **Alberta**: Wind, distant cattle
- **BC**: Rain, ocean waves
- **Maritime provinces**: Seagulls, foghorns
- **Northern territories**: Arctic wind, aurora crackles

#### 4. Combat Audio Integration

**File**: `src/systems/combatEngine.ts`
**Changes**: Trigger appropriate music states

- Start combat music when entering battle
- Switch to boss music for boss fights
- Phase transition audio cues
- Victory/defeat music triggers

#### 5. Audio Preferences Persistence

**File**: `src/stores/gameStore.ts`
**Changes**: Save audio preferences with game state

- Music preferences per context
- Volume levels persist
- Province ambient preferences

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] No audio-related console errors

#### Manual Verification:
- [ ] Music changes appropriately between states
- [ ] Combat music feels tense
- [ ] Boss music is epic
- [ ] Province ambient sounds are distinct
- [ ] Audio transitions are smooth

---

## Phase 8.5: Performance Optimization - Initial Load

### Overview

Optimize initial load time to achieve < 3 second target through code splitting, asset optimization, and lazy loading.

### Changes Required:

#### 1. Route-Based Code Splitting

**File**: `src/App.tsx`
**Changes**: Lazy load heavy components

```typescript
const CombatPanel = lazy(() => import('./components/ui/CombatPanel'));
const CraftingPanel = lazy(() => import('./components/ui/CraftingPanel'));
const PrestigePanel = lazy(() => import('./components/ui/PrestigePanel'));
const SettingsPanel = lazy(() => import('./components/ui/SettingsPanel'));
```

- Wrap with Suspense and fallback
- Preload on hover/focus of tab buttons
- Critical path remains synchronous

#### 2. Vite Build Optimization

**File**: `vite.config.ts`
**Changes**: Optimize production build

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'game-data': [
            './src/data/heroes.ts',
            './src/data/enemies.ts',
            './src/data/zones.ts',
            // ... other data files
          ],
        },
      },
    },
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
  },
});
```

#### 3. Data File Optimization

**File**: `src/data/*.ts`
**Changes**: Optimize data structure imports

- Use dynamic imports for large data arrays
- Create index files for barrel exports
- Tree-shake unused data

#### 4. Three.js Optimization

**File**: `src/components/game/GameScene.tsx`
**Changes**: Optimize 3D scene initialization

- Defer non-critical geometry creation
- Use instanced rendering where possible
- Implement object pooling for particles
- Lazy load complex materials

#### 5. Asset Preloading Strategy

**File**: `src/main.tsx`
**Changes**: Implement strategic preloading

```typescript
// Preload critical assets during loading screen
const criticalAssets = [
  '/icons/loonie.svg',
  '/icons/maple-leaf.svg',
];

// Defer non-critical assets
const deferredAssets = [
  // Province-specific assets
  // Combat animations
];
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm build` succeeds
- [x] Bundle analyzer shows proper chunking
- [x] No dynamic import errors

#### Manual Verification:
- [ ] Initial load < 3 seconds on 3G throttle
- [ ] Lighthouse performance > 80
- [ ] No layout shifts during load
- [x] Lazy components load seamlessly

---

## Phase 8.6: Performance Optimization - Runtime

### Overview

Optimize runtime performance to maintain 60 FPS on desktop and 30 FPS on mobile.

### Changes Required:

#### 1. Game Loop Optimization

**File**: `src/systems/gameLoop.ts`
**Changes**: Optimize tick frequency

- Separate visual updates (60fps) from game logic (10fps)
- Use `requestIdleCallback` for non-critical updates
- Batch state updates to reduce re-renders
- Implement frame budget monitoring

#### 2. React Render Optimization

**File**: Multiple component files
**Changes**: Reduce unnecessary re-renders

- Add `React.memo` to pure components
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Implement virtualization for long lists (generators, equipment)

#### 3. Zustand Selector Optimization

**File**: `src/stores/gameStore.ts`
**Changes**: Optimize state subscriptions

```typescript
// Bad: subscribes to entire state
const state = useGameStore((state) => state);

// Good: subscribes only to needed values
const curds = useGameStore((state) => state.curds);
const generators = useGameStore(
  useShallow((state) => state.generators)
);
```

- Use shallow equality for object/array subscriptions
- Split selectors by update frequency
- Create derived state selectors

#### 4. Three.js Render Optimization

**File**: `src/components/game/GameScene.tsx`, `CheeseWheel.tsx`, `ClickEffects.tsx`
**Changes**: Optimize 3D rendering

- Implement draw call batching
- Use `useFrame` throttling for animations
- Reduce geometry complexity on mobile
- Implement frustum culling

#### 5. Mobile-Specific Optimizations

**File**: `src/App.tsx`, `src/systems/gameLoop.ts`
**Changes**: Detect and optimize for mobile

```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  // Reduce particle count
  // Lower texture resolution
  // Simplify 3D geometry
  // Reduce animation frame rate
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No performance warnings in console

#### Manual Verification:
- [ ] Maintains 60 FPS on desktop during active play
- [ ] Maintains 30 FPS on mid-tier mobile
- [ ] No dropped frames during combat
- [ ] Memory usage stable over extended play

---

## Phase 8.7: Accessibility - Screen Reader Support

### Overview

Implement screen reader support for all UI elements to ensure the game is playable by visually impaired users.

### Changes Required:

#### 1. ARIA Labels and Roles

**File**: Multiple component files
**Changes**: Add comprehensive ARIA attributes

```tsx
// Currency display
<div role="status" aria-live="polite" aria-label={`${curds} curds`}>

// Generator button
<button
  aria-label={`Buy ${generator.name} for ${cost} curds. You own ${owned}. Produces ${cps} curds per second.`}
  aria-disabled={!canAfford}
>

// Tab navigation
<div role="tablist">
  <button role="tab" aria-selected={active} aria-controls="panel-id">
```

#### 2. Screen Reader Announcements

**File**: `src/systems/accessibilityAnnouncer.ts` (new)
**Changes**: Create announcement system

```typescript
export function announce(message: string, priority: 'polite' | 'assertive'): void;
export function announceAchievement(achievement: Achievement): void;
export function announceCombatAction(action: CombatAction): void;
export function announceMilestone(milestone: string): void;
```

- Use visually hidden live region
- Queue announcements to prevent overlap
- Priority system for urgent vs informational

#### 3. Focus Management

**File**: Multiple component files
**Changes**: Implement proper focus handling

- Focus trap in modals
- Return focus after modal close
- Skip links for main content
- Focus indicators for all interactive elements

#### 4. Combat Accessibility

**File**: `src/components/ui/CombatPanel.tsx`
**Changes**: Make combat playable via screen reader

- Announce turn order
- Announce health changes
- Announce ability availability
- Describe enemy states

### Success Criteria:

#### Automated Verification:
- [ ] axe-core accessibility audit passes
- [ ] No ARIA warnings

#### Manual Verification:
- [ ] Game playable with VoiceOver/NVDA
- [ ] All actions announced appropriately
- [ ] Focus management works correctly
- [ ] Combat is understandable via audio only

---

## Phase 8.8: Accessibility - Visual Modes

### Overview

Implement colorblind modes, high contrast, and reduced motion for visual accessibility.

### Changes Required:

#### 1. Colorblind Mode Filters

**File**: `src/index.css`
**Changes**: Add colorblind CSS filters

```css
.colorblind-protanopia {
  filter: url('#protanopia-filter');
}

.colorblind-deuteranopia {
  filter: url('#deuteranopia-filter');
}

.colorblind-tritanopia {
  filter: url('#tritanopia-filter');
}
```

Also update game elements to use patterns/shapes instead of color alone for important information.

#### 2. High Contrast Mode

**File**: `src/index.css`, `tailwind.config.js`
**Changes**: Add high contrast theme

```css
.high-contrast {
  --color-text: #000000;
  --color-background: #ffffff;
  --color-primary: #0000ff;
  --color-success: #008000;
  --color-error: #ff0000;
  /* Increased border widths */
  /* Sharper shadows */
}
```

#### 3. Reduced Motion Support

**File**: `src/index.css`, multiple component files
**Changes**: Respect prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Also check settings.accessibility.reducedMotion
- Replace animations with instant state changes
- Keep essential feedback (use opacity/color instead of motion)

#### 4. Font Size Scaling

**File**: `src/index.css`
**Changes**: Implement font size preferences

```css
.font-size-small { font-size: 14px; }
.font-size-medium { font-size: 16px; }
.font-size-large { font-size: 20px; }
```

- Apply to root element
- Scale relative units appropriately
- Ensure layout doesn't break at larger sizes

#### 5. Apply Accessibility Settings

**File**: `src/App.tsx`
**Changes**: Apply accessibility classes to root

```typescript
const { colorblindMode, reducedMotion, highContrast, fontSize } = settings.accessibility;

return (
  <div className={`
    ${colorblindMode !== 'none' ? `colorblind-${colorblindMode}` : ''}
    ${reducedMotion ? 'reduced-motion' : ''}
    ${highContrast ? 'high-contrast' : ''}
    font-size-${fontSize}
  `}>
```

### Success Criteria:

#### Automated Verification:
- [x] WCAG 2.1 AA color contrast checks pass
- [x] Type checking passes: `pnpm typecheck` (pre-existing errors unrelated to Phase 8.8)

#### Manual Verification:
- [x] Colorblind modes visibly change appearance
- [x] High contrast mode is clearly readable
- [x] Reduced motion eliminates animations
- [x] Font size changes apply throughout
- [x] Game remains playable in all modes

---

## Phase 8.9: Accessibility - Keyboard Navigation

### Overview

Implement full keyboard navigation so the game is playable without a mouse.

### Changes Required:

#### 1. Tab Order Optimization

**File**: Multiple component files
**Changes**: Ensure logical tab order

- Main content areas follow visual flow
- Skip repetitive navigation
- Tab indices only where needed (avoid positive tabindex)

#### 2. Keyboard Shortcuts

**File**: `src/hooks/useKeyboardShortcuts.ts` (new)
**Changes**: Create global keyboard shortcuts

```typescript
const SHORTCUTS = {
  'Space': 'click', // Click cheese wheel
  '1-5': 'buyGenerator', // Buy generators 1-5
  'u': 'openUpgrades',
  'g': 'openGenerators',
  'h': 'openHeroes',
  'c': 'openCombat',
  'p': 'openPrestige',
  'Escape': 'closeModal',
  '?': 'openHelp',
};
```

#### 3. Cheese Wheel Keyboard Interaction

**File**: `src/components/game/CheeseWheel.tsx`
**Changes**: Make cheese wheel keyboard accessible

- Focusable element
- Space/Enter to click
- Visual focus indicator
- Announce click results

#### 4. Combat Keyboard Controls

**File**: `src/components/ui/CombatPanel.tsx`
**Changes**: Add keyboard controls for combat

- Arrow keys to select abilities
- Enter to activate
- Tab through targets
- Escape to flee (with confirmation)

#### 5. Keyboard Help Modal

**File**: `src/components/ui/KeyboardHelpModal.tsx` (new)
**Changes**: Create keyboard shortcut reference

- Lists all available shortcuts
- Grouped by context
- Accessible via '?' key
- Includes link to full accessibility info

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No keyboard trap issues (automated check)

#### Manual Verification:
- [ ] Game fully playable with keyboard only
- [ ] All interactive elements reachable via Tab
- [ ] Shortcuts work as documented
- [ ] Focus visible at all times
- [ ] Combat playable with keyboard

---

## Phase 8.10: Analytics Infrastructure

### Overview

Implement anonymous analytics for understanding player progression and identifying issues.

### Changes Required:

#### 1. Analytics Event Types

**File**: `src/types/analytics.ts` (new)
**Changes**: Define analytics event schema

```typescript
interface AnalyticsEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
}

type GameEvent =
  | { type: 'session_start'; data: { returning: boolean } }
  | { type: 'click'; data: { count: number } }
  | { type: 'generator_purchase'; data: { generatorId: string; count: number } }
  | { type: 'upgrade_purchase'; data: { upgradeId: string } }
  | { type: 'achievement_unlock'; data: { achievementId: string } }
  | { type: 'prestige'; data: { tier: string; rennet: number } }
  | { type: 'combat_start'; data: { zoneId: string; stageNumber: number } }
  | { type: 'combat_end'; data: { result: string; duration: number } }
  | { type: 'error'; data: { message: string; stack?: string } };
```

#### 2. Analytics Service

**File**: `src/systems/analyticsService.ts` (new)
**Changes**: Create analytics tracking service

```typescript
class AnalyticsService {
  private enabled: boolean;
  private sessionId: string;
  private eventQueue: AnalyticsEvent[];

  track(event: GameEvent): void;
  flush(): void;
  setEnabled(enabled: boolean): void;
  getSessionStats(): SessionStats;
}

export const analytics = new AnalyticsService();
```

Features:
- Event batching (send every 30 seconds or 10 events)
- Offline queue with retry
- Session management
- Opt-out support
- No PII collection

#### 3. Analytics Integration Points

**File**: `src/stores/gameStore.ts`, `src/systems/combatEngine.ts`, etc.
**Changes**: Add analytics calls at key moments

Key events to track:
- Session start/end
- Progression milestones (every 10 levels, prestige, etc.)
- Purchase patterns
- Combat engagement and outcomes
- Error occurrences
- Settings changes

#### 4. A/B Testing Framework

**File**: `src/systems/abTesting.ts` (new)
**Changes**: Create simple A/B testing infrastructure

```typescript
interface Experiment {
  id: string;
  variants: string[];
  weights: number[];
}

export function getVariant(experimentId: string): string;
export function trackConversion(experimentId: string): void;
```

#### 5. Privacy Consent UI

**File**: `src/components/ui/PrivacyConsent.tsx` (new)
**Changes**: Create GDPR-compliant consent flow

- First-run consent prompt
- Explanation of data collected
- Easy opt-out in settings
- Link to privacy policy

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No console errors from analytics

#### Manual Verification:
- [ ] Events fire at appropriate moments
- [ ] Opt-out stops all tracking
- [ ] No PII in event data
- [ ] Events batch correctly

---

## Phase 8.11: Launch Preparation - Beta Testing

### Overview

Create beta testing infrastructure and process for gathering feedback before public launch.

### Changes Required:

#### 1. Beta Version Flag

**File**: `src/stores/gameStore.ts`
**Changes**: Add version and beta flags

```typescript
const GAME_VERSION = '0.9.0-beta';
const IS_BETA = true;

// In save data
interface SaveData {
  version: string;
  // ... existing fields
}
```

#### 2. Feedback Widget

**File**: `src/components/ui/FeedbackWidget.tsx` (new)
**Changes**: Create in-game feedback mechanism

- Floating feedback button
- Feedback form with categories (Bug, Suggestion, Balance, Other)
- Screenshot capture option
- Includes game state snapshot
- Anonymous submission

#### 3. Bug Report System

**File**: `src/systems/bugReporter.ts` (new)
**Changes**: Create automated bug reporting

```typescript
interface BugReport {
  description: string;
  category: string;
  screenshot?: string;
  gameState: Partial<GameState>;
  browserInfo: BrowserInfo;
  timestamp: number;
}

export function submitBugReport(report: BugReport): Promise<void>;
export function captureGameState(): Partial<GameState>;
```

#### 4. Beta Tester Agreement

**File**: `src/components/ui/BetaAgreement.tsx` (new)
**Changes**: Create beta participation agreement

- Terms of beta participation
- Data usage acknowledgment
- Bug reporting expectations
- NDA acknowledgment (if applicable)

#### 5. Debug Panel (Beta Only)

**File**: `src/components/ui/DebugPanel.tsx` (new)
**Changes**: Create developer debug tools

Features (only visible in beta):
- Game state inspector
- Currency/resource cheats
- Time manipulation
- Force achievement unlocks
- Combat skip
- Zone unlocks

```typescript
// Only render in beta
{IS_BETA && <DebugPanel />}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Debug panel hidden in production build

#### Manual Verification:
- [ ] Feedback widget submits successfully
- [ ] Bug reports capture relevant information
- [ ] Debug tools work correctly
- [ ] Beta flag gates appropriate features

---

## Phase 8.12: Launch Preparation - Documentation & Assets

### Overview

Create press kit, trailer specifications, and community setup documentation.

### Changes Required:

#### 1. Press Kit Specification

**File**: `docs/press-kit.md` (new)
**Changes**: Document press kit requirements

Contents to prepare:
- Game logo (various sizes)
- Screenshots (desktop and mobile)
- Gameplay GIF
- Feature bullet points
- Contact information
- System requirements
- Release date

#### 2. Trailer Specifications

**File**: `docs/trailer-spec.md` (new)
**Changes**: Document trailer requirements

Trailer structure:
- 0-5s: Hook (cheese wheel explosion)
- 5-15s: Core gameplay (clicking, production)
- 15-25s: Combat system
- 25-35s: Prestige system
- 35-45s: Canadian content montage
- 45-60s: Call to action, logo

Technical specs:
- 1080p minimum, 4K preferred
- 60fps
- MP4 with H.264

#### 3. Community Setup Guide

**File**: `docs/community-setup.md` (new)
**Changes**: Document community channel setup

Recommended channels:
- Discord server structure
- Reddit subreddit guidelines
- Twitter/X posting strategy
- YouTube channel setup

#### 4. FAQ Document

**File**: `docs/faq.md` (new)
**Changes**: Create player FAQ

Categories:
- Gameplay basics
- Saving/loading
- Progression tips
- Accessibility
- Bug reporting
- Contact

#### 5. Changelog System

**File**: `src/data/changelog.ts` (new)
**Changes**: Create in-game changelog

```typescript
interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'feature' | 'fix' | 'balance' | 'content';
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-XX-XX',
    changes: [
      { type: 'feature', description: 'Initial release!' },
    ],
  },
];
```

**File**: `src/components/ui/ChangelogModal.tsx` (new)
**Changes**: Create changelog viewer

- Shows on first visit after update
- Accessible from settings
- Categorized and searchable

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck` (new files pass; pre-existing errors unrelated to Phase 8.12)
- [x] All documentation files exist

#### Manual Verification:
- [x] Press kit spec is comprehensive
- [x] Trailer spec covers all systems
- [x] Community guide is actionable
- [x] FAQ covers common questions
- [x] Changelog modal displays correctly

---

## Testing Strategy

### Performance Testing
- Lighthouse audits for mobile and desktop
- Frame rate monitoring during gameplay
- Memory leak detection over extended sessions
- Bundle size analysis
- Initial load time measurement

### Accessibility Testing
- Automated axe-core audits
- Manual screen reader testing (VoiceOver, NVDA)
- Keyboard-only navigation testing
- Color contrast verification
- Reduced motion preference testing

### Cross-Browser Testing
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Beta Testing Process
1. Internal testing (1 week)
2. Closed beta with invited testers (2 weeks)
3. Open beta (1 week)
4. Fix critical issues
5. Release

### Regression Testing
- All Phase 1-7 features still functional
- Save compatibility with existing saves
- No new console errors
- Performance maintained or improved

---

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Phase 8 section: Lines 505-545
- Current audio system: `src/systems/audioSystem.ts`
- Current app structure: `src/App.tsx`
- Type definitions: `src/types/game.ts`
- Existing plans: `thoughts/shared/plans/phase1-7-*.md`

---

*This plan covers Phase 8 (Polish & Launch). Upon completion, the game will be ready for public release with professional polish, full accessibility, and the infrastructure needed for ongoing community engagement.*
