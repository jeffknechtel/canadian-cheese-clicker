import { useFocusTrap } from '../../hooks/useFocusTrap';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Array<{ key: string; description: string }>;
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'General',
    shortcuts: [
      { key: 'Space', description: 'Click cheese wheel' },
      { key: '?', description: 'Open this help menu' },
      { key: 'Escape', description: 'Close modal/dialog' },
      { key: 's', description: 'Open Settings' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'g', description: 'Generators panel' },
      { key: 'u', description: 'Upgrades panel' },
      { key: 'h', description: 'Heroes panel' },
      { key: 'c', description: 'Combat panel' },
      { key: 'p', description: 'Prestige panel' },
      { key: 'r', description: 'Crafting panel' },
      { key: 'a', description: 'Achievements panel' },
    ],
  },
  {
    title: 'Generators',
    shortcuts: [
      { key: '1-5', description: 'Buy generator by number' },
    ],
  },
  {
    title: 'Combat',
    shortcuts: [
      { key: '1-4', description: 'Select hero by number' },
      { key: 'Arrow keys', description: 'Navigate between heroes' },
      { key: 'Enter / Space', description: 'Use selected hero ability' },
      { key: 'f', description: 'Flee from battle' },
      { key: 'l', description: 'Activate Limit Break' },
      { key: ', / . / /', description: 'Combat speed 1x / 2x / 4x' },
    ],
  },
];

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 animate-backdrop-in"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-modal-in panel-wood-solid"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-timber-200 header-timmys text-white">
          <h2 id="keyboard-help-title" className="text-xl font-bold flex items-center gap-2">
            <span aria-hidden="true">⌨️</span>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Close keyboard shortcuts help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
          <p className="text-sm text-gray-600 mb-4">
            Navigate and play the game entirely with your keyboard. Press <kbd className="keyboard-key">?</kbd> at any time to open this help.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {SHORTCUT_CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3 className="text-sm font-bold text-timber-700 mb-2 pb-1 border-b border-timber-200">
                  {category.title}
                </h3>
                <ul className="space-y-1.5" role="list">
                  {category.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{shortcut.description}</span>
                      <kbd className="keyboard-key">{shortcut.key}</kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Accessibility note */}
          <div className="mt-6 p-3 bg-maple-50 rounded-lg border border-maple-200">
            <h3 className="text-sm font-bold text-maple-700 mb-1 flex items-center gap-1">
              <span aria-hidden="true">♿</span> Accessibility
            </h3>
            <p className="text-xs text-maple-600">
              This game is designed to be fully playable with keyboard only.
              Screen reader announcements are provided for all game actions.
              Use <kbd className="keyboard-key text-xs">Tab</kbd> to navigate interactive elements,
              and <kbd className="keyboard-key text-xs">Enter</kbd> or <kbd className="keyboard-key text-xs">Space</kbd> to activate them.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-timber-200 bg-timber-50/50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-cheddar-500 hover:bg-cheddar-600 text-white font-semibold rounded-lg transition-colors btn-ripple"
          >
            Got it! (Press Escape to close)
          </button>
        </div>
      </div>
    </div>
  );
}
