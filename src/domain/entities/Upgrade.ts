import Decimal from 'decimal.js';
import type { Upgrade as UpgradeData, UpgradeEffect, UpgradeRequirement } from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Upgrade.
 * Encapsulates requirement checking and effect application.
 */
export class Upgrade extends BaseEntity<UpgradeData> implements UpgradeData {
  get name(): string {
    return this.data.name;
  }
  get description(): string {
    return this.data.description;
  }
  get cost(): Decimal {
    return this.data.cost;
  }
  get costCurrency(): 'curds' | 'whey' {
    return this.data.costCurrency;
  }
  get effect(): UpgradeEffect {
    return this.data.effect;
  }
  get requirement(): UpgradeRequirement | undefined {
    return this.data.requirement;
  }

  protected withData(updates: Partial<UpgradeData>): this {
    return new Upgrade({ ...this.data, ...updates }) as this;
  }

  /**
   * Check if this upgrade's requirement is met.
   */
  isUnlocked(ownedGenerators: Record<string, number>): boolean {
    if (!this.requirement) return true;

    if (this.requirement.type === 'generatorOwned') {
      const owned = ownedGenerators[this.requirement.generatorId] ?? 0;
      return owned >= this.requirement.count;
    }

    return true;
  }

  /**
   * Check if player can afford this upgrade.
   */
  canAfford(curds: Decimal, whey: Decimal): boolean {
    const currency = this.costCurrency === 'curds' ? curds : whey;
    return currency.gte(this.cost);
  }

  /**
   * Check if this upgrade affects a specific generator.
   */
  affectsGenerator(generatorId: string): boolean {
    return (
      this.effect.type === 'generatorMultiplier' && this.effect.generatorId === generatorId
    );
  }

  /**
   * Get the multiplier value if this is a multiplier upgrade.
   */
  getMultiplierValue(): number {
    if (
      this.effect.type === 'clickMultiplier' ||
      this.effect.type === 'generatorMultiplier' ||
      this.effect.type === 'globalMultiplier'
    ) {
      return this.effect.value;
    }
    return 1;
  }

  static fromDefinition(data: UpgradeData): Upgrade {
    return new Upgrade(data);
  }
}
