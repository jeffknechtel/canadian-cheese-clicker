import type { CombatEnemy, StatusEffect } from '../../types/game';
import { getEnemyById, getBossById } from '../../data/enemies';
import { CombatATBBar } from './CombatATBBar';

interface StatusEffectBadgeProps {
  effect: StatusEffect;
}

function StatusEffectBadge({ effect }: StatusEffectBadgeProps) {
  const isBuff = effect.type === 'buff';
  const statIcons: Record<string, string> = {
    attack: '⚔️',
    defense: '🛡️',
    speed: '💨',
    hp: '❤️',
    cheeseAffinity: '🧀',
    damage_over_time: '🔥',
    heal_over_time: '💚',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs
        ${isBuff ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
      `}
      title={`${effect.stat}: ${effect.value > 0 ? '+' : ''}${effect.value} (${effect.duration} turns)`}
    >
      {statIcons[effect.stat] || '✨'}
      <span className="text-[10px]">{effect.duration}</span>
    </span>
  );
}

interface EnemyCardProps {
  enemy: CombatEnemy;
  showATB?: boolean;
}

export function EnemyCard({ enemy, showATB = true }: EnemyCardProps) {
  const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
  if (!enemyDef) return null;

  const isBoss = enemyDef.type === 'boss';
  const hpPercentage = (enemy.currentHp / enemy.maxHp) * 100;
  const isLowHp = hpPercentage < 25;
  const isMediumHp = hpPercentage < 50;
  const isReady = enemy.atbGauge >= 100;

  return (
    <div
      className={`
        p-2 rounded-lg border transition-all duration-200
        ${!enemy.isAlive
          ? 'bg-gray-100 border-gray-200 opacity-50 grayscale'
          : isBoss
            ? 'bg-red-50 border-red-300 shadow-md'
            : 'bg-white/70 border-timber-200'
        }
        ${isReady && enemy.isAlive ? 'ring-2 ring-red-400 ring-opacity-50' : ''}
      `}
    >
      {/* Header: Icon, Name, Type */}
      <div className="flex items-center gap-2">
        <div
          className={`
            w-10 h-10 flex items-center justify-center rounded-lg text-xl
            ${!enemy.isAlive
              ? 'bg-gray-200'
              : isBoss
                ? 'bg-red-100'
                : 'bg-timber-100'
            }
          `}
        >
          {enemyDef.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`
                font-semibold text-sm truncate
                ${!enemy.isAlive ? 'text-gray-400 line-through' : 'text-timber-700'}
              `}
            >
              {enemyDef.name}
            </span>
            {isBoss && enemy.isAlive && (
              <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold">
                BOSS
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="capitalize">{enemyDef.type}</span>
            {enemyDef.weakness && (
              <span className="text-amber-600">• Weak: {enemyDef.weakness}</span>
            )}
          </div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500">HP</span>
          <span
            className={`font-medium ${
              isLowHp ? 'text-red-600' : isMediumHp ? 'text-amber-600' : 'text-timber-600'
            }`}
          >
            {enemy.currentHp}/{enemy.maxHp}
          </span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-300
              ${isLowHp
                ? 'bg-gradient-to-r from-red-400 to-red-600'
                : isMediumHp
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                  : 'bg-gradient-to-r from-green-400 to-green-600'
              }
            `}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* ATB Bar */}
      {showATB && enemy.isAlive && (
        <div className="mt-1.5">
          <CombatATBBar
            currentValue={enemy.atbGauge}
            color="enemy"
            isReady={isReady}
            showLabel={false}
            size="sm"
          />
        </div>
      )}

      {/* Status Effects */}
      {enemy.statusEffects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {enemy.statusEffects.map((effect) => (
            <StatusEffectBadge key={effect.id} effect={effect} />
          ))}
        </div>
      )}

      {/* Defeated Overlay */}
      {!enemy.isAlive && (
        <div className="mt-2 text-center text-xs text-gray-500 font-medium">
          💀 Defeated
        </div>
      )}
    </div>
  );
}

interface EnemyDisplayProps {
  enemies: CombatEnemy[];
}

export function EnemyDisplay({ enemies }: EnemyDisplayProps) {
  const aliveEnemies = enemies.filter((e) => e.isAlive);
  const defeatedEnemies = enemies.filter((e) => !e.isAlive);

  return (
    <div className="space-y-2">
      {/* Alive Enemies */}
      {aliveEnemies.map((enemy) => (
        <EnemyCard key={enemy.instanceId} enemy={enemy} />
      ))}

      {/* Defeated Enemies (collapsed) */}
      {defeatedEnemies.length > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-400 mb-1">Defeated ({defeatedEnemies.length})</div>
          <div className="grid grid-cols-2 gap-1">
            {defeatedEnemies.map((enemy) => {
              const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
              return (
                <div
                  key={enemy.instanceId}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-400"
                >
                  <span className="grayscale">{enemyDef?.icon}</span>
                  <span className="truncate line-through">{enemyDef?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
