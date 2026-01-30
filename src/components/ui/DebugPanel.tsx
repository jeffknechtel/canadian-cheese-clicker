/**
 * Debug Panel (Beta Only)
 *
 * Developer debug tools for testing during beta.
 * Only visible when IS_BETA is true.
 */

import { useState, useCallback } from 'react';
import Decimal from 'decimal.js';
import { useGameStore } from '../../stores/gameStore';
import { IS_BETA, GAME_VERSION } from '../../config/version';
import { ZONES } from '../../data/zones';
import { ACHIEVEMENTS } from '../../data/achievements';
import { GENERATORS } from '../../data/generators';

interface DebugPanelProps {
  className?: string;
}

type DebugTab = 'resources' | 'combat' | 'progression' | 'state';

export function DebugPanel({ className = '' }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DebugTab>('resources');
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Game store actions
  const addCurds = useGameStore((state) => state.addCurds);
  const buyGenerator = useGameStore((state) => state.buyGenerator);
  const startCombat = useGameStore((state) => state.startCombat);
  const endCombat = useGameStore((state) => state.endCombat);
  const reset = useGameStore((state) => state.reset);

  // Game state
  const curds = useGameStore((state) => state.curds);
  const prestige = useGameStore((state) => state.prestige);
  const achievements = useGameStore((state) => state.achievements);
  const combat = useGameStore((state) => state.combat);
  const zoneProgress = useGameStore((state) => state.zoneProgress);
  const generators = useGameStore((state) => state.generators);
  const upgrades = useGameStore((state) => state.upgrades);
  const heroes = useGameStore((state) => state.heroes);

  const log = useCallback((message: string) => {
    setLogMessages((prev) => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  // Debug actions
  const handleAddCurds = useCallback((amount: number) => {
    addCurds(new Decimal(amount));
    log(`Added ${amount.toLocaleString()} curds`);
  }, [addCurds, log]);

  const handleAddRennet = useCallback((amount: number) => {
    // Directly modify prestige state (for debugging only)
    useGameStore.setState((state) => ({
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet + amount,
        totalRennet: state.prestige.totalRennet + amount,
      },
    }));
    log(`Added ${amount} Golden Rennet`);
  }, [log]);

  const handleMaxGenerators = useCallback(() => {
    GENERATORS.forEach((gen) => {
      const current = generators[gen.id] || 0;
      if (current < 100) {
        for (let i = current; i < 100; i++) {
          buyGenerator(gen.id, 1);
        }
      }
    });
    log('Maxed all generators to 100');
  }, [generators, buyGenerator, log]);

  const handleUnlockAllAchievements = useCallback(() => {
    const unlockedIds = achievements;
    const toUnlock = ACHIEVEMENTS.filter((a) => !unlockedIds.includes(a.id)).map((a) => a.id);

    useGameStore.setState((state) => ({
      achievements: [...state.achievements, ...toUnlock],
    }));

    log(`Unlocked ${toUnlock.length} achievements`);
  }, [achievements, log]);

  const handleUnlockAllZones = useCallback(() => {
    const progress: Record<string, { zoneId: string; highestStageCleared: number; bossDefeated: boolean; timesCompleted: number }> = {};

    ZONES.forEach((zone) => {
      progress[zone.id] = {
        zoneId: zone.id,
        highestStageCleared: zone.bossStage.stageNumber,
        bossDefeated: true,
        timesCompleted: 1,
      };
    });

    useGameStore.setState({ zoneProgress: progress });
    log('Unlocked all zones');
  }, [log]);

  const handleWinCombat = useCallback(() => {
    if (combat.isInCombat) {
      endCombat('victory');
      log('Combat won (debug)');
    } else {
      log('Not in combat');
    }
  }, [combat.isInCombat, endCombat, log]);

  const handleSkipCombat = useCallback(() => {
    if (combat.isInCombat) {
      // Kill all enemies
      useGameStore.setState((state) => ({
        combat: {
          ...state.combat,
          enemies: state.combat.enemies.map((e) => ({ ...e, currentHp: 0, isAlive: false })),
          battleResult: 'victory',
        },
      }));
      log('Combat skipped - all enemies defeated');
    } else {
      log('Not in combat');
    }
  }, [combat.isInCombat, log]);

  const handleTimeWarp = useCallback((hours: number) => {
    const cps = useGameStore.getState().curdPerSecond;
    const curdsEarned = cps.mul(hours * 60 * 60);

    addCurds(curdsEarned);
    log(`Time warped ${hours}h, earned ${curdsEarned.toFixed(0)} curds`);
  }, [addCurds, log]);

  const handleResetGame = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
      reset();
      log('Game reset');
    }
  }, [reset, log]);

  const handleExportState = useCallback(() => {
    const state = useGameStore.getState();
    const exportData = {
      version: GAME_VERSION,
      timestamp: Date.now(),
      curds: state.curds.toString(),
      totalCurdsEarned: state.totalCurdsEarned.toString(),
      generators: state.generators,
      upgrades: state.upgrades,
      achievements: state.achievements,
      prestige: state.prestige,
      zoneProgress: state.zoneProgress,
      heroes: state.heroes,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cheese-quest-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    log('State exported');
  }, [log]);

  // Don't render in production
  if (!IS_BETA) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 z-40 ${className}`}>
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white text-xs font-mono rounded-lg shadow-lg transition-colors"
          title="Open Debug Panel"
          aria-label="Open debug panel"
        >
          🛠️ Debug
        </button>
      )}

      {/* Debug panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-gray-900/95 text-white rounded-lg shadow-2xl overflow-hidden font-mono text-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
            <span className="font-bold text-yellow-400">🛠️ Debug Panel</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{GAME_VERSION}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {(['resources', 'combat', 'progression', 'state'] as DebugTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-2 py-1.5 text-center capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-700 text-yellow-400'
                    : 'hover:bg-gray-800 text-gray-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-3 max-h-80 overflow-y-auto space-y-2">
            {activeTab === 'resources' && (
              <>
                <div className="text-gray-400 mb-2">Current: {curds.toFixed(0)} curds</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAddCurds(1000)} className="debug-btn">+1K Curds</button>
                  <button onClick={() => handleAddCurds(1000000)} className="debug-btn">+1M Curds</button>
                  <button onClick={() => handleAddCurds(1e9)} className="debug-btn">+1B Curds</button>
                  <button onClick={() => handleAddCurds(1e12)} className="debug-btn">+1T Curds</button>
                </div>
                <div className="text-gray-400 mt-3 mb-2">Rennet: {prestige.rennet}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAddRennet(10)} className="debug-btn">+10 Rennet</button>
                  <button onClick={() => handleAddRennet(100)} className="debug-btn">+100 Rennet</button>
                </div>
              </>
            )}

            {activeTab === 'combat' && (
              <>
                <div className="text-gray-400 mb-2">
                  Status: {combat.isInCombat ? `In Combat (${combat.currentZone} #${combat.currentStage})` : 'Not in combat'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleWinCombat}
                    disabled={!combat.isInCombat}
                    className="debug-btn disabled:opacity-50"
                  >
                    Win Combat
                  </button>
                  <button
                    onClick={handleSkipCombat}
                    disabled={!combat.isInCombat}
                    className="debug-btn disabled:opacity-50"
                  >
                    Skip Combat
                  </button>
                  <button
                    onClick={() => {
                      if (ZONES[0]) {
                        startCombat(ZONES[0].id, 1);
                        log(`Started combat: ${ZONES[0].id}`);
                      }
                    }}
                    disabled={combat.isInCombat}
                    className="debug-btn disabled:opacity-50"
                  >
                    Start Combat
                  </button>
                  <button
                    onClick={() => {
                      if (combat.isInCombat) {
                        endCombat('flee');
                        log('Fled combat');
                      }
                    }}
                    disabled={!combat.isInCombat}
                    className="debug-btn disabled:opacity-50"
                  >
                    Flee Combat
                  </button>
                </div>
              </>
            )}

            {activeTab === 'progression' && (
              <div className="space-y-2">
                <button onClick={handleMaxGenerators} className="debug-btn w-full">
                  Max All Generators (100)
                </button>
                <button onClick={handleUnlockAllAchievements} className="debug-btn w-full">
                  Unlock All Achievements
                </button>
                <button onClick={handleUnlockAllZones} className="debug-btn w-full">
                  Unlock All Zones
                </button>
                <div className="text-gray-400 mt-3 mb-2">Time Warp:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleTimeWarp(1)} className="debug-btn">+1h</button>
                  <button onClick={() => handleTimeWarp(8)} className="debug-btn">+8h</button>
                  <button onClick={() => handleTimeWarp(24)} className="debug-btn">+24h</button>
                </div>
              </div>
            )}

            {activeTab === 'state' && (
              <div className="space-y-2">
                <div className="bg-gray-800 p-2 rounded text-[10px] leading-relaxed">
                  <div>Curds: {curds.toExponential(2)}</div>
                  <div>Generators: {Object.values(generators).reduce((a, b) => a + b, 0)}</div>
                  <div>Upgrades: {upgrades.length}</div>
                  <div>Achievements: {achievements.length}/{ACHIEVEMENTS.length}</div>
                  <div>Heroes: {Object.keys(heroes).length}</div>
                  <div>Zones cleared: {Object.keys(zoneProgress).length}/{ZONES.length}</div>
                  <div>Rennet: {prestige.rennet}</div>
                  <div>Aging resets: {prestige.agingResetCount}</div>
                </div>
                <button onClick={handleExportState} className="debug-btn w-full">
                  Export State (JSON)
                </button>
                <button
                  onClick={handleResetGame}
                  className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white"
                >
                  Reset Game
                </button>
              </div>
            )}
          </div>

          {/* Log output */}
          {logMessages.length > 0 && (
            <div className="border-t border-gray-700 p-2 max-h-24 overflow-y-auto bg-gray-950">
              {logMessages.map((msg, i) => (
                <div key={i} className="text-[10px] text-gray-400">{msg}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debug button styles */}
      <style>{`
        .debug-btn {
          padding: 6px 12px;
          background: #374151;
          border-radius: 4px;
          transition: background 0.15s;
        }
        .debug-btn:hover:not(:disabled) {
          background: #4B5563;
        }
        .debug-btn:active:not(:disabled) {
          background: #6B7280;
        }
      `}</style>
    </div>
  );
}

export default DebugPanel;
