import type {
  ZoneDefinition,
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

  static fromDefinition(data: ZoneDefinition): Zone {
    return new Zone(data);
  }
}
