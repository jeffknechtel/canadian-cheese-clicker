import { useGameStore } from '../../stores/gameStore';
import { formatNumber } from '../../utils/formatNumber';

interface RennetDisplayProps {
  showPotential?: boolean;
  className?: string;
}

export function RennetDisplay({ showPotential = false, className = '' }: RennetDisplayProps) {
  const { prestige, getPotentialRennet, getPrestigeMultipliers } = useGameStore();
  const potentialRennet = getPotentialRennet();
  const multipliers = getPrestigeMultipliers();

  const hasPrestiged = prestige.agingResetCount > 0 || prestige.rennet > 0;

  if (!hasPrestiged && potentialRennet === 0 && !showPotential) {
    return null;
  }

  return (
    <div className={`group relative inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-lg" title="Rennet">🧀</span>
      <span className="font-bold text-amber-700">{formatNumber(prestige.rennet)}</span>

      {showPotential && potentialRennet > 0 && (
        <span className="text-xs text-amber-600">
          (+{formatNumber(potentialRennet)})
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-rind text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg">
        <div className="font-semibold mb-1">Prestige Bonuses</div>
        <div className="space-y-0.5 text-gray-200">
          <div>Production: x{multipliers.production.toFixed(2)}</div>
          {multipliers.click > 1 && <div>Click: x{multipliers.click.toFixed(2)}</div>}
          {multipliers.costReduction > 0 && <div>Cost Reduction: {(multipliers.costReduction * 100).toFixed(0)}%</div>}
          {multipliers.xp > 1 && <div>XP Bonus: x{multipliers.xp.toFixed(2)}</div>}
          {multipliers.combat > 1 && <div>Combat: x{multipliers.combat.toFixed(2)}</div>}
        </div>
        <div className="text-gray-300 mt-1 pt-1 border-t border-gray-500">
          Aging Resets: {prestige.agingResetCount}
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-rind" />
      </div>
    </div>
  );
}
