import { useCallback, useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getHeroById, getHeroAbility, heroHasLimitBreak } from '../../data/heroes';
import { getZoneById } from '../../data/zones';
import { CombatATBBar, LimitBreakGauge } from './CombatATBBar';
import { EnemyDisplay } from './EnemyDisplay';
import { CompactCombatLog } from './CombatLog';
import { HeroAbilityButton } from './HeroAbilityButton';
import { announce } from '../../systems/accessibilityAnnouncer';
import type { HeroCombatState } from '../../types/game';

interface HeroCombatCardProps {
  heroState: HeroCombatState;
  isSelected?: boolean;
  heroNumber?: number;
}

function HeroCombatCard({ heroState, isSelected = false, heroNumber }: HeroCombatCardProps) {
  const hero = getHeroById(heroState.heroId);
  const ability = getHeroAbility(heroState.heroId);
  const combat = useGameStore((state) => state.combat);

  if (!hero) return null;

  const hpPercentage = (heroState.currentHp / heroState.maxHp) * 100;
  const isLowHp = hpPercentage < 25;
  const isMediumHp = hpPercentage < 50;
  const isReady = heroState.atbGauge >= 100;

  // Build status description for screen readers
  const healthStatus = !heroState.isAlive
    ? 'defeated'
    : isLowHp
      ? 'critically wounded'
      : isMediumHp
        ? 'wounded'
        : 'healthy';
  const readyStatus = isReady && heroState.isAlive ? ', ready to act' : '';
  const statusLabel = `${hero.name}: ${heroState.currentHp} of ${heroState.maxHp} HP, ${healthStatus}${readyStatus}`;

  return (
    <article
      className={`
        p-2 rounded-lg border transition-all duration-200
        ${!heroState.isAlive
          ? 'bg-gray-100 border-gray-200 opacity-50'
          : isSelected
            ? 'bg-maple-50 border-maple-400 ring-2 ring-maple-500 ring-opacity-75'
            : isReady
              ? 'bg-cheddar-50 border-cheddar-300 ring-2 ring-cheddar-400 ring-opacity-50'
              : 'bg-white/70 border-timber-200'
        }
      `}
      aria-label={statusLabel}
      aria-selected={isSelected}
      role="listitem"
      data-hero-number={heroNumber}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {/* Keyboard shortcut indicator */}
        {heroNumber && heroState.isAlive && (
          <span
            className={`
              w-5 h-5 flex items-center justify-center rounded text-xs font-bold
              ${isSelected
                ? 'bg-maple-500 text-white'
                : 'bg-gray-200 text-gray-600'
              }
            `}
            aria-hidden="true"
            title={`Press ${heroNumber} to select`}
          >
            {heroNumber}
          </span>
        )}
        <div
          className={`
            w-8 h-8 flex items-center justify-center rounded-lg text-lg
            ${!heroState.isAlive ? 'bg-gray-200 grayscale' : 'bg-maple-100'}
          `}
          aria-hidden="true"
        >
          {hero.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={`font-semibold text-sm truncate ${
                !heroState.isAlive ? 'text-gray-400 line-through' : 'text-timber-700'
              }`}
            >
              {hero.name}
            </span>
            {isReady && heroState.isAlive && (
              <span className="text-xs bg-cheddar-100 text-cheddar-700 px-1 rounded animate-pulse" aria-hidden="true">
                READY
              </span>
            )}
          </div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mt-1.5">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500" id={`hp-label-${heroState.heroId}`}>HP</span>
          <span
            className={`font-medium ${
              isLowHp ? 'text-red-600' : isMediumHp ? 'text-amber-600' : 'text-green-600'
            }`}
            aria-label={`${heroState.currentHp} of ${heroState.maxHp} hit points`}
          >
            {heroState.currentHp}/{heroState.maxHp}
          </span>
        </div>
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={heroState.currentHp}
          aria-valuemin={0}
          aria-valuemax={heroState.maxHp}
          aria-labelledby={`hp-label-${heroState.heroId}`}
        >
          <div
            className={`
              h-full rounded-full transition-all duration-300
              ${isLowHp
                ? 'bg-linear-to-r from-red-400 to-red-600'
                : isMediumHp
                  ? 'bg-linear-to-r from-amber-400 to-amber-600'
                  : 'bg-linear-to-r from-green-400 to-green-600'
              }
            `}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* ATB Bar */}
      {heroState.isAlive && (
        <div className="mt-1">
          <CombatATBBar
            currentValue={heroState.atbGauge}
            color="hero"
            isReady={isReady}
            showLabel={false}
            size="sm"
          />
        </div>
      )}

      {/* Ability Button */}
      {heroState.isAlive && ability && combat.battleResult === 'ongoing' && (
        <div className="mt-1.5">
          <HeroAbilityButton heroState={heroState} size="sm" />
        </div>
      )}

      {/* Status Effects */}
      {heroState.statusEffects.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5" role="list" aria-label="Active status effects">
          {heroState.statusEffects.map((effect) => (
            <span
              key={effect.id}
              role="listitem"
              className={`
                text-[10px] px-1 rounded font-medium
                ${effect.type === 'buff' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
              `}
              title={`${effect.stat}: ${effect.value > 0 ? '+' : ''}${effect.value} (${effect.duration} turns)`}
              aria-label={`${effect.type === 'buff' ? 'Buff' : 'Debuff'}: ${effect.stat} ${effect.value > 0 ? '+' : ''}${effect.value}, ${effect.duration} turns remaining`}
            >
              <span aria-hidden="true">{effect.stat === 'damage_over_time' ? '🔥' : effect.stat === 'heal_over_time' ? '💚' : '✨'}</span>
            </span>
          ))}
        </div>
      )}

      {/* Defeated Overlay */}
      {!heroState.isAlive && (
        <div className="mt-1 text-center text-xs text-gray-500" aria-hidden="true">💀 Down</div>
      )}
    </article>
  );
}

