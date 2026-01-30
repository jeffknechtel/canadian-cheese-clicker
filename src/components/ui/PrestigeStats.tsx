import { useGameStore } from '../../stores/gameStore';
import { AGING_UPGRADES, getAgingUpgradePurchaseCount } from '../../data/agingUpgrades';

interface StatRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatRow({ label, value, highlight = false }: StatRowProps) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-amber-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-amber-600' : 'text-rind'}`}>
        {value}
      </span>
    </div>
  );
}

export function PrestigeStats() {
  const { prestige, getPrestigeMultipliers } = useGameStore();
  const multipliers = getPrestigeMultipliers();

  // Calculate starting bonuses
  let startingCurds = 0;
  const startingGenerators: Record<string, number> = {};

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = AGING_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) continue;

    if (upgrade.effect.type === 'startingCurds') {
      startingCurds += upgrade.effect.value;
    } else if (upgrade.effect.type === 'startingGenerators') {
      const genId = upgrade.effect.generatorId;
      startingGenerators[genId] = (startingGenerators[genId] || 0) + upgrade.effect.value;
    }
  }

  const totalRennetSpent = prestige.totalRennet - prestige.rennet;

  // Count unique purchased upgrades
  const uniqueUpgrades = new Set(prestige.agingUpgrades);

  return (
    <div className="space-y-4">
      {/* Multipliers Section */}
      <div className="bg-white/50 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-amber-700 mb-2">Prestige Multipliers</h3>
        <StatRow
          label="Production"
          value={`x${multipliers.production.toFixed(2)}`}
          highlight={multipliers.production > 1}
        />
        <StatRow
          label="Click Power"
          value={`x${multipliers.click.toFixed(2)}`}
          highlight={multipliers.click > 1}
        />
        <StatRow
          label="Generator Cost Reduction"
          value={`${(multipliers.costReduction * 100).toFixed(0)}%`}
          highlight={multipliers.costReduction > 0}
        />
        <StatRow
          label="Hero XP Gain"
          value={`x${multipliers.xp.toFixed(2)}`}
          highlight={multipliers.xp > 1}
        />
        <StatRow
          label="Combat Rewards"
          value={`x${multipliers.combat.toFixed(2)}`}
          highlight={multipliers.combat > 1}
        />
      </div>

      {/* Aging Stats Section */}
      <div className="bg-white/50 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-amber-700 mb-2">Aging Statistics</h3>
        <StatRow label="Current Rennet" value={prestige.rennet.toString()} />
        <StatRow label="Total Rennet Earned" value={prestige.totalRennet.toString()} />
        <StatRow label="Total Rennet Spent" value={totalRennetSpent.toString()} />
        <StatRow label="Aging Resets" value={prestige.agingResetCount.toString()} />
        <StatRow label="Upgrades Purchased" value={`${uniqueUpgrades.size}/${AGING_UPGRADES.length}`} />
      </div>

      {/* Starting Bonuses Section */}
      {(startingCurds > 0 || Object.keys(startingGenerators).length > 0) && (
        <div className="bg-amber-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">Starting Bonuses (After Aging)</h3>
          {startingCurds > 0 && (
            <StatRow label="Starting Curds" value={startingCurds.toLocaleString()} highlight />
          )}
          {Object.entries(startingGenerators).map(([genId, count]) => (
            <StatRow
              key={genId}
              label={`Starting ${genId.replace(/_/g, ' ')}`}
              value={count.toString()}
              highlight
            />
          ))}
        </div>
      )}

      {/* Vintage Stats Section */}
      {(prestige.vintageWheels > 0 || prestige.vintageResetCount > 0) && (
        <div className="bg-purple-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-purple-700 mb-2">Vintage Statistics</h3>
          <StatRow label="Vintage Wheels" value={prestige.vintageWheels.toString()} />
          <StatRow label="Total Wheels Earned" value={prestige.totalVintageWheels.toString()} />
          <StatRow label="Vintage Resets" value={prestige.vintageResetCount.toString()} />
        </div>
      )}

      {/* Legacy Stats Section */}
      {prestige.legacyResetCount > 0 && (
        <div className="bg-yellow-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-yellow-700 mb-2">Legacy Statistics</h3>
          <StatRow label="Legacy Points" value={prestige.legacy.toString()} />
          <StatRow label="Legacy Resets" value={prestige.legacyResetCount.toString()} />
        </div>
      )}

      {/* Upgrade Purchases Summary */}
      {prestige.agingUpgrades.length > 0 && (
        <div className="bg-white/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">Purchased Upgrades</h3>
          <div className="space-y-1">
            {AGING_UPGRADES.map((upgrade) => {
              const count = getAgingUpgradePurchaseCount(prestige.agingUpgrades, upgrade.id);
              if (count === 0) return null;
              return (
                <div key={upgrade.id} className="flex items-center gap-2 text-sm">
                  <span>{upgrade.icon}</span>
                  <span className="text-gray-600">{upgrade.name}</span>
                  <span className="text-amber-600 font-medium">
                    x{count}{upgrade.maxPurchases > 1 && `/${upgrade.maxPurchases}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
