import type { GameEvent } from '../types/game';

/**
 * Event definitions for seasonal and special events
 * Events are activated/deactivated manually or by date range
 * All events are inactive by default - activation is handled by game store
 */
export const EVENTS: GameEvent[] = [
  {
    id: 'canada-day',
    name: 'Canada Day Celebration',
    description: 'Red and white themed festivities!',
    isActive: false,
    bonuses: [
      {
        type: 'production',
        multiplier: 2,
        description: '2x Canadian-themed drops',
      },
    ],
    exclusiveContent: {
      cheeses: ['maple-firework-curd'],
      equipment: ['canada-day-cape'],
    },
  },
  {
    id: 'poutine-week',
    name: 'Poutine Week',
    description: 'Quebec-focused gravy goodness',
    isActive: false,
    bonuses: [
      {
        type: 'production',
        multiplier: 1.5,
        description: '+50% Quebec zone rewards',
      },
    ],
    exclusiveContent: {
      cheeses: ['festival-poutine-supreme'],
    },
  },
  {
    id: 'hockey-season',
    name: 'Hockey Season',
    description: 'Stanley Cup chase begins!',
    isActive: false,
    bonuses: [
      {
        type: 'xp',
        multiplier: 2,
        description: '2x Hero XP',
      },
    ],
    exclusiveContent: {
      equipment: ['stanley-cup-replica'],
    },
  },
  {
    id: 'winterlude',
    name: 'Winterlude Festival',
    description: 'Ice sculptures and hot chocolate',
    isActive: false,
    bonuses: [
      {
        type: 'drops',
        multiplier: 1.5,
        description: '+50% equipment drops',
      },
    ],
    exclusiveContent: {
      cheeses: ['ice-sculpture-aged'],
      equipment: ['winterlude-toque'],
    },
  },
];

/**
 * Get event by ID
 */
export function getEventById(eventId: string): GameEvent | undefined {
  return EVENTS.find((event) => event.id === eventId);
}

/**
 * Get all active events (based on date or manual activation)
 */
export function getActiveEvents(activeEventIds: string[]): GameEvent[] {
  return EVENTS.filter((event) => activeEventIds.includes(event.id));
}

/**
 * Calculate combined event bonus multiplier for a specific bonus type
 */
export function calculateEventBonusMultiplier(
  activeEventIds: string[],
  bonusType: 'production' | 'xp' | 'drops' | 'click'
): number {
  let multiplier = 1;

  for (const eventId of activeEventIds) {
    const event = getEventById(eventId);
    if (event) {
      for (const bonus of event.bonuses) {
        if (bonus.type === bonusType) {
          multiplier *= bonus.multiplier;
        }
      }
    }
  }

  return multiplier;
}
