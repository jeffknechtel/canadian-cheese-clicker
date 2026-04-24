import type { EventBonus } from '../../../types/game';

export interface EventSliceState {
  activeEvents: string[];
}

export interface EventSliceActions {
  activateEvent: (eventId: string) => boolean;
  deactivateEvent: (eventId: string) => boolean;
  getEventBonuses: () => EventBonus[];
  getEventMultipliers: () => {
    production: number;
    xp: number;
    drops: number;
    click: number;
  };
  checkEventActivation: () => void;
}

export type EventSlice = EventSliceState & EventSliceActions;
