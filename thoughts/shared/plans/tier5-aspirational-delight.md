# Tier 5: Aspirational Delight Implementation Plan

## Overview

This plan addresses the final tier of the world-class polish roadmap: aspirational features that transform the game from polished to memorable. These are "nice-to-haves" that elevate the experience but aren't blockers for launch. Focus areas: cheese wheel visual evolution, province ambient audio, real click crits, and milestone celebrations.

## Current State Analysis

**Cheese wheel visualization:**
- Current wheel is an untextured amber cylinder (`CheeseWheel.tsx:92-97`)
- No visual progression with production scale
- Shadows configured but never render (`GameScene.tsx:266-268` — no `shadows` prop on Canvas)
- Best example to follow: `GoldenCheeseWheel.tsx:42-108` (scale-in, spin, bob, panic-pulse, fade warning)

**Ambient audio:**
- 13 province ambient configs exist (`audioSystem.ts:567-697`)
- Wind layers defined (`audioSystem.ts:847-899`)
- Chirp patterns defined (`audioSystem.ts:737-820`)
- Province music modifiers defined (`audioSystem.ts:273-287`)
- `setCurrentProvince` (`audioSystem.ts:531`) and `startProvinceAmbient` (`audioSystem.ts:719`) have zero callers
- Prestige music theme `startPrestigeMusic` (`audioSystem.ts:2007`) never called

**Click crits:**
- Fake "CRIT!" on clicks exists (`ClickEffects.tsx:40-43`, `Math.random() < 0.1`, comment says "for demo")
- No gameplay effect behind it — purely cosmetic

**Milestone celebrations:**
- No buy-milestone celebrations (25/50/100 generator purchases)
- Achievement unlock has sound/toast but no party effects

**Typography:**
- System font stack only (`index.css:94`)
- No brand/display font for headers

## Desired End State

1. **Cheese wheel evolves** — Visual changes with production scale: texture, holes, wedges, scene complexity
2. **Province audio plays** — Each combat zone has distinct ambient soundscape
3. **Prestige music plays** — Distinct theme during prestige flow
4. **Click crits are real** — Gameplay-affecting critical clicks with bonus curds
5. **Milestone celebrations** — Buy 25/50/100 generators triggers fireworks
6. **Brand typography** — Display font for headers and key numbers

## What We're NOT Doing

- Full procedural cheese mesh generation (too complex)
- Voice acting or recorded audio (keeping synthesized)
- Leaderboards or social features
- Additional prestige tiers (Vintage/Legacy mechanics)
- New game content (heroes, zones, recipes)

---

## Phase 1: Cheese Wheel Visual Evolution

### Overview

Make the cheese wheel visually reflect production scale — the "Cookie Clicker world reflects progress" effect.

### Changes Required:

#### 1.1 Define Production Tiers

**File**: `src/data/constants.ts`

```typescript
export const CHEESE_WHEEL_TIERS = [
  { threshold: 0,        texture: 'basic',    holes: 0, wedges: 0, glow: false, label: 'Fresh Curd' },
  { threshold: 1_000,    texture: 'aged',     holes: 3, wedges: 0, glow: false, label: 'Young Cheese' },
  { threshold: 100_000,  texture: 'mature',   holes: 6, wedges: 0, glow: false, label: 'Aged Cheese' },
  { threshold: 10_000_000, texture: 'vintage', holes: 9, wedges: 1, glow: false, label: 'Vintage Wheel' },
  { threshold: 1_000_000_000, texture: 'artisan', holes: 12, wedges: 2, glow: true, label: 'Artisan Masterpiece' },
  { threshold: 1_000_000_000_000, texture: 'legendary', holes: 15, wedges: 4, glow: true, label: 'Legendary Fromage' },
] as const;

export type CheeseWheelTier = typeof CHEESE_WHEEL_TIERS[number];
```

#### 1.2 Create Cheese Wheel Textures

**File**: `src/components/game/CheeseWheelTextures.ts` (new file)

