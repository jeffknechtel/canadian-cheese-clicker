import { memo, useCallback, useState, useRef, useEffect, type MouseEvent } from 'react';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { SYNERGIES } from '../../data/synergies';
import { formatNumber } from '../../utils/formatNumber';
import { playAgingUpgradeSound } from '../../systems/audioSystem';
import { emitParticles } from '../../systems/particleSystem';
import type { SynergyUpgrade } from '../../types/game';

interface SynergyCardProps {
  synergy: SynergyUpgrade;
  isPurchased: boolean;
  canAfford: boolean;
  index: number;
  onPurchase: (id: string, event: MouseEvent) => void;
}

const SynergyCard = memo(function SynergyCard({
  synergy,
  isPurchased,
  canAfford,
  index,
  onPurchase,
}: SynergyCardProps) {
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);
  const [purchaseAnimation, setPurchaseAnimation] = useState<'success' | 'failure' | null>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (isPurchased) return;

      if (canAfford) {
        onPurchase(synergy.id, event);
        playAgingUpgradeSound();
        emitParticles(event.clientX, event.clientY, 'goldenSparkles');
        if (!reducedMotion) {
          setPurchaseAnimation('success');
          animationTimeoutRef.current = setTimeout(() => setPurchaseAnimation(null), 400);
        }
      } else if (!reducedMotion) {
        setPurchaseAnimation('failure');
        animationTimeoutRef.current = setTimeout(() => setPurchaseAnimation(null), 300);
      }
    },
    [isPurchased, canAfford, onPurchase, synergy.id, reducedMotion]
  );

  const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);

  return (
    <div
      role="button"
      tabIndex={isPurchased ? -1 : 0}
      aria-label={
        isPurchased
          ? `${synergy.name} - Already purchased`
          : canAfford
            ? `Purchase ${synergy.name} for ${synergy.cost} Whey`
            : `${synergy.name} - Cannot afford (costs ${synergy.cost} Whey)`
      }
      aria-disabled={isPurchased || !canAfford}
      className={`
        p-4 rounded-lg transition-all
        ${isPurchased
          ? 'bg-timber-600/20 border-2 border-timber-500'
          : canAfford
            ? 'bg-white/70 hover:bg-white/90 cursor-pointer border-2 border-transparent hover:border-amber-400'
            : 'bg-white/40 border-2 border-transparent opacity-60'
        }
        ${!reducedMotion ? 'animate-slide-up' : ''}
        ${purchaseAnimation === 'success' && !reducedMotion ? 'animate-success-flash' : ''}
        ${purchaseAnimation === 'failure' && !reducedMotion ? 'animate-shake' : ''}
      `}
      style={{ animationDelay: `${staggerDelay}ms` }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as MouseEvent);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-hidden="true">
          {synergy.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-timber-700">{synergy.name}</h4>
            {isPurchased ? (
              <span className="text-timber-500 text-lg" aria-label="Purchased">
                &#10003;
              </span>
            ) : (
              <span
                className={`text-sm font-bold tabular-nums ${
                  canAfford ? 'text-amber-600' : 'text-gray-400'
                }`}
              >
                {synergy.cost} Whey
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{synergy.description}</p>
          <p className="text-xs text-timber-500 mt-2">
            {synergy.systemsConnected[0]} &#8594; {synergy.systemsConnected[1]}
          </p>
        </div>
      </div>
    </div>
  );
});

export function SynergiesPanel() {
  const whey = useGameStore((state) => state.whey);
  const purchased = useGameStore((state) => state.synergy.purchased);
  const purchaseSynergy = useGameStore((state) => state.purchaseSynergy);
  const canPurchaseSynergy = useGameStore((state) => state.canPurchaseSynergy);

  const handlePurchase = useCallback(
    (id: string) => {
      purchaseSynergy(id as Parameters<typeof purchaseSynergy>[0]);
    },
    [purchaseSynergy]
  );

  const purchasedCount = purchased.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-timber-700">Cross-System Synergies</h3>
        <div className="text-sm font-medium">
          <span className="text-amber-600">{formatNumber(whey)}</span>
          <span className="text-gray-500 ml-1">Whey</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Permanent upgrades that connect game systems. Purchased with Whey from boss battles.
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-timber-500 rounded-full h-2 transition-all duration-300"
            style={{ width: `${(purchasedCount / SYNERGIES.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 tabular-nums">
          {purchasedCount}/{SYNERGIES.length}
        </span>
      </div>

      {/* Synergies List */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {SYNERGIES.map((synergy, index) => {
          const isPurchased = purchased.includes(synergy.id);
          const canAfford = canPurchaseSynergy(synergy.id);

          return (
            <SynergyCard
              key={synergy.id}
              synergy={synergy}
              isPurchased={isPurchased}
              canAfford={canAfford}
              index={index}
              onPurchase={handlePurchase}
            />
          );
        })}
      </div>
    </div>
  );
}
