/**
 * A/B Testing Framework
 *
 * Simple client-side A/B testing infrastructure for experimenting
 * with game balance, UI changes, and features.
 *
 * Features:
 * - Persistent variant assignment
 * - Weighted random distribution
 * - Conversion tracking
 */

import type { Experiment, ExperimentAssignments } from '../types/analytics';
import { analytics } from './analyticsService';

// Storage key for experiment assignments
const STORAGE_KEY = 'canadian_cheese_quest_experiments';

/**
 * Active experiments configuration
 * Add new experiments here
 */
export const EXPERIMENTS: Experiment[] = [
  // Example experiments - uncomment to activate
  // {
  //   id: 'onboarding_flow',
  //   name: 'Onboarding Flow Test',
  //   variants: ['control', 'tutorial_tips', 'video_intro'],
  //   weights: [0.34, 0.33, 0.33],
  //   isActive: true,
  // },
  // {
  //   id: 'prestige_reminder',
  //   name: 'Prestige Reminder Style',
  //   variants: ['subtle', 'prominent'],
  //   weights: [0.5, 0.5],
  //   isActive: true,
  // },
];

/**
 * In-memory cache of assignments
 */
let assignments: ExperimentAssignments | null = null;

/**
 * Load assignments from storage
 */
function loadAssignments(): ExperimentAssignments {
  if (assignments !== null) {
    return assignments;
  }

  if (typeof localStorage === 'undefined') {
    assignments = {};
    return assignments;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      assignments = JSON.parse(stored) as ExperimentAssignments;
    } else {
      assignments = {};
    }
  } catch {
    assignments = {};
  }

  return assignments;
}

/**
 * Save assignments to storage
 */
function saveAssignments(): void {
  if (typeof localStorage === 'undefined' || assignments === null) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // Storage not available
  }
}

/**
 * Select a variant based on weighted random distribution
 */
function selectWeightedVariant(
  variants: string[],
  weights: number[]
): string {
  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < variants.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return variants[i];
    }
  }

  // Fallback to last variant (handles floating point rounding)
  return variants[variants.length - 1];
}

/**
 * Get the assigned variant for an experiment
 *
 * If the user hasn't been assigned yet, assigns them randomly
 * based on the experiment's weight distribution.
 *
 * @param experimentId - The experiment ID to get variant for
 * @returns The assigned variant, or null if experiment doesn't exist or is inactive
 */
export function getVariant(experimentId: string): string | null {
  const experiment = EXPERIMENTS.find((e) => e.id === experimentId);

  // Return null for unknown or inactive experiments
  if (!experiment || !experiment.isActive) {
    return null;
  }

  const currentAssignments = loadAssignments();

  // Check if already assigned
  if (currentAssignments[experimentId]) {
    return currentAssignments[experimentId].variant;
  }

  // Assign a variant
  const variant = selectWeightedVariant(experiment.variants, experiment.weights);

  currentAssignments[experimentId] = {
    variant,
    assignedAt: Date.now(),
  };

  assignments = currentAssignments;
  saveAssignments();

  // Track assignment
  if (analytics.isEnabled()) {
    analytics.track({
      type: 'settings_change',
      data: {
        setting: `experiment_${experimentId}`,
        value: variant,
      },
    });
  }

  return variant;
}

/**
 * Track a conversion for an experiment
 *
 * Use this when a user completes a desired action related to the experiment.
 * For example, if testing onboarding, call this when they complete the tutorial.
 *
 * @param experimentId - The experiment ID
 * @param conversionEvent - Optional description of what converted
 */
export function trackConversion(
  experimentId: string,
  conversionEvent?: string
): void {
  if (!analytics.isEnabled()) return;

  const currentAssignments = loadAssignments();
  const assignment = currentAssignments[experimentId];

  if (!assignment) return;

  analytics.track({
    type: 'milestone_reached',
    data: {
      milestone: 0, // Using milestone as a generic event
      totalCurdsEarned: 0,
      // Additional context for conversion
      experimentId,
      variant: assignment.variant,
      conversionEvent: conversionEvent ?? 'default',
    },
  });
}

/**
 * Check if user is in a specific variant
 *
 * Convenience function for conditional rendering or logic.
 *
 * @param experimentId - The experiment ID
 * @param variant - The variant to check
 * @returns True if user is assigned to this variant
 */
export function isInVariant(experimentId: string, variant: string): boolean {
  return getVariant(experimentId) === variant;
}

/**
 * Get all active experiment assignments for the current user
 *
 * Useful for debugging or displaying in a dev panel.
 */
export function getAllAssignments(): ExperimentAssignments {
  return { ...loadAssignments() };
}

/**
 * Clear all experiment assignments
 *
 * Useful for testing or resetting user to fresh state.
 */
export function clearAssignments(): void {
  assignments = {};

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Get experiment metadata by ID
 */
export function getExperiment(experimentId: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.id === experimentId);
}

/**
 * Get all active experiments
 */
export function getActiveExperiments(): Experiment[] {
  return EXPERIMENTS.filter((e) => e.isActive);
}
