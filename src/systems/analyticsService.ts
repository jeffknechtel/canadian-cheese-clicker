/**
 * Analytics Service
 *
 * Client-side analytics tracking for understanding player progression
 * and identifying issues. No PII is collected.
 *
 * Features:
 * - Event batching (send every 30 seconds or 10 events)
 * - Offline queue with retry
 * - Session management
 * - Opt-out support
 */

import type {
  GameEvent,
  AnalyticsEvent,
  SessionStats,
  PrivacyConsent,
} from '../types/analytics';
import { CURRENT_CONSENT_VERSION } from '../types/analytics';

// Constants
const BATCH_INTERVAL_MS = 30_000; // 30 seconds
const BATCH_SIZE = 10;
const MAX_QUEUE_SIZE = 100;
const STORAGE_KEY = 'canadian_cheese_quest_analytics';
const CONSENT_STORAGE_KEY = 'canadian_cheese_quest_consent';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analytics Service Singleton
 */
class AnalyticsService {
  private enabled: boolean = false;
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionStats: SessionStats;
  private batchTimerId: ReturnType<typeof setInterval> | null = null;
  private consent: PrivacyConsent;

  constructor() {
    this.sessionId = generateSessionId();
    this.consent = this.loadConsent();
    this.enabled = this.consent.analyticsEnabled;
    this.sessionStats = this.createEmptyStats();

    // Load any queued events from previous session
    this.loadQueueFromStorage();

    // Start batch timer if enabled
    if (this.enabled) {
      this.startBatchTimer();
    }

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flush();
        }
      });
    }
  }

  /**
   * Track a game event
   */
  track(event: GameEvent): void {
    if (!this.enabled) return;

    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: event.data,
    };

    // Update session stats based on event type
    this.updateSessionStats(event);

    // Add to queue
    this.eventQueue.push(analyticsEvent);

    // Flush if batch size reached
    if (this.eventQueue.length >= BATCH_SIZE) {
      this.flush();
    }

    // Cap queue size to prevent memory issues
    if (this.eventQueue.length > MAX_QUEUE_SIZE) {
      this.eventQueue = this.eventQueue.slice(-MAX_QUEUE_SIZE);
    }
  }

  /**
   * Flush events to storage (client-side only for now)
   * In a production app, this would send to an analytics endpoint
   */
  flush(): void {
    if (!this.enabled || this.eventQueue.length === 0) return;

    // For client-side only analytics, we store events locally
    // In production, you would send these to an analytics server
    this.saveQueueToStorage();

    // Log events in development
    if (import.meta.env.DEV) {
      console.log('[Analytics] Flushed events:', this.eventQueue.length);
    }

    // Clear the queue after "sending"
    // In production with server, you'd only clear after successful send
    this.eventQueue = [];
  }

  /**
   * Enable or disable analytics tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (enabled && !this.batchTimerId) {
      this.startBatchTimer();
    } else if (!enabled && this.batchTimerId) {
      this.stopBatchTimer();
      this.eventQueue = [];
      this.clearStoredQueue();
    }

    // Update consent
    this.consent = {
      analyticsEnabled: enabled,
      consentedAt: Date.now(),
      version: CURRENT_CONSENT_VERSION,
    };
    this.saveConsent();
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): SessionStats {
    return { ...this.sessionStats };
  }

  /**
   * Get consent state
   */
  getConsent(): PrivacyConsent {
    return { ...this.consent };
  }

  /**
   * Check if user has made a consent decision
   */
  hasConsentDecision(): boolean {
    return this.consent.consentedAt !== null;
  }

  /**
   * Start a new session (called on app load)
   */
  startSession(returning: boolean, lastSessionMs?: number): void {
    this.sessionId = generateSessionId();
    this.sessionStats = this.createEmptyStats();

    this.track({
      type: 'session_start',
      data: { returning, lastSessionMs },
    });
  }

  /**
   * End the current session
   */
  endSession(): void {
    const duration = Date.now() - this.sessionStats.startTime;

    this.track({
      type: 'session_end',
      data: {
        duration,
        curdsEarned: this.sessionStats.totalCurdsEarned,
      },
    });

    this.flush();
  }

  // ===== Private Methods =====

  private createEmptyStats(): SessionStats {
    return {
      sessionId: this.sessionId,
      startTime: Date.now(),
      totalClicks: 0,
      totalCurdsEarned: 0,
      generatorsPurchased: 0,
      upgradesPurchased: 0,
      achievementsUnlocked: 0,
      combatBattles: 0,
      combatWins: 0,
    };
  }

  private updateSessionStats(event: GameEvent): void {
    switch (event.type) {
      case 'click':
        this.sessionStats.totalClicks += event.data.count;
        break;
      case 'generator_purchase':
        this.sessionStats.generatorsPurchased += event.data.count;
        break;
      case 'upgrade_purchase':
        this.sessionStats.upgradesPurchased++;
        break;
      case 'achievement_unlock':
        this.sessionStats.achievementsUnlocked++;
        break;
      case 'combat_start':
        this.sessionStats.combatBattles++;
        break;
      case 'combat_end':
        if (event.data.result === 'victory') {
          this.sessionStats.combatWins++;
        }
        break;
    }
  }

  private startBatchTimer(): void {
    if (this.batchTimerId) return;
    this.batchTimerId = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
  }

  private stopBatchTimer(): void {
    if (this.batchTimerId) {
      clearInterval(this.batchTimerId);
      this.batchTimerId = null;
    }
  }

  private loadConsent(): PrivacyConsent {
    if (typeof localStorage === 'undefined') {
      return { analyticsEnabled: false, consentedAt: null, version: CURRENT_CONSENT_VERSION };
    }

    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const consent = JSON.parse(stored) as PrivacyConsent;
        // Check if consent version is current
        if (consent.version === CURRENT_CONSENT_VERSION) {
          return consent;
        }
        // Consent version changed, need re-consent
        return { analyticsEnabled: false, consentedAt: null, version: CURRENT_CONSENT_VERSION };
      }
    } catch {
      // Ignore parse errors
    }

    return { analyticsEnabled: false, consentedAt: null, version: CURRENT_CONSENT_VERSION };
  }

  private saveConsent(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(this.consent));
    } catch {
      // Storage full or not available
    }
  }

  private loadQueueFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const events = JSON.parse(stored) as AnalyticsEvent[];
        // Only load events from the last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.eventQueue = events.filter((e) => e.timestamp > oneDayAgo);
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveQueueToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.eventQueue));
    } catch {
      // Storage full, clear old events
      this.eventQueue = this.eventQueue.slice(-BATCH_SIZE);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.eventQueue));
      } catch {
        // Give up on storage
      }
    }
  }

  private clearStoredQueue(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Convenience functions for common tracking scenarios
export function trackClick(count: number, totalClicks: number): void {
  analytics.track({
    type: 'click',
    data: { count, totalClicks },
  });
}

export function trackGeneratorPurchase(
  generatorId: string,
  count: number,
  totalOwned: number
): void {
  analytics.track({
    type: 'generator_purchase',
    data: { generatorId, count, totalOwned },
  });
}

export function trackUpgradePurchase(upgradeId: string): void {
  analytics.track({
    type: 'upgrade_purchase',
    data: { upgradeId },
  });
}

export function trackAchievementUnlock(
  achievementId: string,
  totalUnlocked: number
): void {
  analytics.track({
    type: 'achievement_unlock',
    data: { achievementId, totalUnlocked },
  });
}

export function trackPrestige(
  tier: 'aging' | 'vintage' | 'legacy',
  rennetGained?: number,
  wheelsGained?: number
): void {
  analytics.track({
    type: 'prestige',
    data: { tier, rennetGained, wheelsGained },
  });
}

export function trackCombatStart(
  zoneId: string,
  stageNumber: number,
  isBoss: boolean
): void {
  analytics.track({
    type: 'combat_start',
    data: { zoneId, stageNumber, isBoss },
  });
}

export function trackCombatEnd(
  zoneId: string,
  stageNumber: number,
  result: 'victory' | 'defeat' | 'flee',
  durationMs: number
): void {
  analytics.track({
    type: 'combat_end',
    data: { zoneId, stageNumber, result, durationMs },
  });
}

export function trackHeroRecruit(heroId: string, totalRecruited: number): void {
  analytics.track({
    type: 'hero_recruit',
    data: { heroId, totalRecruited },
  });
}

export function trackHeroLevelUp(heroId: string, newLevel: number): void {
  analytics.track({
    type: 'hero_level_up',
    data: { heroId, newLevel },
  });
}

export function trackCraftingStart(recipeId: string, caveId: string): void {
  analytics.track({
    type: 'crafting_start',
    data: { recipeId, caveId },
  });
}

export function trackCraftingComplete(recipeId: string, quality: number): void {
  analytics.track({
    type: 'crafting_complete',
    data: { recipeId, quality },
  });
}

export function trackSettingsChange(setting: string, value: unknown): void {
  analytics.track({
    type: 'settings_change',
    data: { setting, value },
  });
}

export function trackMilestone(
  milestone: number,
  totalCurdsEarned: number
): void {
  analytics.track({
    type: 'milestone_reached',
    data: { milestone, totalCurdsEarned },
  });
}

export function trackError(
  message: string,
  stack?: string,
  context?: string
): void {
  analytics.track({
    type: 'error',
    data: { message, stack, context },
  });
}
