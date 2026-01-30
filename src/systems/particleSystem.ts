/**
 * Particle System for Visual Effects
 *
 * Provides reusable particle effects for the game using HTML/CSS-based particles.
 * These integrate with the settings store to respect the "particles enabled" setting.
 */

import { useSettingsStore } from '../stores/settingsStore';

// ===== Types =====

export interface ParticleConfig {
  count: number;
  colors: readonly string[];
  size: number; // in pixels
  lifetime: number; // in ms
  velocity: { readonly x: number; readonly y: number };
  spread: number; // randomness factor 0-1
  gravity?: number; // pixels per second squared
  fadeOut?: boolean;
  rotation?: boolean;
  shape?: 'circle' | 'square' | 'star' | 'leaf';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  shape: ParticleConfig['shape'];
  createdAt: number;
  lifetime: number;
}

// ===== Preset Configurations =====

export const PARTICLE_PRESETS = {
  // Cheese crumb particles for clicking
  cheeseCrumbs: {
    count: 8,
    colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef3c7'],
    size: 6,
    lifetime: 800,
    velocity: { x: 0, y: -2 },
    spread: 0.8,
    gravity: 200,
    fadeOut: true,
    rotation: true,
    shape: 'square' as const,
  },

  // Critical click golden burst
  criticalBurst: {
    count: 16,
    colors: ['#ffd700', '#ffec4d', '#fff9e6', '#fbbf24'],
    size: 8,
    lifetime: 1000,
    velocity: { x: 0, y: -3 },
    spread: 1,
    gravity: 100,
    fadeOut: true,
    rotation: true,
    shape: 'star' as const,
  },

  // Achievement confetti
  confetti: {
    count: 30,
    colors: ['#c8102e', '#ffffff', '#fbbf24', '#22c55e', '#3b82f6'],
    size: 10,
    lifetime: 2000,
    velocity: { x: 0, y: -4 },
    spread: 1,
    gravity: 150,
    fadeOut: true,
    rotation: true,
    shape: 'square' as const,
  },

  // Maple leaf particles for Canadian achievements
  mapleLeaves: {
    count: 12,
    colors: ['#c8102e', '#a80d24', '#ff4d4d'],
    size: 16,
    lifetime: 2500,
    velocity: { x: 0.5, y: -1 },
    spread: 0.6,
    gravity: 50,
    fadeOut: true,
    rotation: true,
    shape: 'leaf' as const,
  },

  // Golden sparkles for rare achievements
  goldenSparkles: {
    count: 20,
    colors: ['#ffd700', '#ffec4d', '#fff9e6'],
    size: 4,
    lifetime: 1500,
    velocity: { x: 0, y: -2 },
    spread: 0.9,
    gravity: -20, // Float upward
    fadeOut: true,
    rotation: false,
    shape: 'star' as const,
  },

  // Prestige aging swirl
  agingSwirl: {
    count: 24,
    colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
    size: 8,
    lifetime: 2000,
    velocity: { x: 0, y: -3 },
    spread: 0.7,
    gravity: -40, // Float up
    fadeOut: true,
    rotation: true,
    shape: 'circle' as const,
  },

  // Golden Rennet particles
  rennetFloat: {
    count: 15,
    colors: ['#ffd700', '#f59e0b', '#fbbf24'],
    size: 6,
    lifetime: 3000,
    velocity: { x: 0, y: -1.5 },
    spread: 0.4,
    gravity: -30,
    fadeOut: true,
    rotation: false,
    shape: 'circle' as const,
  },

  // Healing sparkles (green)
  healingSparkles: {
    count: 10,
    colors: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
    size: 5,
    lifetime: 1200,
    velocity: { x: 0, y: -2 },
    spread: 0.5,
    gravity: -50,
    fadeOut: true,
    rotation: false,
    shape: 'star' as const,
  },

  // Damage impact (red)
  damageImpact: {
    count: 8,
    colors: ['#ef4444', '#dc2626', '#f87171'],
    size: 6,
    lifetime: 600,
    velocity: { x: 0, y: 0 },
    spread: 1,
    gravity: 100,
    fadeOut: true,
    rotation: true,
    shape: 'circle' as const,
  },

  // Limit break explosion
  limitBreakExplosion: {
    count: 40,
    colors: ['#ffd700', '#ff6b35', '#ff4d4d', '#ffffff'],
    size: 10,
    lifetime: 1500,
    velocity: { x: 0, y: -4 },
    spread: 1,
    gravity: 80,
    fadeOut: true,
    rotation: true,
    shape: 'star' as const,
  },
} as const;

// ===== Utility Functions =====

