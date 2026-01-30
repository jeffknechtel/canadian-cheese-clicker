/**
 * Game Version Configuration
 *
 * Central place for version information and beta flags.
 * Used for save compatibility, bug reports, and feature gating.
 */

export const GAME_VERSION = '0.9.0-beta';
export const IS_BETA = true;
export const VERSION_NAME = 'The Great Canadian Cheese Quest';

/**
 * Feature flags for beta testing
 * These can be toggled to enable/disable experimental features
 */
export const BETA_FEATURES = {
  debugPanel: IS_BETA, // Show debug panel in beta only
  feedbackWidget: IS_BETA, // Show feedback widget in beta only
  analyticsVerbose: IS_BETA, // More verbose analytics in beta
} as const;

/**
 * Get version info for bug reports and analytics
 */
export function getVersionInfo(): {
  version: string;
  isBeta: boolean;
  name: string;
  buildDate: string;
  userAgent: string;
} {
  return {
    version: GAME_VERSION,
    isBeta: IS_BETA,
    name: VERSION_NAME,
    buildDate: new Date().toISOString().split('T')[0],
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}
