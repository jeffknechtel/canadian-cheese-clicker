import { useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { GENERATORS } from '../../data/generators';
import { formatNumber } from '../../utils/formatNumber';
import { playPurchaseSound } from '../../systems/audioSystem';
import { announceGeneratorPurchase } from '../../systems/accessibilityAnnouncer';
import type { Generator } from '../../types/game';

type BuyAmount = 1 | 10 | 100 | 'max';

interface GeneratorRowProps {
  generator: Generator;
  buyAmount: BuyAmount;
  isCanadianTier: boolean;
  index: number;
}

// Canadian tier starts at generator index 5 (curling_stone)
const CANADIAN_TIER_START = 5;

// Memoized generator row to prevent unnecessary re-renders
// Only re-renders when generator, buyAmount, isCanadianTier, or index changes
const GeneratorRow = memo(function GeneratorRow({ generator, buyAmount, isCanadianTier, index }: GeneratorRowProps) {
  const buyGenerator = useGameStore((state) => state.buyGenerator);
  const canAffordGenerator = useGameStore((state) => state.canAffordGenerator);
  const getGeneratorCost = useGameStore((state) => state.getGeneratorCost);
  const getMaxAffordable = useGameStore((state) => state.getMaxAffordable);
  const getGeneratorCount = useGameStore((state) => state.getGeneratorCount);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const [purchaseAnimation, setPurchaseAnimation] = useState<'success' | 'failure' | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const owned = getGeneratorCount(generator.id);
  const effectiveAmount = buyAmount === 'max' ? getMaxAffordable(generator.id) : buyAmount;
  const cost = getGeneratorCost(generator.id, effectiveAmount || 1);
  const canAfford = effectiveAmount > 0 && canAffordGenerator(generator.id, effectiveAmount);

  // Buy handler - React Compiler will optimize this automatically
  const handleBuy = () => {
    if (effectiveAmount > 0) {
      const success = buyGenerator(generator.id, effectiveAmount);
      if (success) {
        playPurchaseSound();
        // Announce purchase for screen readers
        announceGeneratorPurchase(generator.name, effectiveAmount, owned + effectiveAmount);
        if (!reducedMotion) {
          setPurchaseAnimation('success');
          setTimeout(() => setPurchaseAnimation(null), 400);
        }
      } else if (!reducedMotion) {
        setPurchaseAnimation('failure');
        setTimeout(() => setPurchaseAnimation(null), 300);
      }
    } else if (!reducedMotion) {
      setPurchaseAnimation('failure');
      setTimeout(() => setPurchaseAnimation(null), 300);
    }
  };

  // Calculate stagger delay for entrance animation
  const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);

  // Build aria-label for the buy button
  const buyButtonLabel = canAfford
    ? `Buy ${effectiveAmount} ${generator.name} for ${formatNumber(cost)} curds. You own ${owned}. Produces ${formatNumber(generator.baseCps)} curds per second each.`
    : `Cannot afford ${generator.name}. Cost: ${formatNumber(cost)} curds.`;

  return (
    <article
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all item-canadian
        ${isCanadianTier ? 'tier-canadian' : 'tier-basic'}
        hover:shadow-md
        ${!reducedMotion ? 'animate-slide-up' : ''}
        ${purchaseAnimation === 'success' && !reducedMotion ? 'animate-success-flash' : ''}
        ${purchaseAnimation === 'failure' && !reducedMotion ? 'animate-shake' : ''}
      `}
      style={{ animationDelay: `${staggerDelay}ms` }}
      aria-label={`${generator.name}: ${owned} owned, produces ${formatNumber(generator.baseCps)} curds per second each`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Generator Icon */}
      <div className="shrink-0 text-2xl w-10 h-10 flex items-center justify-center bg-white/50 rounded-lg" aria-hidden="true">
        {generator.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={`font-semibold transition-all duration-200 ${isHovered ? 'whitespace-normal' : 'truncate'}`}
            style={{ color: '#8b7355' }}
            title={generator.name}
          >
            {generator.name}
          </span>
          <span
            className="text-sm font-medium tabular-nums shrink-0"
            style={{ color: isCanadianTier ? '#dc2626' : '#b45309' }}
            aria-label={`${owned} owned`}
          >
            ×{owned}
          </span>
        </div>
        <p
          className={`text-xs transition-all duration-200 ${isHovered ? 'whitespace-normal' : 'truncate'}`}
          style={{ color: '#4b5563' }}
          title={generator.description}
        >
          {generator.description}
        </p>
        <p className="text-xs" style={{ color: isCanadianTier ? '#dc2626' : '#d97706' }}>
          +{formatNumber(generator.baseCps)} cps each
        </p>
      </div>
      <button
        onClick={handleBuy}
        disabled={!canAfford}
        aria-label={buyButtonLabel}
        aria-disabled={!canAfford}
        className="px-4 py-2 rounded-lg font-medium text-sm transition-all btn-ripple btn-scale shadow-md hover:shadow-lg"
        style={{
          backgroundColor: canAfford
            ? isCanadianTier ? '#ef4444' : '#f59e0b'
            : '#e5e7eb',
          color: canAfford ? '#ffffff' : '#374151',
          cursor: canAfford ? 'pointer' : 'not-allowed',
        }}
      >
        <div className="text-center" aria-hidden="true">
          <div>Buy {buyAmount === 'max' ? `×${effectiveAmount || 0}` : `×${buyAmount}`}</div>
          <div className="text-xs tabular-nums">{formatNumber(cost)}</div>
        </div>
      </button>
    </article>
  );
});

export function GeneratorPanel() {
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);

  const basicGenerators = GENERATORS.slice(0, CANADIAN_TIER_START);
  const canadianGenerators = GENERATORS.slice(CANADIAN_TIER_START);

  return (
    <section className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain" aria-labelledby="generators-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="generators-heading" className="text-lg font-bold flex items-center gap-2" style={{ color: '#5f4810' }}>
          <span>Generators</span>
        </h2>
        <div className="flex gap-1" role="group" aria-label="Buy quantity selector">
          {([1, 10, 100, 'max'] as BuyAmount[]).map((amount) => (
            <button
              key={amount}
              onClick={() => setBuyAmount(amount)}
              aria-pressed={buyAmount === amount}
              aria-label={amount === 'max' ? 'Buy maximum affordable' : `Buy ${amount} at a time`}
              className="px-2 py-1 text-xs rounded font-medium transition-colors"
              style={{
                backgroundColor: buyAmount === amount ? '#8b6914' : 'rgba(255,255,255,0.5)',
                color: buyAmount === amount ? '#ffffff' : '#5f4810',
              }}
            >
              {amount === 'max' ? 'MAX' : `×${amount}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin" role="list" aria-label="Available generators">
        {/* Basic Tier Generators */}
        {basicGenerators.map((generator, index) => (
          <GeneratorRow
            key={generator.id}
            generator={generator}
            buyAmount={buyAmount}
            isCanadianTier={false}
            index={index}
          />
        ))}

        {/* Canadian Tier Separator */}
        {canadianGenerators.length > 0 && (
          <div className="maple-divider my-3">
            <span>Canadian Tier</span>
          </div>
        )}

        {/* Canadian Tier Generators */}
        {canadianGenerators.map((generator, index) => (
          <GeneratorRow
            key={generator.id}
            generator={generator}
            buyAmount={buyAmount}
            isCanadianTier={true}
            index={basicGenerators.length + index}
          />
        ))}
      </div>
    </section>
  );
}
