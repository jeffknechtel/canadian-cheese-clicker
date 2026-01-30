// Web Audio API-based audio system for game sounds
// Supports background music, ambient sounds, SFX, achievement fanfares, and milestone chimes
// Enhanced with music state machine, province-specific ambient, and combat music transitions

import type { Province } from '../types/game';

let audioContext: AudioContext | null = null;

// Volume and mute settings
let masterVolume = 0.5;
let musicVolume = 0.5;
let sfxVolume = 0.7;
let musicEnabled = true;
let sfxEnabled = true;

// ===== Music State Machine =====

export type MusicState = 'idle' | 'combat' | 'boss' | 'victory' | 'defeat' | 'prestige';

let currentMusicState: MusicState = 'idle';
let currentProvince: Province | null = null;

// Background music state
let musicOscillators: OscillatorNode[] = [];
let musicGainNode: GainNode | null = null;
let isMusicPlaying = false;
let musicLoopInterval: number | null = null;

// Crossfade state
let isCrossfading = false;

// Ambient sound state
let ambientOscillators: OscillatorNode[] = [];
let ambientGainNode: GainNode | null = null;
let isAmbientPlaying = false;
let ambientInterval: number | null = null;
let currentAmbientProvince: Province | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Resume audio context (required after user interaction)
export function resumeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

// ===== Master Volume =====

export function setMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
  updateMusicGain();
  updateAmbientGain();
}

export function getMasterVolume(): number {
  return masterVolume;
}

// Legacy compatibility
export function setVolume(volume: number): void {
  setMasterVolume(volume);
}

export function getVolume(): number {
  return masterVolume;
}

// ===== Music Volume =====

export function setMusicVolume(volume: number): void {
  musicVolume = Math.max(0, Math.min(1, volume));
  updateMusicGain();
}

export function getMusicVolume(): number {
  return musicVolume;
}

// ===== SFX Volume =====

export function setSfxVolume(volume: number): void {
  sfxVolume = Math.max(0, Math.min(1, volume));
}

export function getSfxVolume(): number {
  return sfxVolume;
}

// ===== Mute Controls =====

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (enabled && !isMusicPlaying) {
    startBackgroundMusic();
  } else if (!enabled && isMusicPlaying) {
    stopBackgroundMusic();
  }
}

