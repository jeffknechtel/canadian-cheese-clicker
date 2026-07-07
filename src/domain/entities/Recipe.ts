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
 * Context needed to evaluate recipe unlock requirements.
 */
export interface RecipeUnlockContext {
  readonly totalRennet: number;
  readonly totalVintageWheels: number;
  readonly cheeseCollection: Record<string, number>;
  readonly zoneProgress: Record<string, { bossDefeated: boolean }>;
}

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

  /**
   * Check if this recipe can be unlocked given the current game state.
   * Returns true if no unlock requirement exists.
   */
  isUnlockable(ctx: RecipeUnlockContext): boolean {
    const req = this.unlockRequirement;
    if (!req) return true;

    switch (req.type) {
      case 'none':
        return true;
      case 'prestige_rennet':
        return ctx.totalRennet >= req.amount;
      case 'prestige_vintage':
        return ctx.totalVintageWheels >= req.amount;
      case 'cheese_crafted':
        return (ctx.cheeseCollection[req.recipeId] ?? 0) >= req.count;
      case 'province_complete':
        // Known bug: provinceId doesn't match zoneProgress keys (zone IDs)
        // This preserves existing behavior; P3 plan fixes the data model
        return ctx.zoneProgress[req.provinceId]?.bossDefeated ?? false;
      default:
        return false;
    }
  }

  static fromDefinition(data: CheeseRecipe): Recipe {
    return new Recipe(data);
  }
}
