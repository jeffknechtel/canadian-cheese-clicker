import { useEffect, useState, useCallback, useRef } from 'react';
import type { Achievement } from '../../types/game';
import { setAchievementUnlockCallback } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { playAchievementFanfare } from '../../systems/audioSystem';
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

interface ToastItem {
  id: string;
  achievement: Achievement;
  timestamp: number;
}

const TOAST_DURATION_MS = 5000;

function getRewardText(achievement: Achievement): string | null {
  if (!achievement.reward) return null;

  const { type, value } = achievement.reward;
  if (type === 'globalMultiplier') {
    const percent = Math.round((value - 1) * 100);
    return `+${percent}% all production`;
  }
  if (type === 'clickMultiplier') {
    return `x${value} click power`;
  }
  return null;
}

// Check if achievement is Canadian-themed
function isCanadianAchievement(achievement: Achievement): boolean {
  const canadianKeywords = ['canada', 'canadian', 'maple', 'hockey', 'poutine', 'tim', 'eh', 'mountie', 'loonie', 'toonie'];
  const name = achievement.name.toLowerCase();
  const desc = achievement.description.toLowerCase();
  return canadianKeywords.some((kw) => name.includes(kw) || desc.includes(kw));
}

// Check if achievement is rare (has significant rewards)
function isRareAchievement(achievement: Achievement): boolean {
  if (!achievement.reward) return false;
  const { type, value } = achievement.reward;
  if (type === 'globalMultiplier' && value >= 1.1) return true;
  if (type === 'clickMultiplier' && value >= 2) return true;
  return false;
}

interface AchievementToastItemProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function AchievementToastItem({ item, onDismiss }: AchievementToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number>(0);
  const particleConfigRef = useRef<ParticleConfig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { achievement } = item;
  const rewardText = getRewardText(achievement);

  // Settings
  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Initialize particles on mount
  useEffect(() => {
    if (!particlesEnabled || reducedMotion) return;

    // Determine which particle effect to use
    let effectType: ParticleEffect = 'confetti';
    if (isCanadianAchievement(achievement)) {
      effectType = 'mapleLeaves';
    } else if (isRareAchievement(achievement)) {
      effectType = 'goldenSparkles';
    }

    const preset = PARTICLE_PRESETS[effectType];
    particleConfigRef.current = {
      ...preset,
      count: getAdjustedParticleCount(preset.count),
    };

    // Create particles centered in the toast
    const centerX = 150; // Approximate center of toast
    const centerY = 40;
    const newParticles = createParticles(centerX, centerY, particleConfigRef.current);
    setParticles(newParticles);
  }, [achievement, particlesEnabled, reducedMotion]);

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
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, TOAST_DURATION_MS - 300); // Start exit animation 300ms before removal

    const removeTimer = setTimeout(() => {
      onDismiss(item.id);
    }, TOAST_DURATION_MS);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      ref={containerRef}
      className={`
        relative flex items-center gap-3 p-4 rounded-lg shadow-lg border-2 border-cheddar-400
        bg-linear-to-r from-cheddar-100 to-cheddar-50 backdrop-blur
        transform transition-all duration-300 overflow-hidden
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(item.id), 300);
      }}
    >
      {/* Particle effects */}
      {particlesEnabled && !reducedMotion && particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <div key={particle.id} style={getParticleStyles(particle)} />
          ))}
        </div>
      )}

      {/* Trophy icon or achievement icon */}
      <div className="w-12 h-12 flex items-center justify-center text-3xl bg-cheddar-500/20 rounded-lg relative z-10">
        {achievement.icon ?? '🏆'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-maple-600 font-semibold uppercase tracking-wide">
            Achievement Unlocked!
          </span>
        </div>
        <p className="font-bold text-rind truncate">{achievement.name}</p>
        <p className="text-sm text-gray-600 truncate">{achievement.description}</p>
        {rewardText && (
          <p className="text-xs text-cheddar-700 font-medium mt-1">
            Bonus: {rewardText}
          </p>
        )}
      </div>

      {/* Dismiss hint */}
      <div className="text-xs text-gray-400 shrink-0 relative z-10">
        Click to dismiss
      </div>
    </div>
  );
}

export function AchievementToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((achievement: Achievement) => {
    const newToast: ToastItem = {
      id: `${achievement.id}-${Date.now()}`,
      achievement,
      timestamp: Date.now(),
    };
    setToasts((prev) => [...prev, newToast]);

    // Play achievement fanfare
    playAchievementFanfare();
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register the callback with the game store
  useEffect(() => {
    setAchievementUnlockCallback(addToast);

    return () => {
      setAchievementUnlockCallback(null);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <AchievementToastItem item={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
