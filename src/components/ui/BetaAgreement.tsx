/**
 * Beta Agreement Component
 *
 * Shows beta participation agreement to players on first visit.
 * Must be accepted before playing during beta period.
 */

import { useState, useCallback } from 'react';
import { GAME_VERSION } from '../../config/version';
import { storeBetaAgreement } from '../../hooks/useBetaAgreement';

interface BetaAgreementProps {
  onAccept: () => void;
  onDecline?: () => void;
}

export function BetaAgreement({ onAccept, onDecline }: BetaAgreementProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 20;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom]);

  const handleAccept = useCallback(() => {
    storeBetaAgreement();
    onAccept();
  }, [onAccept]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-maple-600 to-maple-700 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧀</span>
            <div>
              <h2 className="text-xl font-bold">Beta Tester Agreement</h2>
              <p className="text-sm text-white/80">The Great Canadian Cheese Quest v{GAME_VERSION}</p>
            </div>
          </div>
        </div>

        {/* Agreement content */}
        <div
          className="p-6 max-h-[50vh] overflow-y-auto bg-cream/50"
          onScroll={handleScroll}
        >
          <div className="space-y-4 text-sm text-cheddar-700">
            <p className="font-medium text-cheddar-800">
              Welcome to the beta test of The Great Canadian Cheese Quest!
            </p>

            <section>
              <h3 className="font-semibold text-cheddar-800 mb-2">What to Expect</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Game features are still in development and may change</li>
                <li>You may encounter bugs, glitches, or balance issues</li>
                <li>Game saves may need to be reset between updates</li>
                <li>Some features may be incomplete or placeholder</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-cheddar-800 mb-2">Your Role as a Beta Tester</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Report bugs and issues using the in-game feedback widget</li>
                <li>Share balance concerns (too easy, too hard)</li>
                <li>Suggest improvements or new ideas</li>
                <li>Help us make the game better for everyone!</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-cheddar-800 mb-2">Data Collection</h3>
              <p>
                During beta, we collect anonymous gameplay data to improve the game:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Gameplay progress and statistics</li>
                <li>Feature usage patterns</li>
                <li>Bug reports and feedback you submit</li>
                <li>Performance metrics</li>
              </ul>
              <p className="mt-2 text-xs text-cheddar-500">
                No personal information is collected. You can disable analytics in Settings.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-cheddar-800 mb-2">Agreement</h3>
              <p>
                By clicking "Accept & Play", you agree to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Participate in beta testing of an in-development game</li>
                <li>Accept that your game progress may be reset</li>
                <li>Allow anonymous gameplay data collection</li>
                <li>Report issues constructively and helpfully</li>
              </ul>
            </section>

            <div className="pt-4 border-t border-cheddar-200 text-center text-cheddar-500 text-xs">
              Thank you for helping us craft the perfect cheese experience, eh! 🇨🇦
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        {!hasScrolledToBottom && (
          <div className="px-6 py-2 bg-cheddar-100 text-center text-xs text-cheddar-500 animate-pulse">
            Scroll down to read the full agreement
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 py-4 bg-white border-t border-cheddar-200 flex gap-3">
          {onDecline && (
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 px-4 rounded-lg border border-cheddar-200 text-cheddar-600 hover:bg-cheddar-50 transition-colors"
            >
              Maybe Later
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={!hasScrolledToBottom}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              hasScrolledToBottom
                ? 'bg-maple-600 hover:bg-maple-700 text-white'
                : 'bg-cheddar-200 text-cheddar-400 cursor-not-allowed'
            }`}
            title={hasScrolledToBottom ? undefined : 'Please read the full agreement first'}
          >
            Accept & Play
          </button>
        </div>
      </div>
    </div>
  );
}

export default BetaAgreement;
