import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../../stores/gameStore';
import type { CheeseActiveBuff } from '../../../types/game';

export function ActiveBuffsBar() {
  const { crafting } = useGameStore();
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Force re-render every second to update timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter to only show active (non-expired) buffs
  const activeBuffs = useMemo(() => {
    return crafting.activeBuffs.filter((buff) => buff.endTime > currentTime);
  }, [crafting.activeBuffs, currentTime]);

  if (activeBuffs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {activeBuffs.map((buff) => (
        <BuffChip key={buff.id} buff={buff} currentTime={currentTime} />
      ))}
    </div>
  );
}

interface BuffChipProps {
  buff: CheeseActiveBuff;
  currentTime: number;
}

function BuffChip({ buff, currentTime }: BuffChipProps) {
  const remainingMs = Math.max(0, buff.endTime - currentTime);
  const remainingStr = formatDuration(remainingMs);

  // Get source cheese info for the icon
  const { effect } = buff;
  const icon = getBuffIcon(effect.type);
  const label = getBuffLabel(effect);

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 bg-cheddar-100 rounded-full border border-cheddar-200"
      title={`${label} - ${remainingStr} remaining`}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium text-cheddar-700">{label}</span>
      <span className="text-xs text-cheddar-500">({remainingStr})</span>
    </div>
  );
}

function getBuffIcon(type: CheeseActiveBuff['effect']['type']): string {
  switch (type) {
    case 'production_boost':
      return '';
    case 'click_boost':
      return '';
    case 'xp_boost':
      return '';
    case 'hero_buff':
      return '';
    default:
      return '';
  }
}

function getBuffLabel(effect: CheeseActiveBuff['effect']): string {
  switch (effect.type) {
    case 'production_boost':
      return `+${Math.round((effect.multiplier - 1) * 100)}% Prod`;
    case 'click_boost':
      return `+${Math.round((effect.multiplier - 1) * 100)}% Click`;
    case 'xp_boost':
      return `+${Math.round((effect.multiplier - 1) * 100)}% XP`;
    case 'hero_buff':
      return `+${effect.value} ${effect.stat}`;
    default:
      return 'Buff';
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
