import { useCallback, useState, useEffect, memo } from 'react';
import { useGameStore } from '../../stores';
import { useCombatState, useGameStoreShallow } from '../../utils/zustandOptimization';
import { useSettingsStore } from '../../stores/settingsStore';
import { getHeroAbility, heroHasLimitBreak } from '../../data/heroes';
import { heroRegistry, zoneRegistry } from '../../domain';
import { CombatATBBar, LimitBreakGauge } from './CombatATBBar';
import { EnemyDisplay } from './EnemyDisplay';
import { CompactCombatLog } from './CombatLog';
import { HeroAbilityButton } from './HeroAbilityButton';
import {
  DamageNumberContainer,
  FlashOverlay,
  ComboCounter,
  CombatResultBanner,
} from './CombatFeedback';
import { announce } from '../../systems/accessibilityAnnouncer';
import { ATB_MAX, LIMIT_BREAK_MAX, HP_LOW_THRESHOLD, HP_MEDIUM_THRESHOLD } from '../../systems/combatEngine';
import { PanelContainer } from './shared/PanelContainer';
import { ProgressBar } from './shared/ProgressBar';
import type { HeroCombatState } from '../../types/game';

interface HeroCombatCardProps {
  heroState: HeroCombatState;
  isSelected?: boolean;
  heroNumber?: number;
}

