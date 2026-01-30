/**
 * Hook to manage beta agreement state
 */

import { useState, useCallback, useMemo } from 'react';
import { GAME_VERSION } from '../config/version';

const BETA_AGREEMENT_KEY = 'canadian_cheese_quest_beta_agreed';
const BETA_AGREEMENT_VERSION = 1; // Increment to require re-agreement

interface StoredAgreement {
  version: number;
  acceptedAt: number;
  gameVersion: string;
}

/**
 * Check if user has already accepted the beta agreement
 */
export function hasBetaAgreement(): boolean {
  try {
    const stored = localStorage.getItem(BETA_AGREEMENT_KEY);
    if (!stored) return false;

    const agreement: StoredAgreement = JSON.parse(stored);
    return agreement.version === BETA_AGREEMENT_VERSION;
  } catch {
    return false;
  }
}

/**
 * Store beta agreement acceptance
 */
export function storeBetaAgreement(): void {
  const agreement: StoredAgreement = {
    version: BETA_AGREEMENT_VERSION,
    acceptedAt: Date.now(),
    gameVersion: GAME_VERSION,
  };
  localStorage.setItem(BETA_AGREEMENT_KEY, JSON.stringify(agreement));
}

/**
 * Hook to manage beta agreement state
 */
export function useBetaAgreement() {
  // Check agreement status on initial render (synchronous)
  const initialHasAgreed = useMemo(() => hasBetaAgreement(), []);

  const [showAgreement, setShowAgreement] = useState(!initialHasAgreed);

  const acceptAgreement = useCallback(() => {
    storeBetaAgreement();
    setShowAgreement(false);
  }, []);

  return {
    showAgreement,
    hasChecked: true, // Always true since we check synchronously
    acceptAgreement,
  };
}
