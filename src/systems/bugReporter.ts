/**
 * Bug Reporter System
 *
 * Automated bug reporting with game state capture for beta testing.
 * Reports are stored locally and can be exported for submission.
 */

import { GAME_VERSION } from '../config/version';
import type { GameState, PrestigeState } from '../types/game';

/**
 * Categories for bug reports
 */
export type BugCategory = 'bug' | 'balance' | 'suggestion' | 'crash' | 'other';

/**
 * Browser information for bug reports
 */
export interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  onLine: boolean;
  cookiesEnabled: boolean;
  localStorage: boolean;
}

/**
 * Partial game state snapshot (safe subset for bug reports)
 */
export interface GameStateSnapshot {
  version: string;
  totalCurdsEarned: string;
  totalClicks: number;
  generatorCount: number;
  upgradeCount: number;
  achievementCount: number;
  heroCount: number;
  prestige: {
    rennet: number;
    agingResetCount: number;
    vintageWheels: number;
    vintageResetCount: number;
    legacy: number;
    legacyResetCount: number;
  };
  combatState: {
    isInCombat: boolean;
    currentZone: string | null;
    currentStage: number;
  };
  craftingState: {
    unlockedRecipes: number;
    unlockedCaves: number;
    activeJobs: number;
    cheeseInventory: number;
  };
  playTime: number; // milliseconds since game started
}

/**
 * Full bug report structure
 */
export interface BugReport {
  id: string;
  description: string;
  category: BugCategory;
  screenshot?: string; // Base64 encoded
  gameState: GameStateSnapshot;
  browserInfo: BrowserInfo;
  timestamp: number;
  url: string;
  consoleErrors: string[];
}

/**
 * Storage key for bug reports
 */
const BUG_REPORTS_KEY = 'canadian_cheese_quest_bug_reports';
const MAX_STORED_REPORTS = 50;

/**
 * Capture console errors for bug reports
 */
let capturedErrors: string[] = [];

/**
 * Initialize error capture (call once at app start)
 */
export function initializeErrorCapture(): void {
  if (typeof window === 'undefined') return;

  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const errorMessage = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
      }
      return String(arg);
    }).join(' ');

    capturedErrors.push(errorMessage);
    // Keep only last 20 errors
    if (capturedErrors.length > 20) {
      capturedErrors = capturedErrors.slice(-20);
    }

    originalError.apply(console, args);
  };

  // Also capture unhandled errors
  window.addEventListener('error', (event) => {
    capturedErrors.push(`Unhandled: ${event.message} at ${event.filename}:${event.lineno}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    capturedErrors.push(`Unhandled Promise: ${event.reason}`);
  });
}

/**
 * Get browser information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: 'unknown',
      platform: 'unknown',
      language: 'en',
      screenWidth: 0,
      screenHeight: 0,
      devicePixelRatio: 1,
      onLine: false,
      cookiesEnabled: false,
      localStorage: false,
    };
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    onLine: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
  };
}

/**
 * Capture a safe subset of game state for bug reports
 */
export function captureGameState(state: GameState): GameStateSnapshot {
  const prestige: PrestigeState = state.prestige;

  return {
    version: GAME_VERSION,
    totalCurdsEarned: state.totalCurdsEarned.toString(),
    totalClicks: state.totalClicks,
    generatorCount: Object.values(state.generators).reduce((sum, count) => sum + count, 0),
    upgradeCount: state.upgrades.length,
    achievementCount: state.achievements.length,
    heroCount: Object.keys(state.heroes).length,
    prestige: {
      rennet: prestige.rennet,
      agingResetCount: prestige.agingResetCount,
      vintageWheels: prestige.vintageWheels,
      vintageResetCount: prestige.vintageResetCount,
      legacy: prestige.legacy,
      legacyResetCount: prestige.legacyResetCount,
    },
    combatState: {
      isInCombat: state.combat.isInCombat,
      currentZone: state.combat.currentZone,
      currentStage: state.combat.currentStage,
    },
    craftingState: {
      unlockedRecipes: state.crafting.unlockedRecipes.length,
      unlockedCaves: state.crafting.unlockedCaves.length,
      activeJobs: state.crafting.activeJobs.length,
      cheeseInventory: state.crafting.cheeseInventory.length,
    },
    playTime: Date.now() - state.gameStarted,
  };
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a bug report
 */
export function createBugReport(
  description: string,
  category: BugCategory,
  gameState: GameState,
  screenshot?: string
): BugReport {
  return {
    id: generateReportId(),
    description,
    category,
    screenshot,
    gameState: captureGameState(gameState),
    browserInfo: getBrowserInfo(),
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    consoleErrors: [...capturedErrors],
  };
}

/**
 * Submit a bug report (stores locally for beta)
 * In production, this would send to a backend
 */
export function submitBugReport(report: BugReport): Promise<{ success: boolean; reportId: string }> {
  return new Promise((resolve) => {
    try {
      // Store locally
      const storedReports = getStoredReports();
      storedReports.push(report);

      // Keep only recent reports
      const trimmedReports = storedReports.slice(-MAX_STORED_REPORTS);

      localStorage.setItem(BUG_REPORTS_KEY, JSON.stringify(trimmedReports));

      // Log for development
      if (import.meta.env.DEV) {
        console.log('[BugReporter] Report stored:', report.id);
      }

      resolve({ success: true, reportId: report.id });
    } catch (error) {
      console.error('[BugReporter] Failed to store report:', error);
      resolve({ success: false, reportId: report.id });
    }
  });
}

/**
 * Get all stored bug reports
 */
export function getStoredReports(): BugReport[] {
  try {
    const raw = localStorage.getItem(BUG_REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BugReport[];
  } catch {
    return [];
  }
}

/**
 * Clear all stored bug reports
 */
export function clearStoredReports(): void {
  try {
    localStorage.removeItem(BUG_REPORTS_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Export bug reports as JSON for manual submission
 */
export function exportBugReports(): string {
  const reports = getStoredReports();
  return JSON.stringify(reports, null, 2);
}

/**
 * Capture a screenshot of the game (canvas element)
 * Returns base64 encoded image or undefined if capture fails
 */
export function captureScreenshot(): string | undefined {
  try {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('[BugReporter] No canvas found for screenshot');
      return undefined;
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('[BugReporter] Screenshot capture failed:', error);
    return undefined;
  }
}