export function getMusicEnabled(): boolean {
  return musicEnabled;
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

export function getSfxEnabled(): boolean {
  return sfxEnabled;
}

// Legacy mute (affects all audio)
export function toggleMute(): boolean {
  const allMuted = !musicEnabled && !sfxEnabled;
  if (allMuted) {
    musicEnabled = true;
    sfxEnabled = true;
    if (!isMusicPlaying) startBackgroundMusic();
  } else {
    musicEnabled = false;
    sfxEnabled = false;
    if (isMusicPlaying) stopBackgroundMusic();
  }
  return !musicEnabled && !sfxEnabled;
}

export function setMuted(muted: boolean): void {
  musicEnabled = !muted;
  sfxEnabled = !muted;
  if (muted && isMusicPlaying) {
    stopBackgroundMusic();
  } else if (!muted && !isMusicPlaying) {
    startBackgroundMusic();
  }
}

export function getMuted(): boolean {
  return !musicEnabled && !sfxEnabled;
}

// ===== Helper Functions =====

function updateMusicGain(): void {
  if (musicGainNode) {
    const targetVolume = musicEnabled ? masterVolume * musicVolume * 0.15 : 0;
    musicGainNode.gain.setValueAtTime(targetVolume, getAudioContext().currentTime);
  }
}

function updateAmbientGain(): void {
  if (ambientGainNode) {
    const targetVolume = musicEnabled ? masterVolume * musicVolume * 0.05 : 0;
    ambientGainNode.gain.setValueAtTime(targetVolume, getAudioContext().currentTime);
  }
}

function getEffectiveSfxVolume(): number {
  return sfxEnabled ? masterVolume * sfxVolume : 0;
}

// ===== Music Theme Definitions =====

// Chord progressions for different music states
// Each theme has a distinct Canadian-inspired feel

interface MusicTheme {
  chords: number[][];
  tempo: number; // ms per chord
  baseOctave: number;
  waveform: OscillatorType;
  intensity: number; // 0-1, affects volume and layering
}

const MUSIC_THEMES: Record<MusicState, MusicTheme> = {
  // Main Theme: Warm folk-inspired melody - cozy cheese farm feel
  idle: {
    chords: [
      [261.63, 329.63, 392.00], // C major (C4, E4, G4)
      [293.66, 349.23, 440.00], // D minor (D4, F4, A4)
      [246.94, 311.13, 369.99], // B diminished / transition
      [261.63, 329.63, 392.00], // Back to C
      [220.00, 277.18, 329.63], // A minor
      [246.94, 311.13, 392.00], // G major
    ],
    tempo: 4000,
    baseOctave: 0.5, // One octave lower for warmth
    waveform: 'sine',
    intensity: 0.6,
  },

  // Combat Theme: Faster tempo, more tension - battle for the curds
  combat: {
    chords: [
      [220.00, 277.18, 329.63], // A minor - tension
      [246.94, 311.13, 369.99], // B diminished - urgency
      [261.63, 329.63, 392.00], // C major - hope
      [220.00, 261.63, 329.63], // A minor variant
    ],
    tempo: 2000, // Twice as fast
    baseOctave: 1.0,
    waveform: 'triangle',
    intensity: 0.8,
  },

  // Boss Theme: Epic, dramatic with building intensity
  boss: {
    chords: [
      [196.00, 246.94, 293.66], // G minor - ominous
      [174.61, 220.00, 261.63], // F minor - darkness
      [196.00, 233.08, 293.66], // G minor (different voicing)
      [220.00, 261.63, 329.63], // A minor - building
      [233.08, 293.66, 349.23], // Bb major - dramatic shift
      [220.00, 277.18, 329.63], // A minor - climax
    ],
    tempo: 2500,
    baseOctave: 1.0,
    waveform: 'sawtooth',
    intensity: 1.0,
  },

  // Victory Theme: Triumphant fanfare
  victory: {
    chords: [
      [261.63, 329.63, 392.00], // C major - triumph
      [329.63, 392.00, 493.88], // E minor to G
      [392.00, 493.88, 587.33], // G major high
      [523.25, 659.26, 783.99], // C major octave up
    ],
    tempo: 1500,
    baseOctave: 1.0,
    waveform: 'triangle',
    intensity: 0.9,
  },

  // Defeat Theme: Sad, descending - but still dignified
  defeat: {
    chords: [
      [220.00, 261.63, 329.63], // A minor
      [196.00, 246.94, 293.66], // G minor
      [174.61, 220.00, 261.63], // F minor
      [164.81, 196.00, 246.94], // E minor low
    ],
    tempo: 3500,
    baseOctave: 0.5,
    waveform: 'sine',
    intensity: 0.5,
  },

  // Prestige Theme: Ethereal, transformative - cheese aging magic
  prestige: {
    chords: [
      [261.63, 392.00, 523.25], // C sus4 feel
      [293.66, 440.00, 587.33], // D sus4 feel
      [329.63, 493.88, 659.26], // E sus4 feel
      [392.00, 587.33, 783.99], // G sus4 feel - ascending
      [523.25, 783.99, 1046.50], // C high - transcendence
    ],
    tempo: 5000,
    baseOctave: 1.0,
    waveform: 'sine',
    intensity: 0.7,
  },
};

// Province-specific theme variations (subtle pitch/tempo adjustments)
const PROVINCE_THEME_MODIFIERS: Partial<Record<Province, { pitchMod: number; tempoMod: number }>> = {
  ontario: { pitchMod: 1.0, tempoMod: 1.0 },
  quebec: { pitchMod: 1.05, tempoMod: 0.95 }, // Slightly higher, more relaxed - cafe feel
  alberta: { pitchMod: 0.95, tempoMod: 1.05 }, // Lower, slightly faster - country feel
  bc: { pitchMod: 1.02, tempoMod: 0.90 }, // Slightly higher, slower - pacific chill
  manitoba: { pitchMod: 0.98, tempoMod: 1.0 }, // Slightly lower - prairie feel
  saskatchewan: { pitchMod: 1.0, tempoMod: 0.92 }, // Same pitch, slower - endless fields
  nova_scotia: { pitchMod: 1.03, tempoMod: 0.88 }, // Higher, slower - maritime feel
  new_brunswick: { pitchMod: 1.0, tempoMod: 0.95 },
  pei: { pitchMod: 1.05, tempoMod: 0.90 }, // Higher, relaxed - island feel
  newfoundland: { pitchMod: 0.97, tempoMod: 0.85 }, // Lower, much slower - rugged
  yukon: { pitchMod: 0.92, tempoMod: 1.1 }, // Lower, faster - wild north
  nwt: { pitchMod: 0.90, tempoMod: 0.80 }, // Much lower, slow - vast tundra
  nunavut: { pitchMod: 0.88, tempoMod: 0.75 }, // Lowest, slowest - frozen crown
};


export function startBackgroundMusic(): void {
  if (!musicEnabled || isMusicPlaying) return;
  startThemedMusic(currentMusicState);
}

/**
 * Start playing music for a specific theme/state
 */
function startThemedMusic(state: MusicState): void {
  if (!musicEnabled) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    // Stop any existing music first
    if (isMusicPlaying) {
      stopBackgroundMusicInternal();
    }

    isMusicPlaying = true;
    currentMusicState = state;

    const theme = MUSIC_THEMES[state];
    const provinceMod = currentProvince ? PROVINCE_THEME_MODIFIERS[currentProvince] : undefined;
    const pitchMod = provinceMod?.pitchMod ?? 1.0;
    const tempoMod = provinceMod?.tempoMod ?? 1.0;
    const adjustedTempo = theme.tempo * tempoMod;

    // Create master gain for music
    musicGainNode = ctx.createGain();
    musicGainNode.connect(ctx.destination);
    const baseVolume = masterVolume * musicVolume * 0.15 * theme.intensity;
    musicGainNode.gain.setValueAtTime(baseVolume, ctx.currentTime);

    let chordIndex = 0;

    // Play a chord
    const playChord = () => {
      if (!isMusicPlaying || !musicGainNode) return;

      // Stop previous oscillators
      musicOscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Already stopped
        }
      });
      musicOscillators = [];

      const chord = theme.chords[chordIndex];
      const now = ctx.currentTime;
      const chordDuration = adjustedTempo / 1000;

      // Create oscillators for each note in the chord
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.connect(noteGain);
        noteGain.connect(musicGainNode!);

        const adjustedFreq = freq * theme.baseOctave * pitchMod;
        osc.frequency.setValueAtTime(adjustedFreq, now);
        osc.type = theme.waveform;

        // Soft attack and sustain
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.3, now + 0.3);
        noteGain.gain.setValueAtTime(0.3, now + chordDuration * 0.75);
        noteGain.gain.linearRampToValueAtTime(0, now + chordDuration);

        osc.start(now);
        osc.stop(now + chordDuration + 0.1);

        musicOscillators.push(osc);
      });

      // Add a subtle pad layer for fuller sound
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      padOsc.connect(padGain);
      padGain.connect(musicGainNode!);

      const padFreq = chord[0] * theme.baseOctave * pitchMod * 0.5; // One octave below root
      padOsc.frequency.setValueAtTime(padFreq, now);
      padOsc.type = 'triangle';

      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.2 * theme.intensity, now + 0.5);
      padGain.gain.setValueAtTime(0.2 * theme.intensity, now + chordDuration * 0.75);
      padGain.gain.linearRampToValueAtTime(0, now + chordDuration);

      padOsc.start(now);
      padOsc.stop(now + chordDuration + 0.1);

      musicOscillators.push(padOsc);

      // For boss theme, add extra dramatic layer
      if (state === 'boss') {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.connect(bassGain);
        bassGain.connect(musicGainNode!);

        bassOsc.frequency.setValueAtTime(chord[0] * 0.25 * pitchMod, now);
        bassOsc.type = 'sawtooth';

        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
        bassGain.gain.setValueAtTime(0.15, now + chordDuration * 0.6);
        bassGain.gain.linearRampToValueAtTime(0, now + chordDuration);

        bassOsc.start(now);
        bassOsc.stop(now + chordDuration + 0.1);

        musicOscillators.push(bassOsc);
      }

      chordIndex = (chordIndex + 1) % theme.chords.length;
    };

    // Start immediately
    playChord();

    // Loop at tempo
    musicLoopInterval = window.setInterval(playChord, adjustedTempo);
  } catch {
    isMusicPlaying = false;
  }
}

