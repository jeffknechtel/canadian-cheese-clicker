import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { getRewardDescription } from '../../systems/goldenCheeseSystem';
import type { GoldenCheeseRewardType } from '../../types/game';
import {
  type Particle,
  createParticles,
  updateParticles,
  getParticleStyles,
  getAdjustedParticleCount,
  PARTICLE_PRESETS,
} from '../../systems/particleSystem';

interface NotificationItem {
  id: string;
  rewardType: GoldenCheeseRewardType;
  description: string;
  timestamp: number;
}

const NOTIFICATION_DURATION_MS = 2500;

function getRewardIcon(rewardType: GoldenCheeseRewardType): string {
  const icons: Record<GoldenCheeseRewardType, string> = {
    cheeseFrenzy: '🧀',
    luckyCurds: '💰',
    clickStorm: '⚡',
    rareIngredient: '🌟',
    heroRally: '⚔️',
    curdTsunami: '🌊',
  };
  return icons[rewardType];
}

function getRewardColor(rewardType: GoldenCheeseRewardType): string {
  const colors: Record<GoldenCheeseRewardType, string> = {
    cheeseFrenzy: 'from-amber-500 to-yellow-400',
    luckyCurds: 'from-green-500 to-emerald-400',
    clickStorm: 'from-blue-500 to-cyan-400',
    rareIngredient: 'from-purple-500 to-pink-400',
    heroRally: 'from-red-500 to-orange-400',
    curdTsunami: 'from-yellow-400 to-amber-300',
  };
  return colors[rewardType];
}

interface NotificationItemProps {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}

function GoldenCheeseNotificationItem({ item, onDismiss }: NotificationItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Initialize particles on mount using useMemo to avoid setState in effect
  const initialParticles = useMemo(() => {
    if (!particlesEnabled || reducedMotion) return [];

    const preset = PARTICLE_PRESETS.goldenSparkles;
    const config = {
      ...preset,
      count: getAdjustedParticleCount(Math.floor(preset.count * 0.5)),
    };

    const centerX = 150;
    const centerY = 30;
    return createParticles(centerX, centerY, config);
  }, [particlesEnabled, reducedMotion]);

  const [particles, setParticles] = useState<Particle[]>(initialParticles);

  // Animate particles
  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles) return;

    const config = PARTICLE_PRESETS.goldenSparkles;

    const animate = (time: number) => {
      const deltaMs = lastTimeRef.current === 0 ? 16 : time - lastTimeRef.current;
      lastTimeRef.current = time;

      setParticles((prev) => {
        if (prev.length === 0) return prev;
        return updateParticles(prev, deltaMs, config);
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

  // Auto-dismiss timer
  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, NOTIFICATION_DURATION_MS - 300);

    const removeTimer = setTimeout(() => {
      onDismiss(item.id);
    }, NOTIFICATION_DURATION_MS);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onDismiss]);

  const icon = getRewardIcon(item.rewardType);
  const gradientClass = getRewardColor(item.rewardType);

  return (
    <div
      className={`
        relative flex items-center gap-3 p-4 rounded-xl shadow-2xl
        bg-gradient-to-r ${gradientClass} text-white
        transform transition-all duration-300 overflow-hidden
        border-2 border-white/30
        ${isExiting ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}
        ${reducedMotion ? '' : 'animate-bounce-in'}
      `}
      style={{
        animation: reducedMotion ? 'none' : 'goldenPulse 1s ease-in-out infinite',
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

      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'linear-gradient(45deg, transparent 40%, white 50%, transparent 60%)',
          backgroundSize: '200% 200%',
          animation: reducedMotion ? 'none' : 'shine 2s linear infinite',
        }}
      />

      {/* Icon */}
      <div className="w-14 h-14 flex items-center justify-center text-4xl bg-white/20 rounded-lg relative z-10 shrink-0">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-90">
            Golden Cheese!
          </span>
          <span className="text-xl">✨</span>
        </div>
        <p className="font-bold text-lg truncate drop-shadow-md">
          {item.description}
        </p>
      </div>
    </div>
  );
}

export function GoldenCheeseNotificationContainer() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const lastCollectedRef = useRef(0);

  const totalCollected = useGameStore((s) => s.goldenCheese.totalCollected);
  const isVisible = useGameStore((s) => s.goldenCheese.isVisible);
  const currentReward = useGameStore((s) => s.goldenCheese.currentReward);

  // Track when a golden cheese is collected
  useEffect(() => {
    if (totalCollected > lastCollectedRef.current && totalCollected > 0) {
      lastCollectedRef.current = totalCollected;

      // The reward was just collected - show notification
      // We need to figure out what the reward was
      // Since currentReward is cleared after collection, we need to catch it before
    }
  }, [totalCollected]);

  // Watch for the moment of collection (isVisible goes false and totalCollected increments)
  const prevVisibleRef = useRef(isVisible);
  const prevRewardRef = useRef(currentReward);

  useEffect(() => {
    if (prevVisibleRef.current && !isVisible && prevRewardRef.current) {
      // A golden cheese was just collected
      const rewardType = prevRewardRef.current;
      const description = getRewardDescription(rewardType);

      const newNotification: NotificationItem = {
        id: `golden-${Date.now()}`,
        rewardType,
        description,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, newNotification]);
    }

    prevVisibleRef.current = isVisible;
    prevRewardRef.current = currentReward;
  }, [isVisible, currentReward]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <GoldenCheeseNotificationItem item={notification} onDismiss={removeNotification} />
        </div>
      ))}
      <style>{`
        @keyframes goldenPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.9); }
        }
        @keyframes shine {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