```typescript
import * as THREE from 'three';

export type TextureType = 'basic' | 'aged' | 'mature' | 'vintage' | 'artisan' | 'legendary';

const TEXTURE_COLORS: Record<TextureType, { base: string; rind: string }> = {
  basic: { base: '#F5DEB3', rind: '#D4A853' },     // Pale wheat
  aged: { base: '#FDEBD0', rind: '#B8860B' },      // Cream with golden rind
  mature: { base: '#F5CBA7', rind: '#8B4513' },    // Deeper amber
  vintage: { base: '#E8B86D', rind: '#654321' },   // Rich gold
  artisan: { base: '#DAA520', rind: '#4A3728' },   // Goldenrod
  legendary: { base: '#FFD700', rind: '#2F1810' }, // Pure gold
};

export function createCheeseTexture(type: TextureType): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  const colors = TEXTURE_COLORS[type];
  
  // Base color
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, 256, 256);
  
  // Add subtle noise for texture
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 3 + 1;
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Rind edge gradient
  const gradient = ctx.createRadialGradient(128, 128, 100, 128, 128, 128);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, colors.rind + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
```

#### 1.3 Create Cheese Holes Component

**File**: `src/components/game/CheeseHoles.tsx` (new file)

```tsx
import { useMemo } from 'react';

interface CheeseHolesProps {
  count: number;
  radius: number;
  depth: number;
}

export function CheeseHoles({ count, radius, depth }: CheeseHolesProps) {
  const holes = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const r = radius * 0.3 + Math.random() * radius * 0.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (Math.random() - 0.5) * depth * 0.8;
      positions.push([x, y, z]);
    }
    return positions;
  }, [count, radius, depth]);
  
  if (count === 0) return null;
  
  return (
    <>
      {holes.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, 0, Math.random() * Math.PI]}>
          <sphereGeometry args={[0.08 + Math.random() * 0.04, 8, 8]} />
          <meshStandardMaterial color="#2A1F1A" transparent opacity={0.9} />
        </mesh>
      ))}
    </>
  );
}
```

#### 1.4 Create Cheese Wedge Component

**File**: `src/components/game/CheeseWedge.tsx` (new file)

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';

interface CheeseWedgeProps {
  index: number;
  total: number;
  radius: number;
  depth: number;
}

