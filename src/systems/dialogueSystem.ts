/**
 * Dialogue System
 *
 * Manages showing Canadian dialogue toasts throughout the game.
 * Separated from the UI component for better Fast Refresh support.
 */

import type { DialogueTrigger } from '../data/canadianDialogue';
import { getRandomPhrase } from '../data/canadianDialogue';
import { getHeroLevelUpPhrase, getHeroRecruitPhrase } from '../data/heroes';
import type { HeroDefinition } from '../types/game';

// Global callback for dialogue display
type DialogueCallback = (text: string, trigger: DialogueTrigger) => void;
let dialogueCallback: DialogueCallback | null = null;

/**
 * Register a callback to receive dialogue messages.
 * Called by the DialogueToastContainer on mount.
 */
export function setDialogueCallback(callback: DialogueCallback | null): void {
  dialogueCallback = callback;
}

/**
 * Show a specific dialogue message.
 */
export function showDialogue(text: string, trigger: DialogueTrigger = 'random'): void {
  if (dialogueCallback) {
    dialogueCallback(text, trigger);
  }
}

/**
 * Show a random dialogue message for the given trigger type.
 */
export function showRandomDialogue(trigger: DialogueTrigger = 'random'): void {
  const text = getRandomPhrase(trigger);
  showDialogue(text, trigger);
}

/**
 * Show a hero level-up dialogue message with hero-specific catchphrase.
 */
export function showHeroLevelUpDialogue(hero: HeroDefinition, level: number): void {
  // Use hero-specific catchphrase
  const heroPhrase = getHeroLevelUpPhrase(hero.id, level);
  const text = `${hero.name}: "${heroPhrase}"`;
  showDialogue(text, 'milestone');
}

/**
 * Show a hero recruitment dialogue message with hero-specific catchphrase.
 */
export function showHeroRecruitDialogue(hero: HeroDefinition): void {
  const heroPhrase = getHeroRecruitPhrase(hero.id);
  const text = `${hero.name} joins! "${heroPhrase}"`;
  showDialogue(text, 'achievement');
}

/**
 * Track the last milestone triggered to avoid duplicates.
 */
let lastMilestoneTriggered = 0;

export function getLastMilestoneTriggered(): number {
  return lastMilestoneTriggered;
}

export function setLastMilestoneTriggered(value: number): void {
  lastMilestoneTriggered = value;
}

// ===== Combat Dialogue Helpers =====

/**
 * Show combat start dialogue.
 */
export function showCombatStartDialogue(): void {
  showRandomDialogue('combat_start');
}

/**
 * Show combat victory dialogue.
 */
export function showCombatVictoryDialogue(): void {
  showRandomDialogue('combat_victory');
}

/**
 * Show combat defeat dialogue.
 */
export function showCombatDefeatDialogue(): void {
  showRandomDialogue('combat_defeat');
}

/**
 * Show limit break activation dialogue.
 */
export function showLimitBreakDialogue(): void {
  showRandomDialogue('limit_break');
}
