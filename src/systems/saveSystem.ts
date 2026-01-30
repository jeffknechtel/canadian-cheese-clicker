import Decimal from 'decimal.js';
import type { GameState, HeroState, PartyFormation, PrestigeState, ZoneProgress, CraftingState } from '../types/game';
import {
  calculateCps,
  calculateClickMultiplier,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateAchievementClickMultiplier,
  calculateHeroCpsBonus,
  calculateFormationBonus,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeClickMultiplier,
} from './productionEngine';
import type { AudioPreferences } from './audioSystem';
import {
  getAudioPreferences,
  setAudioPreferences,
} from './audioSystem';

const SAVE_KEY = 'canadian_cheese_quest_save';
const AUDIO_PREFS_KEY = 'canadian_cheese_quest_audio';
const SAVE_VERSION = 7; // Bumped for event system

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

  // Recalculate derived values from saved state (including hero and prestige bonuses)
  const generatorMultipliers = calculateGeneratorMultipliers(upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(achievements);
  const heroBonus = calculateHeroCpsBonus(heroes, party);
  const formationBonus = calculateFormationBonus(party, heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
  const totalGlobalMultiplier =
    upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
  const curdPerSecond = calculateCps(generators, generatorMultipliers, totalGlobalMultiplier);

  const upgradeClickMultiplier = calculateClickMultiplier(upgrades);
  const achievementClickMultiplier = calculateAchievementClickMultiplier(achievements);
  const prestigeClickMultiplier = calculatePrestigeClickMultiplier(prestige);
  const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
  const curdPerClick = new Decimal(1).mul(totalClickMultiplier);

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
    },
    // Restore zone progress from save or start fresh
    zoneProgress: serialized.zoneProgress || {},
    // Prestige system - already deserialized above with v4 migration handling
    prestige,
    // Crafting system - already deserialized above with v5 migration handling
    crafting,
    // Event system - v7 migration with empty default
    activeEvents: serialized.activeEvents ?? [],
  };
}

export function saveGame(state: GameState): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      state: serializeState({
        ...state,
        lastSaved: Date.now(),
      }),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save game:', error);
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);

    // Handle version migrations here in the future
    if (data.version !== SAVE_VERSION) {
      console.warn(`Save version mismatch: ${data.version} vs ${SAVE_VERSION}`);
      // For now, try to load anyway - add migrations later if needed
    }

    return deserializeState(data.state);
  } catch (error) {
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
  lastSaved: number
): OfflineProgress {
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60; // 8 hours max
  const now = Date.now();
  const elapsedMs = now - lastSaved;
  const elapsedSeconds = Math.min(elapsedMs / 1000, MAX_OFFLINE_SECONDS);

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
