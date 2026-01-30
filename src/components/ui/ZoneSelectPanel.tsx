import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { ZONES, getProvinceDisplayName, isZoneUnlocked, getTotalStages, getZoneCompletionPercent } from '../../data/zones';
import type { ZoneDefinition, Province } from '../../types/game';

const PROVINCE_ICONS: Record<Province, string> = {
  ontario: '🍁',
  quebec: '⚜️',
  alberta: '🛢️',
  manitoba: '🏒',
  saskatchewan: '🌾',
  yukon: '❄️',
  bc: '🌲',
  nova_scotia: '🦞',
  new_brunswick: '🌉',
  pei: '🥔',
  newfoundland: '⚓',
  nwt: '🌌',
  nunavut: '🐻‍❄️',
};

interface ZoneCardProps {
  zone: ZoneDefinition;
  isUnlocked: boolean;
  progress?: { highestStageCleared: number; bossDefeated: boolean };
  onSelectStage: (zoneId: string, stageNumber: number) => void;
}

function ZoneCard({ zone, isUnlocked, progress, onSelectStage }: ZoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completion = progress
    ? getZoneCompletionPercent(zone, progress.highestStageCleared, progress.bossDefeated)
    : 0;

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${isUnlocked
          ? 'bg-white/70 border-timber-200 hover:border-maple-400 hover:shadow-md cursor-pointer'
          : 'bg-gray-100/50 border-gray-200 opacity-60 cursor-not-allowed'
        }
      `}
    >
      {/* Zone Header */}
      <button
        onClick={() => isUnlocked && setIsExpanded(!isExpanded)}
        disabled={!isUnlocked}
        className="w-full p-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`
              w-12 h-12 flex items-center justify-center rounded-lg text-2xl
              ${isUnlocked ? 'bg-maple-100' : 'bg-gray-200 grayscale'}
            `}
          >
            {PROVINCE_ICONS[zone.province]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold truncate ${isUnlocked ? 'text-timber-700' : 'text-gray-500'}`}>
                {zone.name}
              </span>
              {progress?.bossDefeated && (
                <span className="text-xs bg-cheddar-100 text-cheddar-700 px-1.5 py-0.5 rounded">
                  ✓ Complete
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{getProvinceDisplayName(zone.province)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Recommended Lv. {zone.recommendedLevel}</p>
          </div>
          <div className="shrink-0 text-right">
            {isUnlocked ? (
              <>
                <div className="text-sm font-medium text-timber-600">{completion}%</div>
                <div className="text-xs text-gray-500">
                  {progress?.highestStageCleared || 0}/{getTotalStages(zone)} stages
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400">🔒 Locked</div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isUnlocked && (
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress?.bossDefeated
                  ? 'bg-linear-to-r from-cheddar-400 to-cheddar-600'
                  : 'bg-linear-to-r from-maple-400 to-maple-600'
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>
        )}
      </button>

      {/* Expanded Stage List */}
      {isExpanded && isUnlocked && (
        <div className="px-3 pb-3">
          <div className="border-t border-timber-200 pt-2 mt-1">
            <p className="text-xs text-gray-600 mb-2">{zone.description}</p>
            <div className="grid grid-cols-4 gap-1">
              {zone.stages.map((stage) => {
                const isCleared = (progress?.highestStageCleared || 0) >= stage.stageNumber;
                const canAttempt = stage.stageNumber <= (progress?.highestStageCleared || 0) + 1;
                return (
                  <button
                    key={stage.stageNumber}
                    onClick={() => canAttempt && onSelectStage(zone.id, stage.stageNumber)}
                    disabled={!canAttempt}
                    className={`
                      py-2 px-1 rounded text-xs font-medium transition-all duration-200
                      ${isCleared
                        ? 'bg-cheddar-100 text-cheddar-700 border border-cheddar-300'
                        : canAttempt
                          ? 'bg-maple-100 text-maple-700 border border-maple-300 hover:bg-maple-200 hover:shadow-xs'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      }
                    `}
                  >
                    {stage.stageNumber}
                    {isCleared && ' ✓'}
                  </button>
                );
              })}
              {/* Boss Stage */}
              <button
                onClick={() => {
                  const canAttemptBoss = (progress?.highestStageCleared || 0) >= zone.stages.length;
                  if (canAttemptBoss) {
                    onSelectStage(zone.id, zone.bossStage.stageNumber);
                  }
                }}
                disabled={(progress?.highestStageCleared || 0) < zone.stages.length}
                className={`
                  py-2 px-1 rounded text-xs font-medium transition-all duration-200
                  ${progress?.bossDefeated
                    ? 'bg-cheddar-100 text-cheddar-700 border border-cheddar-300'
                    : (progress?.highestStageCleared || 0) >= zone.stages.length
                      ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:shadow-xs'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  }
                `}
              >
                👑 BOSS
                {progress?.bossDefeated && ' ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ZoneSelectPanelProps {
  onStartCombat: (zoneId: string, stageNumber: number) => void;
}

export function ZoneSelectPanel({ onStartCombat }: ZoneSelectPanelProps) {
  const zoneProgress = useGameStore((state) => state.zoneProgress);
  const curds = useGameStore((state) => state.curds);
  const achievements = useGameStore((state) => state.achievements);
  const party = useGameStore((state) => state.party);
  const heroes = useGameStore((state) => state.heroes);

  // Check if player has any heroes in party
  const hasPartyMembers = [
    party.frontLeft,
    party.frontRight,
    party.backLeft,
    party.backRight,
  ].some((id) => id !== null && heroes[id] !== undefined);

  const handleSelectStage = (zoneId: string, stageNumber: number) => {
    if (!hasPartyMembers) return;
    onStartCombat(zoneId, stageNumber);
  };

  return (
    <div className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-lg font-bold text-timber-700 flex items-center gap-2">
          <span>⚔️</span>
          <span>Combat Zones</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Select a zone and stage to begin battle
        </p>
      </div>

      {/* No Party Warning */}
      {!hasPartyMembers && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">⚠️ No heroes in party!</p>
          <p className="text-xs text-red-600 mt-1">
            Add heroes to your party before entering combat.
          </p>
        </div>
      )}

      {/* Zone List */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        {ZONES.map((zone) => {
          const unlocked = isZoneUnlocked(zone, zoneProgress, curds, achievements);
          const progress = zoneProgress[zone.id];
          return (
            <ZoneCard
              key={zone.id}
              zone={zone}
              isUnlocked={unlocked}
              progress={progress}
              onSelectStage={handleSelectStage}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-timber-200">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cheddar-100 border border-cheddar-300" /> Cleared
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-maple-100 border border-maple-300" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Locked
          </span>
        </div>
      </div>
    </div>
  );
}
