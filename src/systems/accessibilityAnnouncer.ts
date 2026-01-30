/**
 * Accessibility Announcer System
 *
 * Provides screen reader announcements for important game events
 * using ARIA live regions. Queues announcements to prevent overlap
 * and supports priority levels.
 */

import type { Achievement, CombatLogEntry, HeroCombatState, CombatEnemy } from '../types/game';
import { getHeroById } from '../data/heroes';
import { getEnemyById } from '../data/enemies';

type Priority = 'polite' | 'assertive';

interface QueuedAnnouncement {
  message: string;
  priority: Priority;
  timestamp: number;
}

// Announcement queue to prevent overlapping
const announcementQueue: QueuedAnnouncement[] = [];
let isProcessing = false;
let politeRegion: HTMLElement | null = null;
let assertiveRegion: HTMLElement | null = null;

// Minimum delay between announcements in ms
const ANNOUNCEMENT_DELAY = 500;
const ASSERTIVE_PRIORITY_DELAY = 100; // Shorter delay for urgent messages

/**
 * Initialize the live regions in the DOM
 * Call this once when the app starts
 */
export function initializeAnnouncer(): void {
  // Check if already initialized
  if (politeRegion && assertiveRegion) return;

  // Create polite live region (for non-urgent announcements)
  politeRegion = document.createElement('div');
  politeRegion.setAttribute('role', 'status');
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-atomic', 'true');
  politeRegion.className = 'sr-only';
  politeRegion.id = 'a11y-announcer-polite';
  document.body.appendChild(politeRegion);

  // Create assertive live region (for urgent announcements)
  assertiveRegion = document.createElement('div');
  assertiveRegion.setAttribute('role', 'alert');
  assertiveRegion.setAttribute('aria-live', 'assertive');
  assertiveRegion.setAttribute('aria-atomic', 'true');
  assertiveRegion.className = 'sr-only';
  assertiveRegion.id = 'a11y-announcer-assertive';
  document.body.appendChild(assertiveRegion);
}

/**
 * Clean up the live regions
 * Call this on app unmount
 */
export function cleanupAnnouncer(): void {
  if (politeRegion) {
    politeRegion.remove();
    politeRegion = null;
  }
  if (assertiveRegion) {
    assertiveRegion.remove();
    assertiveRegion = null;
  }
}

/**
 * Process the announcement queue
 */
function processQueue(): void {
  if (isProcessing || announcementQueue.length === 0) return;

  isProcessing = true;
  const announcement = announcementQueue.shift()!;
  const region = announcement.priority === 'assertive' ? assertiveRegion : politeRegion;
  const delay = announcement.priority === 'assertive' ? ASSERTIVE_PRIORITY_DELAY : ANNOUNCEMENT_DELAY;

  if (region) {
    // Clear and then set content to trigger announcement
    region.textContent = '';
    // Small delay to ensure screen readers detect the change
    requestAnimationFrame(() => {
      region.textContent = announcement.message;
    });
  }

  // Process next announcement after delay
  setTimeout(() => {
    isProcessing = false;
    processQueue();
  }, delay);
}

/**
 * Queue an announcement for screen readers
 * @param message - The message to announce
 * @param priority - 'polite' for informational, 'assertive' for urgent
 */
export function announce(message: string, priority: Priority = 'polite'): void {
  if (!message.trim()) return;

  // Initialize if not already done
  if (!politeRegion || !assertiveRegion) {
    initializeAnnouncer();
  }

  // Add to queue
  announcementQueue.push({
    message,
    priority,
    timestamp: Date.now(),
  });

  // If assertive, move to front of queue (after other assertive messages)
  if (priority === 'assertive') {
    const lastAssertiveIndex = announcementQueue.reduce(
      (lastIdx, item, idx) => (item.priority === 'assertive' ? idx : lastIdx),
      -1
    );

    // Only reorder if not already at the front
    const newAnnouncement = announcementQueue.pop()!;
    const insertIndex = lastAssertiveIndex === -1 ? 0 : Math.min(lastAssertiveIndex + 1, announcementQueue.length);
    announcementQueue.splice(insertIndex, 0, newAnnouncement);
  }

  processQueue();
}

/**
 * Announce an achievement unlock
 */
export function announceAchievement(achievement: Achievement): void {
  const rewardText = achievement.reward
    ? achievement.reward.type === 'globalMultiplier'
      ? `, bonus: ${Math.round((achievement.reward.value - 1) * 100)}% production increase`
      : `, bonus: ${achievement.reward.value}x click power`
    : '';

  announce(
    `Achievement unlocked: ${achievement.name}. ${achievement.description}${rewardText}`,
    'polite'
  );
}

