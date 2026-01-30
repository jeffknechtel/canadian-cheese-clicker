import { useState, useCallback } from 'react';
import {
  getMuted,
  toggleMute,
  getMasterVolume,
  setMasterVolume,
  getMusicVolume,
  setMusicVolume,
  getSfxVolume,
  setSfxVolume,
  getMusicEnabled,
  setMusicEnabled,
  getSfxEnabled,
  setSfxEnabled,
  startBackgroundMusic,
  resumeAudioContext,
} from '../../systems/audioSystem';
import { saveAudioPreferences, loadAudioPreferences } from '../../systems/saveSystem';

export function AudioControls() {
  // Load saved preferences once on initial render
  const [isInitialized] = useState(() => {
    loadAudioPreferences();
    return true;
  });

  const [isMuted, setIsMuted] = useState(() => {
    if (!isInitialized) loadAudioPreferences();
    return getMuted();
  });
  const [masterVol, setMasterVol] = useState(getMasterVolume);
  const [musicVol, setMusicVol] = useState(getMusicVolume);
  const [sfxVol, setSfxVol] = useState(getSfxVolume);
  const [musicOn, setMusicOn] = useState(getMusicEnabled);
  const [sfxOn, setSfxOn] = useState(getSfxEnabled);
  const [showPanel, setShowPanel] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Save preferences when they change
  const savePrefs = useCallback(() => {
    saveAudioPreferences();
  }, []);

  // Handle user interaction to enable audio context
  const handleFirstInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      resumeAudioContext();
      if (musicOn) {
        startBackgroundMusic();
      }
    }
  }, [hasInteracted, musicOn]);

  const handleToggleMute = () => {
    handleFirstInteraction();
    const newMuted = toggleMute();
    setIsMuted(newMuted);
    setMusicOn(!newMuted);
    setSfxOn(!newMuted);
    savePrefs();
  };

  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFirstInteraction();
    const newVolume = parseFloat(e.target.value);
    setMasterVol(newVolume);
    setMasterVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      toggleMute();
      setIsMuted(false);
      setMusicOn(true);
      setSfxOn(true);
    }
    savePrefs();
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFirstInteraction();
    const newVolume = parseFloat(e.target.value);
    setMusicVol(newVolume);
    setMusicVolume(newVolume);
    savePrefs();
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFirstInteraction();
    const newVolume = parseFloat(e.target.value);
    setSfxVol(newVolume);
    setSfxVolume(newVolume);
    savePrefs();
  };

  const handleMusicToggle = () => {
    handleFirstInteraction();
    const newEnabled = !musicOn;
    setMusicOn(newEnabled);
    setMusicEnabled(newEnabled);
    setIsMuted(!newEnabled && !sfxOn);
    savePrefs();
  };

  const handleSfxToggle = () => {
    handleFirstInteraction();
    const newEnabled = !sfxOn;
    setSfxOn(newEnabled);
    setSfxEnabled(newEnabled);
    setIsMuted(!musicOn && !newEnabled);
    savePrefs();
  };

  return (
    <div
      className="relative"
      onMouseLeave={() => setShowPanel(false)}
    >
      <button
        onClick={handleToggleMute}
        onMouseEnter={() => setShowPanel(true)}
        className="p-2 rounded-lg bg-cheddar-500/30 hover:bg-cheddar-500/50 transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || masterVol === 0 ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </button>

      {/* Volume panel on hover (desktop only) */}
      {showPanel && (
        <div
          className="hidden sm:block absolute right-0 top-full mt-2 p-4 bg-white rounded-lg shadow-lg z-45 min-w-[200px]"
        >
          {/* Master Volume */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-rind-700 mb-1">
              Master Volume
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={masterVol}
              onChange={handleMasterVolumeChange}
              className="w-full accent-cheddar-500"
            />
          </div>

          {/* Music */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-rind-700">Music</label>
              <button
                onClick={handleMusicToggle}
                className={`w-10 h-5 rounded-full transition-colors ${
                  musicOn ? 'bg-cheddar-500' : 'bg-rind-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    musicOn ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={musicVol}
              onChange={handleMusicVolumeChange}
              disabled={!musicOn}
              className={`w-full accent-cheddar-500 ${!musicOn ? 'opacity-50' : ''}`}
            />
          </div>

          {/* SFX */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-rind-700">SFX</label>
              <button
                onClick={handleSfxToggle}
                className={`w-10 h-5 rounded-full transition-colors ${
                  sfxOn ? 'bg-cheddar-500' : 'bg-rind-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    sfxOn ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={sfxVol}
              onChange={handleSfxVolumeChange}
              disabled={!sfxOn}
              className={`w-full accent-cheddar-500 ${!sfxOn ? 'opacity-50' : ''}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
