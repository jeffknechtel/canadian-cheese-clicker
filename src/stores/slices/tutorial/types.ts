export type TutorialStepId =
  | 'intro'
  | 'firstClick'
  | 'firstCurds'
  | 'firstGenerator'
  | 'explainCps'
  | 'explainUpgrades'
  | 'combatUnlock'
  | 'firstZone'
  | 'firstBossDefeated'
  | 'heroesUnlock'
  | 'firstHeroRecruited'
  | 'craftingUnlock'
  | 'prestigeUnlock'
  | 'firstAging';

export type LoreEntryId =
  | 'intro_story'
  | 'quest_begins'
  | 'dark_forces'
  | 'heroes_answer'
  | 'ancient_recipes'
  | 'secret_of_aging'
  | 'legend_grows'
  | `province_${string}`
  | `hero_${string}`;

export type CodexSectionId =
  | 'story'
  | 'provinces'
  | 'heroes'
  | 'cheese_lore';

export interface TutorialSliceState {
  completedSteps: Set<TutorialStepId>;
  tutorialEnabled: boolean;
  discoveredLore: Set<LoreEntryId>;
  unlockedCodexSections: Set<CodexSectionId>;
  pendingToast: TutorialStepId | null;
  toastQueue: TutorialStepId[];
}

export interface TutorialSliceActions {
  isTutorialStepCompleted: (step: TutorialStepId) => boolean;
  completeTutorialStep: (step: TutorialStepId) => void;
  triggerTutorialStep: (step: TutorialStepId) => void;
  dismissCurrentToast: () => void;
  setTutorialEnabled: (enabled: boolean) => void;
  discoverLore: (loreId: LoreEntryId) => void;
  hasDiscoveredLore: (loreId: LoreEntryId) => boolean;
  unlockCodexSection: (section: CodexSectionId) => void;
}

export type TutorialSlice = TutorialSliceState & TutorialSliceActions;
