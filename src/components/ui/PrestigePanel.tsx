import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatNumber } from '../../utils/formatNumber';
import {
  playPrestigeSound,
  playAgingUpgradeSound,
  playRennetGainSound,
} from '../../systems/audioSystem';
import { AGING_UPGRADES, getAgingUpgradePurchaseCount } from '../../data/agingUpgrades';
import {
  getPrestigeDialogue,
  getResetMilestoneMessage,
  getRennetMilestoneMessage,
} from '../../data/canadianDialogue';
import { AgingConfirmModal } from './AgingConfirmModal';
import { PrestigeStats } from './PrestigeStats';
import type { AgingUpgrade } from '../../types/game';
import Decimal from 'decimal.js';
import {
  type Particle,
  type ParticleConfig,
  createParticles,
  updateParticles,
  getParticleStyles,
  getAdjustedParticleCount,
  PARTICLE_PRESETS,
} from '../../systems/particleSystem';

type TabType = 'aging' | 'upgrades' | 'stats';

interface AgingUpgradeCardProps {
  upgrade: AgingUpgrade;
  purchaseCount: number;
  canPurchase: boolean;
  onPurchase: () => void;
}

function getRequirementText(upgrade: AgingUpgrade, prestige: { agingResetCount: number; totalRennet: number; rennet: number; agingUpgrades: string[] }): string | null {
  if (!upgrade.requirement) return null;

  const totalRennetSpent = prestige.totalRennet - prestige.rennet;

  switch (upgrade.requirement.type) {
    case 'rennetSpent':
      if (totalRennetSpent < upgrade.requirement.amount) {
        return `Requires ${upgrade.requirement.amount} Rennet spent (${totalRennetSpent}/${upgrade.requirement.amount})`;
      }
      return null;
    case 'agingResets':
      if (prestige.agingResetCount < upgrade.requirement.count) {
        return `Requires ${upgrade.requirement.count} Aging resets (${prestige.agingResetCount}/${upgrade.requirement.count})`;
      }
      return null;
    case 'upgrade': {
      const requiredUpgradeId = upgrade.requirement.upgradeId;
      if (!prestige.agingUpgrades.includes(requiredUpgradeId)) {
        const requiredUpgrade = AGING_UPGRADES.find((u) => u.id === requiredUpgradeId);
        return `Requires: ${requiredUpgrade?.name ?? 'Unknown upgrade'}`;
      }
      return null;
    }
    default:
      return null;
  }
}

