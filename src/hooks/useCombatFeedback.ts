import { useState, useCallback } from 'react';

// ===== Screen Shake Effect =====

interface UseScreenShakeReturn {
  isShaking: boolean;
  triggerShake: (intensity?: 'light' | 'medium' | 'heavy') => void;
  shakeClass: string;
}

export function useScreenShake(): UseScreenShakeReturn {
  const [shakeState, setShakeState] = useState<{
    isShaking: boolean;
    intensity: 'light' | 'medium' | 'heavy';
  }>({ isShaking: false, intensity: 'medium' });

  const triggerShake = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    setShakeState({ isShaking: true, intensity });

    const duration = intensity === 'light' ? 150 : intensity === 'medium' ? 300 : 500;
    setTimeout(() => {
      setShakeState((prev) => ({ ...prev, isShaking: false }));
    }, duration);
  }, []);

  const shakeClass = shakeState.isShaking
    ? shakeState.intensity === 'light'
      ? 'animate-shake-light'
      : shakeState.intensity === 'heavy'
        ? 'animate-shake-heavy'
        : 'animate-shake-medium'
    : '';

  return {
    isShaking: shakeState.isShaking,
    triggerShake,
    shakeClass,
  };
}

// ===== Flash Effect for Crits and Big Hits =====

interface UseFlashEffectReturn {
  isFlashing: boolean;
  triggerFlash: (color?: 'red' | 'gold' | 'white' | 'green') => void;
  flashColor: 'red' | 'gold' | 'white' | 'green';
}

export function useFlashEffect(): UseFlashEffectReturn {
  const [flashState, setFlashState] = useState<{
    isFlashing: boolean;
    color: 'red' | 'gold' | 'white' | 'green';
  }>({ isFlashing: false, color: 'white' });

  const triggerFlash = useCallback((color: 'red' | 'gold' | 'white' | 'green' = 'white') => {
    setFlashState({ isFlashing: true, color });
    setTimeout(() => {
      setFlashState((prev) => ({ ...prev, isFlashing: false }));
    }, 150);
  }, []);

  return {
    isFlashing: flashState.isFlashing,
    triggerFlash,
    flashColor: flashState.color,
  };
}
