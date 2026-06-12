import Decimal from 'decimal.js';

export interface TimeToAfford {
  canAfford: boolean;
  seconds: number | null;
  formatted: string;
}

export function calculateTimeToAfford(
  cost: Decimal,
  currentCurds: Decimal,
  curdPerSecond: Decimal
): TimeToAfford {
  if (currentCurds.gte(cost)) {
    return { canAfford: true, seconds: 0, formatted: 'Now' };
  }

  if (curdPerSecond.isZero() || curdPerSecond.isNegative()) {
    return { canAfford: false, seconds: null, formatted: '∞' };
  }

  const remaining = cost.minus(currentCurds);
  const seconds = remaining.div(curdPerSecond).ceil().toNumber();

  return {
    canAfford: false,
    seconds,
    formatted: formatDuration(seconds),
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
