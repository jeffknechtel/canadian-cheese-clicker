import { useGameStore } from '../../../stores';
import type { HintId } from '../../../types/game';

interface FirstTimeHintProps {
  hintId: HintId;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const HINT_CONTENT: Record<HintId, { title: string; message: string }> = {
  firstClick: {
    title: 'Click the Cheese!',
    message: 'Click or tap the cheese wheel to earn curds. Keep clicking to grow your cheese empire!',
  },
  firstGenerator: {
    title: 'Automated Production',
    message: 'Generators produce curds automatically every second. Buy more to increase your CPS!',
  },
  firstCombat: {
    title: 'Battle for Cheese',
    message: 'Send heroes to fight enemies across Canada. Defeat bosses to unlock new zones!',
  },
  firstPrestige: {
    title: 'Aging Your Cheese',
    message: 'Reset your progress to earn Rennet, a permanent multiplier. The more curds you have, the more Rennet you gain!',
  },
  firstCraft: {
    title: 'Cheese Crafting',
    message: 'Craft special cheeses for temporary buffs. Higher quality ingredients give better results!',
  },
};

export function FirstTimeHint({ hintId, children, position = 'bottom' }: FirstTimeHintProps) {
  const shouldShow = useGameStore((s) => !s.isHintShown(hintId));
  const markHintShown = useGameStore((s) => s.markHintShown);
  const content = HINT_CONTENT[hintId];

  if (!shouldShow) {
    return <>{children}</>;
  }

  const positionClasses: Record<string, string> = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const arrowClasses: Record<string, string> = {
    top: '-bottom-1 border-t-rind-600',
    bottom: '-top-1 border-b-rind-600',
    left: '-right-1 border-l-rind-600',
    right: '-left-1 border-r-rind-600',
  };

  return (
    <div className="relative">
      {children}
      <div
        className={`absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 z-50 w-64 animate-fade-in`}
        role="tooltip"
      >
        <div className="bg-rind-600 text-white rounded-lg shadow-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{content.title}</p>
              <p className="text-xs mt-1 text-white/90">{content.message}</p>
            </div>
            <button
              onClick={() => markHintShown(hintId)}
              className="text-white/70 hover:text-white shrink-0"
              aria-label="Dismiss hint"
            >
              ✕
            </button>
          </div>
          <button
            onClick={() => markHintShown(hintId)}
            className="mt-2 w-full text-xs bg-white/20 hover:bg-white/30 rounded py-1 transition-colors"
          >
            Got it!
          </button>
        </div>
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${arrowClasses[position]} border-4 border-transparent`}
        />
      </div>
    </div>
  );
}
