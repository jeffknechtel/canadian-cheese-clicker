import { useState, memo, useRef, useEffect, useMemo } from 'react';
import { useGameStore } from '../../stores';
import { useGameStoreShallow } from '../../utils/zustandOptimization';
import { useSettingsStore } from '../../stores/settingsStore';
import { GENERATORS } from '../../data/generators';
import { UNLOCK_THRESHOLDS, BUY_MILESTONES, MILESTONE_MULTIPLIER } from '../../data/constants';
import { formatNumber } from '../../utils/formatNumber';
import { calculateTimeToAfford } from '../../utils/timeToAfford';
import { playPurchaseSound } from '../../systems/audioSystem';
import { vibrateError } from '../../systems/haptics';
import { announceGeneratorPurchase } from '../../systems/accessibilityAnnouncer';
import type { Generator } from '../../types/game';
import { CpsBreakdownPanel } from './CpsBreakdownPanel';
import { FirstTimeHint } from './shared/FirstTimeHint';
import { PanelContainer } from './shared/PanelContainer';
import { DISABLED_BUTTON_CLASSES } from './shared/Button';

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
  const { curds, curdPerSecond } = useGameStoreShallow((state) => ({
    curds: state.curds,
    curdPerSecond: state.curdPerSecond,
  }));
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const [purchaseAnimation, setPurchaseAnimation] = useState<'success' | 'failure' | null>(null);
  
  // Ref for animation timeout cleanup to prevent memory leaks
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const owned = getGeneratorCount(generator.id);
  const effectiveAmount = buyAmount === 'max' ? getMaxAffordable(generator.id) : buyAmount;
  const cost = getGeneratorCost(generator.id, effectiveAmount || 1);
  const canAfford = effectiveAmount > 0 && canAffordGenerator(generator.id, effectiveAmount);
  const nextMilestone = owned > 0 ? BUY_MILESTONES.find((m) => m > owned) : undefined;

  const timeToAfford = useMemo(() => {
    if (canAfford) return null;
    return calculateTimeToAfford(cost, curds, curdPerSecond);
  }, [canAfford, cost, curds, curdPerSecond]);

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
          animationTimeoutRef.current = setTimeout(() => setPurchaseAnimation(null), 400);
        }
      } else {
        vibrateError();
        if (!reducedMotion) {
          setPurchaseAnimation('failure');
          animationTimeoutRef.current = setTimeout(() => setPurchaseAnimation(null), 300);
        }
      }
    } else {
      vibrateError();
      if (!reducedMotion) {
        setPurchaseAnimation('failure');
        animationTimeoutRef.current = setTimeout(() => setPurchaseAnimation(null), 300);
      }
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
        flex items-center gap-3 p-3 rounded-lg transition-all item-canadian card-lift
        ${isCanadianTier ? 'tier-canadian' : 'tier-basic'}
        ${!reducedMotion ? 'animate-slide-up' : ''}
        ${purchaseAnimation === 'success' && !reducedMotion ? 'animate-success-flash' : ''}
        ${purchaseAnimation === 'failure' && !reducedMotion ? 'animate-shake' : ''}
      `}
      style={{ animationDelay: `${staggerDelay}ms` }}
      aria-label={`${generator.name}: ${owned} owned, produces ${formatNumber(generator.baseCps)} curds per second each`}
    >
      {/* Generator Icon */}
      <div className="shrink-0 text-2xl w-10 h-10 flex items-center justify-center bg-white/50 rounded-lg" aria-hidden="true">
        {generator.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="font-semibold text-rind truncate"
            title={generator.name}
          >
            {generator.name}
          </span>
          <span
            className={`text-sm font-medium tabular-nums shrink-0 ${isCanadianTier ? 'text-red-600' : 'text-amber-700'}`}
            aria-label={`${owned} owned`}
          >
            ×{owned}
          </span>
        </div>
        <p
          className="text-xs text-gray-600 truncate"
          title={generator.description}
        >
          {generator.description}
        </p>
        <p className={`text-xs ${isCanadianTier ? 'text-red-600' : 'text-amber-600'}`}>
          +{formatNumber(generator.baseCps)} cps each
        </p>
        {nextMilestone && (
          <p
            className="text-xs text-purple-600 tabular-nums"
            title={`Reach ${nextMilestone} owned for a ×${MILESTONE_MULTIPLIER} production milestone`}
          >
            🏆 {owned}/{nextMilestone} → ×{MILESTONE_MULTIPLIER}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end">
        <button
          onClick={handleBuy}
          disabled={!canAfford}
          aria-label={buyButtonLabel}
          aria-disabled={!canAfford}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all btn-ripple btn-scale shadow-md hover:shadow-lg ${
            canAfford
              ? isCanadianTier
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
              : DISABLED_BUTTON_CLASSES
          }`}
        >
          <div className="text-center" aria-hidden="true">
            <div>Buy {buyAmount === 'max' ? `×${effectiveAmount || 0}` : `×${buyAmount}`}</div>
            <div className="text-xs tabular-nums">{formatNumber(cost)}</div>
          </div>
        </button>
        {timeToAfford && !timeToAfford.canAfford && (
          <div className="text-xs text-gray-500 mt-1 tabular-nums">
            {timeToAfford.seconds !== null
              ? `in ${timeToAfford.formatted}`
              : 'Need CPS'}
          </div>
        )}
      </div>
    </article>
  );
});

