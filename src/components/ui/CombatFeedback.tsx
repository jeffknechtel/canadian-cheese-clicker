import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  type Particle,
  type ParticleConfig,
  type ParticleEffect,
  createParticles,
  updateParticles,
  getParticleStyles,
  getAdjustedParticleCount,
  PARTICLE_PRESETS,
} from '../../systems/particleSystem';

// ===== Damage Number Types =====

export interface DamageNumber {
  id: string;
  value: number;
  type: 'damage' | 'heal' | 'crit' | 'miss' | 'block';
  x: number;
  y: number;
}

// ===== Damage Number Components =====

interface DamageNumberProps {
  damage: DamageNumber;
  onComplete: (id: string) => void;
}

export function DamageNumberDisplay({ damage, onComplete }: DamageNumberProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete(damage.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [damage.id, onComplete]);

  if (!isAnimating) return null;

  const getTypeStyles = () => {
    switch (damage.type) {
      case 'damage':
        return 'text-red-500 text-lg';
      case 'heal':
        return 'text-green-500 text-lg';
      case 'crit':
        return 'text-orange-500 text-xl font-bold';
      case 'miss':
        return 'text-gray-400 text-sm italic';
      case 'block':
        return 'text-blue-400 text-sm';
      default:
        return 'text-white text-lg';
    }
  };

  const displayValue = damage.type === 'heal' ? `+${damage.value}` :
                       damage.type === 'miss' ? 'MISS' :
                       damage.type === 'block' ? 'BLOCK' :
                       `-${damage.value}`;

  return (
    <div
      className={`
        absolute pointer-events-none font-bold
        animate-damage-float
        ${getTypeStyles()}
      `}
      style={{
        left: `${damage.x}%`,
        top: `${damage.y}%`,
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
      }}
    >
      {displayValue}
    </div>
  );
}

interface DamageNumberContainerProps {
  numbers: DamageNumber[];
  onRemove: (id: string) => void;
}

export function DamageNumberContainer({ numbers, onRemove }: DamageNumberContainerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {numbers.map((num) => (
        <DamageNumberDisplay key={num.id} damage={num} onComplete={onRemove} />
      ))}
    </div>
  );
}

// ===== Flash Overlay Component =====

interface FlashOverlayProps {
  isFlashing: boolean;
  color: 'red' | 'gold' | 'white' | 'green';
}

export function FlashOverlay({ isFlashing, color }: FlashOverlayProps) {
  if (!isFlashing) return null;

  const colorMap = {
    red: 'bg-red-500',
    gold: 'bg-yellow-400',
    white: 'bg-white',
    green: 'bg-green-400',
  };

  return (
    <div
      className={`
        absolute inset-0 pointer-events-none z-10
        ${colorMap[color]}
        animate-flash
      `}
    />
  );
}

// ===== Victory/Defeat Animations =====

interface CombatResultBannerProps {
  result: 'victory' | 'defeat';
  onAnimationComplete?: () => void;
}

export function CombatResultBanner({ result, onAnimationComplete }: CombatResultBannerProps) {
  useEffect(() => {
    if (onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [onAnimationComplete]);

  const isVictory = result === 'victory';

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      <div
        className={`
          px-8 py-4 rounded-lg shadow-2xl
          animate-result-banner
          ${isVictory
            ? 'bg-linear-to-r from-green-500 to-emerald-600'
            : 'bg-linear-to-r from-red-500 to-rose-600'
          }
        `}
      >
        <div className="text-center">
          <div className="text-3xl mb-1">
            {isVictory ? '🎉🍁🎉' : '💀😢💀'}
          </div>
          <div className="text-2xl font-bold text-white tracking-wide">
            {isVictory ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className="text-sm text-white/80 mt-1">
            {isVictory
              ? "Beauty, eh! That was gouda!"
              : "Sorry about that, folks..."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Combo Counter =====

interface ComboCounterProps {
  count: number;
  maxCombo: number;
}

export function ComboCounter({ count, maxCombo }: ComboCounterProps) {
  if (count < 2) return null;

  const intensity = count >= 10 ? 'max' : count >= 5 ? 'high' : 'normal';

  return (
    <div
      className={`
        absolute top-2 right-2 px-3 py-1 rounded-lg font-bold
        ${intensity === 'max'
          ? 'bg-linear-to-r from-orange-500 to-red-500 text-white animate-pulse'
          : intensity === 'high'
            ? 'bg-linear-to-r from-yellow-400 to-orange-500 text-white'
            : 'bg-linear-to-r from-blue-400 to-blue-500 text-white'
        }
      `}
    >
      <div className="text-xs opacity-80">COMBO</div>
      <div className="text-xl leading-none">{count}</div>
      {count === maxCombo && (
        <div className="text-[10px] text-yellow-200">MAX!</div>
      )}
    </div>
  );
}

// ===== Attack Effect Indicator =====

interface AttackEffectProps {
  type: 'slash' | 'magic' | 'heal' | 'buff' | 'limitBreak';
  position: { x: number; y: number };
}

export function AttackEffect({ type, position }: AttackEffectProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const particleConfigRef = useRef<ParticleConfig | null>(null);

  // Settings
  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Create particles on mount
  useEffect(() => {
    if (!particlesEnabled || reducedMotion) return;

    // Determine particle effect based on attack type
    let effectType: ParticleEffect;
    switch (type) {
      case 'heal':
        effectType = 'healingSparkles';
        break;
      case 'slash':
      case 'magic':
        effectType = 'damageImpact';
        break;
      case 'limitBreak':
        effectType = 'limitBreakExplosion';
        break;
      default:
        effectType = 'goldenSparkles';
    }

    const preset = PARTICLE_PRESETS[effectType];
    particleConfigRef.current = {
      ...preset,
      count: getAdjustedParticleCount(preset.count),
    };

    // Convert percentage to approximate pixel position
    const pixelX = (position.x / 100) * 300;
    const pixelY = (position.y / 100) * 200;
    const newParticles = createParticles(pixelX, pixelY, particleConfigRef.current);
    setParticles(newParticles);
  }, [type, position, particlesEnabled, reducedMotion]);

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

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), type === 'limitBreak' ? 1500 : 400);
    return () => clearTimeout(timer);
  }, [type]);

  if (!isVisible && particles.length === 0) return null;

  const effectEmoji = {
    slash: '💥',
    magic: '✨',
    heal: '💚',
    buff: '⬆️',
    limitBreak: '🌟',
  };

  return (
    <>
      {/* Emoji indicator */}
      {isVisible && (
        <div
          className={`absolute pointer-events-none text-2xl ${type === 'limitBreak' ? 'text-4xl' : ''} animate-attack-effect`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {effectEmoji[type]}
        </div>
      )}

      {/* Particles */}
      {particlesEnabled && !reducedMotion && particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <div key={particle.id} style={getParticleStyles(particle)} />
          ))}
        </div>
      )}
    </>
  );
}
