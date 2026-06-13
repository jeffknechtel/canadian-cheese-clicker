import { useGameStore } from '../stores';
import {
  GAME_TICK_INTERVAL_MS,
  MOBILE_TICK_INTERVAL_MS,
  FRAME_BUDGET_MS,
} from '../data/constants';

let lastTime: number | null = null;
let animationFrameId: number | null = null;
let isRunning = false;
let lastEventCheckTime = 0;
const EVENT_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check hourly

// Track when tab was hidden for offline progress calculation
let hiddenTimestamp: number | null = null;

// ===== Performance Configuration =====
// Separate game logic tick rate from visual frame rate
// Visual: 60fps (every frame), Game Logic: 10fps (every 100ms)
let accumulatedGameLogicTime = 0;

// Frame budget monitoring for performance tracking
let frameBudgetWarnings = 0;
const MAX_WARNINGS_LOG = 5; // Only log first N warnings to avoid spam

// Mobile detection (cached) - uses capability detection instead of UA sniffing
let isMobileDevice: boolean | null = null;
export function isMobile(): boolean {
  if (isMobileDevice === null) {
    isMobileDevice = window.matchMedia('(pointer: coarse)').matches;
  }
  return isMobileDevice;
}

// Adjust intervals for mobile
function getGameLogicInterval(): number {
  // Mobile gets slightly less frequent game logic updates for battery
  return isMobile() ? MOBILE_TICK_INTERVAL_MS : GAME_TICK_INTERVAL_MS;
}

function tick(currentTime: number) {
  if (!isRunning) return;

  const frameStart = performance.now();

  if (lastTime !== null) {
    const deltaMs = currentTime - lastTime;
    // Cap delta to prevent huge jumps if tab was hidden
    const cappedDelta = Math.min(deltaMs, 100);
    const store = useGameStore.getState();

    // Accumulate time for batched game logic updates
    accumulatedGameLogicTime += cappedDelta;
    const gameLogicInterval = getGameLogicInterval();

    // Game logic tick: runs at reduced frequency (10fps default)
    // This handles production, XP, crafting, buffs, and golden cheese
    if (accumulatedGameLogicTime >= gameLogicInterval) {
      // Process accumulated time in chunks
      while (accumulatedGameLogicTime >= gameLogicInterval) {
        store.tick(gameLogicInterval);
        store.tickHeroXp(gameLogicInterval);
        store.tickCrafting(gameLogicInterval);
        store.tickBuffs(gameLogicInterval);
        store.tickGoldenCheese(gameLogicInterval);
        accumulatedGameLogicTime -= gameLogicInterval;
      }

      // Check for newly unlocked features (after production updates)
      store.checkUnlocks();
    }

    // Combat tick: runs every frame for smooth ATB bars
    // Combat is time-sensitive and needs frequent updates for visual feedback
    if (store.combat.isInCombat) {
      store.tickCombat(cappedDelta);
    }

    // Periodic event lifecycle check (hourly, not per-tick)
    if (currentTime - lastEventCheckTime > EVENT_CHECK_INTERVAL_MS) {
      store.checkEventActivation();
      store.checkWeekRollover();
      lastEventCheckTime = currentTime;
    }
  }

  lastTime = currentTime;

  // Frame budget monitoring (development/debug)
  const frameTime = performance.now() - frameStart;
  if (frameTime > FRAME_BUDGET_MS && frameBudgetWarnings < MAX_WARNINGS_LOG) {
    frameBudgetWarnings++;
    if (import.meta.env.DEV) {
      console.warn(
        `[GameLoop] Frame exceeded budget: ${frameTime.toFixed(2)}ms (budget: ${FRAME_BUDGET_MS}ms)`
      );
    }
  }

  animationFrameId = requestAnimationFrame(tick);
}

export function startGameLoop() {
  if (isRunning) return;

  isRunning = true;
  lastTime = null;
  accumulatedGameLogicTime = 0;
  frameBudgetWarnings = 0;
  animationFrameId = requestAnimationFrame(tick);
}

export function stopGameLoop() {
  isRunning = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  lastTime = null;
}

export function pauseGameLoop() {
  // Stop the loop but don't reset state
  isRunning = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

export function resumeGameLoop() {
  if (isRunning) return;

  isRunning = true;
  lastTime = null; // Reset lastTime to avoid huge delta
  accumulatedGameLogicTime = 0; // Reset accumulated time on resume
  animationFrameId = requestAnimationFrame(tick);
}

// Handle visibility changes to pause/resume
export function setupVisibilityHandler(onVisibilityResume?: (hiddenDurationMs: number) => void) {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      hiddenTimestamp = Date.now();
      pauseGameLoop();
    } else {
      const duration = hiddenTimestamp ? Date.now() - hiddenTimestamp : 0;
      hiddenTimestamp = null;
      if (duration > 0 && onVisibilityResume) {
        onVisibilityResume(duration);
      }
      resumeGameLoop();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
