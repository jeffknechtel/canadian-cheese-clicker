/**
 * Hook to manage privacy consent state
 */

import { useState, useCallback, useEffect } from 'react';
import { analytics } from '../systems/analyticsService';

export function usePrivacyConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    analytics.isEnabled()
  );

  // Check if we need to show consent on mount
  useEffect(() => {
    if (!analytics.hasConsentDecision()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial state setup based on external system
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