/**
 * Internal stop function that doesn't reset state
 */
function stopBackgroundMusicInternal(): void {
  if (musicLoopInterval) {
    clearInterval(musicLoopInterval);
    musicLoopInterval = null;
  }

  musicOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Already stopped
    }
  });
  musicOscillators = [];

  if (musicGainNode) {
    musicGainNode.disconnect();
    musicGainNode = null;
  }

  isMusicPlaying = false;
}

export function stopBackgroundMusic(): void {
  stopBackgroundMusicInternal();
  currentMusicState = 'idle';
}

// ===== Music State Management =====

/**
 * Get the current music state
 */
export function getMusicState(): MusicState {
  return currentMusicState;
}

/**
 * Set the music state directly (immediate transition)
 */
export function setMusicState(state: MusicState): void {
  if (state === currentMusicState && isMusicPlaying) return;

  if (!musicEnabled) {
    currentMusicState = state;
    return;
  }

  stopBackgroundMusicInternal();
  startThemedMusic(state);
}

/**
 * Crossfade to a new music state over a duration
 */
export function crossfadeTo(state: MusicState, durationMs: number = 1000): void {
  if (state === currentMusicState && isMusicPlaying) return;
  if (isCrossfading) return; // Don't interrupt ongoing crossfade

  if (!musicEnabled) {
    currentMusicState = state;
    return;
  }

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      setMusicState(state);
      return;
    }

    isCrossfading = true;
    const durationSec = durationMs / 1000;

    // Fade out current music
    if (musicGainNode && isMusicPlaying) {
      const now = ctx.currentTime;
      musicGainNode.gain.setValueAtTime(musicGainNode.gain.value, now);
      musicGainNode.gain.linearRampToValueAtTime(0, now + durationSec);

      // Schedule stop after fadeout
      setTimeout(() => {
        stopBackgroundMusicInternal();
        // Start new music
        startThemedMusic(state);
        isCrossfading = false;
      }, durationMs);
    } else {
      // No music playing, just start the new state
      startThemedMusic(state);
      isCrossfading = false;
    }
  } catch {
    // Fallback to immediate switch
    setMusicState(state);
    isCrossfading = false;
  }
}

/**
 * Set the current province for ambient sounds and music variation
 */
export function setCurrentProvince(province: Province | null): void {
  currentProvince = province;

  // If music is playing and we're in idle state, restart with province variation
  if (isMusicPlaying && currentMusicState === 'idle') {
    stopBackgroundMusicInternal();
    startThemedMusic('idle');
  }

  // Update ambient sounds for the new province
  if (isAmbientPlaying && province !== currentAmbientProvince) {
    stopAmbientSounds();
    startProvinceAmbient(province);
  }
}

/**
 * Get the current province
 */
export function getCurrentProvince(): Province | null {
  return currentProvince;
}