export function CheeseWedge({ index, total, radius, depth }: CheeseWedgeProps) {
  const geometry = useMemo(() => {
    const angle = Math.PI / 6; // 30-degree wedge
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(radius * Math.cos(-angle / 2), radius * Math.sin(-angle / 2));
    shape.absarc(0, 0, radius, -angle / 2, angle / 2, false);
    shape.lineTo(0, 0);
    
    const extrudeSettings = { depth, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [radius, depth]);
  
  const rotation = (index / total) * Math.PI * 2;
  
  return (
    <mesh 
      geometry={geometry}
      position={[Math.cos(rotation) * 0.2, 0, Math.sin(rotation) * 0.2]}
      rotation={[Math.PI / 2, rotation, 0]}
    >
      <meshStandardMaterial color="#FDEBD0" />
    </mesh>
  );
}
```

#### 1.5 Update CheeseWheel Component

**File**: `src/components/game/CheeseWheel.tsx`

Refactor to use tiers:

```tsx
import { useGameStore } from '@/stores/gameStore';
import { CHEESE_WHEEL_TIERS, type CheeseWheelTier } from '@/data/constants';
import { CheeseHoles } from './CheeseHoles';
import { CheeseWedge } from './CheeseWedge';
import { createCheeseTexture } from './CheeseWheelTextures';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CheeseWheel({ onClick, onClickPosition }: CheeseWheelProps) {
  const totalCurdsEarned = useGameStore((s) => s.totalCurdsEarned);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Determine current tier
  const tier = useMemo<CheeseWheelTier>(() => {
    let current = CHEESE_WHEEL_TIERS[0];
    for (const t of CHEESE_WHEEL_TIERS) {
      if (totalCurdsEarned.gte(t.threshold)) {
        current = t;
      }
    }
    return current;
  }, [totalCurdsEarned]);
  
  const texture = useMemo(() => createCheeseTexture(tier.texture), [tier.texture]);
  
  // Gentle wobble animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });
  
  return (
    <group>
      {/* Main wheel */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
          onClickPosition?.(e.point);
        }}
      >
        <cylinderGeometry args={[1, 1, 0.4, 32]} />
        <meshStandardMaterial 
          map={texture}
          roughness={0.7}
          metalness={tier.glow ? 0.3 : 0}
          emissive={tier.glow ? '#FFD700' : '#000000'}
          emissiveIntensity={tier.glow ? 0.2 : 0}
        />
      </mesh>
      
      {/* Cheese holes */}
      <CheeseHoles count={tier.holes} radius={1} depth={0.4} />
      
      {/* Cut wedges */}
      {Array.from({ length: tier.wedges }).map((_, i) => (
        <CheeseWedge key={i} index={i} total={tier.wedges} radius={1.1} depth={0.05} />
      ))}
      
      {/* Glow effect for legendary */}
      {tier.glow && (
        <pointLight position={[0, 0.5, 0]} intensity={0.5} color="#FFD700" distance={3} />
      )}
    </group>
  );
}
```

#### 1.6 Enable Shadows

**File**: `src/components/game/GameScene.tsx`

Add `shadows` prop to Canvas:

```tsx
<Canvas shadows camera={{ position: [0, 2, 4], fov: 50 }}>
  <ambientLight intensity={0.5} />
  <directionalLight 
    position={[5, 5, 5]} 
    intensity={1} 
    castShadow
    shadow-mapSize-width={1024}
    shadow-mapSize-height={1024}
  />
  {/* ... */}
</Canvas>
```

Add shadow props to mesh:

```tsx
<mesh castShadow receiveShadow>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles
- [x] Build succeeds

#### Manual Verification:
- [ ] Fresh game: basic pale cheese wheel
- [ ] 1K curds: aged texture with 3 holes
- [ ] 100K curds: mature texture with 6 holes
- [ ] 10M curds: vintage with holes and 1 wedge
- [ ] 1B curds: artisan with glow effect
- [ ] 1T curds: legendary golden wheel with full effects
- [ ] Shadows visible on ground plane

---

## Phase 2: Province Ambient Audio

### Overview

Wire the existing province ambient audio system to play when entering combat zones.

### Changes Required:

#### 2.1 Track Current Province in Combat State

**File**: `src/stores/slices/combat/combatSlice.ts`

The slice already has `currentZone`. Extract province from zone:

```typescript
import { getZoneById, Zone } from '@/data/zones';

// Selector to get current province
getCurrentProvince: () => {
  const state = get();
  if (!state.combat.currentZone) return null;
  const zone = getZoneById(state.combat.currentZone);
  return zone?.province ?? null;
},
```

#### 2.2 Wire Province Audio on Zone Enter

**File**: `src/stores/slices/combat/combatSlice.ts`

In `enterZone` action:

```typescript
import { setCurrentProvince, startProvinceAmbient, stopProvinceAmbient } from '@/systems/audioSystem';

enterZone: (zoneId: string) => {
  const zone = getZoneById(zoneId);
  if (!zone) return;
  
  // Start province ambient audio
  setCurrentProvince(zone.province);
  startProvinceAmbient();
  
  set((state) => ({
    combat: {
      ...state.combat,
      currentZone: zoneId,
      // ... other zone setup
    },
  }));
},
```

#### 2.3 Stop Ambient on Combat Exit

**File**: `src/stores/slices/combat/combatSlice.ts`

In `exitCombat` or `endBattle`:

```typescript
import { stopProvinceAmbient } from '@/systems/audioSystem';

exitCombat: () => {
  stopProvinceAmbient();
  
  set((state) => ({
    combat: {
      ...state.combat,
      isInCombat: false,
      currentZone: null,
      // ... reset state
    },
  }));
},
```

#### 2.4 Verify Audio System Functions Work

**File**: `src/systems/audioSystem.ts`

Check that `setCurrentProvince`, `startProvinceAmbient`, `stopProvinceAmbient` are exported and functional:

```typescript
// These should already exist based on research:
export function setCurrentProvince(province: string): void {
  currentProvince = province;
}

export function startProvinceAmbient(): void {
  if (!currentProvince) return;
  const config = PROVINCE_AMBIENT[currentProvince];
  if (!config) return;
  
  // Start wind layer
  startWindLayer(config.wind);
  
  // Start chirp patterns
  if (config.chirps) {
    startChirpPattern(config.chirps);
  }
  
  // Adjust music mood
  if (config.musicModifier) {
    setMusicMood(config.musicModifier);
  }
}

export function stopProvinceAmbient(): void {
  stopWindLayer();
  stopChirpPattern();
  resetMusicMood();
}
```

#### 2.5 Add Province Audio Setting

**File**: `src/stores/settingsStore.ts`

```typescript
interface AudioSettings {
  // ... existing
  ambientEnabled: boolean;
  ambientVolume: number;
}

// Defaults:
ambientEnabled: true,
ambientVolume: 0.5,
```

**File**: `src/components/ui/SettingsPanel.tsx`

Add controls:

```tsx
<SettingRow label="Ambient Sounds" description="Environmental sounds during combat">
  <Toggle
    checked={settings.audio.ambientEnabled}
    onChange={(v) => settings.setAmbientEnabled(v)}
  />
</SettingRow>
{settings.audio.ambientEnabled && (
  <SettingRow label="Ambient Volume">
    <Slider
      value={settings.audio.ambientVolume}
      onChange={(v) => settings.setAmbientVolume(v)}
      min={0}
      max={1}
      step={0.1}
    />
  </SettingRow>
)}
```

### Success Criteria:

#### Manual Verification:
- [ ] Enter Ontario zone → hear wind and ambient sounds
- [ ] Enter Quebec zone → different ambient (French-influenced)
- [ ] Enter BC zone → coastal wind/bird sounds
- [ ] Exit combat → ambient stops
- [ ] Ambient toggle in settings works
- [ ] Volume slider affects ambient level

---

## Phase 3: Prestige Music Theme

### Overview

Play a distinct theme during the prestige flow.

### Changes Required:

#### 3.1 Wire Prestige Music

**File**: `src/components/ui/AgingConfirmModal.tsx`

Start prestige music when modal opens:

```typescript
import { startPrestigeMusic, stopPrestigeMusic } from '@/systems/audioSystem';

useEffect(() => {
  if (isOpen) {
    startPrestigeMusic();
  } else {
    stopPrestigeMusic();
  }
  return () => stopPrestigeMusic();
}, [isOpen]);
```

**File**: `src/stores/slices/prestige/prestigeSlice.ts`

Ensure music continues during prestige animation, stops after:

```typescript
performAging: () => {
  // ... prestige logic
  
  // Music fades out as new game starts
  setTimeout(() => {
    stopPrestigeMusic();
    fadeInMainTheme();
  }, 2000);
},
```

#### 3.2 Verify Prestige Music Function

**File**: `src/systems/audioSystem.ts`

Check `startPrestigeMusic` exists and sounds good:

```typescript
export function startPrestigeMusic(): void {
  // Should exist at line ~2007
  // If not implemented, add:
  stopCurrentMusic();
  
  const ctx = getAudioContext();
  // Play a reverential, anticipatory theme
  // Different key/tempo from main theme
  // ...
}

export function stopPrestigeMusic(): void {
  // Fade out prestige theme
}
```

### Success Criteria:

#### Manual Verification:
- [ ] Open Aging modal → prestige theme starts
- [ ] Close modal without aging → theme stops, main music resumes
- [ ] Perform aging → theme continues through reset, then fades to main
- [ ] Theme is distinct from main game music

---

## Phase 4: Real Click Crits

### Overview

Make click criticals affect gameplay — bonus curds on crit, not just visual.

### Changes Required:

#### 4.1 Define Crit Mechanics

**File**: `src/data/constants.ts`

```typescript
// Click critical hit mechanics
export const CLICK_CRIT = {
  baseChance: 0.05,      // 5% base crit chance
  baseDamageMultiplier: 2, // 2x curds on crit
  // Upgrades can modify these
} as const;
```

#### 4.2 Add Crit State to Production

**File**: `src/stores/slices/production/types.ts`

```typescript
export interface ProductionState {
  // ... existing
  lastClickWasCrit: boolean;
  critChance: number;
  critMultiplier: number;
}
```

#### 4.3 Implement Real Crit in Click Action

**File**: `src/stores/slices/production/productionSlice.ts`

```typescript
import { CLICK_CRIT } from '@/data/constants';
import { vibrateCrit } from '@/systems/haptics';
import { playCriticalSound } from '@/systems/audioSystem';

click: () => {
  const state = get();
  const baseValue = state.getClickValue();
  
  // Roll for crit
  const critChance = state.critChance ?? CLICK_CRIT.baseChance;
  const isCrit = Math.random() < critChance;
  
  let earnedCurds = baseValue;
  if (isCrit) {
    const critMult = state.critMultiplier ?? CLICK_CRIT.baseDamageMultiplier;
    earnedCurds = baseValue.mul(critMult);
    vibrateCrit();
    playCriticalSound();
  }
  
  set({
    curds: state.curds.plus(earnedCurds),
    totalCurdsEarned: state.totalCurdsEarned.plus(earnedCurds),
    lastClickWasCrit: isCrit,
    currencyAnimationTrigger: state.currencyAnimationTrigger + 1,
  });
  
  return { earnedCurds, isCrit };
},
```

#### 4.4 Update Click Effects to Use Real Crit

**File**: `src/components/game/ClickEffects.tsx`

Replace fake crit logic:

```typescript
// BEFORE (line 40-43):
const isCrit = Math.random() < 0.1; // fake

// AFTER:
const lastClickWasCrit = useGameStore((s) => s.lastClickWasCrit);

// In floater display:
{lastClickWasCrit && <span className="text-yellow-400 text-xl">CRIT!</span>}
```

#### 4.5 Add Crit Chance Upgrades

**File**: `src/data/upgrades.ts`

Add upgrades that boost crit:

```typescript
{
  id: 'lucky_click_1',
  name: 'Lucky Fingers',
  description: '+2% critical click chance',
  baseCost: new Decimal(10_000_000),
  effect: { type: 'critChance', value: 0.02 },
  requirement: { type: 'generatorOwned', generatorId: 'poutinerie', count: 50 },
},
{
  id: 'devastating_crit_1',
  name: 'Devastating Curds',
  description: '+0.5x critical click multiplier',
  effect: { type: 'critMultiplier', value: 0.5 },
  // ...
},
```

#### 4.6 Add Crit Sound

**File**: `src/systems/audioSystem.ts`

```typescript
export function playCriticalSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;
  
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Powerful, satisfying crit sound
  // Rising chord + impact
  const freqs = [523.25, 659.25, 783.99]; // C major chord
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);
    
    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(getSfxBus());
    
    osc.start(now + i * 0.02);
    osc.stop(now + 0.4);
  });
}
```

### Success Criteria:

#### Manual Verification:
- [ ] Clicking has ~5% chance to crit (visible "CRIT!" and sound)
- [ ] Crit awards 2x curds
- [ ] Crit triggers haptic feedback
- [ ] Crit has distinct sound from normal click
- [ ] Crit upgrades increase chance/multiplier

---

## Phase 5: Buy Milestone Celebrations

### Overview

Celebrate when reaching 25/50/100 of any generator with fireworks.

### Changes Required:

#### 5.1 Define Milestones

**File**: `src/data/constants.ts`

```typescript
export const BUY_MILESTONES = [25, 50, 100, 150, 200, 250, 300, 400, 500] as const;
export type BuyMilestone = typeof BUY_MILESTONES[number];
```

#### 5.2 Check for Milestones in Buy Action

**File**: `src/stores/slices/production/productionSlice.ts`

```typescript
import { BUY_MILESTONES } from '@/data/constants';
import { playMilestoneSound } from '@/systems/audioSystem';
import { emitParticles } from '@/components/ui/ParticleContainer';

buyGenerator: (id, amount = 1) => {
  const state = get();
  const generator = getGeneratorById(id);
  if (!generator) return false;
  
  const currentOwned = state.generators[id] ?? 0;
  const newOwned = currentOwned + amount;
  
  // Check if we crossed a milestone
  const crossedMilestone = BUY_MILESTONES.find(
    (m) => currentOwned < m && newOwned >= m
  );
  
  if (crossedMilestone) {
    playMilestoneSound(crossedMilestone);
    emitParticles('fireworks', { x: window.innerWidth / 2, y: window.innerHeight / 3 });
    announce(`${generator.name} milestone: ${crossedMilestone}!`);
  }
  
  // ... rest of buy logic
},
```

#### 5.3 Add Fireworks Particle Effect

**File**: `src/systems/particleSystem.ts`

Add fireworks effect type:

```typescript
export type ParticleEffectType = 'confetti' | 'sparkle' | 'fireworks';

const FIREWORK_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F97316'];

function createFireworkBurst(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const burstCount = 30;
  
  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2;
    const speed = 3 + Math.random() * 3;
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Slight upward bias
      life: 1,
      decay: 0.02 + Math.random() * 0.01,
      color,
      size: 4 + Math.random() * 4,
    });
  }
  
  return particles;
}
```

#### 5.4 Add Milestone Sound

**File**: `src/systems/audioSystem.ts`

```typescript
export function playMilestoneSound(milestone: number): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;
  
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Fanfare that scales with milestone
  const intensity = Math.min(milestone / 100, 2);
  
  // Rising arpeggio
  const notes = [
    { freq: 523.25, time: 0 },
    { freq: 659.25, time: 0.1 },
    { freq: 783.99, time: 0.2 },
    { freq: 1046.50, time: 0.3 },
  ];
  
  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(volume * 0.3 * intensity, now + time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.4);
    
    osc.connect(gain);
    gain.connect(getSfxBus());
    
    osc.start(now + time);
    osc.stop(now + time + 0.5);
  });
}
```

### Success Criteria:

#### Manual Verification:
- [ ] Buy 25th of any generator → fireworks + fanfare
- [ ] Buy 50th → bigger celebration
- [ ] Buy 100th → biggest celebration
- [ ] Announcement reads out milestone
- [ ] Particles visible and celebratory

---

## Phase 6: Brand Typography

### Overview

Add a display font for headers and big numbers to give the game visual identity.

### Changes Required:

#### 6.1 Choose and Add Font

Options:
- **Bungee** — Bold, game-like
- **Fredoka** — Friendly, rounded
- **Lobster** — Script, artisanal cheese feel
- **Righteous** — Strong, Canadian hockey aesthetic

**File**: `index.html`

Add Google Fonts link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Righteous&display=swap" rel="stylesheet">
```

#### 6.2 Define Typography Tokens

**File**: `src/index.css`

```css
@theme {
  --font-display: 'Righteous', cursive;
  /* Keep existing system font for body */
  --font-body: system-ui, -apple-system, sans-serif;
}
```

Add utility classes:

```css
.font-display {
  font-family: var(--font-display);
}
```

#### 6.3 Apply Display Font to Key Elements

**Headers:**
```tsx
<h1 className="font-display text-2xl">The Great Canadian Cheese Quest</h1>
```

**Currency display:**
```tsx
<span className="font-display text-4xl">{formatNumber(curds)}</span>
```

**Panel titles:**
```tsx
<h2 className="font-display text-xl">Generators</h2>
<h2 className="font-display text-xl">Combat</h2>
```

**Achievement names:**
```tsx
<span className="font-display">{achievement.name}</span>
```

**Modal titles:**
```tsx
<h2 className="font-display text-lg">Age Your Cheese</h2>
```

### Success Criteria:

#### Automated Verification:
- [ ] Font loads without FOUT (flash of unstyled text)
- [ ] Build includes font preload

#### Manual Verification:
- [ ] Game title uses display font
- [ ] Currency counter uses display font
- [ ] Panel headers use display font
- [ ] Body text remains system font (readable)
- [ ] Font feels "on brand" for Canadian cheese theme

---

## Testing Strategy

### Manual Testing Steps:

1. **Cheese Wheel Evolution**:
   - Use dev tools to set curds to each tier threshold
   - Verify visual changes at each tier
   - Check shadows render

2. **Province Audio**:
   - Enter each province zone
   - Listen for distinct ambiance
   - Toggle ambient setting
   - Verify stops on exit

3. **Prestige Music**:
   - Open Aging modal
   - Listen for theme
   - Close without aging → main music
   - Perform aging → theme through reset

4. **Click Crits**:
   - Click many times (20+)
   - Observe ~5% crit rate
   - Verify crit awards 2x
   - Buy crit upgrades, verify higher rate

5. **Milestones**:
   - Buy to 25/50/100 generators
   - Watch for fireworks
   - Listen for fanfare
   - Verify announcement

6. **Typography**:
   - Check all headers
   - Check currency display
   - Verify body text readable

## Performance Considerations

- Cheese textures generated once, cached
- Province audio streams (no large buffers)
- Fireworks limited particle count (30 per burst)
- Display font async loaded (no render block)

## References

- World-class polish roadmap: `thoughts/shared/research/2026-06-12_14-19-23_world-class-polish-roadmap.md`
- Audio system: `src/systems/audioSystem.ts`
- Particle system: `src/systems/particleSystem.ts`
- Cheese wheel: `src/components/game/CheeseWheel.tsx`
- Golden cheese wheel (reference): `src/components/game/GoldenCheeseWheel.tsx`
