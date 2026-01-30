import { useGameStore } from '../../stores/gameStore';
import { getHeroById, getHeroAbility, getHeroLimitBreak, heroHasLimitBreak } from '../../data/heroes';
import { getAbilityCooldown, isAbilityReady } from '../../systems/combatEngine';
import type { HeroCombatState } from '../../types/game';

interface HeroAbilityButtonProps {
  heroState: HeroCombatState;
  size?: 'sm' | 'md' | 'lg';
}

export function HeroAbilityButton({ heroState, size = 'md' }: HeroAbilityButtonProps) {
  const canUseHeroSkill = useGameStore((state) => state.canUseHeroSkill);
  const combat = useGameStore((state) => state.combat);

  const hero = getHeroById(heroState.heroId);
  const ability = getHeroAbility(heroState.heroId);

  if (!hero || !ability) return null;

  const { canUse, reason } = canUseHeroSkill(heroState.heroId);
  const cooldown = getAbilityCooldown(heroState, heroState.heroId);
  const abilityIsReady = isAbilityReady(heroState, heroState.heroId);
  const isDisabled = !canUse || combat.battleResult !== 'ongoing';

  const handleClick = () => {
    if (!isDisabled) {
      useGameStore.getState().useHeroSkill(heroState.heroId, ability.id);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        title={!canUse ? reason : ability.description}
        className={`
          ${sizeClasses[size]}
          rounded font-medium transition-all duration-200 w-full
          ${abilityIsReady && !isDisabled
            ? 'bg-gradient-to-r from-maple-500 to-maple-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
            : isDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-maple-200 text-maple-700 cursor-not-allowed'
          }
        `}
      >
        <div className="flex items-center justify-center gap-1">
          <span>{ability.name}</span>
          {cooldown > 0 && (
            <span className="bg-black/20 px-1 rounded text-[10px]">
              {cooldown}
            </span>
          )}
        </div>
      </button>

      {/* Cooldown overlay */}
      {cooldown > 0 && (
        <div className="absolute inset-0 bg-gray-500/30 rounded flex items-center justify-center">
          <span className="text-white font-bold text-shadow">{cooldown}</span>
        </div>
      )}
    </div>
  );
}

interface LimitBreakButtonProps {
  heroId: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LimitBreakButton({ heroId, size = 'md' }: LimitBreakButtonProps) {
  const canUseLimitBreakAction = useGameStore((state) => state.canUseLimitBreakAction);
  const combat = useGameStore((state) => state.combat);

  const hero = getHeroById(heroId);
  const limitBreak = getHeroLimitBreak(heroId);

  if (!hero || !limitBreak) return null;

  const { canUse, reason } = canUseLimitBreakAction(heroId);
  const isDisabled = !canUse || combat.battleResult !== 'ongoing';

  const handleClick = () => {
    if (!isDisabled) {
      useGameStore.getState().useLimitBreak(heroId);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={!canUse ? reason : limitBreak.description}
      className={`
        ${sizeClasses[size]}
        rounded font-bold transition-all duration-200 w-full
        ${canUse && !isDisabled
          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] animate-pulse'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }
      `}
    >
      <div className="flex items-center justify-center gap-1">
        <span>⚡</span>
        <span>{limitBreak.name}</span>
        <span>⚡</span>
      </div>
    </button>
  );
}

interface HeroAbilityPanelProps {
  compact?: boolean;
}

export function HeroAbilityPanel({ compact = false }: HeroAbilityPanelProps) {
  const combat = useGameStore((state) => state.combat);

  const heroStates = Object.values(combat.heroStates);
  const aliveHeroes = heroStates.filter((h) => h.isAlive);

  // Find heroes with limit breaks
  const heroesWithLimitBreak = aliveHeroes.filter((h) => heroHasLimitBreak(h.heroId));
  const isLimitBreakReady = combat.limitBreakGauge >= 100;

  if (aliveHeroes.length === 0) return null;

  return (
    <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
      {/* Ability buttons for each hero */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-1' : 'grid-cols-1 gap-2'}`}>
        {aliveHeroes.map((heroState) => (
          <div key={heroState.heroId} className="flex items-center gap-1">
            {!compact && (
              <span className="text-xs text-gray-500 w-20 truncate">
                {getHeroById(heroState.heroId)?.name}:
              </span>
            )}
            <div className="flex-1">
              <HeroAbilityButton heroState={heroState} size={compact ? 'sm' : 'md'} />
            </div>
          </div>
        ))}
      </div>

      {/* Limit break buttons */}
      {isLimitBreakReady && heroesWithLimitBreak.length > 0 && (
        <div className={`mt-2 pt-2 border-t border-timber-200 ${compact ? 'space-y-1' : 'space-y-2'}`}>
          <div className="text-xs font-semibold text-amber-600 flex items-center gap-1">
            <span>⚡</span> Limit Breaks Available!
          </div>
          {heroesWithLimitBreak.map((heroState) => (
            <LimitBreakButton
              key={heroState.heroId}
              heroId={heroState.heroId}
              size={compact ? 'sm' : 'md'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
