// Number formatting utilities - to be fully implemented in Phase 1.2
import Decimal from 'decimal.js';

export function formatNumber(value: Decimal | number): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  if (num < 1000) return Math.floor(num).toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num < 1_000_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  return (num / 1_000_000_000_000).toFixed(1) + 'T';
}
