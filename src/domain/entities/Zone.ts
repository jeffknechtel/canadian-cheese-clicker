import type {
  ZoneDefinition,
  ZoneProgress,
  ZoneUnlockRequirement,
  Province,
  StageDefinition,
  BossStageDefinition,
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

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

  protected withData(updates: Partial<ZoneDefinition>): this {
    return new Zone({ ...this.data, ...updates }) as this;
  }

  /**
   * Check if this zone is unlocked given current progress.
   */
  isUnlocked(zoneProgress: Record<string, ZoneProgress>): boolean {
    if (this.unlockRequirement.type === 'none') return true;

    if (this.unlockRequirement.type === 'zone_complete') {
      return zoneProgress[this.unlockRequirement.zoneId]?.bossDefeated ?? false;
    }

    return true;
  }

  /**
   * Get completion percentage for this zone.
   */
  getProgress(zoneProgress: ZoneProgress | undefined): number {
    if (!zoneProgress) return 0;
    if (zoneProgress.bossDefeated) return 100;
    const totalStages = this.stages.length;
    return Math.floor((zoneProgress.highestStageCleared / totalStages) * 100);
  }

  /**
   * Check if boss stage has been reached.
   */
  isBossStageReached(currentStage: number): boolean {
    return currentStage > this.stages.length;
  }

  /**
   * Get stage definition for a specific stage number.
   */
  getStage(stageNumber: number): StageDefinition | undefined {
    return this.stages.find((s) => s.stageNumber === stageNumber);
  }

  /**
   * Get total number of stages (excluding boss).
   */
  getTotalStages(): number {
    return this.stages.length;
  }

  static fromDefinition(data: ZoneDefinition): Zone {
    return new Zone(data);
  }
}
