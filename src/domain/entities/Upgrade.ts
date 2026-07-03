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

  /**
   * Get the multiplier value if this is a multiplier upgrade.
   */
  getMultiplierValue(): number {
    if (
      this.effect.type === 'clickMultiplier' ||
      this.effect.type === 'generatorMultiplier' ||
      this.effect.type === 'globalMultiplier' ||
      this.effect.type === 'clickCpsPercent' ||
      this.effect.type === 'critChance' ||
      this.effect.type === 'critMultiplier'
    ) {
      return this.effect.value;
    }
    return 1;
  }

  static fromDefinition(data: UpgradeData): Upgrade {
    return new Upgrade(data);
  }
}
