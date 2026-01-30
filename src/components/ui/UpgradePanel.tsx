import { useState, memo, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatNumber } from '../../utils/formatNumber';
import { playPurchaseSound } from '../../systems/audioSystem';
import type { Upgrade } from '../../types/game';
import { getGeneratorById } from '../../data/generators';

type TabType = 'available' | 'purchased';

interface UpgradeCardProps {
  upgrade: Upgrade;
  isPurchased: boolean;
  index: number;
}

function getEffectDescription(upgrade: Upgrade): string {
  const { effect } = upgrade;
  switch (effect.type) {
    case 'clickMultiplier':
      return `×${effect.value} click power`;
    case 'generatorMultiplier': {
      const generator = getGeneratorById(effect.generatorId);
      return `×${effect.value} ${generator?.name ?? 'Unknown'} production`;
    }
    case 'globalMultiplier':
      return `×${effect.value} all production`;
    default:
      return 'Unknown effect';
  }
}

function getRequirementText(upgrade: Upgrade): string | null {
  if (!upgrade.requirement) return null;

  const { requirement } = upgrade;
  if (requirement.type === 'generatorOwned') {
    const generator = getGeneratorById(requirement.generatorId);
    return `Requires ${requirement.count} ${generator?.name ?? 'Unknown'}`;
  }
  return null;
}

// Memoized upgrade card to prevent unnecessary re-renders
const UpgradeCard = memo(function UpgradeCard({ upgrade, isPurchased, index }: UpgradeCardProps) {
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const canAffordUpgrade = useGameStore((state) => state.canAffordUpgrade);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const [purchaseAnimation, setPurchaseAnimation] = useState<'success' | 'failure' | null>(null);

  const canAfford = canAffordUpgrade(upgrade.id);
  const requirementText = getRequirementText(upgrade);

  // Memoized buy handler
  const handleBuy = useCallback(() => {
    if (!isPurchased && canAfford) {
      const success = buyUpgrade(upgrade.id);
      if (success) {
        playPurchaseSound();
        if (!reducedMotion) {
          setPurchaseAnimation('success');
          setTimeout(() => setPurchaseAnimation(null), 400);
        }
      }
    } else if (!isPurchased && !reducedMotion) {
      setPurchaseAnimation('failure');
      setTimeout(() => setPurchaseAnimation(null), 300);
    }
  }, [isPurchased, canAfford, buyUpgrade, upgrade.id, reducedMotion]);

  // Calculate stagger delay for entrance animation
  const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);

  return (
    <div
      role="button"
      tabIndex={isPurchased ? -1 : 0}
      aria-label={
        isPurchased
          ? `${upgrade.name} - Already purchased`
          : canAfford
            ? `Purchase ${upgrade.name} for ${upgrade.cost} ${upgrade.costCurrency}`
            : `${upgrade.name} - Cannot afford (costs ${upgrade.cost} ${upgrade.costCurrency})`
      }
      aria-disabled={isPurchased || !canAfford}
      className={`
        p-3 rounded-lg transition-all item-canadian btn-scale
        ${isPurchased
          ? 'bg-timber-100/70 border border-timber-300'
          : canAfford
            ? 'bg-white/70 hover:bg-white/90 cursor-pointer border border-transparent hover:border-timber-300'
            : 'bg-white/40 border border-transparent'
        }
        ${!reducedMotion ? 'animate-slide-up' : ''}
        ${purchaseAnimation === 'success' && !reducedMotion ? 'animate-success-flash' : ''}
        ${purchaseAnimation === 'failure' && !reducedMotion ? 'animate-shake' : ''}
      `}
      style={{ animationDelay: `${staggerDelay}ms` }}
      onClick={handleBuy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleBuy();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-timber-700 truncate" title={upgrade.name}>{upgrade.name}</span>
            {isPurchased && (
              <span className="text-xs bg-timber-500 text-white px-1.5 py-0.5 rounded">
                Owned
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{upgrade.description}</p>
          <p className="text-xs text-timber-600 font-medium mt-1">
            {getEffectDescription(upgrade)}
          </p>
          {requirementText && !isPurchased && (
            <p className="text-xs text-gray-500 mt-0.5 italic">{requirementText}</p>
          )}
        </div>
        {!isPurchased && (
          <div className="shrink-0 text-right">
            <div
              className={`
                text-sm font-bold tabular-nums
                ${canAfford ? 'text-timber-600' : 'text-gray-400'}
              `}
            >
              {formatNumber(upgrade.cost)}
            </div>
            <div className="text-xs text-gray-500">
              {upgrade.costCurrency}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export function UpgradePanel() {
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const { getAvailableUpgrades, getPurchasedUpgrades, getClickMultiplier } = useGameStore();

  const availableUpgrades = getAvailableUpgrades();
  const purchasedUpgrades = getPurchasedUpgrades();
  const clickMultiplier = getClickMultiplier();

  return (
    <div className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain">
      {/* Header with click multiplier info */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-timber-700">Upgrades</h2>
        {clickMultiplier > 1 && (
          <span className="text-xs bg-maple-100 text-maple-700 px-2 py-1 rounded border border-maple-200">
            Click ×{clickMultiplier}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab('available')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'available'
              ? 'bg-timber-500 text-white'
              : 'bg-white/50 text-timber-700 hover:bg-white/70'
            }
          `}
        >
          Available ({availableUpgrades.length})
        </button>
        <button
          onClick={() => setActiveTab('purchased')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'purchased'
              ? 'bg-timber-500 text-white'
              : 'bg-white/50 text-timber-700 hover:bg-white/70'
            }
          `}
        >
          Owned ({purchasedUpgrades.length})
        </button>
      </div>

      {/* Upgrade List */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        {activeTab === 'available' ? (
          availableUpgrades.length > 0 ? (
            availableUpgrades.map((upgrade, index) => (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                isPurchased={false}
                index={index}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No upgrades available</p>
              <p className="text-xs mt-1">Buy more generators to unlock upgrades!</p>
            </div>
          )
        ) : (
          purchasedUpgrades.length > 0 ? (
            purchasedUpgrades.map((upgrade, index) => (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                isPurchased={true}
                index={index}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No upgrades purchased yet</p>
              <p className="text-xs mt-1">Buy upgrades to boost your production!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