export function GeneratorPanel() {
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);

  const curds = useGameStore((s) => s.curds);
  const visibleGenerators = useMemo(() => {
    let highestAffordableIndex = -1;
    for (let i = 0; i < GENERATORS.length; i++) {
      if (curds.gte(GENERATORS[i].baseCost)) {
        highestAffordableIndex = i;
      }
    }
    const revealUpTo = Math.min(highestAffordableIndex + UNLOCK_THRESHOLDS.generatorRevealAhead + 1, GENERATORS.length);
    return GENERATORS.slice(0, Math.max(revealUpTo, 3));
  }, [curds]);
  const basicGenerators = useMemo(() => visibleGenerators.filter((_, i) => i < CANADIAN_TIER_START), [visibleGenerators]);
  const canadianGenerators = useMemo(() => visibleGenerators.filter((_, i) => i >= CANADIAN_TIER_START), [visibleGenerators]);

  return (
    <PanelContainer as="section" className="gap-3" aria-labelledby="generators-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="generators-heading" className="text-lg font-bold flex items-center gap-2 text-timber-700">
          <span>Generators</span>
        </h2>
        <div className="flex gap-1" role="group" aria-label="Buy quantity selector">
          {([1, 10, 100, 'max'] as BuyAmount[]).map((amount) => (
            <button
              key={amount}
              onClick={() => setBuyAmount(amount)}
              aria-pressed={buyAmount === amount}
              aria-label={amount === 'max' ? 'Buy maximum affordable' : `Buy ${amount} at a time`}
              className={`min-w-[44px] min-h-[44px] px-2 py-2 text-xs rounded font-medium transition-colors ${
                buyAmount === amount
                  ? 'bg-timber-500 text-white'
                  : 'bg-white/50 text-timber-700'
              }`}
            >
              {amount === 'max' ? 'MAX' : `×${amount}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin" role="list" aria-label="Available generators">
        {/* Basic Tier Generators */}
        {basicGenerators.map((generator, index) =>
          index === 0 ? (
            <FirstTimeHint key={generator.id} hintId="firstGenerator" position="right">
              <GeneratorRow
                generator={generator}
                buyAmount={buyAmount}
                isCanadianTier={false}
                index={index}
              />
            </FirstTimeHint>
          ) : (
            <GeneratorRow
              key={generator.id}
              generator={generator}
              buyAmount={buyAmount}
              isCanadianTier={false}
              index={index}
            />
          )
        )}

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

        {/* More generators hint */}
        {visibleGenerators.length < GENERATORS.length && (
          <div className="text-center text-gray-500 py-4 text-sm">
            <span className="text-lg">🔒</span>
            <p>More generators unlock as you progress!</p>
            <p className="text-xs mt-1">
              Next: {GENERATORS[visibleGenerators.length]?.name}
            </p>
          </div>
        )}
      </div>
      <CpsBreakdownPanel />
    </PanelContainer>
  );
}
