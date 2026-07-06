import type { DamageType } from '../types/game';

/** Icon for each damage element, shown on abilities and enemy weakness lines */
export const DAMAGE_TYPE_ICONS: Record<DamageType, string> = {
  physical: '⚔️',
  fire: '🔥',
  ice: '❄️',
  lightning: '⚡',
  nature: '🌿',
  holy: '✨',
  dark: '🌑',
};

/** Human-readable element label (capitalized) */
export function getDamageTypeLabel(damageType: DamageType): string {
  return damageType.charAt(0).toUpperCase() + damageType.slice(1);
}
