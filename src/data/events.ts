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
    icon: '🍁',
    startMonth: 6, startDay: 25,  // June 25
    endMonth: 7, endDay: 7,       // July 7 (week around Canada Day)
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
    icon: '🍟',
    startMonth: 2, startDay: 1,   // February 1
    endMonth: 2, endDay: 7,       // February 7
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
    icon: '🏒',
    startMonth: 10, startDay: 1,  // October 1
    endMonth: 10, endDay: 15,     // October 15
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
    icon: '❄️',
    startMonth: 2, startDay: 1,   // February 1
    endMonth: 2, endDay: 21,      // February 21 (3 weeks in February)
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

/**
 * Check if an event should be active based on current date.
 */
export function isEventInDateRange(event: GameEvent, currentDate: Date = new Date()): boolean {
  if (!event.startMonth || !event.startDay || !event.endMonth || !event.endDay) {
    return false; // No date range defined
  }

  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();        // 1-31

  // Handle year-wrapping (e.g., Dec 25 - Jan 5)
  const startDayOfYear = event.startMonth * 100 + event.startDay;
  const endDayOfYear = event.endMonth * 100 + event.endDay;
  const currentDayOfYear = currentMonth * 100 + currentDay;

  if (startDayOfYear <= endDayOfYear) {
    // Normal range (doesn't wrap year)
    return currentDayOfYear >= startDayOfYear && currentDayOfYear <= endDayOfYear;
  } else {
    // Year-wrapping range (e.g., Dec 25 - Jan 5)
    return currentDayOfYear >= startDayOfYear || currentDayOfYear <= endDayOfYear;
  }
}

/**
 * Get all events that should be active based on current date.
 */
export function getAutoActiveEventIds(currentDate: Date = new Date()): string[] {
  return EVENTS
    .filter((event) => isEventInDateRange(event, currentDate))
    .map((event) => event.id);
}
