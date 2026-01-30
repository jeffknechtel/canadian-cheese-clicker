/**
 * Hook to manage privacy consent state
 */

import { useState, useCallback } from 'react';
import { analytics } from '../systems/analyticsService';

export function usePrivacyConsent() {
  // Initialize showConsent based on whether we have a consent decision
  const [showConsent, setShowConsent] = useState(
    () => !analytics.hasConsentDecision()
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    () => analytics.isEnabled()
  );

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