// ===== Ambient Sounds =====
// Province-specific ambient audio for immersive atmosphere

// Province ambient sound configurations
interface ProvinceAmbientConfig {
  baseFrequency: number;
  type: 'wind' | 'urban' | 'water' | 'forest' | 'arctic';
  chirpFreq?: number; // Optional bird/animal chirp frequency
  chirpInterval: [number, number]; // min-max seconds between chirps
  windIntensity: number; // 0-1
  additionalEffects?: string[];
}

const PROVINCE_AMBIENT_CONFIGS: Record<Province, ProvinceAmbientConfig> = {
  // Ontario: Urban hum, distant traffic - city near cheese caves
  ontario: {
    baseFrequency: 80,
    type: 'urban',
    chirpFreq: 1400,
    chirpInterval: [8, 15],
    windIntensity: 0.3,
    additionalEffects: ['traffic_hum'],
  },

  // Quebec: Accordion hints, cafe ambiance - charming fromagerie
  quebec: {
    baseFrequency: 120,
    type: 'urban',
    chirpFreq: 1600,
    chirpInterval: [6, 12],
    windIntensity: 0.2,
    additionalEffects: ['cafe_murmur'],
  },

  // Alberta: Wind, distant cattle - open prairie dairy
  alberta: {
    baseFrequency: 60,
    type: 'wind',
    chirpFreq: 800, // Lower - cow-like
    chirpInterval: [10, 25],
    windIntensity: 0.6,
    additionalEffects: ['prairie_wind'],
  },

  // BC: Rain, ocean waves - coastal caves
  bc: {
    baseFrequency: 100,
    type: 'water',
    chirpFreq: 1800,
    chirpInterval: [5, 10],
    windIntensity: 0.4,
    additionalEffects: ['rain', 'waves'],
  },

  // Manitoba: Ice and hockey - frozen rinks
  manitoba: {
    baseFrequency: 90,
    type: 'arctic',
    chirpFreq: 2000, // High - ice cracking
    chirpInterval: [12, 20],
    windIntensity: 0.5,
    additionalEffects: ['ice_creak'],
  },

  // Saskatchewan: Wind through endless wheat fields
  saskatchewan: {
    baseFrequency: 70,
    type: 'wind',
    chirpFreq: 1200,
    chirpInterval: [8, 18],
    windIntensity: 0.7,
    additionalEffects: ['wheat_rustle'],
  },

  // Nova Scotia: Seagulls, foghorns - maritime depths
  nova_scotia: {
    baseFrequency: 85,
    type: 'water',
    chirpFreq: 900, // Seagull-like
    chirpInterval: [4, 10],
    windIntensity: 0.5,
    additionalEffects: ['foghorn', 'seagulls'],
  },

  // New Brunswick: Forest sounds, lumber - covered bridges
  new_brunswick: {
    baseFrequency: 95,
    type: 'forest',
    chirpFreq: 1500,
    chirpInterval: [6, 14],
    windIntensity: 0.4,
    additionalEffects: ['wood_creak', 'owl'],
  },

  // PEI: Peaceful farmland - Anne's Island
  pei: {
    baseFrequency: 110,
    type: 'wind',
    chirpFreq: 1700,
    chirpInterval: [5, 12],
    windIntensity: 0.3,
    additionalEffects: ['farm_ambience'],
  },

  // Newfoundland: Viking shores, icebergs
  newfoundland: {
    baseFrequency: 75,
    type: 'water',
    chirpFreq: 600, // Low - deep sea sounds
    chirpInterval: [10, 20],
    windIntensity: 0.6,
    additionalEffects: ['ice_crack', 'wind'],
  },

  // Yukon: Arctic wind, gold rush ghosts
  yukon: {
    baseFrequency: 55,
    type: 'arctic',
    chirpFreq: 500, // Very low - howling
    chirpInterval: [15, 30],
    windIntensity: 0.8,
    additionalEffects: ['arctic_wind', 'wolves'],
  },

  // NWT: Aurora crackles, vast tundra
  nwt: {
    baseFrequency: 50,
    type: 'arctic',
    chirpFreq: 2500, // High sparkle - aurora
    chirpInterval: [8, 16],
    windIntensity: 0.7,
    additionalEffects: ['aurora_crackle'],
  },

  // Nunavut: The Frozen Crown - most extreme arctic
  nunavut: {
    baseFrequency: 45,
    type: 'arctic',
    chirpFreq: 3000, // Very high - ice crystals
    chirpInterval: [20, 40],
    windIntensity: 0.9,
    additionalEffects: ['blizzard', 'aurora_crackle'],
  },
};

// Default ambient config for when no province is set
const DEFAULT_AMBIENT_CONFIG: ProvinceAmbientConfig = {
  baseFrequency: 100,
  type: 'wind',
  chirpFreq: 1400,
  chirpInterval: [5, 15],
  windIntensity: 0.4,
};

/**
 * Start generic ambient sounds (legacy function)
 */
export function startAmbientSounds(): void {
  if (!musicEnabled || isAmbientPlaying) return;
  startProvinceAmbient(currentProvince);
}

/**
 * Start province-specific ambient sounds
 */
