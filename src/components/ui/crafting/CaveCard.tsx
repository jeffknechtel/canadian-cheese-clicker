import { useGameStore } from '../../../stores';
import { useNow } from '../../../hooks/useNow';
import { formatAgingDuration } from '../../../data/cheeseRecipes';
import { recipeRegistry } from '../../../domain';
import { playPurchaseSound } from '../../../systems/audioSystem';
import { ProgressBar } from '../shared/ProgressBar';
import { getInteractionQualityEffect } from '../../../systems/craftingEngine';
import type { AffinageCave, CraftingJob } from '../../../types/game';

interface CaveCardProps {
  cave: AffinageCave;
  jobs: CraftingJob[];
}

export function CaveCard({ cave, jobs }: CaveCardProps) {
  const usedSlots = jobs.length;
  const availableSlots = cave.capacity - usedSlots;

  return (
    <div className="bg-white/70 rounded-lg border border-timber-200 overflow-hidden">
      {/* Cave Header */}
      <div className="p-3 bg-timber-50 border-b border-timber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cave.icon}</span>
            <div>
              <div className="font-semibold text-timber-700">{cave.name}</div>
              <div className="text-xs text-timber-500">{cave.description}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-timber-700">
              {usedSlots}/{cave.capacity} slots
            </div>
            {cave.qualityBonus > 0 && (
              <div className="text-xs text-cheddar-600">
                +{cave.qualityBonus}% quality
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="p-2">
        {jobs.length === 0 ? (
          <div className="text-center text-gray-500 py-4 text-sm">
            No cheese aging in this cave
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <AgingJobRow key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Available slots indicator */}
        {availableSlots > 0 && (
          <div className="mt-2 text-center text-xs text-timber-500">
            {availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
          </div>
        )}
      </div>
    </div>
  );
}

interface AgingJobRowProps {
  job: CraftingJob;
}

function AgingJobRow({ job }: AgingJobRowProps) {
  const collectCheese = useGameStore((s) => s.collectCheese);
  const addInteraction = useGameStore((s) => s.addInteraction);
  // Selected as a function deliberately: it reads fresh state via get() at call
  // time, and the useNow() clock below re-renders this row once per second.
  const getJobProgress = useGameStore((s) => s.getJobProgress);

  // Shared 1s clock drives both the countdown display and the progress refresh
  const currentTime = useNow();
  const progress = getJobProgress(job.id);

  const recipe = recipeRegistry.get(job.recipeId);
  const isComplete = progress >= 100;

  const handleCollect = () => {
    if (!isComplete) return;

    const cheese = collectCheese(job.id);
    if (cheese) {
      playPurchaseSound();
    }
  };

  const handleTurn = () => {
    if (isComplete) return;

    addInteraction(job.id, {
      type: 'turn',
      qualityEffect: getInteractionQualityEffect('turn'),
    });
  };

  if (!recipe) return null;

  const remainingMs = Math.max(0, job.endTime - currentTime);
  const remainingStr = formatAgingDuration(remainingMs);

  return (
    <div
      className={`
        p-2 rounded-lg border transition-all
        ${isComplete
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-timber-100'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {/* Recipe icon */}
        <span className="text-lg">{recipe.icon}</span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-timber-700 truncate">
              {recipe.name}
            </span>
            {job.qualityBonus > 0 && (
              <span className="text-xs text-cheddar-600">
                +{job.qualityBonus}% quality
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-1">
            <ProgressBar
              percent={progress}
              height="h-2"
              bgColor="bg-timber-100"
              fillColor={isComplete ? 'bg-green-500' : 'bg-cheddar-400'}
              showShimmer={!isComplete}
              glowOnNearComplete
            />
            <div className="flex justify-between text-xs mt-0.5">
              <span className="text-timber-500">
                {isComplete ? 'Ready!' : remainingStr}
              </span>
              <span className="text-timber-500">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex gap-1">
          {!isComplete && (
            <button
              onClick={handleTurn}
              className="px-2 py-1 text-xs bg-timber-100 hover:bg-timber-200 text-timber-700 rounded transition-colors btn-scale"
              title="Turn cheese (+1% quality)"
            >
              Turn
            </button>
          )}
          {isComplete && (
            <button
              onClick={handleCollect}
              className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors btn-scale btn-ripple"
            >
              Collect
            </button>
          )}
        </div>
      </div>

      {/* Interactions */}
      {job.interactions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.interactions.map((interaction) => (
            <span
              key={`${interaction.type}-${interaction.timestamp}`}
              className="text-xs px-1.5 py-0.5 bg-timber-50 rounded text-timber-600"
            >
              {interaction.type === 'turn' && ''}
              {interaction.type === 'rind_wash' && ''}
              {interaction.type === 'flavor_addition' && ''}
              +{interaction.qualityEffect}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
