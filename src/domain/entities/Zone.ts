import Decimal from 'decimal.js';
import type {
  ZoneDefinition,
  ZoneUnlockRequirement,
  Province,
  StageDefinition,
  BossStageDefinition,
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Context needed to evaluate zone unlock requirements.
 */
export interface ZoneUnlockContext {
  readonly zoneProgress: Record<string, { bossDefeated: boolean }>;
  readonly curds: Decimal;
  readonly achievements: readonly string[];
}

/**
 * Rich domain model for Zone.
 * Encapsulates unlock requirements and progression logic.
 */
export class Zone extends BaseEntity<ZoneDefinition> implements ZoneDefinition {
  get name(): string {
    return this.data.name;
  }
  get description(): string {
    return this.data.description;
  }
  get province(): Province {
    return this.data.province;
  }
  get stages(): StageDefinition[] {
    return this.data.stages;
  }
  get bossStage(): BossStageDefinition {
    return this.data.bossStage;
  }
  get unlockRequirement(): ZoneUnlockRequirement {
    return this.data.unlockRequirement;
  }
  get backgroundImage(): string | undefined {
    return this.data.backgroundImage;
  }
  get recommendedLevel(): number {
    return this.data.recommendedLevel;
  }

  get isLegendary(): boolean {
    return this.data.isLegendary ?? false;
  }

  /**
   * Check if this zone is unlocked given the current game state.
   */
  isUnlocked(ctx: ZoneUnlockContext): boolean {
    const req = this.unlockRequirement;

    switch (req.type) {
      case 'none':
        return true;
      case 'zone_complete':
        return ctx.zoneProgress[req.zoneId]?.bossDefeated ?? false;
      case 'curds':
        return ctx.curds.gte(req.amount);
      case 'achievement':
        return ctx.achievements.includes(req.achievementId);
      default:
        return false;
    }
  }

  static fromDefinition(data: ZoneDefinition): Zone {
    return new Zone(data);
  }
}