export function startProvinceAmbient(province: Province | null): void {
  if (!musicEnabled || isAmbientPlaying) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    isAmbientPlaying = true;
    currentAmbientProvince = province;

    const config = province ? PROVINCE_AMBIENT_CONFIGS[province] : DEFAULT_AMBIENT_CONFIG;

    // Create master gain for ambient
    ambientGainNode = ctx.createGain();
    ambientGainNode.connect(ctx.destination);
    ambientGainNode.gain.setValueAtTime(masterVolume * musicVolume * 0.05, ctx.currentTime);

    // Play province-specific chirp/effect sounds
    const playChirp = () => {
      if (!isAmbientPlaying || !ambientGainNode || !config.chirpFreq) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ambientGainNode!);

      // Frequency varies based on province ambient type
      const baseFreq = config.chirpFreq + (Math.random() - 0.5) * config.chirpFreq * 0.3;

      switch (config.type) {
        case 'water':
          // Wave-like swoosh
          osc.frequency.setValueAtTime(baseFreq * 0.5, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.15);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + 0.4);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.55);
          break;

        case 'arctic':
          // Ice crackle / aurora sparkle
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.02);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.08);
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        case 'forest':
          // Bird/owl-like chirp
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.05);
          osc.frequency.setValueAtTime(baseFreq * 0.9, now + 0.1);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.2);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'urban':
          // Distant traffic hum or cafe murmur
          osc.frequency.setValueAtTime(baseFreq * 0.3, now);
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.03, now + 0.2);
          gain.gain.setValueAtTime(0.03, now + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc.start(now);
          osc.stop(now + 0.85);
          break;

        case 'wind':
        default:
          // Standard bird-like chirp
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.1);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
      }
    };

    // Add continuous wind/atmosphere layer based on intensity
    if (config.windIntensity > 0) {
      playWindLayer(config.windIntensity, config.type);
    }

    // Random chirps at province-specific intervals
    const scheduleChirp = () => {
      if (!isAmbientPlaying) return;
      const [minDelay, maxDelay] = config.chirpInterval;
      const delay = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;
      ambientInterval = window.setTimeout(() => {
        playChirp();
        scheduleChirp();
      }, delay);
    };

    scheduleChirp();
  } catch {
    isAmbientPlaying = false;
  }
}

/**
 * Play a continuous wind/atmosphere layer
 */
function playWindLayer(intensity: number, type: ProvinceAmbientConfig['type']): void {
  if (!ambientGainNode) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create white noise for wind effect
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter the noise based on ambient type
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    switch (type) {
      case 'arctic':
        filter.frequency.setValueAtTime(800, now);
        break;
      case 'water':
        filter.frequency.setValueAtTime(400, now);
        break;
      case 'urban':
        filter.frequency.setValueAtTime(200, now);
        break;
      default:
        filter.frequency.setValueAtTime(500, now);
    }

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(intensity * 0.05 * masterVolume * musicVolume, now);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(ambientGainNode);

    noise.start(now);

    // Store reference to stop later
    ambientOscillators.push(noise as unknown as OscillatorNode);
  } catch {
    // Wind layer failed, continue without it
  }
}

export function stopAmbientSounds(): void {
  isAmbientPlaying = false;
  currentAmbientProvince = null;

  if (ambientInterval) {
    clearTimeout(ambientInterval);
    ambientInterval = null;
  }

  ambientOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Already stopped
    }
  });
  ambientOscillators = [];

  if (ambientGainNode) {
    ambientGainNode.disconnect();
    ambientGainNode = null;
  }
}

// ===== Sound Effects =====

// Generate a simple click sound using oscillators
export function playClickSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;

    // Create oscillator for a satisfying "pop" sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Higher frequency for a brighter click
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    oscillator.type = 'sine';

    // Quick attack and decay envelope
    const gain = volume * 0.3;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch {
    // Silently fail if audio not available
  }
}

// Play a "success" sound for purchases
export function playPurchaseSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;

    // Create two oscillators for a richer sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Two-note "success" jingle
    osc1.frequency.setValueAtTime(523, now); // C5
    osc1.frequency.setValueAtTime(659, now + 0.08); // E5
    osc1.type = 'sine';

    osc2.frequency.setValueAtTime(392, now); // G4
    osc2.frequency.setValueAtTime(523, now + 0.08); // C5
    osc2.type = 'sine';

    const gain = volume * 0.2;
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  } catch {
    // Silently fail if audio not available
  }
}

// Achievement fanfare - triumphant chord progression
export function playAchievementFanfare(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Triumphant C-E-G-C arpeggio
    const notes = [
      { freq: 261.63, time: 0 }, // C4
      { freq: 329.63, time: 0.1 }, // E4
      { freq: 392.00, time: 0.2 }, // G4
      { freq: 523.25, time: 0.3 }, // C5
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'triangle';

      const gain = volume * 0.25;
      noteGain.gain.setValueAtTime(0, now + time);
      noteGain.gain.linearRampToValueAtTime(gain, now + time + 0.02);
      noteGain.gain.setValueAtTime(gain, now + time + 0.15);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.5);

      osc.start(now + time);
      osc.stop(now + time + 0.6);
    });

    // Add a final sustained chord
    const chordNotes = [261.63, 329.63, 392.00, 523.25];
    chordNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + 0.4);
      osc.type = 'sine';

      const gain = volume * 0.15;
      noteGain.gain.setValueAtTime(0, now + 0.4);
      noteGain.gain.linearRampToValueAtTime(gain, now + 0.5);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.start(now + 0.4);
      osc.stop(now + 1.3);
    });
  } catch {
    // Silently fail if audio not available
  }
}

