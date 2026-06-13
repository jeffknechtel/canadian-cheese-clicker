import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../../../stores';
import type { CheeseActiveBuff } from '../../../types/game';

export function ActiveBuffsBar() {
  const storeActiveBuffs = useGameStore((s) => s.crafting.activeBuffs);
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
    return storeActiveBuffs.filter((buff: CheeseActiveBuff) => buff.endTime > currentTime);
  }, [storeActiveBuffs, currentTime]);

  if (activeBuffs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto max-w-48">
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

  // Check if this is a golden cheese buff
  const isGoldenBuff = buff.sourceCheeseId === 'golden_cheese';

  // Get source cheese info for the icon
  const { effect } = buff;
  const icon = isGoldenBuff ? '⭐' : getBuffIcon(effect.type);
  const label = getBuffLabel(effect, isGoldenBuff);

  // Style based on golden vs regular
  const bgClass = isGoldenBuff
    ? 'bg-gradient-to-r from-amber-200 to-yellow-100 border-amber-400'
    : 'bg-cheddar-100 border-cheddar-200';
  const textClass = isGoldenBuff ? 'text-amber-800' : 'text-cheddar-700';
  const timerClass = isGoldenBuff ? 'text-amber-600' : 'text-cheddar-500';

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-full border ${bgClass}`}
      title={`${isGoldenBuff ? 'Golden: ' : ''}${label} - ${remainingStr} remaining`}
    >
      <span className="text-sm">{icon}</span>
      <span className={`text-xs font-medium ${textClass}`}>{label}</span>
      <span className={`text-xs ${timerClass}`}>({remainingStr})</span>
    </div>
  );
}

function getBuffIcon(type: CheeseActiveBuff['effect']['type']): string {
  switch (type) {
    case 'productionBoost':
      return '';
    case 'clickBoost':
      return '';
    case 'xpBoost':
      return '';
    case 'heroBuff':
      return '';
    default:
      return '';
  }
}

function getBuffLabel(effect: CheeseActiveBuff['effect'], isGolden: boolean = false): string {
  const prefix = isGolden ? 'Golden: ' : '';
  switch (effect.type) {
    case 'productionBoost':
      return `${prefix}${effect.multiplier}x Prod`;
    case 'clickBoost':
      return `${prefix}${effect.multiplier}x Click`;
    case 'xpBoost':
      return `${prefix}${effect.multiplier}x XP`;
    case 'heroBuff':
      return `${prefix}+${effect.value} ${effect.stat}`;
    default:
      return `${prefix}Buff`;
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
