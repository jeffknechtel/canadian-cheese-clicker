import Decimal from 'decimal.js';
import type {
  CheeseRecipe,
  RecipeUnlockRequirement,
  CheeseCategory,
  CheeseEffect,
  MilkType,
  CultureType,
  RennetType,
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Cheese Recipe.
 * Encapsulates crafting requirements and quality calculation.
 */
export class Recipe extends BaseEntity<CheeseRecipe> implements CheeseRecipe {
  get name(): string {
    return this.data.name;
  }
  get description(): string {
    return this.data.description;
  }
  get category(): CheeseCategory {
    return this.data.category;
  }
  get requiredIngredients(): {
    milkType: MilkType[];
    cultureType: CultureType[];
    rennetType?: RennetType[];
    specialtyItems?: string[];
  } {
    return this.data.requiredIngredients;
  }
  get agingDuration(): number {
    return this.data.agingDuration;
  }
  get baseQuality(): number {
    return this.data.baseQuality;
  }
  get baseValue(): Decimal {
    return this.data.baseValue;
  }
  get effects(): CheeseEffect[] | undefined {
    return this.data.effects;
  }
  get unlockRequirement(): RecipeUnlockRequirement | undefined {
    return this.data.unlockRequirement;
  }
  get icon(): string {
    return this.data.icon;
  }

  static fromDefinition(data: CheeseRecipe): Recipe {
    return new Recipe(data);
  }
}
