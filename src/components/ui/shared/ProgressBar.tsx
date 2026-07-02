import { useSettingsStore } from '../../../stores/settingsStore';

interface ProgressBarProps {
  percent: number;
  height?: string;
  bgColor?: string;
  fillColor?: string;
  className?: string;
  showShimmer?: boolean;
  glowOnNearComplete?: boolean;
}

export function ProgressBar({
  percent,
  height = 'h-2',
  bgColor = 'bg-gray-200',
  fillColor = 'bg-amber-500',
  className = '',
  showShimmer = false,
  glowOnNearComplete = false,
}: ProgressBarProps) {
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);
  const nearComplete = percent >= 90 && percent < 100;
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      className={`${height} ${bgColor} rounded-full overflow-hidden relative ${className} ${
        glowOnNearComplete && nearComplete && !reducedMotion ? 'animate-pulse-glow' : ''
      }`}
    >
      <div
        className={`h-full ${fillColor} transition-all duration-300 relative`}
        style={{ width: `${clampedPercent}%` }}
      >
        {showShimmer && !reducedMotion && clampedPercent > 0 && clampedPercent < 100 && (
          <div className="absolute inset-0 animate-shimmer" />
        )}
      </div>
    </div>
  );
}
