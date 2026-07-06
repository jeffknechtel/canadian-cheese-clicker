import { useState } from 'react';
import { useGameStore } from '../../stores';
import { ZONES, getZoneById, getProvinceDisplayName, isZoneUnlocked, getTotalStages, getZoneCompletionPercent, PROVINCE_ICONS } from '../../data/zones';
import { getAchievementById } from '../../data/achievements';
import { formatNumber } from '../../utils/formatNumber';
import { FirstTimeHint } from './shared/FirstTimeHint';
import { PanelContainer } from './shared/PanelContainer';
import { ProgressBar } from './shared/ProgressBar';
import { ModalOverlay } from './shared/ModalOverlay';
import { Button, DISABLED_BUTTON_CLASSES } from './shared/Button';
import type { ZoneDefinition } from '../../types/game';

/** Bespoke icons for the legendary mythology questlines */
const LEGENDARY_ICONS: Record<string, string> = {
  thunderbird_saga: '⚡🦅',
  wendigo_warning: '🐺',
  chasse_galerie: '🛶',
};

/** How far below the recommended level triggers the danger warning */
const LEVEL_WARNING_MARGIN = 10;

/** Human-readable unlock requirement for locked zone cards */
function getUnlockRequirementText(zone: ZoneDefinition): string {
  const req = zone.unlockRequirement;
  switch (req.type) {
    case 'zone_complete': {
      const requiredZone = getZoneById(req.zoneId);
      return `Clear ${requiredZone?.name ?? req.zoneId}'s boss`;
    }
    case 'curds':
      return `Earn ${formatNumber(req.amount)} curds`;
    case 'achievement': {
      const achievement = getAchievementById(req.achievementId);
      return `Unlock achievement: ${achievement?.name ?? req.achievementId}`;
    }
    case 'none':
    default:
      return 'Locked';
  }
}

interface ZoneCardProps {
  zone: ZoneDefinition;
  isUnlocked: boolean;
  progress?: { highestStageCleared: number; bossDefeated: boolean };
  averagePartyLevel: number | null;
  onSelectStage: (zoneId: string, stageNumber: number) => void;
}

