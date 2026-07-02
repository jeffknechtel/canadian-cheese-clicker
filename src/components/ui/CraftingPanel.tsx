import { useState } from 'react';
import { useGameStore } from '../../stores';
import { useGameStoreShallow } from '../../utils/zustandOptimization';
import { RecipeCard } from './crafting/RecipeCard';
import { CaveCard } from './crafting/CaveCard';
import { CheeseInventoryCard } from './crafting/CheeseInventoryCard';
import { CheeseCollectionView } from './crafting/CheeseCollectionView';
import { AnimatedTabContent } from './shared/AnimatedTabContent';
import { TabButton } from './shared/TabButton';
import { PanelContainer } from './shared/PanelContainer';
import { CHEESE_RECIPES } from '../../data/cheeseRecipes';

type CraftingTab = 'recipes' | 'caves' | 'inventory' | 'collection';

export function CraftingPanel() {
  const [activeTab, setActiveTab] = useState<CraftingTab>('recipes');
  const unlockedRecipes = useGameStoreShallow((state) => state.getUnlockedRecipes());
  const unlockedCaves = useGameStoreShallow((state) => state.getUnlockedCaves());
  const cheeseInventory = useGameStoreShallow((state) => state.getCheeseInventory());
  const activeJobs = useGameStoreShallow((state) => state.getActiveJobs());
  const collectionCount = useGameStore((state) => Object.keys(state.crafting.cheeseCollection).length);
  const totalRecipes = CHEESE_RECIPES.length;

  const tabs: { id: CraftingTab; label: string; count?: number }[] = [
    { id: 'recipes', label: 'Recipes', count: unlockedRecipes.length },
    { id: 'caves', label: 'Caves', count: activeJobs.length },
    { id: 'inventory', label: 'Inventory', count: cheeseInventory.length },
    { id: 'collection', label: 'Collection', count: collectionCount },
  ];

  return (
    <PanelContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-timber-700 flex items-center gap-2">
          <span>Cheese Crafting</span>
        </h2>
        {collectionCount > 0 && (
          <span className="text-xs bg-cheddar-100 text-cheddar-700 px-2 py-1 rounded border border-cheddar-200">
            {collectionCount}/{totalRecipes} Discovered
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            size="sm"
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1 ${activeTab === tab.id ? 'text-white/80' : 'text-timber-600'}`}>
                ({tab.count})
              </span>
            )}
          </TabButton>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatedTabContent activeKey={activeTab}>
          {activeTab === 'recipes' && (
            <RecipesTab recipes={unlockedRecipes} caves={unlockedCaves} />
          )}
          {activeTab === 'caves' && (
            <CavesTab caves={unlockedCaves} activeJobs={activeJobs} />
          )}
          {activeTab === 'inventory' && (
            <InventoryTab inventory={cheeseInventory} />
          )}
          {activeTab === 'collection' && (
            <CheeseCollectionView />
          )}
        </AnimatedTabContent>
      </div>
    </PanelContainer>
  );
}

// ===== Recipes Tab =====

import type { CheeseRecipe, AffinageCave } from '../../types/game';

interface RecipesTabProps {
  recipes: CheeseRecipe[];
  caves: AffinageCave[];
}

function RecipesTab({ recipes, caves }: RecipesTabProps) {
  const [selectedCave, setSelectedCave] = useState<string>(caves[0]?.id ?? '');
  // Array of primitives compared shallowly — re-renders only when a cave's slot count changes
  const caveAvailableSlots = useGameStoreShallow((state) =>
    caves.map((cave) => state.getCaveAvailableSlots(cave.id))
  );

  if (recipes.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">No recipes unlocked yet</p>
        <p className="text-xs mt-1">Gain Rennet through Aging to unlock recipes!</p>
      </div>
    );
  }

  // Group recipes by category
  const recipesByCategory = recipes.reduce((acc, recipe) => {
    const category = recipe.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(recipe);
    return acc;
  }, {} as Record<string, CheeseRecipe[]>);

  const categoryOrder = ['fresh', 'soft', 'semi_hard', 'hard', 'legendary'];
  const categoryLabels: Record<string, string> = {
    fresh: 'Fresh Cheeses',
    soft: 'Soft Cheeses',
    semi_hard: 'Semi-Hard Cheeses',
    hard: 'Hard Cheeses',
    legendary: 'Legendary Cheeses',
  };

  return (
    <div className="space-y-4">
      {/* Cave selector */}
      {caves.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
          <span className="text-xs text-timber-600 font-medium">Craft in:</span>
          <select
            value={selectedCave}
            onChange={(e) => setSelectedCave(e.target.value)}
            className="flex-1 text-xs bg-white border border-timber-200 rounded px-2 py-1 text-timber-700"
          >
            {caves.map((cave, index) => {
              const available = caveAvailableSlots[index];
              return (
                <option key={cave.id} value={cave.id}>
                  {cave.icon} {cave.name} ({available}/{cave.capacity} slots)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Recipes by category */}
      {categoryOrder.map((category) => {
        const categoryRecipes = recipesByCategory[category];
        if (!categoryRecipes || categoryRecipes.length === 0) return null;

        return (
          <div key={category}>
            <div className="text-xs font-semibold text-timber-600 mb-2 uppercase tracking-wide">
              {categoryLabels[category]}
            </div>
            <div className="space-y-2">
              {categoryRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  selectedCaveId={selectedCave}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Caves Tab =====

import type { CraftingJob } from '../../types/game';

interface CavesTabProps {
  caves: AffinageCave[];
  activeJobs: CraftingJob[];
}

function CavesTab({ caves, activeJobs }: CavesTabProps) {
  if (caves.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">No caves unlocked yet</p>
        <p className="text-xs mt-1">Gain Rennet to unlock your first cave!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {caves.map((cave) => {
        const caveJobs = activeJobs.filter((job) => job.caveId === cave.id);
        return (
          <CaveCard
            key={cave.id}
            cave={cave}
            jobs={caveJobs}
          />
        );
      })}
    </div>
  );
}

// ===== Inventory Tab =====

import type { CraftedCheese } from '../../types/game';

interface InventoryTabProps {
  inventory: CraftedCheese[];
}

function InventoryTab({ inventory }: InventoryTabProps) {
  if (inventory.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">No cheese in inventory</p>
        <p className="text-xs mt-1">Craft some cheese and collect it when ready!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {inventory.map((cheese) => (
        <CheeseInventoryCard key={cheese.id} cheese={cheese} />
      ))}
    </div>
  );
}
