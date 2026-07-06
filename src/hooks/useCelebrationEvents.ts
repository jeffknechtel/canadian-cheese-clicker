/**
 * Hook that listens for celebration-worthy domain events
 * and triggers corresponding particle effects.
 */

import { useEffect } from 'react';
import { subscribe } from '../domain/events';
import { emitParticles } from '../systems/particleSystem';

export function useCelebrationEvents(): void {
  useEffect(() => {
    const unsubZone = subscribe('ZoneFirstBossDefeated', () => {
      // Spawn confetti at screen center
      emitParticles(window.innerWidth / 2, window.innerHeight / 3, 'confetti');
      // Follow up with golden sparkles
      setTimeout(() => {
        emitParticles(window.innerWidth / 2, window.innerHeight / 3, 'goldenSparkles');
      }, 200);
    });

    const unsubChallenge = subscribe('ChallengeCompleted', () => {
      // Spawn celebration particles at screen center
      emitParticles(window.innerWidth / 2, window.innerHeight / 2, 'goldenSparkles');
      setTimeout(() => {
        emitParticles(window.innerWidth / 2, window.innerHeight / 2, 'confetti');
      }, 150);
    });

    return () => {
      unsubZone();
      unsubChallenge();
    };
  }, []);
}
