import { subscribe } from '../../../domain/events';
import { useGameStore } from '../../index';

/**
 * Initialize production slice event subscriptions.
 * Called once during store initialization.
 */
export function initProductionEventSubscriber(): () => void {
  const unsubBattleWon = subscribe('BattleWon', (event) => {
    const store = useGameStore.getState();

    // Add rewards (production-owned state)
    store.addCurds(event.rewards.curds);
    useGameStore.setState((s) => ({
      whey: s.whey.plus(event.rewards.whey),
      totalCurdsEarned: s.totalCurdsEarned.plus(event.rewards.curds),
    }));
  });

  const unsubCpsChanged = subscribe('CpsInputsChanged', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  return () => {
    unsubBattleWon();
    unsubCpsChanged();
  };
}
