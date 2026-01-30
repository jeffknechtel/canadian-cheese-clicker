import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsState } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import {
  setMasterVolume,
  setMusicVolume,
  setSfxVolume,
  setMusicEnabled,
  setSfxEnabled,
} from '../systems/audioSystem';

interface SettingsStore extends SettingsState {
  // Audio actions
  setMasterVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;

  // Graphics actions
  setQuality: (quality: SettingsState['graphics']['quality']) => void;
  setParticlesEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;

  // Accessibility actions
  setColorblindMode: (mode: SettingsState['accessibility']['colorblindMode']) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setFontSize: (size: SettingsState['accessibility']['fontSize']) => void;

  // Game actions
  setAutoSaveInterval: (seconds: number) => void;
  setOfflineProgressCap: (hours: number) => void;
  setNumberFormat: (format: SettingsState['game']['numberFormat']) => void;

  // Utility actions
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      // ===== Audio Actions =====
      setMasterVolume: (volume: number) => {
        setMasterVolume(volume);
        set((state) => ({
          audio: { ...state.audio, masterVolume: volume },
        }));
      },

      setMusicVolume: (volume: number) => {
        setMusicVolume(volume);
        set((state) => ({
          audio: { ...state.audio, musicVolume: volume },
        }));
      },

      setSfxVolume: (volume: number) => {
        setSfxVolume(volume);
        set((state) => ({
          audio: { ...state.audio, sfxVolume: volume },
        }));
      },

      setMusicEnabled: (enabled: boolean) => {
        setMusicEnabled(enabled);
        set((state) => ({
          audio: { ...state.audio, musicEnabled: enabled },
        }));
      },

      setSfxEnabled: (enabled: boolean) => {
        setSfxEnabled(enabled);
        set((state) => ({
          audio: { ...state.audio, sfxEnabled: enabled },
        }));
      },

      // ===== Graphics Actions =====
      setQuality: (quality) => {
        set((state) => ({
          graphics: { ...state.graphics, quality },
        }));
      },

      setParticlesEnabled: (enabled) => {
        set((state) => ({
          graphics: { ...state.graphics, particlesEnabled: enabled },
        }));
      },

      setAnimationsEnabled: (enabled) => {
        set((state) => ({
          graphics: { ...state.graphics, animationsEnabled: enabled },
        }));
      },

      // ===== Accessibility Actions =====
      setColorblindMode: (mode) => {
        set((state) => ({
          accessibility: { ...state.accessibility, colorblindMode: mode },
        }));
      },

      setReducedMotion: (enabled) => {
        set((state) => ({
          accessibility: { ...state.accessibility, reducedMotion: enabled },
        }));
      },

      setHighContrast: (enabled) => {
        set((state) => ({
          accessibility: { ...state.accessibility, highContrast: enabled },
        }));
      },

      setFontSize: (size) => {
        set((state) => ({
          accessibility: { ...state.accessibility, fontSize: size },
        }));
      },

      // ===== Game Actions =====
      setAutoSaveInterval: (seconds) => {
        set((state) => ({
          game: { ...state.game, autoSaveInterval: seconds },
        }));
      },

      setOfflineProgressCap: (hours) => {
        set((state) => ({
          game: { ...state.game, offlineProgressCap: hours },
        }));
      },

      setNumberFormat: (format) => {
        set((state) => ({
          game: { ...state.game, numberFormat: format },
        }));
      },

      // ===== Utility Actions =====
      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
        // Apply audio settings to the audio system
        setMasterVolume(DEFAULT_SETTINGS.audio.masterVolume);
        setMusicVolume(DEFAULT_SETTINGS.audio.musicVolume);
        setSfxVolume(DEFAULT_SETTINGS.audio.sfxVolume);
        setMusicEnabled(DEFAULT_SETTINGS.audio.musicEnabled);
        setSfxEnabled(DEFAULT_SETTINGS.audio.sfxEnabled);
      },

      exportSettings: () => {
        const state = get();
        return JSON.stringify({
          audio: state.audio,
          graphics: state.graphics,
          accessibility: state.accessibility,
          game: state.game,
        });
      },

      importSettings: (json: string) => {
        try {
          const imported = JSON.parse(json);
          if (imported.audio && imported.graphics && imported.accessibility && imported.game) {
            set({
              audio: { ...DEFAULT_SETTINGS.audio, ...imported.audio },
              graphics: { ...DEFAULT_SETTINGS.graphics, ...imported.graphics },
              accessibility: { ...DEFAULT_SETTINGS.accessibility, ...imported.accessibility },
              game: { ...DEFAULT_SETTINGS.game, ...imported.game },
            });
            // Apply audio settings
            setMasterVolume(imported.audio.masterVolume ?? DEFAULT_SETTINGS.audio.masterVolume);
            setMusicVolume(imported.audio.musicVolume ?? DEFAULT_SETTINGS.audio.musicVolume);
            setSfxVolume(imported.audio.sfxVolume ?? DEFAULT_SETTINGS.audio.sfxVolume);
            setMusicEnabled(imported.audio.musicEnabled ?? DEFAULT_SETTINGS.audio.musicEnabled);
            setSfxEnabled(imported.audio.sfxEnabled ?? DEFAULT_SETTINGS.audio.sfxEnabled);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'canadian_cheese_quest_settings',
      version: 1,
    }
  )
);

// Initialize audio system with stored settings on app load
export function initializeSettingsAudio(): void {
  const state = useSettingsStore.getState();
  setMasterVolume(state.audio.masterVolume);
  setMusicVolume(state.audio.musicVolume);
  setSfxVolume(state.audio.sfxVolume);
  setMusicEnabled(state.audio.musicEnabled);
  setSfxEnabled(state.audio.sfxEnabled);
}
