import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../stores';
import { TUTORIAL_STEPS } from '../../data/tutorialSteps';
import { getLoreEntry } from '../../data/loreEntries';
import { useSettingsStore } from '../../stores/settingsStore';
import { vibrateClick } from '../../systems/haptics';
import type { TutorialStepId } from '../../stores/slices/tutorial';

const TOAST_DURATION_MS = 8000;
const TOAST_EXIT_DURATION_MS = 300;

function GusAvatar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-cheddar-200 border-2 border-cheddar-400 ${className}`}
      aria-hidden="true"
    >
      <span className="text-2xl" role="img" aria-label="Gruyère Gus">
        🧀
      </span>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-maple-500 rounded-full flex items-center justify-center">
        <span className="text-[10px]">🍁</span>
      </div>
    </div>
  );
}

interface TutorialToastItemProps {
  stepId: TutorialStepId;
  onDismiss: () => void;
}

function TutorialToastItem({ stepId, onDismiss }: TutorialToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const step = TUTORIAL_STEPS[stepId];
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const duration = step?.autoDismissMs ?? TOAST_DURATION_MS;

  useEffect(() => {
    vibrateClick();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      }
    };
    const animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [duration, reducedMotion]);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - TOAST_EXIT_DURATION_MS);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, TOAST_EXIT_DURATION_MS);
  }, [onDismiss]);

  if (!step) return null;

  const loreEntry = step.loreId ? getLoreEntry(step.loreId) : null;

  return (
    <div
      role="dialog"
      aria-labelledby={`tutorial-title-${stepId}`}
      aria-describedby={`tutorial-message-${stepId}`}
      className={`
        relative flex gap-3 p-4 rounded-lg shadow-xl border-2 border-rind-300
        bg-linear-to-br from-panel-wood via-panel-wood to-cheddar-50
        transform transition-all duration-300 overflow-hidden
        ${isExiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
      `}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-rind-200">
        <div
          className="h-full bg-cheddar-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Gus Avatar */}
      <GusAvatar className="w-12 h-12 shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3
            id={`tutorial-title-${stepId}`}
            className="font-bold text-rind-800 text-sm"
          >
            {step.title}
          </h3>
          <button
            onClick={handleDismiss}
            className="text-rind-400 hover:text-rind-600 transition-colors p-1 -mr-1 -mt-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Dismiss tutorial"
          >
            ✕
          </button>
        </div>
        <p
          id={`tutorial-message-${stepId}`}
          className="text-sm text-rind-600 mt-1 leading-relaxed"
        >
          {step.message}
        </p>
        {loreEntry && (
          <p className="text-xs text-maple-600 mt-2 italic flex items-center gap-1">
            <span>📜</span> Lore unlocked: {loreEntry.title}
          </p>
        )}
        <button
          onClick={handleDismiss}
          className="mt-3 px-4 py-2 bg-cheddar-500 hover:bg-cheddar-600 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
        >
          Got it, eh!
        </button>
      </div>
    </div>
  );
}

export function TutorialToastContainer() {
  const pendingToast = useGameStore((s) => s.pendingToast);
  const dismissCurrentToast = useGameStore((s) => s.dismissCurrentToast);
  const tutorialEnabled = useGameStore((s) => s.tutorialEnabled);
  const discoverLore = useGameStore((s) => s.discoverLore);

  const handleDismiss = useCallback(() => {
    if (pendingToast) {
      const step = TUTORIAL_STEPS[pendingToast];
      if (step?.loreId) {
        discoverLore(step.loreId);
      }
    }
    dismissCurrentToast();
  }, [pendingToast, dismissCurrentToast, discoverLore]);

  if (!tutorialEnabled || !pendingToast) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
      <div className="pointer-events-auto">
        <TutorialToastItem
          key={pendingToast}
          stepId={pendingToast}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}
