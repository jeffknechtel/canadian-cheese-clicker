import type { BossDefinition, EnemyDefinition } from '../../types/game';
import { ENEMIES, BOSSES } from '../../data/enemies';
import { Enemy } from '../entities/Enemy';
import { EntityRegistry } from './EntityRegistry';

const enemyEntities = ENEMIES.map(Enemy.fromDefinition);

export const enemyRegistry = new EntityRegistry(enemyEntities);
export const bossRegistry = new EntityRegistry<BossDefinition>(BOSSES);

/**
 * Unified lookup for any enemy (regular or boss).
 * Returns the raw definition for bosses, Enemy instance for regular enemies.
 */
export function getAnyEnemy(id: string): EnemyDefinition | undefined {
  const enemy = enemyRegistry.get(id);
  if (enemy) return enemy.toJSON();
  return bossRegistry.get(id);
}

export { Enemy };