// Milestone chime - celebratory ascending tones
export function playMilestoneChime(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Quick ascending chime: G-B-D
    const notes = [
      { freq: 392.00, time: 0 }, // G4
      { freq: 493.88, time: 0.08 }, // B4
      { freq: 587.33, time: 0.16 }, // D5
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'sine';

      const gain = volume * 0.2;
      noteGain.gain.setValueAtTime(0, now + time);
      noteGain.gain.linearRampToValueAtTime(gain, now + time + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.3);

      osc.start(now + time);
      osc.stop(now + time + 0.35);
    });
  } catch {
    // Silently fail if audio not available
  }
}

// ===== Audio Preferences =====

export interface AudioPreferences {
  masterVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  // Extended preferences for Phase 8.4
  lastMusicState?: MusicState;
  lastProvince?: Province | null;
}

export function getAudioPreferences(): AudioPreferences {
  return {
    masterVolume,
    musicEnabled,
    sfxEnabled,
    musicVolume,
    sfxVolume,
    lastMusicState: currentMusicState,
    lastProvince: currentProvince,
  };
}

export function setAudioPreferences(prefs: AudioPreferences): void {
  masterVolume = prefs.masterVolume;
  musicEnabled = prefs.musicEnabled;
  sfxEnabled = prefs.sfxEnabled;
  musicVolume = prefs.musicVolume;
  sfxVolume = prefs.sfxVolume;

  // Restore province if provided
  if (prefs.lastProvince !== undefined) {
    currentProvince = prefs.lastProvince;
  }

  // Apply changes
  updateMusicGain();
  updateAmbientGain();

  if (musicEnabled && !isMusicPlaying) {
    // Restore to last state or idle
    const targetState = prefs.lastMusicState || 'idle';
    startThemedMusic(targetState);
  } else if (!musicEnabled && isMusicPlaying) {
    stopBackgroundMusic();
  }
}

// ===== Combat Sound Effects =====

// Play attack sound - quick percussive hit
export function playAttackSound(type: 'physical' | 'magic' | 'critical' = 'physical'): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    if (type === 'physical') {
      // Quick "thwack" sound
      const osc = ctx.createOscillator();
      osc.connect(gainNode);
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
      osc.type = 'triangle';

      gainNode.gain.setValueAtTime(volume * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);

      // Add a noise burst for impact
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(volume * 0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.start(now);
    } else if (type === 'magic') {
      // Sparkly magic sound
      const frequencies = [800, 1000, 1200, 1400];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.connect(noteGain);
        noteGain.connect(gainNode);

        osc.frequency.setValueAtTime(freq, now + i * 0.03);
        osc.type = 'sine';

        noteGain.gain.setValueAtTime(0, now + i * 0.03);
        noteGain.gain.linearRampToValueAtTime(volume * 0.1, now + i * 0.03 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.2);

        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.25);
      });
    } else if (type === 'critical') {
      // Powerful crit sound - two-tone impact
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      osc1.type = 'sawtooth';

      osc2.frequency.setValueAtTime(400, now);
      osc2.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      osc2.type = 'triangle';

      gainNode.gain.setValueAtTime(volume * 0.35, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.25);
    }
  } catch {
    // Silently fail
  }
}

// Play ability activation sound
export function playAbilitySound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Rising whoosh with sparkle
    const osc1 = ctx.createOscillator();
    osc1.connect(gainNode);
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    osc1.type = 'sine';

    const osc2 = ctx.createOscillator();
    osc2.connect(gainNode);
    osc2.frequency.setValueAtTime(600, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    osc2.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.2, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.4);
  } catch {
    // Silently fail
  }
}

// Play limit break activation sound - epic rising power
export function playLimitBreakSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Building power chord progression
    const notes = [
      { freq: 130.81, time: 0 },    // C3
      { freq: 164.81, time: 0.1 },  // E3
      { freq: 196.00, time: 0.2 },  // G3
      { freq: 261.63, time: 0.3 },  // C4
      { freq: 329.63, time: 0.4 },  // E4
      { freq: 392.00, time: 0.5 },  // G4
      { freq: 523.25, time: 0.6 },  // C5
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'sawtooth';

      noteGain.gain.setValueAtTime(0, now + time);
      noteGain.gain.linearRampToValueAtTime(volume * 0.15, now + time + 0.05);
      noteGain.gain.setValueAtTime(volume * 0.15, now + time + 0.15);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.8);

      osc.start(now + time);
      osc.stop(now + time + 0.9);
    });

    // Add final chord burst
    const finalChord = [261.63, 329.63, 392.00, 523.25];
    finalChord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + 0.7);
      osc.type = 'triangle';

      noteGain.gain.setValueAtTime(0, now + 0.7);
      noteGain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.75);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.start(now + 0.7);
      osc.stop(now + 1.6);
    });
  } catch {
    // Silently fail
  }
}