const HeroCombatCard = memo(function HeroCombatCard({ heroState, isSelected = false, heroNumber }: HeroCombatCardProps) {
  const hero = heroRegistry.get(heroState.heroId);
  const ability = getHeroAbility(heroState.heroId);
  const battleResult = useGameStore((state) => state.combat.battleResult);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  if (!hero) return null;

  const hpPercentage = (heroState.currentHp / heroState.maxHp) * 100;
  const isLowHp = hpPercentage < HP_LOW_THRESHOLD;
  const isMediumHp = hpPercentage < HP_MEDIUM_THRESHOLD;
  const isReady = heroState.atbGauge >= ATB_MAX;

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
      aria-current={isSelected ? 'true' : undefined}
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
                ? 'bg-maple-600 text-white'
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
        <div className="flex-1 min-w-0 overflow-hidden">
          <span
            className={`font-semibold text-sm block truncate ${
              !heroState.isAlive ? 'text-gray-400 line-through' : 'text-timber-700'
            }`}
            title={hero.name}
          >
            {hero.name}
            {isReady && heroState.isAlive && (
              <span className={`ml-1 text-xs bg-cheddar-100 text-cheddar-700 px-1 rounded ${!reducedMotion ? 'animate-pulse' : ''}`} aria-hidden="true">
                READY
              </span>
            )}
          </span>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mt-1.5">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500" id={`hp-label-${heroState.heroId}`}>HP</span>
          <span
            className={`font-medium ${
              isLowHp ? 'text-error' : isMediumHp ? 'text-warning' : 'text-success'
            }`}
            aria-label={`${heroState.currentHp} of ${heroState.maxHp} hit points`}
          >
            {heroState.currentHp}/{heroState.maxHp}
          </span>
        </div>
        <ProgressBar
          percent={hpPercentage}
          height="h-2"
          fillColor={
            isLowHp
              ? 'bg-linear-to-r from-red-400 to-red-600'
              : isMediumHp
                ? 'bg-linear-to-r from-amber-400 to-amber-600'
                : 'bg-linear-to-r from-green-400 to-green-600'
          }
          ariaLabel={`${heroState.currentHp} of ${heroState.maxHp} hit points`}
        />
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
      {heroState.isAlive && ability && battleResult === 'ongoing' && (
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
              <span aria-hidden="true">{effect.stat === 'damageOverTime' ? '🔥' : effect.stat === 'healOverTime' ? '💚' : '✨'}</span>
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
});

const COMBAT_SPEEDS: Array<1 | 2 | 4> = [1, 2, 4];

interface SpeedControlProps {
  currentSpeed: 1 | 2 | 4;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
}

const SpeedControl = memo(function SpeedControl({ currentSpeed, onSpeedChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Combat speed control">
      <span className="text-xs text-gray-500 mr-1" id="speed-label">Speed:</span>
      {COMBAT_SPEEDS.map((speed) => (
        <button
          key={speed}
          onClick={() => onSpeedChange(speed)}
          aria-pressed={currentSpeed === speed}
          aria-label={`${speed}x speed${currentSpeed === speed ? ' (selected)' : ''}`}
          className={`
            min-w-[44px] min-h-[44px] px-2 py-2 text-xs font-bold rounded transition-all btn-scale
            ${currentSpeed === speed
              ? 'bg-maple-600 text-white shadow-xs'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }
          `}
        >
          {speed}x
        </button>
      ))}
    </div>
  );
});

interface CombatPanelProps {
  onFlee: () => void;
}

export function CombatPanel({ onFlee }: CombatPanelProps) {
  // Low-frequency combat fields — change on turn/battle-level events only
  const { currentZone, currentStage, battleResult, combatSpeed, limitBreakGauge } = useCombatState();
  // Per-frame combat fields — this panel renders ATB/HP bars and feedback layers
  const { heroStates: heroStatesById, enemies, feedback, combatLog } = useGameStoreShallow((state) => ({
    heroStates: state.combat.heroStates,
    enemies: state.combat.enemies,
    feedback: state.combat.feedback,
    combatLog: state.combat.combatLog,
  }));
  const setCombatSpeed = useGameStore((state) => state.setCombatSpeed);
  const canUseHeroAbility = useGameStore((state) => state.canUseHeroAbility);
  const removeDamageNumber = useGameStore((state) => state.removeDamageNumber);

  // Track selected hero for keyboard navigation
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);

  // Derive values safely (these are needed for hooks below)
  // Must be computed before hooks to ensure consistent hook call order
  const isInitialized = !!(heroStatesById && enemies);
  const heroStates = isInitialized ? Object.values(heroStatesById) : [];
  const aliveHeroes = heroStates.filter((h) => h.isAlive);

  // Reset selected hero index when heroes change
  // Hook must be called unconditionally (React rules of hooks)
  useEffect(() => {
    if (isInitialized && selectedHeroIndex >= aliveHeroes.length) {
      setSelectedHeroIndex(Math.max(0, aliveHeroes.length - 1));
    }
  }, [isInitialized, aliveHeroes.length, selectedHeroIndex]);

  const handleLimitBreak = useCallback(() => {
    if (!isInitialized) return;
    // Find the first alive hero with a limit break
    const heroWithLimitBreak = aliveHeroes.find((h) => heroHasLimitBreak(h.heroId));
    if (heroWithLimitBreak) {
      useGameStore.getState().useLimitBreak(heroWithLimitBreak.heroId);
    }
  }, [isInitialized, aliveHeroes]);

  // Use selected hero's ability
  const handleUseSelectedAbility = useCallback(() => {
    if (!isInitialized || battleResult !== 'ongoing') return;
    const selectedHero = aliveHeroes[selectedHeroIndex];
    if (!selectedHero) return;

    const ability = getHeroAbility(selectedHero.heroId);
    const { canUse, reason } = canUseHeroAbility(selectedHero.heroId);

    if (ability && canUse) {
      useGameStore.getState().useHeroAbility(selectedHero.heroId, ability.id);
      const hero = heroRegistry.get(selectedHero.heroId);
      announce(`${hero?.name || 'Hero'} used ${ability.name}`, 'polite');
    } else if (reason) {
      announce(reason, 'polite');
    }
  }, [isInitialized, battleResult, aliveHeroes, selectedHeroIndex, canUseHeroAbility]);

  // Combat keyboard navigation handler
  const handleCombatKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isInitialized || battleResult !== 'ongoing') return;

      switch (event.key) {
        // Navigate between heroes with arrow keys
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          setSelectedHeroIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : aliveHeroes.length - 1;
            const hero = heroRegistry.get(aliveHeroes[newIndex]?.heroId);
            announce(`Selected ${hero?.name || 'hero'}`, 'polite');
            return newIndex;
          });
          break;

        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          setSelectedHeroIndex((prev) => {
            const newIndex = prev < aliveHeroes.length - 1 ? prev + 1 : 0;
            const hero = heroRegistry.get(aliveHeroes[newIndex]?.heroId);
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
            const hero = heroRegistry.get(aliveHeroes[index]?.heroId);
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
          if (limitBreakGauge >= LIMIT_BREAK_MAX) {
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
    [isInitialized, battleResult, limitBreakGauge, aliveHeroes, handleUseSelectedAbility, onFlee, setCombatSpeed, handleLimitBreak]
  );

  // Early return AFTER all hooks (React rules of hooks)
  // This prevents white screen errors when combat data is missing
  if (!isInitialized) {
    return (
      <PanelContainer as="section" className="items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <p className="text-timber-700 font-medium">Initializing combat...</p>
          <p className="text-sm text-gray-500 mt-2">If this persists, try selecting a zone again.</p>
        </div>
      </PanelContainer>
    );
  }

  // Get zone info (safe to access now that we know combat is initialized)
  const zone = currentZone ? zoneRegistry.get(currentZone) : null;
  const isBossStage = zone ? currentStage === zone.bossStage.stageNumber : false;
  const aliveEnemies = enemies.filter((e) => e.isAlive);

  // Build battle status description for screen readers
  const battleStatusText = battleResult === 'ongoing'
    ? 'Battle in progress'
    : battleResult === 'victory'
      ? 'Victory'
      : 'Defeat';

  // Shake class for screen shake effect
  const shakeClass = feedback?.shakeIntensity
    ? `animate-shake-${feedback.shakeIntensity}`
    : '';

  return (
    <PanelContainer
      as="section"
      className={`relative focus:outline-none focus:ring-2 focus:ring-cheddar-400 ${shakeClass}`}
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
              {zone.name} - Stage {currentStage}
            </p>
          )}
        </div>
        <SpeedControl currentSpeed={combatSpeed} onSpeedChange={setCombatSpeed} />
      </div>

      {/* Battle Status Bar */}
      <div
        id="battle-status"
        className="flex items-center justify-between px-3 py-2 bg-timber-100 rounded-lg mb-3"
        role="status"
        aria-live="polite"
        aria-label={`${battleStatusText}. Heroes: ${aliveHeroes.length} of ${heroStates.length} alive. Enemies: ${aliveEnemies.length} of ${enemies.length} remaining.`}
      >
        <div className="flex items-center gap-4 text-sm">
          <span className="text-maple-600 font-medium">
            Heroes: {aliveHeroes.length}/{heroStates.length}
          </span>
          <span className="text-red-600 font-medium">
            Enemies: {aliveEnemies.length}/{enemies.length}
          </span>
        </div>
        <div
          className={`
            px-2 py-1 rounded text-xs font-bold
            ${battleResult === 'ongoing'
              ? 'bg-amber-500 text-white'
              : battleResult === 'victory'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }
          `}
          aria-hidden="true"
        >
          {battleResult === 'ongoing'
            ? '⚔️ FIGHTING'
            : battleResult === 'victory'
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
            <EnemyDisplay enemies={enemies} />
          </div>
        </div>
      </div>

      {/* Limit Break Gauge */}
      <div className="mt-3">
        <LimitBreakGauge
          currentValue={limitBreakGauge}
          onActivate={handleLimitBreak}
          isDisabled={battleResult !== 'ongoing' || aliveHeroes.length === 0}
        />
      </div>

      {/* Combat Log (Compact) */}
      <div className="mt-3" aria-labelledby="combat-log-heading">
        <div id="combat-log-heading" className="text-xs font-semibold text-gray-500 mb-1">Recent Actions</div>
        <div className="bg-white/60 rounded-lg p-2 h-24 overflow-hidden" role="log" aria-live="polite" aria-atomic="false">
          <CompactCombatLog entries={combatLog} maxEntries={4} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onFlee}
          disabled={battleResult !== 'ongoing'}
          aria-label="Flee from battle"
          aria-disabled={battleResult !== 'ongoing'}
          className={`
            flex-1 py-2 rounded font-medium text-sm transition-all btn-scale
            ${battleResult === 'ongoing'
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span aria-hidden="true">🏃</span> Flee (Sorry!)
        </button>
      </div>

      {/* Combat Feedback Overlays */}
      {feedback && (
        <>
          <FlashOverlay
            isFlashing={feedback.isFlashing}
            color={feedback.flashColor || 'red'}
          />
          <DamageNumberContainer
            numbers={feedback.damageNumbers}
            onRemove={removeDamageNumber}
          />
          <ComboCounter
            count={feedback.comboCount}
            maxCombo={feedback.maxCombo}
          />
          {battleResult && battleResult !== 'ongoing' && (
            <CombatResultBanner result={battleResult} />
          )}
        </>
      )}
    </PanelContainer>
  );
}

