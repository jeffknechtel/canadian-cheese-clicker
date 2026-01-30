import { useGameStore } from '../../../stores/gameStore';
import { formatNumber } from '../../../utils/formatNumber';
import { getRecipeById } from '../../../data/cheeseRecipes';
import { playPurchaseSound } from '../../../systems/audioSystem';
import type { CraftedCheese, CheeseEffect } from '../../../types/game';

interface CheeseInventoryCardProps {
  cheese: CraftedCheese;
}

export function CheeseInventoryCard({ cheese }: CheeseInventoryCardProps) {
  const { consumeCheese, sellCheese } = useGameStore();
  const recipe = getRecipeById(cheese.recipeId);

  if (!recipe) return null;

  // Calculate sell value based on quality
  const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.5;
  const sellValue = recipe.baseValue.mul(qualityMultiplier);

  const hasEffects = recipe.effects && recipe.effects.length > 0;

  const handleConsume = () => {
    if (!hasEffects) return;

    const success = consumeCheese(cheese.id);
    if (success) {
      playPurchaseSound();
    }
  };

  const handleSell = () => {
    const value = sellCheese(cheese.id);
    if (value.gt(0)) {
      playPurchaseSound();
    }
  };

  return (
    <div className="bg-white/70 rounded-lg border border-timber-200 p-3 transition-all hover:bg-white/90">
      <div className="flex items-start gap-3">
        {/* Icon and Quality */}
        <div className="flex-shrink-0 relative">
          <div className="text-2xl w-12 h-12 flex items-center justify-center bg-timber-50 rounded-lg">
            {recipe.icon}
          </div>
          <div className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full px-1.5 py-0.5 border border-timber-200 font-medium">
            <QualityStars quality={cheese.quality} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-timber-700">{recipe.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getQualityColor(cheese.quality)}`}>
              Q{cheese.quality}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{recipe.description}</p>

          {/* Effects preview */}
          {hasEffects && (
            <div className="mt-1 flex flex-wrap gap-1">
              {recipe.effects!.map((effect, idx) => (
                <span
                  key={idx}
                  className="text-xs px-1.5 py-0.5 bg-cheddar-50 rounded text-cheddar-700"
                >
                  {formatEffect(effect, cheese.quality)}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients used */}
          <div className="mt-1.5 text-xs text-timber-500">
            Made with: {cheese.ingredients.milkType} milk, {cheese.ingredients.cultureType} culture
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-1">
          {hasEffects && (
            <button
              onClick={handleConsume}
              className="px-3 py-1.5 text-xs bg-cheddar-500 hover:bg-cheddar-600 text-white rounded font-medium transition-colors"
            >
              Consume
            </button>
          )}
          <button
            onClick={handleSell}
            className="px-3 py-1.5 text-xs bg-timber-100 hover:bg-timber-200 text-timber-700 rounded transition-colors"
          >
            Sell ({formatNumber(sellValue)})
          </button>
        </div>
      </div>
    </div>
  );
}

function QualityStars({ quality }: { quality: number }) {
  // Convert quality (1-100) to stars (1-5)
  const stars = Math.ceil(quality / 20);
  const fullStars = Math.min(5, stars);

  return (
    <span className="text-yellow-500" title={`Quality: ${quality}`}>
      {'★'.repeat(fullStars)}
      {'☆'.repeat(5 - fullStars)}
    </span>
  );
}

function getQualityColor(quality: number): string {
  if (quality >= 90) return 'bg-purple-100 text-purple-700';
  if (quality >= 70) return 'bg-yellow-100 text-yellow-700';
  if (quality >= 50) return 'bg-green-100 text-green-700';
  if (quality >= 30) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function formatEffect(effect: CheeseEffect, quality: number): string {
  // Scale effect by quality
  const qualityMultiplier = 0.5 + (quality / 100) * 1.0;
  const durationSec = Math.round(effect.duration / 1000);
  const durationStr = durationSec >= 60 ? `${Math.round(durationSec / 60)}m` : `${durationSec}s`;

  switch (effect.type) {
    case 'production_boost': {
      const bonus = Math.round((effect.multiplier - 1) * qualityMultiplier * 100);
      return `+${bonus}% Prod (${durationStr})`;
    }
    case 'click_boost': {
      const bonus = Math.round((effect.multiplier - 1) * qualityMultiplier * 100);
      return `+${bonus}% Click (${durationStr})`;
    }
    case 'xp_boost': {
      const bonus = Math.round((effect.multiplier - 1) * qualityMultiplier * 100);
      return `+${bonus}% XP (${durationStr})`;
    }
    case 'hero_buff': {
      const value = Math.round(effect.value * qualityMultiplier);
      return `+${value} ${effect.stat} (${durationStr})`;
    }
    default:
      return 'Unknown';
  }
}
