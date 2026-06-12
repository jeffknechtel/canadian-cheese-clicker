import { useState, useMemo, memo } from 'react';
import { useGameStore } from '../../stores';
import { useGameStoreShallow } from '../../utils/zustandOptimization';
import { computeCpsBreakdown } from '../../stores/slices/production/cpsBreakdown';
import { formatNumber } from '../../utils/formatNumber';

export const CpsBreakdownPanel = memo(function CpsBreakdownPanel() {
  const [expanded, setExpanded] = useState(false);

  const curdPerSecond = useGameStoreShallow((s) => s.curdPerSecond);

  const breakdown = useMemo(() => {
    const fullState = useGameStore.getState();
    return computeCpsBreakdown(fullState);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Recompute when CPS changes
  }, [curdPerSecond]);

  const generators = breakdown.items.filter((i) => i.category === 'generator');
  const multipliers = breakdown.items.filter((i) => i.category === 'multiplier');

  if (breakdown.total.isZero()) return null;

  return (
    <div className="bg-cream/80 rounded-lg p-3 shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={expanded}
        aria-controls="cps-breakdown-content"
      >
        <span className="font-semibold text-timber-700">CPS Breakdown</span>
        <span className="text-sm text-gray-500">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div id="cps-breakdown-content" className="mt-3 space-y-2 text-sm">
          {generators.length > 0 && (
            <>
              <div className="font-medium text-gray-700">Generators</div>
              {generators.map((item, i) => (
                <div key={i} className="flex justify-between pl-2 text-gray-600">
                  <span className="truncate mr-2">{item.label}</span>
                  <span className="tabular-nums whitespace-nowrap">
                    {formatNumber(item.value)}/s
                    {item.percentage !== undefined && (
                      <span className="text-gray-400 ml-1">
                        ({item.percentage.toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </>
          )}

          {multipliers.length > 0 && (
            <>
              <div className="font-medium text-gray-700 mt-3">Multipliers</div>
              {multipliers.map((item, i) => (
                <div key={i} className="flex justify-between pl-2 text-gray-600">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-green-600">
                    ×{item.multiplier?.toFixed(2)}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-semibold text-timber-700">
            <span>Total CPS</span>
            <span className="tabular-nums">{formatNumber(breakdown.total)}/s</span>
          </div>
        </div>
      )}
    </div>
  );
});
