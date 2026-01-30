interface CombatATBBarProps {
  currentValue: number; // 0-100
  maxValue?: number;
  label?: string;
  icon?: string;
  color?: 'hero' | 'enemy';
  isReady?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CombatATBBar({
  currentValue,
  maxValue = 100,
  label,
  icon,
  color = 'hero',
  isReady = false,
  showLabel = true,
  size = 'md',
}: CombatATBBarProps) {
  const percentage = Math.min(100, (currentValue / maxValue) * 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const gradientClasses = {
    hero: isReady
      ? 'bg-linear-to-r from-cheddar-400 to-cheddar-500 animate-pulse'
      : 'bg-linear-to-r from-maple-400 to-maple-600',
    enemy: isReady
      ? 'bg-linear-to-r from-red-400 to-red-500 animate-pulse'
      : 'bg-linear-to-r from-red-300 to-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      {/* Icon */}
      {icon && (
        <span
          className={`
            shrink-0 text-center
            ${size === 'sm' ? 'text-sm w-5' : size === 'md' ? 'text-base w-6' : 'text-lg w-8'}
            ${isReady ? 'animate-bounce' : ''}
          `}
        >
          {icon}
        </span>
      )}

      {/* Bar Container */}
      <div className="flex-1 min-w-0">
        {/* Label */}
        {showLabel && label && (
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs font-medium text-timber-600 truncate">{label}</span>
            {isReady && (
              <span className="text-xs text-cheddar-600 font-bold animate-pulse">READY!</span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden`}>
          <div
            className={`
              h-full rounded-full transition-all duration-100 ease-linear
              ${gradientClasses[color]}
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface LimitBreakGaugeProps {
  currentValue: number; // 0-100
  onActivate?: () => void;
  isDisabled?: boolean;
}

export function LimitBreakGauge({
  currentValue,
  onActivate,
  isDisabled = false,
}: LimitBreakGaugeProps) {
  const isReady = currentValue >= 100;
  const percentage = Math.min(100, currentValue);

  return (
    <div className="p-2 bg-timber-100 rounded-lg border border-timber-200">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-timber-700">💥 Limit Break</span>
        <span className="text-xs text-gray-500">{Math.floor(percentage)}%</span>
      </div>

      {/* Gauge */}
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`
            h-full rounded-full transition-all duration-200
            ${isReady
              ? 'bg-linear-to-r from-amber-400 via-orange-500 to-red-500 animate-pulse'
              : 'bg-linear-to-r from-amber-300 to-amber-500'
            }
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Activate Button */}
      <button
        onClick={onActivate}
        disabled={!isReady || isDisabled}
        className={`
          w-full py-2 rounded font-bold text-sm transition-all duration-200
          ${isReady && !isDisabled
            ? 'bg-linear-to-r from-amber-500 to-red-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {isReady ? '⚡ UNLEASH LIMIT BREAK!' : 'Charge by dealing and taking damage'}
      </button>
    </div>
  );
}
