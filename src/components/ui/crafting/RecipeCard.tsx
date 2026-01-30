import { useState } from 'react';
import { useGameStore } from '../../../stores/gameStore';
import { formatNumber } from '../../../utils/formatNumber';
import { formatAgingDuration } from '../../../data/cheeseRecipes';
import { getMilkByType, getCultureByType, getRennetByType } from '../../../data/ingredients';
import { playPurchaseSound } from '../../../systems/audioSystem';
import type { CheeseRecipe, MilkType, CultureType, RennetType, CheeseEffect } from '../../../types/game';

interface RecipeCardProps {
  recipe: CheeseRecipe;
  selectedCaveId: string;
}

const categoryColors: Record<string, string> = {
  fresh: 'bg-green-600 text-white border-green-700',
  soft: 'bg-amber-500 text-white border-amber-600',
  semi_hard: 'bg-orange-600 text-white border-orange-700',
  hard: 'bg-red-600 text-white border-red-700',
  legendary: 'bg-purple-600 text-white border-purple-700',
};

export function RecipeCard({ recipe, selectedCaveId }: RecipeCardProps) {
  const { curds, crafting, startCrafting, canStartCrafting } = useGameStore();

  // Ingredient selection state
  const [selectedMilk, setSelectedMilk] = useState<MilkType>(
    recipe.requiredIngredients.milkType[0]
  );
  const [selectedCulture, setSelectedCulture] = useState<CultureType>(
    recipe.requiredIngredients.cultureType[0]
  );
  const [selectedRennet, setSelectedRennet] = useState<RennetType>(
    recipe.requiredIngredients.rennetType?.[0] ?? 'animal'
  );

  const [isExpanded, setIsExpanded] = useState(false);

  // Get ingredient data
  const milk = getMilkByType(selectedMilk);
  const culture = getCultureByType(selectedCulture);
  const rennet = getRennetByType(selectedRennet);

  // Calculate total cost
  const totalCost = (milk?.cost.toNumber() ?? 0) +
    (culture?.cost.toNumber() ?? 0) +
    (rennet?.cost.toNumber() ?? 0);

  // Check if we can afford and have slots
  const canAfford = curds.gte(totalCost);
  const { canStart, reason } = canStartCrafting(recipe.id, selectedCaveId);

  // Check if ingredients are unlocked
  const milkUnlocked = milk && crafting.unlockedIngredients.includes(milk.id);
  const cultureUnlocked = culture && crafting.unlockedIngredients.includes(culture.id);
  const rennetUnlocked = rennet && crafting.unlockedIngredients.includes(rennet.id);
  const allIngredientsUnlocked = milkUnlocked && cultureUnlocked && rennetUnlocked;

  const canCraft = canStart && canAfford && allIngredientsUnlocked;

  const handleCraft = () => {
    if (!canCraft) return;

    const success = startCrafting(recipe.id, selectedCaveId, {
      milkType: selectedMilk,
      cultureType: selectedCulture,
      rennetType: selectedRennet,
      specialtyItems: [], // TODO: Add specialty item selection
    });

    if (success) {
      playPurchaseSound();
    }
  };

  return (
    <div className="bg-white/70 rounded-lg border border-timber-200 overflow-hidden transition-all">
      {/* Header - always visible */}
      <div
        className="p-3 cursor-pointer hover:bg-white/90 transition-colors"
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 text-2xl w-10 h-10 flex items-center justify-center bg-timber-50 rounded-lg">
            {recipe.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-timber-700">{recipe.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${categoryColors[recipe.category]}`}>
                {recipe.category.replace('_', '-')}
              </span>
              {recipe.province && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-maple-100 text-maple-700 border border-maple-200">
                  {recipe.province}
                </span>
              )}
            </div>
            <p className="text-xs text-timber-600 mt-1 line-clamp-2" title={recipe.description}>{recipe.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="text-timber-500 font-medium">
                {formatAgingDuration(recipe.agingDuration)}
              </span>
              <span className="text-cheddar-700 font-medium">
                Base: {formatNumber(recipe.baseValue)} curds
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          <div className="shrink-0 text-timber-400">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-timber-100 pt-3 space-y-3">
          {/* Ingredient Selectors */}
          <div className="grid grid-cols-3 gap-2">
            {/* Milk selector */}
            <div>
              <label className="text-xs text-timber-600 font-medium block mb-1">Milk</label>
              <select
                value={selectedMilk}
                onChange={(e) => setSelectedMilk(e.target.value as MilkType)}
                className="w-full text-xs bg-white border border-timber-200 rounded px-2 py-1.5"
              >
                {recipe.requiredIngredients.milkType.map((type) => {
                  const ingredient = getMilkByType(type);
                  const isUnlocked = ingredient && crafting.unlockedIngredients.includes(ingredient.id);
                  return (
                    <option key={type} value={type} disabled={!isUnlocked}>
                      {ingredient?.icon} {ingredient?.name} {!isUnlocked && '(Locked)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Culture selector */}
            <div>
              <label className="text-xs text-timber-600 font-medium block mb-1">Culture</label>
              <select
                value={selectedCulture}
                onChange={(e) => setSelectedCulture(e.target.value as CultureType)}
                className="w-full text-xs bg-white border border-timber-200 rounded px-2 py-1.5"
              >
                {recipe.requiredIngredients.cultureType.map((type) => {
                  const ingredient = getCultureByType(type);
                  const isUnlocked = ingredient && crafting.unlockedIngredients.includes(ingredient.id);
                  return (
                    <option key={type} value={type} disabled={!isUnlocked}>
                      {ingredient?.icon} {ingredient?.name} {!isUnlocked && '(Locked)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Rennet selector */}
            <div>
              <label className="text-xs text-timber-600 font-medium block mb-1">Rennet</label>
              <select
                value={selectedRennet}
                onChange={(e) => setSelectedRennet(e.target.value as RennetType)}
                className="w-full text-xs bg-white border border-timber-200 rounded px-2 py-1.5"
              >
                {(recipe.requiredIngredients.rennetType ?? ['animal', 'vegetable', 'microbial']).map((type) => {
                  const ingredient = getRennetByType(type);
                  const isUnlocked = ingredient && crafting.unlockedIngredients.includes(ingredient.id);
                  return (
                    <option key={type} value={type} disabled={!isUnlocked}>
                      {ingredient?.icon} {ingredient?.name} {!isUnlocked && '(Locked)'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Effects preview */}
          {recipe.effects && recipe.effects.length > 0 && (
            <div className="bg-timber-50 rounded p-2">
              <div className="text-xs font-medium text-timber-600 mb-1">Effects when consumed:</div>
              <div className="flex flex-wrap gap-1">
                {recipe.effects.map((effect, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 bg-white rounded border border-timber-200 text-timber-700"
                  >
                    {formatEffect(effect)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cost and craft button */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-timber-600">Cost: </span>
              <span className={canAfford ? 'text-timber-700 font-medium' : 'text-red-500 font-medium'}>
                {formatNumber(totalCost)} curds
              </span>
            </div>

            <button
              onClick={handleCraft}
              disabled={!canCraft}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${canCraft
                  ? 'bg-cheddar-500 hover:bg-cheddar-600 text-white shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-gray-200 text-gray-700 cursor-not-allowed'
                }
              `}
            >
              {!canStart
                ? reason ?? 'Cannot Craft'
                : !allIngredientsUnlocked
                  ? 'Unlock Ingredients'
                  : !canAfford
                    ? 'Need Curds'
                    : 'Start Crafting'
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatEffect(effect: CheeseEffect): string {
  const durationSec = Math.round(effect.duration / 1000);
  const durationStr = durationSec >= 60 ? `${Math.round(durationSec / 60)}m` : `${durationSec}s`;

  switch (effect.type) {
    case 'production_boost':
      return `+${Math.round((effect.multiplier - 1) * 100)}% Production (${durationStr})`;
    case 'click_boost':
      return `+${Math.round((effect.multiplier - 1) * 100)}% Click (${durationStr})`;
    case 'xp_boost':
      return `+${Math.round((effect.multiplier - 1) * 100)}% XP (${durationStr})`;
    case 'hero_buff':
      return `+${effect.value} ${effect.stat} (${durationStr})`;
    default:
      return 'Unknown effect';
  }
}
