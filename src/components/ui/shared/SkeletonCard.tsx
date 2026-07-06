import { useSettingsStore } from '../../../stores/settingsStore';

interface SkeletonCardProps {
  lines?: number;
  showIcon?: boolean;
  showButton?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 2,
  showIcon = true,
  showButton = false,
  className = '',
}: SkeletonCardProps) {
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-cream/50 ${className}`}
      aria-hidden="true"
    >
      {showIcon && (
        <div className="w-10 h-10 rounded-lg bg-timber-200 shrink-0 overflow-hidden relative">
          {!reducedMotion && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          )}
        </div>
      )}
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-timber-200 overflow-hidden relative"
            style={{ width: i === 0 ? '60%' : '40%' }}
          >
            {!reducedMotion && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            )}
          </div>
        ))}
      </div>
      {showButton && (
        <div className="w-16 h-8 rounded bg-timber-200 shrink-0 overflow-hidden relative">
          {!reducedMotion && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          )}
        </div>
      )}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  cardProps?: Omit<SkeletonCardProps, 'className'>;
  className?: string;
}

export function SkeletonList({ count = 3, cardProps, className = '' }: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading...">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...cardProps} />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