function ZoneCard({ zone, isUnlocked, progress, averagePartyLevel, onSelectStage }: ZoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completion = progress
    ? getZoneCompletionPercent(zone, progress.highestStageCleared, progress.bossDefeated)
    : 0;
  const isLegendary = zone.isLegendary === true;
  const isUnderleveled =
    averagePartyLevel !== null && averagePartyLevel < zone.recommendedLevel - LEVEL_WARNING_MARGIN;

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${isUnlocked
          ? isLegendary
            ? 'bg-gradient-to-r from-amber-50 to-purple-50 border-2 border-amber-400 hover:border-purple-400 hover:shadow-lg cursor-pointer'
            : 'bg-white/70 border-timber-200 hover:border-maple-400 hover:shadow-md cursor-pointer'
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
              ${isUnlocked
                ? isLegendary
                  ? 'bg-gradient-to-br from-amber-100 to-purple-100'
                  : 'bg-maple-100'
                : 'bg-gray-200 grayscale'}
            `}
          >
            {isLegendary ? LEGENDARY_ICONS[zone.id] ?? '⚜️' : PROVINCE_ICONS[zone.province]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold truncate ${isUnlocked ? (isLegendary ? 'text-purple-800' : 'text-timber-700') : 'text-gray-500'}`}>
                {zone.name}
              </span>
              {isLegendary && (
                <span className="text-xs bg-gradient-to-r from-amber-500 to-purple-600 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                  LEGENDARY
                </span>
              )}
              {progress?.bossDefeated && (
                <span className="text-xs bg-cheddar-100 text-cheddar-700 px-1.5 py-0.5 rounded">
                  ✓ Complete
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{getProvinceDisplayName(zone.province)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Recommended Lv. {zone.recommendedLevel}</p>
            {isUnlocked && isUnderleveled && (
              <p className="text-xs text-warning mt-0.5">
                ⚠️ Your party may not survive (avg Lv {averagePartyLevel} vs recommended Lv {zone.recommendedLevel})
              </p>
            )}
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
              <div className="text-xs text-gray-500 max-w-[9rem] text-right">
                🔒 {getUnlockRequirementText(zone)}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isUnlocked && (
          <ProgressBar
            percent={completion}
            height="h-1.5"
            className="mt-2"
            fillColor={
              progress?.bossDefeated
                ? 'bg-linear-to-r from-cheddar-400 to-cheddar-600'
                : isLegendary
                  ? 'bg-linear-to-r from-amber-400 to-purple-500'
                  : 'bg-linear-to-r from-maple-400 to-maple-600'
            }
            transitionClass="transition-all duration-500"
            ariaLabel={`${zone.name} completion: ${completion}%`}
          />
        )}
      </button>

      {/* Expanded Stage List */}
      {isExpanded && isUnlocked && (
        <div className="px-3 pb-3">
          <div className="border-t border-timber-200 pt-2 mt-1">
            <p className="text-xs text-gray-600 mb-2">{zone.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {zone.stages.map((stage) => {
                const isCleared = (progress?.highestStageCleared || 0) >= stage.stageNumber;
                const canAttempt = stage.stageNumber <= (progress?.highestStageCleared || 0) + 1;
                return (
                  <button
                    key={stage.stageNumber}
                    onClick={() => canAttempt && onSelectStage(zone.id, stage.stageNumber)}
                    disabled={!canAttempt}
                    className={`
                      py-2 px-1 rounded text-xs font-medium transition-all duration-200 btn-scale min-h-[44px] md:min-h-[28px]
                      ${isCleared
                        ? 'bg-cheddar-100 text-cheddar-700 border border-cheddar-300'
                        : canAttempt
                          ? 'bg-maple-100 text-maple-700 border border-maple-300 hover:bg-maple-200 hover:shadow-xs'
                          : `${DISABLED_BUTTON_CLASSES} border border-gray-300`
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
                  py-2 px-1 rounded text-xs font-medium transition-all duration-200 btn-scale min-h-[44px] md:min-h-[28px]
                  ${progress?.bossDefeated
                    ? 'bg-cheddar-100 text-cheddar-700 border border-cheddar-300'
                    : (progress?.highestStageCleared || 0) >= zone.stages.length
                      ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:shadow-xs'
                      : `${DISABLED_BUTTON_CLASSES} border border-gray-300`
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

  // Underleveled confirmation dialog target
  const [pendingStage, setPendingStage] = useState<{ zoneId: string; stageNumber: number; zoneName: string; recommendedLevel: number } | null>(null);

  // Check if player has any heroes in party
  const partyHeroIds = [
    party.frontLeft,
    party.frontRight,
    party.backLeft,
    party.backRight,
  ].filter((id): id is string => id !== null && heroes[id] !== undefined);
  const hasPartyMembers = partyHeroIds.length > 0;

  const averagePartyLevel = hasPartyMembers
    ? Math.round(partyHeroIds.reduce((sum, id) => sum + heroes[id].level, 0) / partyHeroIds.length)
    : null;

  const provincialZones = ZONES.filter((z) => !z.isLegendary);
  const legendaryZones = ZONES.filter((z) => z.isLegendary);

  const handleSelectStage = (zoneId: string, stageNumber: number) => {
    if (!hasPartyMembers) return;

    const zone = getZoneById(zoneId);
    const isUnderleveled =
      zone !== undefined &&
      averagePartyLevel !== null &&
      averagePartyLevel < zone.recommendedLevel - LEVEL_WARNING_MARGIN;

    if (isUnderleveled) {
      setPendingStage({ zoneId, stageNumber, zoneName: zone.name, recommendedLevel: zone.recommendedLevel });
      return;
    }

    onStartCombat(zoneId, stageNumber);
  };

  const handleConfirmDangerousEntry = () => {
    if (pendingStage) {
      onStartCombat(pendingStage.zoneId, pendingStage.stageNumber);
      setPendingStage(null);
    }
  };

  const renderZoneCard = (zone: ZoneDefinition) => {
    const unlocked = isZoneUnlocked(zone, zoneProgress, curds, achievements);
    const progress = zoneProgress[zone.id];
    return (
      <ZoneCard
        key={zone.id}
        zone={zone}
        isUnlocked={unlocked}
        progress={progress}
        averagePartyLevel={averagePartyLevel}
        onSelectStage={handleSelectStage}
      />
    );
  };

  return (
    <FirstTimeHint hintId="firstCombat" position="top">
      <PanelContainer>
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
          <p className="text-sm text-error font-medium">⚠️ No heroes in party!</p>
          <p className="text-xs text-error mt-1">
            Add heroes to your party before entering combat.
          </p>
        </div>
      )}

      {/* Zone List */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        {provincialZones.map(renderZoneCard)}

        {/* Legendary Questlines Section */}
        {legendaryZones.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-3 pb-1">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              <span className="text-sm font-bold text-purple-700 whitespace-nowrap">⚜️ Legendary Questlines</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            </div>
            <p className="text-xs text-gray-500 pb-1">
              Endgame mythology sagas — far deadlier than their unlock order suggests.
            </p>
            {legendaryZones.map(renderZoneCard)}
          </>
        )}
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

        {/* Underleveled Confirmation */}
        {pendingStage && (
          <ModalOverlay isOpen={true} onClose={() => setPendingStage(null)} ariaLabelledBy="danger-entry-title">
            <div className="bg-white panel-wood-solid border-4 border-amber-500 rounded-lg p-6 max-w-md mx-4 shadow-2xl">
              <h2 id="danger-entry-title" className="text-xl font-bold text-warning mb-2 text-center">
                ⚠️ Dangerous Territory
              </h2>
              <p className="text-sm text-rind mb-4 text-center">
                {pendingStage.zoneName} recommends level {pendingStage.recommendedLevel}, but your party
                averages level {averagePartyLevel}. Your heroes may not survive this battle.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setPendingStage(null)} className="flex-1">
                  Retreat
                </Button>
                <Button variant="danger" onClick={handleConfirmDangerousEntry} className="flex-1">
                  Enter Anyway
                </Button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </PanelContainer>
    </FirstTimeHint>
  );
}