interface SpeedControlProps {
  currentSpeed: 1 | 2 | 4;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
}

function SpeedControl({ currentSpeed, onSpeedChange }: SpeedControlProps) {
  const speeds: Array<1 | 2 | 4> = [1, 2, 4];

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Combat speed control">
      <span className="text-xs text-gray-500 mr-1" id="speed-label">Speed:</span>
      {speeds.map((speed) => (
        <button
          key={speed}
          onClick={() => onSpeedChange(speed)}
          aria-pressed={currentSpeed === speed}
          aria-label={`${speed}x speed${currentSpeed === speed ? ' (selected)' : ''}`}
          className={`
            px-2 py-1 text-xs font-bold rounded transition-all
            ${currentSpeed === speed
              ? 'bg-maple-500 text-white shadow-xs'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }
          `}
        >
          {speed}x
        </button>
      ))}
    </div>
  );
}

interface CombatPanelProps {
  onFlee: () => void;
}

export function CombatPanel({ onFlee }: CombatPanelProps) {
  const combat = useGameStore((state) => state.combat);
  const setCombatSpeed = useGameStore((state) => state.setCombatSpeed);
  const canUseHeroSkill = useGameStore((state) => state.canUseHeroSkill);

  // Track selected hero for keyboard navigation
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);

  // Get zone info
  const zone = combat.currentZone ? getZoneById(combat.currentZone) : null;
  const isBossStage = zone ? combat.currentStage === zone.bossStage.stageNumber : false;

  // Get party heroes as array
  const heroStates = Object.values(combat.heroStates);
  const aliveHeroes = heroStates.filter((h) => h.isAlive);
  const aliveEnemies = combat.enemies.filter((e) => e.isAlive);

  // Reset selected hero index when heroes change
  useEffect(() => {
    if (selectedHeroIndex >= aliveHeroes.length) {
      setSelectedHeroIndex(Math.max(0, aliveHeroes.length - 1));
    }
  }, [aliveHeroes.length, selectedHeroIndex]);

  const handleLimitBreak = useCallback(() => {
    // Find the first alive hero with a limit break
    const heroWithLimitBreak = aliveHeroes.find((h) => heroHasLimitBreak(h.heroId));
    if (heroWithLimitBreak) {
      useGameStore.getState().useLimitBreak(heroWithLimitBreak.heroId);
    }
  }, [aliveHeroes]);

  // Use selected hero's ability
  const handleUseSelectedAbility = useCallback(() => {
    if (combat.battleResult !== 'ongoing') return;
    const selectedHero = aliveHeroes[selectedHeroIndex];
    if (!selectedHero) return;

    const ability = getHeroAbility(selectedHero.heroId);
    const { canUse, reason } = canUseHeroSkill(selectedHero.heroId);

    if (ability && canUse) {
      useGameStore.getState().useHeroSkill(selectedHero.heroId, ability.id);
      const hero = getHeroById(selectedHero.heroId);
      announce(`${hero?.name || 'Hero'} used ${ability.name}`, 'polite');
    } else if (reason) {
      announce(reason, 'polite');
    }
  }, [combat.battleResult, aliveHeroes, selectedHeroIndex, canUseHeroSkill]);

  // Combat keyboard navigation handler
  const handleCombatKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (combat.battleResult !== 'ongoing') return;

      switch (event.key) {
        // Navigate between heroes with arrow keys
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          setSelectedHeroIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : aliveHeroes.length - 1;
            const hero = getHeroById(aliveHeroes[newIndex]?.heroId);
            announce(`Selected ${hero?.name || 'hero'}`, 'polite');
            return newIndex;
          });
          break;

        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          setSelectedHeroIndex((prev) => {
            const newIndex = prev < aliveHeroes.length - 1 ? prev + 1 : 0;
            const hero = getHeroById(aliveHeroes[newIndex]?.heroId);
            announce(`Selected ${hero?.name || 'hero'}`, 'polite');
            return newIndex;
          });
          break;

        // Use ability with Enter or Space
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleUseSelectedAbility();
          break;

        // Select hero by number
        case '1':
        case '2':
        case '3':
        case '4': {
          const index = parseInt(event.key) - 1;
          if (index < aliveHeroes.length) {
            event.preventDefault();
            setSelectedHeroIndex(index);
            const hero = getHeroById(aliveHeroes[index]?.heroId);
            announce(`Selected ${hero?.name || 'hero'}`, 'polite');
          }
          break;
        }

        // Flee with F key
        case 'f':
        case 'F':
          event.preventDefault();
          onFlee();
          announce('Fleeing from battle', 'assertive');
          break;

        // Limit break with L key
        case 'l':
        case 'L':
          if (combat.limitBreakGauge >= 100) {
            event.preventDefault();
            handleLimitBreak();
            announce('Activated limit break', 'assertive');
          }
          break;

        // Speed controls
        case ',':
        case '<':
          event.preventDefault();
          setCombatSpeed(1);
          announce('Combat speed: 1x', 'polite');
          break;

        case '.':
          event.preventDefault();
          setCombatSpeed(2);
          announce('Combat speed: 2x', 'polite');
          break;

        case '/':
        case '>':
          event.preventDefault();
          setCombatSpeed(4);
          announce('Combat speed: 4x', 'polite');
          break;
      }
    },
    [combat.battleResult, combat.limitBreakGauge, aliveHeroes, handleUseSelectedAbility, onFlee, setCombatSpeed, handleLimitBreak]
  );

  // Build battle status description for screen readers
  const battleStatusText = combat.battleResult === 'ongoing'
    ? 'Battle in progress'
    : combat.battleResult === 'victory'
      ? 'Victory'
      : 'Defeat';

  return (
    <section
      className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain focus:outline-none focus:ring-2 focus:ring-cheddar-400"
      aria-labelledby="combat-heading"
      aria-describedby="battle-status"
      tabIndex={0}
      onKeyDown={handleCombatKeyDown}
      role="application"
      aria-roledescription="Combat interface. Use arrow keys to select heroes, Enter to use ability, F to flee, L for limit break."
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 id="combat-heading" className="text-lg font-bold text-timber-700 flex items-center gap-2">
            <span aria-hidden="true">⚔️</span>
            <span>Battle{isBossStage ? ' - Boss Fight' : ''}</span>
            {isBossStage && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold" aria-hidden="true">
                BOSS FIGHT
              </span>
            )}
          </h2>
          {zone && (
            <p className="text-xs text-gray-500">
              {zone.name} - Stage {combat.currentStage}
            </p>
          )}
        </div>
        <SpeedControl currentSpeed={combat.combatSpeed} onSpeedChange={setCombatSpeed} />
      </div>

      {/* Battle Status Bar */}
      <div
        id="battle-status"
        className="flex items-center justify-between px-3 py-2 bg-timber-100 rounded-lg mb-3"
        role="status"
        aria-live="polite"
        aria-label={`${battleStatusText}. Heroes: ${aliveHeroes.length} of ${heroStates.length} alive. Enemies: ${aliveEnemies.length} of ${combat.enemies.length} remaining.`}
      >
        <div className="flex items-center gap-4 text-sm">
          <span className="text-maple-600 font-medium">
            Heroes: {aliveHeroes.length}/{heroStates.length}
          </span>
          <span className="text-red-600 font-medium">
            Enemies: {aliveEnemies.length}/{combat.enemies.length}
          </span>
        </div>
        <div
          className={`
            px-2 py-1 rounded text-xs font-bold
            ${combat.battleResult === 'ongoing'
              ? 'bg-amber-500 text-white'
              : combat.battleResult === 'victory'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }
          `}
          aria-hidden="true"
        >
          {combat.battleResult === 'ongoing'
            ? '⚔️ FIGHTING'
            : combat.battleResult === 'victory'
              ? '🎉 VICTORY'
              : '💀 DEFEAT'}
        </div>
      </div>

      {/* Main Battle Area */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Party Side (Left) */}
        <div className="w-1/2 flex flex-col">
          <h3 id="party-heading" className="text-xs font-semibold text-timber-600 mb-2 flex items-center gap-1">
            <span aria-hidden="true">🍁</span> Your Party
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin" role="list" aria-labelledby="party-heading">
            {heroStates.map((heroState) => {
              const aliveIndex = aliveHeroes.findIndex((h) => h.heroId === heroState.heroId);
              return (
                <HeroCombatCard
                  key={heroState.heroId}
                  heroState={heroState}
                  isSelected={heroState.isAlive && aliveIndex === selectedHeroIndex}
                  heroNumber={aliveIndex >= 0 ? aliveIndex + 1 : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Enemy Side (Right) */}
        <div className="w-1/2 flex flex-col">
          <h3 id="enemies-heading" className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
            <span aria-hidden="true">👾</span> Enemies
          </h3>
          <div className="flex-1 overflow-y-auto scrollbar-thin" aria-labelledby="enemies-heading">
            <EnemyDisplay enemies={combat.enemies} />
          </div>
        </div>
      </div>

      {/* Limit Break Gauge */}
      <div className="mt-3">
        <LimitBreakGauge
          currentValue={combat.limitBreakGauge}
          onActivate={handleLimitBreak}
          isDisabled={combat.battleResult !== 'ongoing' || aliveHeroes.length === 0}
        />
      </div>

      {/* Combat Log (Compact) */}
      <div className="mt-3" aria-labelledby="combat-log-heading">
        <div id="combat-log-heading" className="text-xs font-semibold text-gray-500 mb-1">Recent Actions</div>
        <div className="bg-white/60 rounded-lg p-2 h-24 overflow-hidden" role="log" aria-live="polite" aria-atomic="false">
          <CompactCombatLog entries={combat.combatLog} maxEntries={4} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onFlee}
          disabled={combat.battleResult !== 'ongoing'}
          aria-label="Flee from battle"
          aria-disabled={combat.battleResult !== 'ongoing'}
          className={`
            flex-1 py-2 rounded font-medium text-sm transition-all
            ${combat.battleResult === 'ongoing'
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span aria-hidden="true">🏃</span> Flee (Sorry!)
        </button>
      </div>
    </section>
  );
}

