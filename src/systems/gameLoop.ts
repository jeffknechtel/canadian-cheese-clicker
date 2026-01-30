import { useGameStore } from '../stores/gameStore';

let lastTime: number | null = null;
let animationFrameId: number | null = null;
let isRunning = false;

// ===== Performance Configuration =====
// Separate game logic tick rate from visual frame rate
// Visual: 60fps (every frame), Game Logic: 10fps (every 100ms)
const GAME_LOGIC_INTERVAL_MS = 100; // 10 ticks per second for game logic
let accumulatedGameLogicTime = 0;

// Frame budget monitoring for performance tracking
let frameBudgetWarnings = 0;
const FRAME_BUDGET_MS = 16; // Target 60fps = 16.67ms per frame
const MAX_WARNINGS_LOG = 5; // Only log first N warnings to avoid spam

// Mobile detection (cached)
let isMobileDevice: boolean | null = null;
export function isMobile(): boolean {
  if (isMobileDevice === null) {
    isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
  return isMobileDevice;
}

// Adjust intervals for mobile
function getGameLogicInterval(): number {
  // Mobile gets slightly less frequent game logic updates for battery
  return isMobile() ? 150 : GAME_LOGIC_INTERVAL_MS;
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
    // This handles production, XP, crafting, and buffs
    if (accumulatedGameLogicTime >= gameLogicInterval) {
      // Process accumulated time in chunks
      while (accumulatedGameLogicTime >= gameLogicInterval) {
        store.tick(gameLogicInterval);
        store.tickHeroXp(gameLogicInterval);
        store.tickCrafting(gameLogicInterval);
        store.tickBuffs(gameLogicInterval);
        accumulatedGameLogicTime -= gameLogicInterval;
      }
    }

    // Combat tick: runs every frame for smooth ATB bars
    // Combat is time-sensitive and needs frequent updates for visual feedback
    if (store.combat.isInCombat) {
      store.tickCombat(cappedDelta);
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
export function setupVisibilityHandler() {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      pauseGameLoop();
    } else {
      resumeGameLoop();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