// Play enemy defeat sound
export function playEnemyDefeatSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Descending tone with crunch
    const osc = ctx.createOscillator();
    osc.connect(gainNode);
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    osc.type = 'square';

    gainNode.gain.setValueAtTime(volume * 0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Silently fail
  }
}

// Play victory fanfare - triumphant Canadian jingle
export function playVictoryFanfare(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Triumphant melody: C-E-G-C (octave higher)
    const melody = [
      { freq: 261.63, time: 0, duration: 0.15 },     // C4
      { freq: 329.63, time: 0.15, duration: 0.15 },  // E4
      { freq: 392.00, time: 0.30, duration: 0.15 },  // G4
      { freq: 523.25, time: 0.45, duration: 0.4 },   // C5 (held)
    ];

    melody.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'triangle';

      noteGain.gain.setValueAtTime(0, now + time);
      noteGain.gain.linearRampToValueAtTime(volume * 0.25, now + time + 0.02);
      noteGain.gain.setValueAtTime(volume * 0.25, now + time + duration * 0.8);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + duration + 0.1);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.2);
    });

    // Final chord
    const chord = [261.63, 329.63, 392.00, 523.25];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + 0.55);
      osc.type = 'sine';

      noteGain.gain.setValueAtTime(0, now + 0.55);
      noteGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.6);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.start(now + 0.55);
      osc.stop(now + 1.6);
    });
  } catch {
    // Silently fail
  }
}

// Play defeat jingle - sad descending tones
export function playDefeatJingle(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Sad descending melody: G-E-C-G (low)
    const melody = [
      { freq: 392.00, time: 0, duration: 0.25 },     // G4
      { freq: 329.63, time: 0.25, duration: 0.25 },  // E4
      { freq: 261.63, time: 0.50, duration: 0.25 },  // C4
      { freq: 196.00, time: 0.75, duration: 0.5 },   // G3 (held)
    ];

    melody.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'sine';

      noteGain.gain.setValueAtTime(0, now + time);
      noteGain.gain.linearRampToValueAtTime(volume * 0.2, now + time + 0.03);
      noteGain.gain.setValueAtTime(volume * 0.2, now + time + duration * 0.7);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + duration + 0.2);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.3);
    });
  } catch {
    // Silently fail
  }
}

// Play heal sound - gentle ascending chime
export function playHealSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Gentle ascending sparkle
    const notes = [523.25, 659.26, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      osc.type = 'sine';

      noteGain.gain.setValueAtTime(0, now + i * 0.08);
      noteGain.gain.linearRampToValueAtTime(volume * 0.15, now + i * 0.08 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch {
    // Silently fail
  }
}

// Play buff applied sound
export function playBuffSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Quick rising tone
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    osc.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Silently fail
  }
}

// Play debuff applied sound
export function playDebuffSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Quick descending tone
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    osc.type = 'square';

    gainNode.gain.setValueAtTime(volume * 0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Silently fail
  }
}

// ===== Prestige Sound Effects =====

// Play prestige/aging sound - epic "cheese aging" whoosh with satisfying crack
export function playPrestigeSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Rising whoosh (cheese wheel being placed in cave)
    const whoosh = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whoosh.connect(whooshGain);
    whooshGain.connect(gainNode);

    whoosh.frequency.setValueAtTime(100, now);
    whoosh.frequency.exponentialRampToValueAtTime(400, now + 0.4);
    whoosh.frequency.exponentialRampToValueAtTime(200, now + 0.6);
    whoosh.type = 'sine';

    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.2);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    whoosh.start(now);
    whoosh.stop(now + 0.7);

    // Satisfying "crack" sound (aged cheese breaking open)
    const crack = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crack.connect(crackGain);
    crackGain.connect(gainNode);

    crack.frequency.setValueAtTime(800, now + 0.3);
    crack.frequency.exponentialRampToValueAtTime(200, now + 0.45);
    crack.type = 'sawtooth';

    crackGain.gain.setValueAtTime(0, now + 0.3);
    crackGain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.32);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    crack.start(now + 0.3);
    crack.stop(now + 0.5);

    // Triumphant chord (reward feeling)
    const chord = [261.63, 329.63, 392.00, 523.25]; // C major
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + 0.5 + i * 0.05);
      osc.type = 'triangle';

      noteGain.gain.setValueAtTime(0, now + 0.5 + i * 0.05);
      noteGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.55 + i * 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.start(now + 0.5 + i * 0.05);
      osc.stop(now + 1.6);
    });
  } catch {
    // Silently fail
  }
}

// Play Rennet gain sound - golden shimmer effect
export function playRennetGainSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Sparkly ascending notes (like coins)
    const notes = [523.25, 659.26, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      osc.type = 'sine';

      noteGain.gain.setValueAtTime(0, now + i * 0.06);
      noteGain.gain.linearRampToValueAtTime(volume * 0.12, now + i * 0.06 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.3);
    });
  } catch {
    // Silently fail
  }
}

