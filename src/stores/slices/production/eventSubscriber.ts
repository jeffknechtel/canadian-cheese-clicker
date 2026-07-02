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
    // Note: addCurds already updates totalCurdsEarned, so we don't duplicate it here
    store.addCurds(event.rewards.curds);
    useGameStore.setState((s) => ({
      whey: s.whey.plus(event.rewards.whey),
      currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
    }));
  });

  const unsubCpsChanged = subscribe('CpsInputsChanged', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  // Recalc CPS when seasonal events change
  const unsubEventActivated = subscribe('SeasonalEventActivated', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  const unsubEventDeactivated = subscribe('SeasonalEventDeactivated', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  return () => {
    unsubBattleWon();
    unsubCpsChanged();
    unsubEventActivated();
    unsubEventDeactivated();
  };
}
