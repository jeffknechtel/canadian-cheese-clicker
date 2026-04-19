import { CHEESE_RECIPES } from '../../data/cheeseRecipes';
import { Recipe } from '../entities/Recipe';
import { EntityRegistry } from './EntityRegistry';

const recipeEntities = CHEESE_RECIPES.map(Recipe.fromDefinition);

export const recipeRegistry = new EntityRegistry(recipeEntities);

export { Recipe };
