import type { TutorialStepId, LoreEntryId, CodexSectionId } from './types';

export function createInitialTutorialState(): {
  completedSteps: Set<TutorialStepId>;
  tutorialEnabled: boolean;
  discoveredLore: Set<LoreEntryId>;
  unlockedCodexSections: Set<CodexSectionId>;
  pendingToast: TutorialStepId | null;
  toastQueue: TutorialStepId[];
} {
  return {
    completedSteps: new Set<TutorialStepId>(),
    tutorialEnabled: true,
    discoveredLore: new Set<LoreEntryId>(),
    unlockedCodexSections: new Set<CodexSectionId>(),
    pendingToast: null,
    toastQueue: [],
  };
}