function AgingUpgradeCard({ upgrade, purchaseCount, canPurchase, onPurchase }: AgingUpgradeCardProps) {
  const { prestige } = useGameStore();
  const isMaxed = purchaseCount >= upgrade.maxPurchases;
  const requirementText = getRequirementText(upgrade, prestige);
  const isLocked = requirementText !== null;

  const handleClick = () => {
    if (canPurchase && !isMaxed) {
      onPurchase();
    }
  };

  return (
    <div
      role="button"
      tabIndex={canPurchase && !isMaxed && !isLocked ? 0 : -1}
      aria-label={
        isMaxed
          ? `${upgrade.name} - Maximum level reached`
          : isLocked
            ? `${upgrade.name} - Locked`
            : canPurchase
              ? `Purchase ${upgrade.name} for ${upgrade.cost} Rennet`
              : `${upgrade.name} - Cannot afford (costs ${upgrade.cost} Rennet)`
      }
      aria-disabled={!canPurchase || isMaxed || isLocked}
      className={`
        p-3 rounded-lg transition-all
        ${isMaxed
          ? 'bg-amber-100/70 border border-amber-300'
          : isLocked
            ? 'bg-gray-100/50 border border-gray-200 opacity-60'
            : canPurchase
              ? 'bg-white/70 hover:bg-white/90 cursor-pointer border border-transparent hover:border-amber-300'
              : 'bg-white/40 border border-transparent'
        }
      `}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            w-10 h-10 flex items-center justify-center text-2xl rounded-lg shrink-0
            ${isMaxed ? 'bg-amber-500/20' : isLocked ? 'bg-gray-300/30' : 'bg-amber-100'}
          `}
        >
          {isLocked ? '🔒' : upgrade.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold truncate ${isLocked ? 'text-gray-500' : 'text-amber-700'}`}>
              {upgrade.name}
            </span>
            {purchaseCount > 0 && (
              <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">
                {purchaseCount}/{upgrade.maxPurchases}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{upgrade.description}</p>
          {isLocked && requirementText && (
            <p className="text-xs text-red-500 mt-1 italic">{requirementText}</p>
          )}
        </div>

        {/* Cost */}
        {!isMaxed && !isLocked && (
          <div className="shrink-0 text-right">
            <div className={`text-sm font-bold ${canPurchase ? 'text-amber-600' : 'text-gray-400'}`}>
              {upgrade.cost}
            </div>
            <div className="text-xs text-gray-500">Rennet</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PrestigePanel() {
  const [activeTab, setActiveTab] = useState<TabType>('aging');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [prestigeMessage, setPrestigeMessage] = useState<string | null>(null);
  const [showPrestigeAnimation, setShowPrestigeAnimation] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const particleConfigRef = useRef<ParticleConfig | null>(null);

  // Settings
  const particlesEnabled = useSettingsStore((state) => state.graphics.particlesEnabled);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const {
    prestige,
    totalCurdsEarned,
    getPotentialRennet,
    canPerformAging,
    performAging,
    purchaseAgingUpgrade,
    canPurchaseAgingUpgrade,
    canPerformVintage,
    canPerformLegacy,
    checkAchievements,
  } = useGameStore();

  const potentialRennet = getPotentialRennet();
  const canAge = canPerformAging();

  // Clear prestige message after a delay
  useEffect(() => {
    if (prestigeMessage) {
      const timer = setTimeout(() => setPrestigeMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [prestigeMessage]);

  // Clear animation after it completes
  useEffect(() => {
    if (showPrestigeAnimation) {
      const timer = setTimeout(() => setShowPrestigeAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showPrestigeAnimation]);

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

  // Trigger prestige particles
  const triggerPrestigeParticles = () => {
    if (!particlesEnabled || reducedMotion) return;

    // Create swirling aging particles
    const swirlPreset = PARTICLE_PRESETS.agingSwirl;
    particleConfigRef.current = {
      ...swirlPreset,
      count: getAdjustedParticleCount(swirlPreset.count),
    };

    // Create particles across the panel
    const newParticles: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      const x = 100 + i * 100;
      const y = 200;
      newParticles.push(...createParticles(x, y, particleConfigRef.current));
    }

    // Also add rennet float particles
    const rennetPreset = PARTICLE_PRESETS.rennetFloat;
    const rennetConfig = {
      ...rennetPreset,
      count: getAdjustedParticleCount(rennetPreset.count),
    };
    newParticles.push(...createParticles(150, 150, rennetConfig));

    setParticles(newParticles);
  };

  const handleAgingClick = () => {
    if (canAge) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmAging = () => {
    const result = performAging();
    setShowConfirmModal(false);

    // Play prestige sound and trigger animation
    playPrestigeSound();
    setShowPrestigeAnimation(true);

    // Trigger particle effects
    triggerPrestigeParticles();

    // Play Rennet gain sound after a slight delay
    setTimeout(() => {
      playRennetGainSound();
    }, 500);

    // Get appropriate message
    const resetCount = prestige.agingResetCount + 1; // Just incremented
    const milestoneMsg = getResetMilestoneMessage(resetCount);
    const rennetMsg = getRennetMilestoneMessage(result.newTotal);
    const afterMsg = getPrestigeDialogue('afterAging');

    // Show milestone message if applicable, otherwise after-aging message
    setPrestigeMessage(milestoneMsg ?? rennetMsg ?? afterMsg);

    // Check for prestige achievements
    checkAchievements();
  };

  const handlePurchaseUpgrade = (upgradeId: string) => {
    const success = purchaseAgingUpgrade(upgradeId);
    if (success) {
      playAgingUpgradeSound();
      checkAchievements();
    }
  };

  // Calculate progress toward Vintage and Legacy
  const vintageProgress = Math.min(prestige.agingResetCount / 100, 1);
  const legacyProgress = Math.min(prestige.vintageResetCount / 10, 1);

  return (
    <div className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain relative overflow-hidden">
      {/* Prestige Animation Overlay */}
      {showPrestigeAnimation && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-linear-to-t from-amber-400/40 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="text-6xl animate-bounce">🧀</span>
          </div>
          {/* Floating emoji particles as fallback */}
          {(!particlesEnabled || reducedMotion) && (
            <>
              <div className="absolute bottom-0 left-1/4 text-2xl animate-float-up">✨</div>
              <div className="absolute bottom-0 left-1/2 text-2xl animate-float-up animation-delay-200">✨</div>
              <div className="absolute bottom-0 left-3/4 text-2xl animate-float-up animation-delay-400">✨</div>
            </>
          )}
        </div>
      )}

      {/* Particle effects */}
      {particlesEnabled && !reducedMotion && particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {particles.map((particle) => (
            <div key={particle.id} style={getParticleStyles(particle)} />
          ))}
        </div>
      )}

      {/* Prestige Success Message */}
      {prestigeMessage && (
        <div className="absolute top-2 left-2 right-2 z-20 animate-slide-down">
          <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg text-center text-sm font-medium">
            {prestigeMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-amber-700">Cheese Aging</h2>
        <div className="flex items-center gap-2">
          <span className={`text-lg ${showPrestigeAnimation ? 'animate-spin' : ''}`}>🧀</span>
          <span className="font-bold text-amber-600">{prestige.rennet}</span>
          <span className="text-xs text-gray-500">Rennet</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab('aging')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'aging'
              ? 'bg-amber-500 text-white'
              : 'bg-white/50 text-amber-700 hover:bg-white/70'
            }
          `}
        >
          Aging
        </button>
        <button
          onClick={() => setActiveTab('upgrades')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'upgrades'
              ? 'bg-amber-500 text-white'
              : 'bg-white/50 text-amber-700 hover:bg-white/70'
            }
          `}
        >
          Upgrades ({prestige.agingUpgrades.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'stats'
              ? 'bg-amber-500 text-white'
              : 'bg-white/50 text-amber-700 hover:bg-white/70'
            }
          `}
        >
          Stats
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'aging' && (
          <div className="space-y-4">
            {/* Current Run Stats */}
            <div className="bg-white/50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">Current Run</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Total Curds:</span>
                  <span className="ml-1 font-medium">{formatNumber(totalCurdsEarned)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Aging Resets:</span>
                  <span className="ml-1 font-medium">{prestige.agingResetCount}</span>
                </div>
              </div>
            </div>

            {/* Potential Rennet */}
            <div className="bg-amber-100 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-700 mb-1">Potential Rennet Gain</p>
              <p className="text-3xl font-bold text-amber-600">
                +{formatNumber(new Decimal(potentialRennet))}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {potentialRennet === 0 ? 'Earn 1 trillion curds for your first Rennet!' : '+1% production per Rennet'}
              </p>
            </div>

            {/* Age Button */}
            <button
              onClick={handleAgingClick}
              disabled={!canAge}
              className={`
                w-full py-3 px-6 rounded-lg font-bold text-lg transition-all
                ${canAge
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-700 cursor-not-allowed'
                }
              `}
            >
              {canAge ? 'Age Your Empire' : 'Not Enough Curds'}
            </button>

            {/* Vintage Section (Locked) */}
            <div className="bg-purple-50 rounded-lg p-3 opacity-75">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                  <span>🍷</span> Vintage Tier
                  {!canPerformVintage() && <span className="text-xs bg-purple-200 px-1.5 py-0.5 rounded">Locked</span>}
                </h3>
              </div>
              <div className="text-xs text-purple-600 mb-2">
                Sacrifice 100 Rennet for powerful Vintage Wheels
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${vintageProgress * 100}%` }}
                />
              </div>
              <div className="text-xs text-purple-500 mt-1">
                {prestige.agingResetCount}/100 Aging resets required
              </div>
            </div>

            {/* Legacy Section (Locked) */}
            <div className="bg-yellow-50 rounded-lg p-3 opacity-60">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                  <span>👑</span> Legacy Tier
                  {!canPerformLegacy() && <span className="text-xs bg-yellow-200 px-1.5 py-0.5 rounded">Locked</span>}
                </h3>
              </div>
              <div className="text-xs text-yellow-600 mb-2">
                Establish permanent province-based bonuses
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${legacyProgress * 100}%` }}
                />
              </div>
              <div className="text-xs text-yellow-500 mt-1">
                {prestige.vintageResetCount}/10 Vintage resets required
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="space-y-2">
            {AGING_UPGRADES.length > 0 ? (
              AGING_UPGRADES.map((upgrade) => {
                const purchaseCount = getAgingUpgradePurchaseCount(prestige.agingUpgrades, upgrade.id);
                const canPurchase = canPurchaseAgingUpgrade(upgrade.id);
                return (
                  <AgingUpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    purchaseCount={purchaseCount}
                    canPurchase={canPurchase}
                    onPurchase={() => handlePurchaseUpgrade(upgrade.id)}
                  />
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No upgrades available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && <PrestigeStats />}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <AgingConfirmModal
          onConfirm={handleConfirmAging}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
