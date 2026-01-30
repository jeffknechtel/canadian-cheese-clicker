/**
 * Privacy Consent Component
 *
 * GDPR-compliant consent flow for analytics tracking.
 * Displays on first run and can be accessed from settings.
 */

import { useState, useCallback, useEffect, type ReactElement } from 'react';
import { analytics } from '../../systems/analyticsService';

interface PrivacyConsentProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentChange?: (enabled: boolean) => void;
}

/**
 * Privacy consent modal for analytics opt-in
 */
export function PrivacyConsent({
  isOpen,
  onClose,
  onConsentChange,
}: PrivacyConsentProps): ReactElement | null {
  const [showDetails, setShowDetails] = useState(false);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAccept = useCallback(() => {
    analytics.setEnabled(true);
    onConsentChange?.(true);
    onClose();
  }, [onClose, onConsentChange]);

  const handleDecline = useCallback(() => {
    analytics.setEnabled(false);
    onConsentChange?.(false);
    onClose();
  }, [onClose, onConsentChange]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      <div className="bg-cream rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-cheddar-300">
        {/* Header */}
        <div className="p-6 border-b border-cheddar-200 bg-linear-to-r from-cheddar-100 to-maple-100">
          <h2
            id="privacy-consent-title"
            className="text-xl font-bold text-cheddar-800 flex items-center gap-2"
          >
            <span className="text-2xl">🍁</span>
            Help Improve The Great Canadian Cheese Quest
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-rind">
            We'd love to collect anonymous usage data to help improve your gaming
            experience. This helps us understand how players enjoy the game and
            identify areas for improvement.
          </p>

          {/* Data collection summary */}
          <div className="bg-cheddar-50 rounded-lg p-4 border border-cheddar-200">
            <h3 className="font-semibold text-cheddar-700 mb-2">
              What we collect:
            </h3>
            <ul className="text-sm text-rind space-y-1 list-disc list-inside">
              <li>Gameplay progress (generators, upgrades, achievements)</li>
              <li>Combat participation and outcomes</li>
              <li>Session duration and activity patterns</li>
              <li>Settings preferences</li>
              <li>Error reports for debugging</li>
            </ul>
          </div>

          {/* What we don't collect */}
          <div className="bg-maple-50 rounded-lg p-4 border border-maple-200">
            <h3 className="font-semibold text-maple-700 mb-2">
              What we never collect:
            </h3>
            <ul className="text-sm text-rind space-y-1 list-disc list-inside">
              <li>Personal information (name, email, location)</li>
              <li>Device identifiers or IP addresses</li>
              <li>Information from other apps or browsing</li>
            </ul>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-cheddar-600 hover:text-cheddar-700 text-sm font-medium flex items-center gap-1"
            aria-expanded={showDetails}
          >
            {showDetails ? '▼' : '▶'} Technical details
          </button>

          {showDetails && (
            <div className="text-sm text-rind bg-white/50 rounded-lg p-4 border border-cheddar-100">
              <p className="mb-2">
                All data is stored locally in your browser and processed
                client-side. No data is sent to external servers.
              </p>
              <p className="mb-2">
                You can change this preference at any time in the Settings menu
                under "Privacy".
              </p>
              <p>
                This game is open source. You can review the analytics code at
                any time.
              </p>
            </div>
          )}

          {/* Privacy policy note */}
          <p className="text-xs text-rind/70">
            By clicking "Accept", you agree to the collection of anonymous usage
            data as described above. You can opt out at any time in Settings.
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-cheddar-200 bg-cream/50 flex gap-3 justify-end">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-lg border border-rind/30 text-rind hover:bg-white/50 transition-colors"
          >
            No thanks
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 rounded-lg bg-cheddar-500 hover:bg-cheddar-600 text-white font-semibold transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage privacy consent state
 */
export function usePrivacyConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    analytics.isEnabled()
  );

  // Check if we need to show consent on mount
  useEffect(() => {
    if (!analytics.hasConsentDecision()) {
      setShowConsent(true);
    }
  }, []);

  const handleConsentChange = useCallback((enabled: boolean) => {
    setAnalyticsEnabled(enabled);
  }, []);

  const openConsentDialog = useCallback(() => {
    setShowConsent(true);
  }, []);

  const closeConsentDialog = useCallback(() => {
    setShowConsent(false);
  }, []);

  return {
    showConsent,
    analyticsEnabled,
    openConsentDialog,
    closeConsentDialog,
    handleConsentChange,
  };
}

/**
 * Inline privacy toggle for settings panel
 */
export function PrivacyToggle(): ReactElement {
  const [enabled, setEnabled] = useState(analytics.isEnabled());

  const handleToggle = useCallback(() => {
    const newValue = !enabled;
    analytics.setEnabled(newValue);
    setEnabled(newValue);
  }, [enabled]);

  return (
    <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-cheddar-200">
      <div>
        <h4 className="font-medium text-cheddar-700">Analytics</h4>
        <p className="text-xs text-rind/70">
          Help improve the game with anonymous usage data
        </p>
      </div>
      <button
        onClick={handleToggle}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${enabled ? 'bg-cheddar-500' : 'bg-rind/30'}
        `}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle analytics"
      >
        <span
          className={`
            absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
