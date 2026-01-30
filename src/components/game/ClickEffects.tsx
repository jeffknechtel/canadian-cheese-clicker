import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatNumber } from '../../utils/formatNumber';
import {
  type Particle,
  type ParticleConfig,
  createParticles,
  updateParticles,
  getParticleStyles,
  getAdjustedParticleCount,
  PARTICLE_PRESETS,
} from '../../systems/particleSystem';

interface FloatingNumber {
  id: number;
  value: string;
  x: number;
  y: number;
  opacity: number;
  isCrit: boolean;
}

export function ClickEffects() {
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);
  const totalClicks = useGameStore((state) => state.totalClicks);
  const getClickValue = useGameStore((state) => state.getClickValue);
  const lastClicks = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const particleConfigRef = useRef<ParticleConfig | null>(null);

  // Settings
  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Determine if a click is a "critical" (every 10th click for demo, or based on bonuses)
  const isCriticalClick = useCallback(() => {
    // Simple heuristic: 10% chance for critical burst effect
    return Math.random() < 0.1;
  }, []);

  // Watch for clicks and create floating numbers + particles
  useEffect(() => {
    if (totalClicks > lastClicks.current) {
      const clickValue = getClickValue();
      const id = nextId.current++;
      const crit = isCriticalClick();

      // Random position near center
      const x = 50 + (Math.random() - 0.5) * 20;
      const y = 45 + (Math.random() - 0.5) * 10;

      setFloatingNumbers((prev) => [
        ...prev,
        { id, value: `+${formatNumber(clickValue)}`, x, y, opacity: 1, isCrit: crit },
      ]);

      // Create particles if enabled
      if (particlesEnabled && !reducedMotion) {
        const preset = crit ? PARTICLE_PRESETS.criticalBurst : PARTICLE_PRESETS.cheeseCrumbs;
        particleConfigRef.current = {
          ...preset,
          count: getAdjustedParticleCount(preset.count),
        };

        // Convert percentage to pixels (approximate center of click area)
        const containerWidth = window.innerWidth * 0.4; // Approximate game scene width
        const containerHeight = window.innerHeight * 0.5;
        const pixelX = (x / 100) * containerWidth;
        const pixelY = (y / 100) * containerHeight;

        const newParticles = createParticles(pixelX, pixelY, particleConfigRef.current);
        setParticles((prev) => [...prev, ...newParticles]);
      }

      lastClicks.current = totalClicks;
    }
  }, [totalClicks, getClickValue, isCriticalClick, particlesEnabled, reducedMotion]);

  // Animate and remove old numbers
  const hasFloatingNumbers = floatingNumbers.length > 0;
  useEffect(() => {
    if (!hasFloatingNumbers) return;

    const interval = setInterval(() => {
      setFloatingNumbers((prev) =>
        prev
          .map((num) => ({
            ...num,
            y: num.y - 2,
            opacity: num.opacity - 0.05,
          }))
          .filter((num) => num.opacity > 0)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [hasFloatingNumbers]);

  // Animate particles
  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles || !particleConfigRef.current) return;

    const animate = (time: number) => {
      const deltaMs = lastTimeRef.current === 0 ? 16 : time - lastTimeRef.current;
      lastTimeRef.current = time;

      setParticles((prev) => {
        if (prev.length === 0 || !particleConfigRef.current) return prev;
        return updateParticles(prev, deltaMs, particleConfigRef.current);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hasParticles]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Floating numbers */}
      {floatingNumbers.map((num) => (
        <div
          key={num.id}
          className={`absolute font-bold transition-none ${
            num.isCrit
              ? 'text-3xl text-amber-300'
              : 'text-2xl text-cheddar-400'
          }`}
          style={{
            left: `${num.x}%`,
            top: `${num.y}%`,
            opacity: num.opacity,
            transform: `translate(-50%, -50%) ${num.isCrit ? 'scale(1.2)' : ''}`,
            textShadow: num.isCrit
              ? '0 0 10px rgba(251, 191, 36, 0.8), 2px 2px 4px rgba(0,0,0,0.4)'
              : '2px 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {num.value}
          {num.isCrit && <span className="text-xs ml-1">CRIT!</span>}
        </div>
      ))}

      {/* Particles */}
      {particlesEnabled && !reducedMotion && particles.map((particle) => (
        <div key={particle.id} style={getParticleStyles(particle)} />
      ))}
    </div>
  );
}
