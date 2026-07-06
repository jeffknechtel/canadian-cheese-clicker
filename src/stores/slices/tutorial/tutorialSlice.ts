import type { SliceCreator } from '../../types';
import type { TutorialSlice, TutorialStepId, LoreEntryId, CodexSectionId } from './types';
import { createInitialTutorialState } from './resetFactory';

export const createTutorialSlice: SliceCreator<TutorialSlice> = (set, get) => ({
  ...createInitialTutorialState(),

  isTutorialStepCompleted: (step: TutorialStepId) => {
    return get().completedSteps.has(step);
  },

  completeTutorialStep: (step: TutorialStepId) => {
    set((s) => ({
      completedSteps: new Set([...s.completedSteps, step]),
    }));
  },

  triggerTutorialStep: (step: TutorialStepId) => {
    const state = get();
    if (!state.tutorialEnabled) return;
    if (state.completedSteps.has(step)) return;

    if (state.pendingToast === null) {
      set({ pendingToast: step });
    } else {
      set((s) => ({
        toastQueue: [...s.toastQueue, step],
      }));
    }
  },

  dismissCurrentToast: () => {
    const state = get();
    const currentStep = state.pendingToast;

    if (currentStep) {
      const nextToast = state.toastQueue[0] ?? null;
      const remainingQueue = state.toastQueue.slice(1);

      set((s) => ({
        completedSteps: new Set([...s.completedSteps, currentStep]),
        pendingToast: nextToast,
        toastQueue: remainingQueue,
      }));
    }
  },

  setTutorialEnabled: (enabled: boolean) => {
    set({ tutorialEnabled: enabled });
    if (!enabled) {
      set({ pendingToast: null, toastQueue: [] });
    }
  },

  discoverLore: (loreId: LoreEntryId) => {
    set((s) => ({
      discoveredLore: new Set([...s.discoveredLore, loreId]),
    }));

    const sectionMap: Record<string, CodexSectionId> = {
      intro_story: 'story',
      quest_begins: 'story',
      dark_forces: 'story',
      heroes_answer: 'story',
      ancient_recipes: 'cheese_lore',
      secret_of_aging: 'cheese_lore',
      legend_grows: 'story',
    };

    if (loreId.startsWith('province_')) {
      get().unlockCodexSection('provinces');
    } else if (loreId.startsWith('hero_')) {
      get().unlockCodexSection('heroes');
    } else if (sectionMap[loreId]) {
      get().unlockCodexSection(sectionMap[loreId]);
    }
  },

  hasDiscoveredLore: (loreId: LoreEntryId) => {
    return get().discoveredLore.has(loreId);
  },

  unlockCodexSection: (section: CodexSectionId) => {
    set((s) => ({
      unlockedCodexSections: new Set([...s.unlockedCodexSections, section]),
    }));
  },
});
