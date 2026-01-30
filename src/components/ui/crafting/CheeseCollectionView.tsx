import { useGameStore } from '../../../stores/gameStore';
import { CHEESE_RECIPES, formatAgingDuration } from '../../../data/cheeseRecipes';
import type { CheeseRecipe, CheeseCategory } from '../../../types/game';

const categoryOrder: CheeseCategory[] = ['fresh', 'soft', 'semi_hard', 'hard', 'legendary'];
const categoryLabels: Record<CheeseCategory, string> = {
  fresh: 'Fresh Cheeses',
  soft: 'Soft Cheeses',
  semi_hard: 'Semi-Hard Cheeses',
  hard: 'Hard Cheeses',
  legendary: 'Legendary Cheeses',
};

const categoryColors: Record<CheeseCategory, string> = {
  fresh: 'border-green-300 bg-green-50',
  soft: 'border-yellow-300 bg-yellow-50',
  semi_hard: 'border-orange-300 bg-orange-50',
  hard: 'border-red-300 bg-red-50',
  legendary: 'border-purple-300 bg-purple-50',
};

export function CheeseCollectionView() {
  const { crafting } = useGameStore();
  const { cheeseCollection, unlockedRecipes } = crafting;

  // Group recipes by category
  const recipesByCategory = CHEESE_RECIPES.reduce((acc, recipe) => {
    if (!acc[recipe.category]) acc[recipe.category] = [];
    acc[recipe.category].push(recipe);
    return acc;
  }, {} as Record<CheeseCategory, CheeseRecipe[]>);

  // Calculate totals
  const totalCrafted = Object.keys(cheeseCollection).length;
  const totalRecipes = CHEESE_RECIPES.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white/70 rounded-lg p-3 border border-timber-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-timber-700">Collection Progress</span>
          <span className="text-sm text-timber-600">
            {totalCrafted}/{totalRecipes} ({Math.round((totalCrafted / totalRecipes) * 100)}%)
          </span>
        </div>
        <div className="mt-2 h-3 bg-timber-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-cheddar-400 transition-all duration-500"
            style={{ width: `${(totalCrafted / totalRecipes) * 100}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {categoryOrder.map((category) => {
        const recipes = recipesByCategory[category];
        if (!recipes || recipes.length === 0) return null;

        const craftedInCategory = recipes.filter((r) => cheeseCollection[r.id]).length;

        return (
          <div key={category}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-timber-600 uppercase tracking-wide">
                {categoryLabels[category]}
              </span>
              <span className="text-xs text-timber-500">
                {craftedInCategory}/{recipes.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {recipes.map((recipe) => (
                <CollectionItem
                  key={recipe.id}
                  recipe={recipe}
                  timesCrafted={cheeseCollection[recipe.id] ?? 0}
                  isUnlocked={unlockedRecipes.includes(recipe.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CollectionItemProps {
  recipe: CheeseRecipe;
  timesCrafted: number;
  isUnlocked: boolean;
}

function CollectionItem({ recipe, timesCrafted, isUnlocked }: CollectionItemProps) {
  const isCrafted = timesCrafted > 0;

  return (
    <div
      className={`
        p-2 rounded-lg border transition-all
        ${isCrafted
          ? `${categoryColors[recipe.category]} border-2`
          : isUnlocked
            ? 'bg-white/50 border-timber-200'
            : 'bg-gray-100/50 border-gray-200 opacity-60'
        }
      `}
      title={isCrafted ? `Crafted ${timesCrafted} time${timesCrafted !== 1 ? 's' : ''}` : isUnlocked ? 'Not yet crafted' : 'Locked'}
    >
      <div className="flex items-center gap-2">
        <span className={`text-lg ${isCrafted ? '' : 'grayscale opacity-50'}`}>
          {recipe.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${isCrafted ? 'text-timber-700' : 'text-gray-500'}`}>
            {isCrafted || isUnlocked ? recipe.name : '???'}
          </div>
          {isCrafted && (
            <div className="text-xs text-timber-500">
              x{timesCrafted}
            </div>
          )}
          {!isCrafted && isUnlocked && (
            <div className="text-xs text-gray-400">
              {formatAgingDuration(recipe.agingDuration)}
            </div>
          )}
        </div>
        {isCrafted && (
          <span className="text-green-500 text-sm"></span>
        )}
      </div>
    </div>
  );
}
