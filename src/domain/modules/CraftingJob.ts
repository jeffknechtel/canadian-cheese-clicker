import { calculateCheeseQualityFromJob } from '../../systems/craftingEngine';
import { recipeRegistry } from '../index';
import type { CraftingJob as CraftingJobType, CraftedCheese } from '../../types/game';

/**
 * CraftingJob module - owns job lifecycle invariants.
 * Centralizes completion, collection, and progress logic.
 */
export const CraftingJob = {
  /**
   * Check if a job is complete (ready to collect).
   */
  isComplete(job: CraftingJobType, now: number = Date.now()): boolean {
    return now >= job.endTime;
  },

  /**
   * Create the cheese result from a completed job.
   * Returns null if job is not yet complete or recipe not found.
   */
  collect(job: CraftingJobType, now: number = Date.now()): CraftedCheese | null {
    if (!this.isComplete(job, now)) return null;

    const recipe = recipeRegistry.get(job.recipeId);
    if (!recipe) return null;

    const quality = calculateCheeseQualityFromJob(recipe, job);

    return {
      id: `cheese_${now}_${Math.random().toString(36).substring(2, 11)}`,
      recipeId: job.recipeId,
      quality,
      craftedAt: now,
      ingredients: job.ingredients,
    };
  },

  /**
   * Calculate progress percentage (0-100).
   */
  getProgress(job: CraftingJobType, now: number = Date.now()): number {
    const totalDuration = job.endTime - job.startTime;
    if (totalDuration === 0) return 100;

    const elapsed = now - job.startTime;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  },
};
