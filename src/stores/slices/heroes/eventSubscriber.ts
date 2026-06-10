import { subscribe } from '../../../domain/events';
import { useGameStore } from '../../index';

/**
 * Initialize hero slice event subscriptions.
 * Called once during store initialization.
 */
export function initHeroEventSubscriber(): () => void {
  const unsubBattleWon = subscribe('BattleWon', (event) => {
    const store = useGameStore.getState();

    // Grant XP to heroes (hero-owned action)
    for (const [heroId, xpAmount] of Object.entries(event.rewards.xp)) {
      store.grantXp(heroId, xpAmount);
    }
  });

  return () => {
    unsubBattleWon();
  };
}
