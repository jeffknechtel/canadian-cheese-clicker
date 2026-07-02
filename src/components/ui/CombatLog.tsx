import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { CombatLogEntry } from '../../types/game';

const LOG_TYPE_COLORS: Record<CombatLogEntry['type'], string> = {
  attack: 'text-timber-700',
  ability: 'text-purple-600',
  damage: 'text-red-600',
  heal: 'text-green-600',
  status: 'text-amber-600',
  defeat: 'text-red-700 font-semibold',
  victory: 'text-cheddar-600 font-bold',
  phaseChange: 'text-purple-700 font-semibold',
};

const LOG_TYPE_ICONS: Record<CombatLogEntry['type'], string> = {
  attack: '⚔️',
  ability: '✨',
  damage: '💥',
  heal: '💚',
  status: '🔮',
  defeat: '💀',
  victory: '🎉',
  phaseChange: '⚠️',
};

interface CombatLogEntryItemProps {
  entry: CombatLogEntry;
  isNew?: boolean;
}

function CombatLogEntryItem({ entry, isNew = false }: CombatLogEntryItemProps) {
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);
  const colorClass = LOG_TYPE_COLORS[entry.type];
  const icon = LOG_TYPE_ICONS[entry.type];

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className={`
        flex items-start gap-1.5 py-1 px-2 rounded text-xs
        ${isNew ? `bg-cheddar-50 ${!reducedMotion ? 'animate-pulse' : ''}` : 'hover:bg-gray-50'}
        transition-colors duration-200
      `}
    >
      <span className="shrink-0 w-4 text-center">{icon}</span>
      <span className="text-gray-500 shrink-0 tabular-nums">[{formatTime(entry.timestamp)}]</span>
      <span className={`flex-1 ${colorClass}`}>{entry.message}</span>
      {entry.value !== undefined && (
        <span className="shrink-0 font-bold text-red-600">-{entry.value}</span>
      )}
    </div>
  );
}

interface CombatLogProps {
  entries: CombatLogEntry[];
  maxHeight?: string;
  autoScroll?: boolean;
}

export function CombatLog({
  entries,
  maxHeight = '200px',
  autoScroll = true,
}: CombatLogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevEntriesLengthRef = useRef(entries.length);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && entries.length > prevEntriesLengthRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    prevEntriesLengthRef.current = entries.length;
  }, [entries.length, autoScroll]);

  // Track which entries are "new" (last 3 entries if recently added)
  const newEntryThreshold = entries.length - 1;

  return (
    <div className="bg-white/80 rounded-lg border border-timber-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-timber-100 hover:bg-timber-200 transition-colors"
      >
        <span className="text-sm font-semibold text-timber-700 flex items-center gap-2">
          📜 Battle Log
          <span className="text-xs font-normal text-gray-500">
            ({entries.length} events)
          </span>
        </span>
        <span className="text-timber-600">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Log Content */}
      {isExpanded && (
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto scrollbar-thin"
          style={{ maxHeight }}
        >
          {entries.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No battle events yet...
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {entries.map((entry, index) => (
                <CombatLogEntryItem
                  key={entry.timestamp}
                  entry={entry}
                  isNew={index >= newEntryThreshold}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CompactCombatLogProps {
  entries: CombatLogEntry[];
  maxEntries?: number;
}

export function CompactCombatLog({ entries, maxEntries = 5 }: CompactCombatLogProps) {
  const recentEntries = entries.slice(-maxEntries);

  return (
    <div className="space-y-0.5 text-xs">
      {recentEntries.map((entry, index) => {
        const colorClass = LOG_TYPE_COLORS[entry.type];
        const icon = LOG_TYPE_ICONS[entry.type];
        const isLatest = index === recentEntries.length - 1;

        return (
          <div
            key={entry.timestamp}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded
              ${isLatest ? 'bg-cheddar-50' : 'opacity-70'}
            `}
          >
            <span className="w-4 text-center">{icon}</span>
            <span className={`flex-1 truncate ${colorClass}`} title={entry.message}>{entry.message}</span>
          </div>
        );
      })}
    </div>
  );
}
