// ===== Settings Types =====

export interface SettingsState {
  audio: {
    masterVolume: number; // 0-1
    musicVolume: number; // 0-1
    sfxVolume: number; // 0-1
    musicEnabled: boolean;
    sfxEnabled: boolean;
  };
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    particlesEnabled: boolean;
    animationsEnabled: boolean;
  };
  accessibility: {
    colorblindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  game: {
    autoSaveInterval: number; // seconds
    offlineProgressCap: number; // hours
    numberFormat: 'standard' | 'scientific';
  };
}

export const DEFAULT_SETTINGS: SettingsState = {
  audio: {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    musicEnabled: true,
    sfxEnabled: true,
  },
  graphics: {
    quality: 'high',
    particlesEnabled: true,
    animationsEnabled: true,
  },
  accessibility: {
    colorblindMode: 'none',
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
  },
  game: {
    autoSaveInterval: 30,
    offlineProgressCap: 8,
    numberFormat: 'standard',
  },
};