// Play aging upgrade purchase sound - satisfying "unlock" feel
export function playAgingUpgradeSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Quick ascending whoosh
    const osc1 = ctx.createOscillator();
    osc1.connect(gainNode);
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    osc1.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.start(now);
    osc1.stop(now + 0.15);

    // Confirming "ding"
    const osc2 = ctx.createOscillator();
    const ding = ctx.createGain();
    osc2.connect(ding);
    ding.connect(ctx.destination);

    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    osc2.type = 'sine';

    ding.gain.setValueAtTime(0, now + 0.08);
    ding.gain.linearRampToValueAtTime(volume * 0.18, now + 0.1);
    ding.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);
  } catch {
    // Silently fail
  }
}

// Play prestige tier unlock fanfare - epic moment for Vintage/Legacy unlock
export function playPrestigeTierUnlockSound(): void {
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Epic ascending arpeggio
    const notes = [
      { freq: 196.00, time: 0 },     // G3
      { freq: 246.94, time: 0.12 },  // B3
      { freq: 293.66, time: 0.24 },  // D4
      { freq: 392.00, time: 0.36 },  // G4
      { freq: 493.88, time: 0.48 },  // B4
      { freq: 587.33, time: 0.60 },  // D5
      { freq: 783.99, time: 0.72 },  // G5
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'triangle';

      noteGain.gain.setValueAtTime(0, now + time);
      noteGain.gain.linearRampToValueAtTime(volume * 0.15, now + time + 0.03);
      noteGain.gain.setValueAtTime(volume * 0.15, now + time + 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.5);

      osc.start(now + time);
      osc.stop(now + time + 0.6);
    });

    // Final power chord
    const chord = [392.00, 493.88, 587.33, 783.99]; // G major
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.frequency.setValueAtTime(freq, now + 0.85);
      osc.type = 'sawtooth';

      noteGain.gain.setValueAtTime(0, now + 0.85);
      noteGain.gain.linearRampToValueAtTime(volume * 0.12, now + 0.9);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.start(now + 0.85);
      osc.stop(now + 2.1);
    });
  } catch {
    // Silently fail
  }
}

// ===== Combat Audio Integration =====

/**
 * Start combat music - transitions to appropriate combat theme
 * @param isBoss Whether this is a boss fight
 */
export function startCombatMusic(isBoss: boolean = false): void {
  const targetState: MusicState = isBoss ? 'boss' : 'combat';
  crossfadeTo(targetState, 500); // Quick 500ms crossfade into combat
}

/**
 * End combat music - transitions to victory or defeat theme
 * @param victory Whether the battle was won
 */
export function endCombatMusic(victory: boolean): void {
  const targetState: MusicState = victory ? 'victory' : 'defeat';
  crossfadeTo(targetState, 300); // Quick transition for impact

  // After victory/defeat plays for a bit, return to idle
  setTimeout(() => {
    if (currentMusicState === targetState) {
      crossfadeTo('idle', 2000); // Gentle return to idle
    }
  }, 3000); // Let victory/defeat theme play for 3 seconds
}

/**
 * Trigger boss phase transition audio cue
 * This enhances the music intensity when boss enters new phase
 */
export function triggerBossPhaseTransition(newPhase: number): void {
  // Play a dramatic transition sound effect
  const volume = getEffectiveSfxVolume();
  if (volume === 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Dramatic power surge based on phase number
    const baseFreq = 100 * newPhase;

    // Low rumble
    const rumble = ctx.createOscillator();
    rumble.connect(gainNode);
    rumble.frequency.setValueAtTime(50, now);
    rumble.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.3);
    rumble.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.2, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    rumble.start(now);
    rumble.stop(now + 0.55);

    // High accent
    const accent = ctx.createOscillator();
    const accentGain = ctx.createGain();
    accent.connect(accentGain);
    accentGain.connect(ctx.destination);

    accent.frequency.setValueAtTime(baseFreq * 4, now + 0.2);
    accent.frequency.exponentialRampToValueAtTime(baseFreq * 8, now + 0.35);
    accent.type = 'triangle';

    accentGain.gain.setValueAtTime(0, now + 0.2);
    accentGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.25);
    accentGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    accent.start(now + 0.2);
    accent.stop(now + 0.55);
  } catch {
    // Silently fail
  }
}

/**
 * Start prestige music - ethereal transformative theme
 */
export function startPrestigeMusic(): void {
  crossfadeTo('prestige', 1000);
}

/**
 * Return to idle music from any state
 */
export function returnToIdleMusic(): void {
  crossfadeTo('idle', 1500);
}

/**
 * Adjust combat music intensity based on battle progress
 * Called during combat to dynamically adjust tension
 * @param intensity 0-1 value representing battle intensity (enemy HP ratio, danger level)
 */
export function setCombatIntensity(intensity: number): void {
  // Only affect combat/boss states
  if (currentMusicState !== 'combat' && currentMusicState !== 'boss') return;
  if (!musicGainNode) return;

  try {
    const ctx = getAudioContext();
    const theme = MUSIC_THEMES[currentMusicState];
    const baseVolume = masterVolume * musicVolume * 0.15 * theme.intensity;

    // Intensity modifies volume slightly (0.8 to 1.2 range)
    const intensityMod = 0.8 + intensity * 0.4;
    const targetVolume = baseVolume * intensityMod;

    musicGainNode.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.5);
  } catch {
    // Silently fail
  }
}
