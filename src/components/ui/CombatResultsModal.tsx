import { useState } from 'react';
import type { CombatRewards } from '../../types/game';
import { formatNumber } from '../../utils/formatNumber';
import { getHeroById } from '../../data/heroes';
import { getZoneById } from '../../data/zones';
import { useSettingsStore } from '../../stores/settingsStore';

// Canadian victory/defeat phrases
const VICTORY_PHRASES = [
  "Beauty! That was gouda, eh!",
  "We did it, bud! Sorry for the whooping!",
  "Hoser status: defeated! Great work, team!",
  "That's a wrap, folks! Time for a double-double!",
  "Another victory for the Great White North!",
  "Sorry we had to beat you so thoroughly!",
];

const DEFEAT_PHRASES = [
  "Sorry about that, folks. We'll get 'em next time!",
  "Well, that didn't go as planned, eh?",
  "Time to regroup and try again, bud!",
  "We took a licking but we'll keep on ticking!",
  "That was tougher than a Winnipeg winter!",
  "Back to the cheese caves for training!",
];

function getRandomPhrase(isVictory: boolean): string {
  const phrases = isVictory ? VICTORY_PHRASES : DEFEAT_PHRASES;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

interface CombatResultsModalProps {
  result: 'victory' | 'defeat';
  rewards?: CombatRewards | null;
  zoneId: string | null;
  stageNumber: number;
  onContinue: () => void;
  onRetry?: () => void;
}

export function CombatResultsModal({
  result,
  rewards,
  zoneId,
  stageNumber,
  onContinue,
  onRetry,
}: CombatResultsModalProps) {
  const isVictory = result === 'victory';
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Get random phrase - initialized once on mount
  const [phrase] = useState(() => getRandomPhrase(isVictory));

  // Get zone info
  const zone = zoneId ? getZoneById(zoneId) : null;
  const isBossStage = zone ? stageNumber === zone.bossStage.stageNumber : false;

  return (
    <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-60 ${!reducedMotion ? 'animate-backdrop-in' : ''}`}>
      <div
        className={`
          mx-4 max-w-md w-full rounded-lg shadow-2xl overflow-hidden
          ${isVictory
            ? 'bg-linear-to-b from-cheddar-50 to-cream border-4 border-cheddar-500'
            : 'bg-linear-to-b from-gray-100 to-cream border-4 border-gray-400'
          }
          ${!reducedMotion ? 'animate-modal-in' : ''}
        `}
      >
        {/* Header Banner */}
        <div
          className={`
            py-4 px-6 text-center
            ${isVictory
              ? 'bg-linear-to-r from-cheddar-500 to-cheddar-600'
              : 'bg-linear-to-r from-gray-500 to-gray-600'
            }
          `}
        >
          <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            {isVictory ? (
              <>
                <span className="animate-bounce">🎉</span>
                <span>Victory!</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🍁</span>
              </>
            ) : (
              <>
                <span>💀</span>
                <span>Defeat</span>
                <span>💀</span>
              </>
            )}
          </h2>
          {zone && (
            <p className="text-white/80 text-sm mt-1">
              {zone.name} - {isBossStage ? 'Boss Stage' : `Stage ${stageNumber}`}
            </p>
          )}
        </div>

        {/* Canadian Phrase */}
        <div className="px-6 pt-4">
          <p className="text-center text-timber-700 italic">"{phrase}"</p>
        </div>

        {/* Rewards Section (Victory Only) */}
        {isVictory && rewards && (
          <div className="p-6">
            <h3 className={`text-sm font-bold text-timber-600 mb-3 flex items-center gap-2 ${!reducedMotion ? 'animate-slide-up' : ''}`}>
              <span>🎁</span> Battle Rewards
            </h3>

            {/* Currency Rewards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`bg-cheddar-100 rounded-lg p-3 text-center ${!reducedMotion ? 'animate-slide-up' : ''}`} style={{ animationDelay: '50ms' }}>
                <div className={`text-2xl font-bold text-cheddar-700 tabular-nums ${!reducedMotion ? 'animate-number-pop' : ''}`} style={{ animationDelay: '150ms' }}>
                  +{formatNumber(rewards.curds)}
                </div>
                <div className="text-xs text-cheddar-600">Curds</div>
              </div>
              {rewards.whey.gt(0) && (
                <div className={`bg-purple-100 rounded-lg p-3 text-center ${!reducedMotion ? 'animate-slide-up' : ''}`} style={{ animationDelay: '100ms' }}>
                  <div className={`text-2xl font-bold text-purple-700 tabular-nums ${!reducedMotion ? 'animate-number-pop' : ''}`} style={{ animationDelay: '200ms' }}>
                    +{formatNumber(rewards.whey)}
                  </div>
                  <div className="text-xs text-purple-600">Whey</div>
                </div>
              )}
            </div>

            {/* XP Gained */}
            {Object.keys(rewards.xp).length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Experience Gained</h4>
                <div className="space-y-1">
                  {Object.entries(rewards.xp).map(([heroId, xp]) => {
                    const hero = getHeroById(heroId);
                    if (!hero) return null;
                    return (
                      <div
                        key={heroId}
                        className="flex items-center justify-between px-2 py-1 bg-timber-50 rounded"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <span>{hero.icon}</span>
                          <span className="text-timber-700">{hero.name}</span>
                        </span>
                        <span className="text-sm font-medium text-maple-600">+{xp} XP</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Item Drops */}
            {rewards.drops.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Items Found</h4>
                <div className="flex flex-wrap gap-1">
                  {rewards.drops.map((drop, index) => (
                    <span
                      key={`${drop.itemId}-${index}`}
                      className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs"
                    >
                      {drop.itemId} x{drop.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Defeat Message */}
        {!isVictory && (
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-2">Your heroes have fallen in battle.</p>
            <p className="text-sm text-gray-500">
              Try leveling up your heroes or improving their equipment before trying again.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {!isVictory && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-3 rounded-lg font-bold text-white bg-linear-to-r from-maple-500 to-maple-600 hover:from-maple-600 hover:to-maple-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              🔄 Try Again
            </button>
          )}
          <button
            onClick={onContinue}
            className={`
              flex-1 py-3 rounded-lg font-bold transition-all active:scale-[0.98]
              ${isVictory
                ? 'text-white bg-linear-to-r from-cheddar-500 to-cheddar-600 hover:from-cheddar-600 hover:to-cheddar-700 shadow-md hover:shadow-lg'
                : 'text-timber-700 bg-gray-200 hover:bg-gray-300'
              }
            `}
          >
            {isVictory ? '✓ Collect Rewards' : 'Return to Zone Select'}
          </button>
        </div>
      </div>
    </div>
  );
}