let particleIdCounter = 0;

function generateParticleId(): string {
  return `particle_${Date.now()}_${particleIdCounter++}`;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if particles are enabled in settings
 */
export function areParticlesEnabled(): boolean {
  return useSettingsStore.getState().graphics.particlesEnabled;
}

/**
 * Create particles based on configuration
 */
export function createParticles(
  originX: number,
  originY: number,
  config: ParticleConfig
): Particle[] {
  const particles: Particle[] = [];
  const now = Date.now();

  for (let i = 0; i < config.count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spreadFactor = Math.random() * config.spread;

    const vx = config.velocity.x + Math.cos(angle) * spreadFactor * 3;
    const vy = config.velocity.y + Math.sin(angle) * spreadFactor * 3;

    particles.push({
      id: generateParticleId(),
      x: originX + randomRange(-10, 10) * config.spread,
      y: originY + randomRange(-10, 10) * config.spread,
      vx,
      vy,
      color: pickRandom(config.colors),
      size: config.size * randomRange(0.7, 1.3),
      opacity: 1,
      rotation: config.rotation ? randomRange(0, 360) : 0,
      rotationSpeed: config.rotation ? randomRange(-180, 180) : 0,
      shape: config.shape ?? 'circle',
      createdAt: now,
      lifetime: config.lifetime * randomRange(0.8, 1.2),
    });
  }

  return particles;
}

/**
 * Update particles for one frame
 */
export function updateParticles(
  particles: Particle[],
  deltaMs: number,
  config: ParticleConfig
): Particle[] {
  const now = Date.now();
  const deltaSeconds = deltaMs / 1000;
  const gravity = config.gravity ?? 0;

  return particles
    .map((p) => {
      const age = now - p.createdAt;
      const lifeProgress = age / p.lifetime;

      if (lifeProgress >= 1) {
        return null; // Remove dead particles
      }

      return {
        ...p,
        x: p.x + p.vx * deltaSeconds * 100,
        y: p.y + p.vy * deltaSeconds * 100,
        vy: p.vy + gravity * deltaSeconds * 0.01,
        rotation: p.rotation + p.rotationSpeed * deltaSeconds,
        opacity: config.fadeOut ? 1 - lifeProgress : 1,
      };
    })
    .filter((p): p is Particle => p !== null);
}

// ===== React Integration =====

/**
 * Get particle shape SVG path or CSS
 */
export function getParticleStyles(particle: Particle): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    left: particle.x,
    top: particle.y,
    width: particle.size,
    height: particle.size,
    backgroundColor: particle.color,
    opacity: particle.opacity,
    transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
    pointerEvents: 'none',
  };

  switch (particle.shape) {
    case 'circle':
      return { ...baseStyles, borderRadius: '50%' };
    case 'square':
      return { ...baseStyles, borderRadius: '2px' };
    case 'star':
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        background: particle.color,
      };
    case 'leaf':
      return {
        ...baseStyles,
        borderRadius: '0 50% 50% 50%',
        transform: `translate(-50%, -50%) rotate(${particle.rotation + 45}deg)`,
      };
    default:
      return baseStyles;
  }
}

// ===== Particle Effect Hooks =====

export type ParticleEffect =
  | 'cheeseCrumbs'
  | 'criticalBurst'
  | 'confetti'
  | 'mapleLeaves'
  | 'goldenSparkles'
  | 'agingSwirl'
  | 'rennetFloat'
  | 'healingSparkles'
  | 'damageImpact'
  | 'limitBreakExplosion';

/**
 * Get preset config by effect name
 */
export function getPresetConfig(effect: ParticleEffect): ParticleConfig {
  return PARTICLE_PRESETS[effect];
}

/**
 * Adjust particle count based on quality settings
 */
export function getAdjustedParticleCount(baseCount: number): number {
  const quality = useSettingsStore.getState().graphics.quality;
  switch (quality) {
    case 'low':
      return Math.ceil(baseCount * 0.25);
    case 'medium':
      return Math.ceil(baseCount * 0.5);
    case 'high':
      return Math.ceil(baseCount * 0.75);
    case 'ultra':
    default:
      return baseCount;
  }
}

// ===== Global Particle Emitter =====

// Global emitter for triggering particles from anywhere
type EmitCallback = (x: number, y: number, effect: ParticleEffect) => void;
let globalEmitter: EmitCallback | null = null;

export function setGlobalParticleEmitter(emitter: EmitCallback | null): void {
  globalEmitter = emitter;
}

export function emitParticles(x: number, y: number, effect: ParticleEffect): void {
  if (globalEmitter) {
    globalEmitter(x, y, effect);
  }
}
