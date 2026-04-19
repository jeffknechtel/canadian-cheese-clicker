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

type CheeseQuality = 'poor' | 'average' | 'good' | 'excellent' | 'legendary';

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

  protected withData(updates: Partial<CheeseRecipe>): this {
    return new Recipe({ ...this.data, ...updates }) as this;
  }

  /**
   * Check if player has required ingredients available.
   */
  canCraftWith(
    milkType: MilkType,
    cultureType: CultureType,
    rennetType?: RennetType
  ): boolean {
    const milkValid = this.requiredIngredients.milkType.includes(milkType);
    const cultureValid = this.requiredIngredients.cultureType.includes(cultureType);

    if (!this.requiredIngredients.rennetType) {
      return milkValid && cultureValid;
    }

    const rennetValid = rennetType
      ? this.requiredIngredients.rennetType.includes(rennetType)
      : false;

    return milkValid && cultureValid && rennetValid;
  }

  /**
   * Calculate final quality based on modifiers.
   */
  calculateQuality(qualityModifier: number = 0): CheeseQuality {
    const finalQuality = this.baseQuality + qualityModifier;

    if (finalQuality >= 90) return 'legendary';
    if (finalQuality >= 75) return 'excellent';
    if (finalQuality >= 50) return 'good';
    if (finalQuality >= 25) return 'average';
    return 'poor';
  }

  /**
   * Get total crafting time including aging.
   */
  getTotalTime(): number {
    return this.agingDuration;
  }

  /**
   * Check if this is a legendary recipe.
   */
  isLegendary(): boolean {
    return this.category === 'legendary';
  }

  /**
   * Check if this recipe requires aging.
   */
  requiresAging(): boolean {
    return this.agingDuration > 0;
  }

  /**
   * Get required cave tier for aging (if any).
   */
  getRequiredCaveTier(): number {
    if (this.agingDuration === 0) return 0;
    if (this.isLegendary()) return 3;
    if (this.category === 'hard') return 2;
    return 1;
  }

  static fromDefinition(data: CheeseRecipe): Recipe {
    return new Recipe(data);
  }
}
