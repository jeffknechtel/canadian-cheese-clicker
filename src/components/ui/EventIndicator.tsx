import { memo } from 'react';
import { useGameStore } from '../../stores';
import { getEventById } from '../../data/events';

export const EventIndicator = memo(function EventIndicator() {
  const activeEvents = useGameStore((state) => state.activeEvents);
  const eventData = activeEvents
    .map((id) => getEventById(id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  if (eventData.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-100/90 rounded-full border border-amber-300">
      {eventData.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-1"
          title={`${event.name}: ${event.description}`}
        >
          <span>{event.icon}</span>
          <span className="text-sm font-medium text-amber-800 hidden sm:inline">
            {event.name}
          </span>
        </div>
      ))}
    </div>
  );
});
