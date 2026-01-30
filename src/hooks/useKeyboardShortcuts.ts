import { useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { playClickSound, resumeAudioContext } from '../systems/audioSystem';
import { announce } from '../systems/accessibilityAnnouncer';

/**
 * Global keyboard shortcuts for the game
 * Enables keyboard-only gameplay for accessibility
 */

export interface KeyboardShortcuts {
  // Navigation
  openGenerators: () => void;
  openUpgrades: () => void;
  openHeroes: () => void;
  openCombat: () => void;
  openPrestige: () => void;
  openCrafting: () => void;
  openAchievements: () => void;
  openSettings: () => void;
  openHelp: () => void;
  closeModal: () => void;
  // Actions
  clickCheeseWheel: () => void;
  buyGenerator: (index: number) => void;
}

// Keyboard shortcut definitions
const SHORTCUTS: Record<string, string> = {
  Space: 'Click cheese wheel',
  '1': 'Buy generator 1',
  '2': 'Buy generator 2',
  '3': 'Buy generator 3',
  '4': 'Buy generator 4',
  '5': 'Buy generator 5',
  g: 'Open Generators panel',
  u: 'Open Upgrades panel',
  h: 'Open Heroes panel',
  c: 'Open Combat panel',
  p: 'Open Prestige panel',
  r: 'Open Crafting panel',
  a: 'Open Achievements panel',
  s: 'Open Settings',
  Escape: 'Close modal',
  '?': 'Open keyboard shortcuts help',
};

export function getShortcutsList(): Array<{ key: string; description: string }> {
  return Object.entries(SHORTCUTS).map(([key, description]) => ({
    key: key === ' ' ? 'Space' : key,
    description,
  }));
}

interface UseKeyboardShortcutsOptions {
  onNavigate: (panel: 'generators' | 'upgrades' | 'heroes' | 'combat' | 'prestige' | 'crafting' | 'achievements') => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onCloseModal: () => void;
  isModalOpen: boolean;
}

export function useKeyboardShortcuts({
  onNavigate,
  onOpenSettings,
  onOpenHelp,
  onCloseModal,
  isModalOpen,
}: UseKeyboardShortcutsOptions): void {
  const click = useGameStore((state) => state.click);
  const generators = useGameStore((state) => state.generators);
  const buyGenerator = useGameStore((state) => state.buyGenerator);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Handle Escape key for closing modals
      if (event.key === 'Escape') {
        if (isModalOpen) {
          event.preventDefault();
          onCloseModal();
          announce('Modal closed', 'polite');
        }
        return;
      }

      // Don't process other shortcuts if a modal is open
      if (isModalOpen) {
        return;
      }

      // Handle keyboard shortcuts
      switch (event.key) {
        // Cheese wheel click (Space or Enter when not focused on a button)
        case ' ':
          if (target.tagName !== 'BUTTON' && target.role !== 'button') {
            event.preventDefault();
            resumeAudioContext();
            click();
            playClickSound();
            announce('Clicked cheese wheel', 'polite');
          }
          break;

        // Generator purchase shortcuts (1-5)
        case '1':
        case '2':
        case '3':
        case '4':
        case '5': {
          event.preventDefault();
          const generatorIds = Object.keys(generators);
          const index = parseInt(event.key) - 1;
          if (index < generatorIds.length) {
            const genId = generatorIds[index];
            const result = buyGenerator(genId, 1);
            if (result) {
              announce(`Purchased generator ${index + 1}`, 'polite');
              playClickSound();
            } else {
              announce(`Cannot afford generator ${index + 1}`, 'polite');
            }
          }
          break;
        }

        // Panel navigation shortcuts
        case 'g':
          event.preventDefault();
          onNavigate('generators');
          announce('Switched to Generators panel', 'polite');
          break;

        case 'u':
          event.preventDefault();
          onNavigate('upgrades');
          announce('Switched to Upgrades panel', 'polite');
          break;

        case 'h':
          event.preventDefault();
          onNavigate('heroes');
          announce('Switched to Heroes panel', 'polite');
          break;

        case 'c':
          event.preventDefault();
          onNavigate('combat');
          announce('Switched to Combat panel', 'polite');
          break;

        case 'p':
          event.preventDefault();
          onNavigate('prestige');
          announce('Switched to Prestige panel', 'polite');
          break;

        case 'r':
          event.preventDefault();
          onNavigate('crafting');
          announce('Switched to Crafting panel', 'polite');
          break;

        case 'a':
          event.preventDefault();
          onNavigate('achievements');
          announce('Switched to Achievements panel', 'polite');
          break;

        // Settings
        case 's':
          event.preventDefault();
          onOpenSettings();
          announce('Opened Settings', 'polite');
          break;

        // Help modal
        case '?':
          event.preventDefault();
          onOpenHelp();
          announce('Opened keyboard shortcuts help', 'polite');
          break;
      }
    },
    [click, generators, buyGenerator, onNavigate, onOpenSettings, onOpenHelp, onCloseModal, isModalOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Combat-specific keyboard shortcuts
 * Used within the CombatPanel component
 */
interface UseCombatKeyboardOptions {
  heroStates: Array<{ heroId: string; isAlive: boolean; atbGauge: number }>;
  onSelectHero: (heroId: string) => void;
  onUseAbility: (heroId: string) => void;
  onFlee: () => void;
  isInCombat: boolean;
  battleResult: 'ongoing' | 'victory' | 'defeat';
}

export function useCombatKeyboard({
  heroStates,
  onSelectHero,
  onUseAbility,
  onFlee,
  isInCombat,
  battleResult,
}: UseCombatKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle combat shortcuts when in combat
      if (!isInCombat || battleResult !== 'ongoing') {
        return;
      }

      // Don't trigger shortcuts when typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const aliveHeroes = heroStates.filter((h) => h.isAlive);

      switch (event.key) {
        // Select hero by number (1-4 for party members)
        case '1':
        case '2':
        case '3':
        case '4': {
          const index = parseInt(event.key) - 1;
          if (index < aliveHeroes.length) {
            event.preventDefault();
            const hero = aliveHeroes[index];
            onSelectHero(hero.heroId);
            announce(`Selected hero ${index + 1}`, 'polite');
          }
          break;
        }

        // Use ability with Enter/Space when hero is ready
        case 'Enter': {
          event.preventDefault();
          // Use the first ready hero's ability
          const readyHero = aliveHeroes.find((h) => h.atbGauge >= 100);
          if (readyHero) {
            onUseAbility(readyHero.heroId);
            announce('Used ability', 'polite');
          } else {
            announce('No hero ready', 'polite');
          }
          break;
        }

        // Flee from combat with F key
        case 'f':
        case 'F':
          event.preventDefault();
          onFlee();
          announce('Fleeing from battle', 'assertive');
          break;
      }
    },
    [heroStates, onSelectHero, onUseAbility, onFlee, isInCombat, battleResult]
  );

  useEffect(() => {
    if (!isInCombat) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isInCombat]);
}
