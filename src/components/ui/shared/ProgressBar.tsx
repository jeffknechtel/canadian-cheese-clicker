interface ProgressBarProps {
  percent: number;
  height?: string;
  bgColor?: string;
  fillColor?: string;
  className?: string;
}

export function ProgressBar({
  percent,
  height = 'h-2',
  bgColor = 'bg-gray-200',
  fillColor = 'bg-amber-500',
  className = '',
}: ProgressBarProps) {
  return (
    <div className={`${height} ${bgColor} rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${fillColor} transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
