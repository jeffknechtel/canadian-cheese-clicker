import { useMemo } from 'react';
import { formatNumber } from '../../utils/formatNumber';
import type { OfflineProgress } from '../../systems/saveSystem';
import { getWelcomeBackMessage } from '../../data/canadianDialogue';
import { useSettingsStore } from '../../stores/settingsStore';

interface OfflineProgressModalProps {
  progress: OfflineProgress;
  onDismiss: () => void;
}

function formatTimeAway(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function OfflineProgressModal({
  progress,
  onDismiss,
}: OfflineProgressModalProps) {
  // Get a random welcome message (memoized to stay consistent during render)
  const welcomeMessage = useMemo(() => getWelcomeBackMessage(), []);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${!reducedMotion ? 'animate-backdrop-in' : ''}`}>
      <div className={`bg-white panel-wood-solid border-4 border-cheddar-500 rounded-lg p-8 max-w-md mx-4 shadow-2xl ${!reducedMotion ? 'animate-modal-in' : ''}`}>
        <h2 className="text-2xl font-bold text-cheddar-700 mb-2 text-center">
          {welcomeMessage.split(':')[0]}
        </h2>

        <p className="text-rind mb-4 text-center">
          You were away for{' '}
          <span className="font-semibold text-cheddar-600">
            {formatTimeAway(progress.secondsAway)}
          </span>
        </p>

        <div className={`bg-cheddar-100 rounded-lg p-4 mb-6 ${!reducedMotion ? 'animate-slide-up' : ''}`} style={{ animationDelay: '100ms' }}>
          <p className="text-center text-rind">
            Your cheese makers earned you
          </p>
          <p className={`text-4xl font-bold text-cheddar-600 text-center my-2 tabular-nums ${!reducedMotion ? 'animate-number-pop' : ''}`} style={{ animationDelay: '200ms' }}>
            +{formatNumber(progress.curdsEarned)}
          </p>
          <p className="text-center text-rind">curds while you were away!</p>
        </div>

        <button
          onClick={onDismiss}
          className="w-full bg-cheddar-500 hover:bg-cheddar-600 text-white font-bold py-3 px-6 rounded-lg transition-colors btn-ripple btn-scale"
        >
          Collect Curds
        </button>
      </div>
    </div>
  );
}
