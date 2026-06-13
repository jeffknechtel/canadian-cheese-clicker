import Decimal from 'decimal.js';
import type { GameState, HeroState, PartyFormation, PrestigeState, ZoneProgress, CraftingState, GoldenCheeseState, SynergyState, ChallengeState, FeatureId, HintId } from '../types/game';
import { MAX_OFFLINE_SECONDS } from '../data/constants';
import { CURRENT_VERSION, runMigrations } from './migrations';
import type { AudioPreferences } from './audioSystem';
import {
  getAudioPreferences,
  setAudioPreferences,
} from './audioSystem';
import { showSaveToast } from './saveToast';

const SAVE_KEY = 'canadian_cheese_quest_save';
const AUDIO_PREFS_KEY = 'canadian_cheese_quest_audio';

interface SaveData {
  version: number;
  state: SerializedGameState;
}

// Decimal.js values need serialization to strings
interface SerializedGameState {
  curds: string;
  whey: string;
  totalCurdsEarned: string;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: string[];
  achievements: string[];
  ehCount: number;
  lastMilestone: number;
  lastSaved: number;
  gameStarted: number;
  // Hero system
  heroes?: Record<string, HeroState>;
  party?: PartyFormation;
  equipmentInventory?: string[];
  // Combat system
  zoneProgress?: Record<string, ZoneProgress>;
  // Prestige system
  prestige?: PrestigeState;
  // Crafting system
  crafting?: CraftingState;
  // Event system
  activeEvents?: string[];
  // Golden cheese system
  goldenCheese?: GoldenCheeseState;
  // Synergy system
  synergy?: SynergyState;
  // Challenge system
  challenge?: ChallengeState;
  // Progressive unlock system
  unlockedFeatures?: FeatureId[];
  shownHints?: HintId[];
}

function serializeState(state: GameState): SerializedGameState {
  return {
    curds: state.curds.toString(),
    whey: state.whey.toString(),
    totalCurdsEarned: state.totalCurdsEarned.toString(),
    totalClicks: state.totalClicks,
    generators: state.generators,
    upgrades: state.upgrades,
    achievements: state.achievements,
    ehCount: state.ehCount,
    lastMilestone: state.lastMilestone,
    lastSaved: state.lastSaved,
    gameStarted: state.gameStarted,
    // Hero system (no Decimal values, so straightforward)
    heroes: state.heroes,
    party: state.party,
    equipmentInventory: state.equipmentInventory,
    // Combat system - only persist zone progress, not active combat state
    zoneProgress: state.zoneProgress,
    // Prestige system
    prestige: state.prestige,
    // Crafting system
    crafting: state.crafting,
    // Event system
    activeEvents: state.activeEvents,
    // Golden cheese system
    goldenCheese: state.goldenCheese,
    // Synergy system
    synergy: state.synergy,
    // Challenge system
    challenge: state.challenge,
    // Progressive unlock system
    unlockedFeatures: Array.from(state.unlockedFeatures),
    shownHints: Array.from(state.shownHints),
  };
}

