import Decimal from 'decimal.js';
import { useSettingsStore } from '../stores/settingsStore';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: Decimal | number, forceStandard?: boolean): string {
  const num = value instanceof Decimal ? value : new Decimal(value);

  if (num.lt(1000)) {
    return num.floor().toString();
  }

  const format = forceStandard ? 'standard' : useSettingsStore.getState().game.numberFormat;

  if (format === 'scientific') {
    return num.toExponential(2);
  }

  // Standard format with suffixes
  const tier = Math.floor(Decimal.log10(num).div(3).toNumber());

  if (tier >= SUFFIXES.length) {
    // Fall back to scientific for extremely large numbers
    return num.toExponential(2);
  }

  const scale = new Decimal(10).pow(tier * 3);
  const scaled = num.div(scale);

  return scaled.toFixed(1) + SUFFIXES[tier];
}

// For display that doesn't need settings lookup (performance-critical paths)
export function formatNumberStandard(value: Decimal | number): string {
  return formatNumber(value, true);
}