/**
 * Announce a combat action for screen readers
 */
export function announceCombatAction(entry: CombatLogEntry): void {
  // Combat actions are important but not urgent
  announce(entry.message, 'polite');
}

/**
 * Announce a milestone achievement
 */
export function announceMilestone(milestone: string): void {
  announce(`Milestone reached: ${milestone}`, 'polite');
}

/**
 * Announce combat start
 */
export function announceCombatStart(zoneName: string, stageNumber: number, isBoss: boolean): void {
  const bossText = isBoss ? 'Boss fight! ' : '';
  announce(
    `${bossText}Starting battle in ${zoneName}, stage ${stageNumber}.`,
    'assertive'
  );
}

/**
 * Announce combat result
 */
export function announceCombatResult(result: 'victory' | 'defeat' | 'flee'): void {
  const messages = {
    victory: 'Victory! You have won the battle.',
    defeat: 'Defeat. Your party has been defeated.',
    flee: 'Fled from battle.',
  };
  announce(messages[result], 'assertive');
}

/**
 * Announce turn order at combat start
 */
export function announceTurnOrder(heroStates: Record<string, HeroCombatState>, enemies: CombatEnemy[]): void {
  const heroNames = Object.values(heroStates)
    .map((h) => {
      const hero = getHeroById(h.heroId);
      return hero?.name ?? 'Unknown hero';
    })
    .join(', ');

  const enemyNames = enemies
    .map((e) => {
      const enemy = getEnemyById(e.id);
      return enemy?.name ?? 'Unknown enemy';
    })
    .join(', ');

  announce(
    `Battle participants. Your party: ${heroNames}. Enemies: ${enemyNames}.`,
    'polite'
  );
}

/**
 * Announce hero ready to act (ATB full)
 */
export function announceHeroReady(heroId: string): void {
  const hero = getHeroById(heroId);
  if (hero) {
    announce(`${hero.name} is ready to act.`, 'polite');
  }
}

/**
 * Announce HP change for a hero or enemy
 */
export function announceHPChange(
  targetName: string,
  currentHp: number,
  maxHp: number
): void {
  const percentage = Math.round((currentHp / maxHp) * 100);
  const statusText =
    currentHp <= 0
      ? 'has been defeated'
      : percentage <= 25
        ? 'is critically wounded'
        : percentage <= 50
          ? 'is wounded'
          : 'is healthy';

  // Only announce significant HP changes
  if (currentHp <= 0 || percentage <= 25 || percentage <= 50) {
    announce(
      `${targetName} ${statusText}. ${currentHp} of ${maxHp} HP remaining.`,
      currentHp <= 0 ? 'assertive' : 'polite'
    );
  }
}

/**
 * Announce currency change (for significant milestones)
 */
export function announceCurrencyMilestone(currencyName: string, amount: string): void {
  announce(`${currencyName} milestone: You now have ${amount}.`, 'polite');
}

/**
 * Announce generator purchase
 */
export function announceGeneratorPurchase(
  generatorName: string,
  quantity: number,
  totalOwned: number
): void {
  announce(
    `Purchased ${quantity} ${generatorName}. You now own ${totalOwned}.`,
    'polite'
  );
}

/**
 * Announce upgrade purchase
 */
export function announceUpgradePurchase(upgradeName: string, effect: string): void {
  announce(`Upgrade purchased: ${upgradeName}. Effect: ${effect}`, 'polite');
}

/**
 * Announce prestige action
 */
export function announcePrestige(tier: string, currencyGained: number, currencyName: string): void {
  announce(
    `${tier} prestige activated. You gained ${currencyGained} ${currencyName}. Your progress has been reset.`,
    'assertive'
  );
}

/**
 * Announce crafting completion
 */
export function announceCraftingComplete(cheeseName: string, quality: number): void {
  const qualityText =
    quality >= 90 ? 'exceptional' : quality >= 70 ? 'high' : quality >= 50 ? 'good' : 'standard';
  announce(
    `Crafting complete! Your ${cheeseName} has finished aging with ${qualityText} quality.`,
    'polite'
  );
}

/**
 * Announce boss phase change
 */
export function announceBossPhaseChange(bossName: string, phase: number, message: string): void {
  announce(`${bossName} enters phase ${phase}! ${message}`, 'assertive');
}

/**
 * Clear all pending announcements
 */
export function clearAnnouncements(): void {
  announcementQueue.length = 0;
}
