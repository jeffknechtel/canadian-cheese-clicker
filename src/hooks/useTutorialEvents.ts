import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores';
import { subscribe } from '../domain/events';

export function useTutorialEvents() {
  const triggerTutorialStep = useGameStore((s) => s.triggerTutorialStep);
  const isTutorialStepCompleted = useGameStore((s) => s.isTutorialStepCompleted);
  const tutorialEnabled = useGameStore((s) => s.tutorialEnabled);

  const hasTriggeredIntro = useRef(false);
  const hasTriggeredFirstClick = useRef(false);
  const generatorCountRef = useRef(0);

  useEffect(() => {
    if (!tutorialEnabled) return;

    if (!hasTriggeredIntro.current && !isTutorialStepCompleted('intro')) {
      hasTriggeredIntro.current = true;
      setTimeout(() => {
        triggerTutorialStep('intro');
      }, 1000);
    }
  }, [tutorialEnabled, isTutorialStepCompleted, triggerTutorialStep]);

  useEffect(() => {
    if (!tutorialEnabled) return;

    const unsubFeatureUnlocked = subscribe('FeatureUnlocked', (event) => {
      switch (event.featureId) {
        case 'combat':
          triggerTutorialStep('combatUnlock');
          break;
        case 'heroes':
          triggerTutorialStep('heroesUnlock');
          break;
        case 'crafting':
          triggerTutorialStep('craftingUnlock');
          break;
        case 'prestige':
          triggerTutorialStep('prestigeUnlock');
          break;
      }
    });

    const unsubCurdsEarned = subscribe('CurdsEarned', (event) => {
      if (event.source === 'click' && !hasTriggeredFirstClick.current) {
        hasTriggeredFirstClick.current = true;
        if (!isTutorialStepCompleted('firstClick')) {
          triggerTutorialStep('firstClick');
        }
      }
    });

    const unsubHeroRecruited = subscribe('HeroRecruited', () => {
      if (!isTutorialStepCompleted('firstHeroRecruited')) {
        triggerTutorialStep('firstHeroRecruited');
      }
    });

    const unsubBossDefeated = subscribe('ZoneFirstBossDefeated', () => {
      if (!isTutorialStepCompleted('firstBossDefeated')) {
        triggerTutorialStep('firstBossDefeated');
      }
    });

    const unsubPrestige = subscribe('PrestigePerformed', (event) => {
      if (event.tier === 'aging' && !isTutorialStepCompleted('firstAging')) {
        triggerTutorialStep('firstAging');
      }
    });

    return () => {
      unsubFeatureUnlocked();
      unsubCurdsEarned();
      unsubHeroRecruited();
      unsubBossDefeated();
      unsubPrestige();
    };
  }, [tutorialEnabled, triggerTutorialStep, isTutorialStepCompleted]);

  useEffect(() => {
    if (!tutorialEnabled) return;

    const checkGeneratorMilestones = () => {
      const state = useGameStore.getState();
      const totalGenerators = Object.values(state.generators).reduce(
        (sum: number, owned: number) => sum + owned,
        0
      );

      if (totalGenerators > 0 && generatorCountRef.current === 0) {
        if (!isTutorialStepCompleted('firstGenerator')) {
          triggerTutorialStep('firstGenerator');
        }
      }

      generatorCountRef.current = totalGenerators;

      const totalCurds = state.totalCurdsEarned;
      if (totalCurds.gte(10) && !isTutorialStepCompleted('firstCurds')) {
        triggerTutorialStep('firstCurds');
      }
      if (totalCurds.gte(100) && !isTutorialStepCompleted('explainUpgrades')) {
        triggerTutorialStep('explainUpgrades');
      }
    };

    const unsubscribe = useGameStore.subscribe(checkGeneratorMilestones);
    return unsubscribe;
  }, [tutorialEnabled, triggerTutorialStep, isTutorialStepCompleted]);
}

export function useTutorialZoneEntry(zoneId: string | null) {
  const triggerTutorialStep = useGameStore((s) => s.triggerTutorialStep);
  const isTutorialStepCompleted = useGameStore((s) => s.isTutorialStepCompleted);
  const tutorialEnabled = useGameStore((s) => s.tutorialEnabled);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!tutorialEnabled) return;
    if (!zoneId) return;
    if (hasTriggeredRef.current) return;
    if (isTutorialStepCompleted('firstZone')) return;

    hasTriggeredRef.current = true;
    triggerTutorialStep('firstZone');
  }, [zoneId, tutorialEnabled, triggerTutorialStep, isTutorialStepCompleted]);
}
