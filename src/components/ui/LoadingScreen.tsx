import { useEffect, useState, useRef } from 'react';
import { getRandomTipText } from '../../data/loadingTips';

interface LoadingScreenProps {
  progress: number; // 0-100
  onComplete?: () => void;
}

const TIP_CYCLE_INTERVAL_MS = 3000; // Cycle tips every 3 seconds

export function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
  const [tip, setTip] = useState(getRandomTipText);
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const hasTriggeredComplete = useRef(false);

  // Cycle tips
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTip(getRandomTipText());
    }, TIP_CYCLE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  // Handle fade-out when loading completes
  useEffect(() => {
    if (progress >= 100 && !fadeOut && !hasTriggeredComplete.current) {
      hasTriggeredComplete.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: triggers fade animation after progress reaches 100%
      setFadeOut(true);
      // Wait for fade animation before calling onComplete
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [progress, fadeOut, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-90 flex flex-col items-center justify-center bg-linear-to-br from-cream via-cheddar-50 to-cheddar-100 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #8b7355 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Animated Cheese Wheel Logo */}
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full bg-cheddar-400/20 blur-xl animate-pulse" />

          {/* Cheese wheel */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-linear-to-br from-cheddar-300 via-cheddar-400 to-cheddar-500 shadow-lg animate-spin-slow">
            {/* Cheese holes pattern */}
            <div className="absolute top-4 left-6 w-4 h-4 rounded-full bg-cheddar-600/30" />
            <div className="absolute top-8 right-6 w-3 h-3 rounded-full bg-cheddar-600/30" />
            <div className="absolute bottom-6 left-10 w-5 h-5 rounded-full bg-cheddar-600/30" />
            <div className="absolute bottom-10 right-8 w-3 h-3 rounded-full bg-cheddar-600/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-cheddar-600/20" />

            {/* Inner highlight */}
            <div className="absolute inset-2 rounded-full bg-linear-to-tl from-transparent via-white/10 to-white/20" />
          </div>

          {/* Maple leaf accent */}
          <div className="absolute -bottom-2 -right-2 text-4xl animate-bounce" style={{ animationDuration: '2s' }}>
            🍁
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-cheddar-700 mb-2">
            The Great Canadian Cheese Quest
          </h1>
          <p className="text-cheddar-600 text-lg animate-pulse">
            Loading, eh
            <span className="inline-block w-6 text-left">
              <LoadingEllipsis />
            </span>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 sm:w-80">
          <div className="h-3 bg-cheddar-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-linear-to-r from-maple-500 via-maple-600 to-maple-500 rounded-full transition-all duration-300 relative"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          <p className="text-center text-sm text-cheddar-600 mt-2">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Maple leaf decorations on progress bar */}
        <div className="flex justify-center gap-2 -mt-4">
          <span className="text-maple-500 text-sm">🍁</span>
          <span className="text-maple-400 text-xs">🍁</span>
          <span className="text-maple-500 text-sm">🍁</span>
        </div>

        {/* Loading Tip */}
        <div className="max-w-md text-center px-4">
          <div className="bg-white/50 backdrop-blur-xs rounded-lg px-6 py-4 shadow-xs border border-cheddar-200">
            <p className="text-sm text-cheddar-700 italic transition-opacity duration-300">
              💡 {tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Animated ellipsis component
function LoadingEllipsis() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(intervalId);
  }, []);

  return <>{dots}</>;
}
