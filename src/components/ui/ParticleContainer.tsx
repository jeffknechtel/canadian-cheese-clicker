/**
 * Particle Container Component
 *
 * Renders and animates particles from the particle system.
 * Respects the "particles enabled" setting.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  type Particle,
  type ParticleConfig,
  type ParticleEffect,
  createParticles,
  updateParticles,
  getParticleStyles,
  getPresetConfig,
  getAdjustedParticleCount,
} from '../../systems/particleSystem';

interface ParticleContainerProps {
  className?: string;
}

interface ParticleEmission {
  id: string;
  particles: Particle[];
  config: ParticleConfig;
  startTime: number;
}

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

export function ParticleContainer({ className = '' }: ParticleContainerProps) {
  const [emissions, setEmissions] = useState<ParticleEmission[]>([]);
  const animationRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number>(0);
  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Emit particles at a specific position
  const emit = useCallback(
    (x: number, y: number, effect: ParticleEffect) => {
      if (!particlesEnabled || reducedMotion) return;

      const baseConfig = getPresetConfig(effect);
      const adjustedConfig: ParticleConfig = {
        ...baseConfig,
        count: getAdjustedParticleCount(baseConfig.count),
      };

      const newParticles = createParticles(x, y, adjustedConfig);

      setEmissions((prev) => [
        ...prev,
        {
          id: `emission_${Date.now()}_${Math.random()}`,
          particles: newParticles,
          config: adjustedConfig,
          startTime: Date.now(),
        },
      ]);
    },
    [particlesEnabled, reducedMotion]
  );

  // Register global emitter
  useEffect(() => {
    setGlobalParticleEmitter(emit);
    return () => setGlobalParticleEmitter(null);
  }, [emit]);

  // Animation loop
  useEffect(() => {
    if (emissions.length === 0) return;

    const animate = (time: number) => {
      const deltaMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setEmissions((prev) => {
        const updated = prev
          .map((emission) => ({
            ...emission,
            particles: updateParticles(emission.particles, deltaMs, emission.config),
          }))
          .filter((emission) => emission.particles.length > 0);

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [emissions.length > 0]);

  if (!particlesEnabled || reducedMotion || emissions.length === 0) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {emissions.flatMap((emission) =>
        emission.particles.map((particle) => (
          <div key={particle.id} style={getParticleStyles(particle)} />
        ))
      )}
    </div>
  );
}

// ===== Standalone Particle Burst Component =====

interface ParticleBurstProps {
  x: number;
  y: number;
  effect: ParticleEffect;
  onComplete?: () => void;
}

export function ParticleBurst({ x, y, effect, onComplete }: ParticleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number>(performance.now());
  const configRef = useRef<ParticleConfig>(undefined);
  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Initialize particles
  useEffect(() => {
    if (!particlesEnabled || reducedMotion) {
      onComplete?.();
      return;
    }

    const baseConfig = getPresetConfig(effect);
    configRef.current = {
      ...baseConfig,
      count: getAdjustedParticleCount(baseConfig.count),
    };

    const newParticles = createParticles(x, y, configRef.current);
    setParticles(newParticles);
  }, [x, y, effect, particlesEnabled, reducedMotion, onComplete]);

  // Animation loop
  useEffect(() => {
    if (particles.length === 0 || !configRef.current) return;

    const animate = (time: number) => {
      const deltaMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setParticles((prev) => {
        const updated = updateParticles(prev, deltaMs, configRef.current!);

        if (updated.length === 0) {
          onComplete?.();
        }

        return updated;
      });

      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles.length > 0, onComplete]);

  if (!particlesEnabled || reducedMotion || particles.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div key={particle.id} style={getParticleStyles(particle)} />
      ))}
    </div>
  );
}
