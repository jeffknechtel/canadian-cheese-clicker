import { useRef, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGameStoreShallow } from '../../utils/zustandOptimization';
import { formatNumber } from '../../utils/formatNumber';
import { RennetDisplay } from './RennetDisplay';
import Decimal from 'decimal.js';

// Memoized loonie icon to prevent unnecessary re-renders
const LoonieIcon = memo(function LoonieIcon() {
  return (
    <span className="coin-icon coin-loonie" aria-hidden="true">
      $
    </span>
  );
});

export function CurrencyDisplay() {
  // Optimized selectors - only re-render when these specific values change
  const { curds, curdPerSecond, prestigeRennet, agingResetCount } = useGameStoreShallow((state) => ({
    curds: state.curds,
    curdPerSecond: state.curdPerSecond,
    prestigeRennet: state.prestige.rennet,
    agingResetCount: state.prestige.agingResetCount,
  }));
  const getPotentialRennet = useGameStore((state) => state.getPotentialRennet);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const hasPrestiged = agingResetCount > 0 || prestigeRennet > 0;
  const potentialRennet = getPotentialRennet();
  const showRennet = hasPrestiged || potentialRennet > 0;

  // Track previous curds value for animation detection
  const prevCurdsRef = useRef<Decimal>(curds);

  // Check for significant curd increases during render (not in effect)
  let isAnimating = false;
  if (!reducedMotion) {
    const prevCurds = prevCurdsRef.current;
    const diff = curds.minus(prevCurds);
    const threshold = prevCurds.mul(0.1);

    // Animate on significant increase (more than 10% or milestone)
    if (diff.gt(0) && (diff.gt(threshold) || (curds.gt(0) && curds.log(10).floor().gt(prevCurds.isZero() ? new Decimal(0) : prevCurds.log(10).floor())))) {
      isAnimating = true;
    }
    prevCurdsRef.current = curds;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <div
          className={`
            flex items-center gap-2 text-white font-bold text-2xl tabular-nums
            transition-transform duration-200
            ${isAnimating && !reducedMotion ? 'animate-number-pop' : ''}
          `}
        >
          <LoonieIcon />
          <span
            className={isAnimating && !reducedMotion ? 'animate-value-highlight' : ''}
            role="status"
            aria-live="polite"
            aria-label={`${formatNumber(curds)} curds`}
          >
            {formatNumber(curds)} Curds
          </span>
        </div>
        {showRennet && (
          <div className="hidden sm:block border-l border-white/30 pl-3 animate-fade-in">
            <RennetDisplay showPotential={potentialRennet > 0} className="text-white" />
          </div>
        )}
      </div>
      {!curdPerSecond.isZero() && (
        <div className="text-timmys-cream text-sm tabular-nums">
          {formatNumber(curdPerSecond)} / sec
        </div>
      )}
    </div>
  );
}
