import type { SliceCreator } from '../../types';
import type { EventSlice } from './types';
import { getEventById, calculateEventBonusMultiplier, getAutoActiveEventIds } from '../../../data/events';
import type { EventBonus } from '../../../types/game';

export const createEventSlice: SliceCreator<EventSlice> = (set, get) => ({
  // State
  activeEvents: [],

  // Actions
  activateEvent: (eventId: string) => {
    const state = get();
    const event = getEventById(eventId);

    if (!event) return false;
    if (state.activeEvents.includes(eventId)) return false;

    set({
      activeEvents: [...state.activeEvents, eventId],
    });

    return true;
  },

  deactivateEvent: (eventId: string) => {
    const state = get();

    if (!state.activeEvents.includes(eventId)) return false;

    set({
      activeEvents: state.activeEvents.filter((id) => id !== eventId),
    });

    return true;
  },

  getEventBonuses: () => {
    const state = get();
    const bonuses: EventBonus[] = [];

    for (const eventId of state.activeEvents) {
      const event = getEventById(eventId);
      if (event) {
        bonuses.push(...event.bonuses);
      }
    }

    return bonuses;
  },

  getEventMultipliers: () => {
    const state = get();
    return {
      production: calculateEventBonusMultiplier(state.activeEvents, 'production'),
      xp: calculateEventBonusMultiplier(state.activeEvents, 'xp'),
      drops: calculateEventBonusMultiplier(state.activeEvents, 'drops'),
      click: calculateEventBonusMultiplier(state.activeEvents, 'click'),
    };
  },

  checkEventActivation: () => {
    const autoActiveIds = getAutoActiveEventIds();
    const currentIds = get().activeEvents;

    // Merge auto-active events with any manually-activated events
    const newIds = [...new Set([...currentIds, ...autoActiveIds])];

    // Only update if different to avoid unnecessary re-renders
    if (newIds.length !== currentIds.length || !newIds.every((id) => currentIds.includes(id))) {
      set({ activeEvents: newIds });
    }
  },
});