function deserializeState(serialized: SerializedGameState): GameState {
  const generators = serialized.generators;
  const upgrades = serialized.upgrades;
  const achievements = serialized.achievements ?? []; // Handle migration from v1
  const ehCount = serialized.ehCount ?? 0; // Handle migration from v2
  const lastMilestone = serialized.lastMilestone ?? 0; // Handle migration from v2

  // Handle migration from v3 (add hero system defaults)
  const heroes = serialized.heroes ?? {};
  const party: PartyFormation = serialized.party ?? {
    frontLeft: null,
    frontRight: null,
    backLeft: null,
    backRight: null,
  };
  const equipmentInventory = serialized.equipmentInventory ?? [];

  // Handle migration from v5 (add crafting system defaults)
  const crafting: CraftingState = serialized.crafting ?? {
    unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
    unlockedRecipes: ['cottage_cheese', 'ricotta', 'cream_cheese'],
    unlockedCaves: ['basic_cellar'],
    activeJobs: [],
    cheeseInventory: [],
    cheeseCollection: {},
    activeBuffs: [],
  };

  // Handle migration from v4 (add prestige system defaults)
  const prestige: PrestigeState = serialized.prestige ?? {
    rennet: 0,
    totalRennet: 0,
    agingResetCount: 0,
    agingUpgrades: [],
    vintageWheels: 0,
    totalVintageWheels: 0,
    vintageResetCount: 0,
    vintageUnlocks: [],
    legacy: 0,
    legacyBonuses: {
      ontario: 0,
      quebec: 0,
      alberta: 0,
      manitoba: 0,
      saskatchewan: 0,
      yukon: 0,
      bc: 0,
      nova_scotia: 0,
      new_brunswick: 0,
      pei: 0,
      newfoundland: 0,
      nwt: 0,
      nunavut: 0,
    },
    legacyResetCount: 0,
  };

  // CPS and click values are placeholders here - they will be recalculated
  // after state is loaded via store.recalculateCps() and store.recalculateClickValue()
  // This fixes the bug where Eh multiplier was omitted from the load-path CPS calculation
  const curdPerSecond = new Decimal(0);
  const curdPerClick = new Decimal(1);

  return {
    curds: new Decimal(serialized.curds),
    whey: new Decimal(serialized.whey),
    totalCurdsEarned: new Decimal(serialized.totalCurdsEarned),
    totalClicks: serialized.totalClicks,
    curdPerClick,
    curdPerSecond,
    generators,
    upgrades,
    achievements,
    ehCount,
    lastMilestone,
    lastSaved: serialized.lastSaved,
    gameStarted: serialized.gameStarted,
    // Hero system
    heroes,
    party,
    equipmentInventory,
    // Combat system - reset combat state on load (don't persist mid-combat state)
    combat: {
      isInCombat: false,
      currentZone: null,
      currentStage: 0,
      enemies: [],
      heroStates: {},
      combatLog: [],
      combatSpeed: 1,
      limitBreakGauge: 0,
      battleResult: null,
      feedback: {
        damageNumbers: [],
        comboCount: 0,
        maxCombo: 0,
        isFlashing: false,
        flashColor: null,
        shakeIntensity: null,
      },
    },
    // Restore zone progress from save or start fresh
    zoneProgress: serialized.zoneProgress || {},
    // Prestige system - already deserialized above with v4 migration handling
    prestige,
    // Crafting system - already deserialized above with v5 migration handling
    crafting,
    // Event system - v7 migration with empty default
    activeEvents: serialized.activeEvents ?? [],
    // Golden cheese system - default for migration from older saves
    goldenCheese: serialized.goldenCheese ?? {
      nextSpawnAt: 0,
      isVisible: false,
      expiresAt: 0,
      currentReward: null,
      totalCollected: 0,
    },
    // Synergy system - default for migration from older saves
    synergy: serialized.synergy ?? {
      purchased: [],
      zoneGeneratorBonuses: {},
    },
    // Challenge system - default for migration from older saves
    challenge: serialized.challenge ?? {
      activeChallengeId: null,
      weekStartTimestamp: 0,
      progress: 0,
      completed: false,
      claimed: false,
    },
    // Progressive unlock system - for existing saves, unlock all features to preserve experience
    unlockedFeatures: serialized.unlockedFeatures
      ? new Set(serialized.unlockedFeatures)
      : new Set(['upgrades', 'combat', 'heroes', 'crafting', 'prestige', 'achievements'] as FeatureId[]),
    shownHints: new Set(serialized.shownHints ?? []),
  };
}

export function saveGame(state: GameState): boolean {
  try {
    const data: SaveData = {
      version: CURRENT_VERSION,
      state: serializeState({
        ...state,
        lastSaved: Date.now(),
      }),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);

    // Check for future versions - refuse to load to prevent data corruption
    if (data.version > CURRENT_VERSION) {
      // Backup the rejected save
      localStorage.setItem(`${SAVE_KEY}_backup_v${data.version}`, raw);
      showSaveToast(
        'error',
        `Save from newer version (v${data.version}) cannot be loaded. A backup was created. Starting fresh game.`
      );
      console.error(
        `Save version ${data.version} is from a newer game version. ` +
        `Current version is ${CURRENT_VERSION}. Cannot load - this would risk data corruption.`
      );
      return null;
    }

    // Run migrations if version is outdated
    if (data.version < CURRENT_VERSION) {
      console.log(`Migrating save from v${data.version} to v${CURRENT_VERSION}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const migratedState = runMigrations(data.state as any, data.version);
      return deserializeState(migratedState as SerializedGameState);
    }

    return deserializeState(data.state);
  } catch (error) {
    // Backup the corrupted save
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      localStorage.setItem(`${SAVE_KEY}_backup_corrupted_${Date.now()}`, raw);
      showSaveToast('error', 'Save data was corrupted. A backup was created. Starting fresh game.');
    }
    console.error('Failed to load game, starting fresh:', error);
    return null;
  }
}

export interface OfflineProgress {
  curdsEarned: Decimal;
  secondsAway: number;
}

export function calculateOfflineProgress(
  curdPerSecond: Decimal,
  lastSaved: number,
  offlineProgressCapHours?: number
): OfflineProgress {
  const now = Date.now();
  const elapsedMs = now - lastSaved;
  const capSeconds = offlineProgressCapHours !== undefined
    ? offlineProgressCapHours * 60 * 60
    : MAX_OFFLINE_SECONDS;
  const elapsedSeconds = Math.min(elapsedMs / 1000, capSeconds);

  // Only award offline progress if away for more than 1 minute
  if (elapsedSeconds < 60) {
    return { curdsEarned: new Decimal(0), secondsAway: 0 };
  }

  const curdsEarned = curdPerSecond.mul(elapsedSeconds);
  return { curdsEarned, secondsAway: elapsedSeconds };
}

export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}

export function hasSavedGame(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// ===== Audio Preferences Persistence =====

export function saveAudioPreferences(): void {
  try {
    const prefs = getAudioPreferences();
    localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save audio preferences:', error);
  }
}

export function loadAudioPreferences(): void {
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return;

    const prefs: AudioPreferences = JSON.parse(raw);
    setAudioPreferences(prefs);
  } catch (error) {
    console.error('Failed to load audio preferences:', error);
  }
}

export function hasAudioPreferences(): boolean {
  return localStorage.getItem(AUDIO_PREFS_KEY) !== null;
}
