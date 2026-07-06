import { useState, useMemo, memo } from 'react';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { ACHIEVEMENTS } from '../../data/achievements';
import { AnimatedTabContent } from './shared/AnimatedTabContent';
import { TabButton } from './shared/TabButton';
import type { Achievement } from '../../types/game';

type CategoryFilter = Achievement['category'] | 'all';

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
}

function getRewardText(achievement: Achievement): string | null {
  if (!achievement.reward) return null;

  const { type, value } = achievement.reward;
  if (type === 'globalMultiplier') {
    const percent = Math.round((value - 1) * 100);
    return `+${percent}% all production`;
  }
  if (type === 'clickMultiplier') {
    return `x${value} click power`;
  }
  return null;
}

const AchievementCard = memo(function AchievementCard({ achievement, isUnlocked }: AchievementCardProps) {
  const rewardText = getRewardText(achievement);

  return (
    <div
      className={`
        p-3 rounded-lg transition-all
        ${isUnlocked
          ? 'bg-cheddar-200/70 border border-cheddar-400 card-lift'
          : 'bg-white/30 border border-transparent opacity-60'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            w-10 h-10 flex items-center justify-center text-2xl rounded-lg
            ${isUnlocked
              ? 'bg-cheddar-500/20'
              : 'bg-gray-300/30 grayscale'
            }
          `}
        >
          {achievement.icon ?? '?'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`
                font-semibold truncate
                ${isUnlocked ? 'text-rind' : 'text-gray-500'}
              `}
            >
              {isUnlocked ? achievement.name : '???'}
            </span>
            {isUnlocked && (
              <span className="text-xs bg-cheddar-700 text-white px-1.5 py-0.5 rounded shrink-0">
                Unlocked
              </span>
            )}
          </div>
          <p
            className={`
              text-xs mt-0.5
              ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}
            `}
          >
            {isUnlocked ? achievement.description : 'Keep playing to unlock!'}
          </p>
          {rewardText && isUnlocked && (
            <p className="text-xs text-maple-600 font-medium mt-1">
              {rewardText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export function AchievementPanel() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const {
    getUnlockedAchievements,
    getAchievementGlobalMultiplier,
    getAchievementClickMultiplier,
  } = useGameStore();
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const unlockedAchievements = getUnlockedAchievements();
  const achievementGlobalMult = getAchievementGlobalMultiplier();
  const achievementClickMult = getAchievementClickMultiplier();

  const unlockedIds = useMemo(
    () => new Set(unlockedAchievements.map((a) => a.id)),
    [unlockedAchievements]
  );

  const sortedAchievements = useMemo(() => {
    const filtered = categoryFilter === 'all'
      ? ACHIEVEMENTS.filter((a) => a.category !== 'hidden' || unlockedIds.has(a.id))
      : ACHIEVEMENTS.filter((a) => a.category === categoryFilter);

    return [...filtered].sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id);
      const bUnlocked = unlockedIds.has(b.id);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      return 0;
    });
  }, [categoryFilter, unlockedIds]);

  const categories: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'production', label: 'Production' },
    { value: 'clicking', label: 'Clicking' },
    { value: 'collection', label: 'Collection' },
    { value: 'canadian', label: 'Canadian' },
  ];

  return (
    <div className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-rind">Achievements</h2>
        <span className="text-xs bg-maple-100 text-maple-700 px-2 py-1 rounded">
          {unlockedAchievements.length}/{ACHIEVEMENTS.filter((a) => a.category !== 'hidden').length}
        </span>
      </div>

      {/* Multiplier stats */}
      {(achievementGlobalMult > 1 || achievementClickMult > 1) && (
        <div className="flex gap-2 mb-3 text-xs">
          {achievementGlobalMult > 1 && (
            <span className="bg-cheddar-100 text-cheddar-700 px-2 py-1 rounded">
              Production x{achievementGlobalMult.toFixed(2)}
            </span>
          )}
          {achievementClickMult > 1 && (
            <span className="bg-maple-100 text-maple-700 px-2 py-1 rounded">
              Click x{achievementClickMult.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Category filter */}
      <div role="tablist" aria-label="Achievement categories" className="flex flex-wrap gap-1 mb-3">
        {categories.map((cat) => (
          <TabButton
            key={cat.value}
            active={categoryFilter === cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            variant="cheddar"
            size="sm"
            id={`tab-achievement-${cat.value}`}
            controls="panel-achievement-list"
          >
            {cat.label}
          </TabButton>
        ))}
      </div>

      {/* Achievement List */}
      <div
        role="tabpanel"
        id="panel-achievement-list"
        aria-labelledby={`tab-achievement-${categoryFilter}`}
        className="flex-1 overflow-y-auto space-y-2 scrollbar-thin"
      >
        <AnimatedTabContent activeKey={categoryFilter}>
          {sortedAchievements.length > 0 ? (
            sortedAchievements.map((achievement, index) => {
              const staggerDelay = reducedMotion ? 0 : Math.min(index * 50, 250);
              return (
                <div
                  key={achievement.id}
                  className={!reducedMotion ? 'animate-slide-up' : ''}
                  style={{ animationDelay: `${staggerDelay}ms` }}
                >
                  <AchievementCard
                    achievement={achievement}
                    isUnlocked={unlockedIds.has(achievement.id)}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No achievements in this category</p>
            </div>
          )}
        </AnimatedTabContent>
      </div>
    </div>
  );
}
