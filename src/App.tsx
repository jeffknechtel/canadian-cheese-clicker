import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { Layout } from './components/ui/Layout';
import { GameScene } from './components/game/GameScene';
import { CurrencyDisplay } from './components/ui/CurrencyDisplay';
import { GeneratorPanel } from './components/ui/GeneratorPanel';
import { UpgradePanel } from './components/ui/UpgradePanel';
import { AchievementPanel } from './components/ui/AchievementPanel';
import { HeroPanel } from './components/ui/HeroPanel';
import { PartyFormationPanel } from './components/ui/PartyFormationPanel';
import { EquipmentModal } from './components/ui/EquipmentModal';
import { OfflineProgressModal } from './components/ui/OfflineProgressModal';
import { AchievementToastContainer } from './components/ui/AchievementToast';
import { DialogueToastContainer } from './components/ui/DialogueToast';
import { ZoneSelectPanel } from './components/ui/ZoneSelectPanel';
import { CombatResultsModal } from './components/ui/CombatResultsModal';
import { ActiveBuffsBar } from './components/ui/crafting/ActiveBuffsBar';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { KeyboardHelpModal } from './components/ui/KeyboardHelpModal';
import { PrivacyConsent } from './components/ui/PrivacyConsent';
import { usePrivacyConsent } from './hooks/usePrivacyConsent';
import { BetaAgreement } from './components/ui/BetaAgreement';
import { useBetaAgreement } from './hooks/useBetaAgreement';
import { FeedbackWidget } from './components/ui/FeedbackWidget';
import { DebugPanel } from './components/ui/DebugPanel';
import { initializeAnnouncer, cleanupAnnouncer } from './systems/accessibilityAnnouncer';
import { initializeErrorCapture } from './systems/bugReporter';
import { analytics, trackMilestone } from './systems/analyticsService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { IS_BETA, BETA_FEATURES } from './config/version';

// Lazy-loaded heavy components for code splitting
const CombatPanel = lazy(() => import('./components/ui/CombatPanel').then(m => ({ default: m.CombatPanel })));
const PrestigePanel = lazy(() => import('./components/ui/PrestigePanel').then(m => ({ default: m.PrestigePanel })));
const CraftingPanel = lazy(() => import('./components/ui/CraftingPanel').then(m => ({ default: m.CraftingPanel })));
const SettingsPanel = lazy(() => import('./components/ui/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
import { showRandomDialogue, showHeroLevelUpDialogue } from './systems/dialogueSystem';
import { AudioControls } from './components/ui/AudioControls';
import { playMilestoneChime } from './systems/audioSystem';
import { startGameLoop, stopGameLoop, setupVisibilityHandler } from './systems/gameLoop';
import { useGameStore, setHeroLevelUpCallback } from './stores/gameStore';
import { useSettingsStore, initializeSettingsAudio } from './stores/settingsStore';
import { ACHIEVEMENTS } from './data/achievements';
import type { EquipmentSlot, CombatRewards } from './types/game';

const RANDOM_DIALOGUE_MIN_MS = 60_000; // 60 seconds minimum
const RANDOM_DIALOGUE_MAX_MS = 120_000; // 120 seconds maximum
const MILESTONE_CHECK_INTERVAL_MS = 1000; // Check milestones every second

// Loading fallback for lazy-loaded panels
function PanelLoader() {
  return (
    <div className="h-full flex items-center justify-center bg-cream/50 rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-cheddar-300 border-t-cheddar-500 rounded-full animate-spin" />
        <span className="text-sm text-cheddar-600">Loading...</span>
      </div>
    </div>
  );
}

type MobileTab = 'generators' | 'upgrades' | 'achievements' | 'heroes' | 'combat' | 'prestige' | 'crafting';

type RightPanelView = 'upgrades' | 'achievements' | 'heroes' | 'combat' | 'prestige' | 'crafting';

// Equipment modal state
interface EquipmentModalState {
  heroId: string;
  slot: EquipmentSlot;
}

// Combat results state
interface CombatResultsState {
  result: 'victory' | 'defeat';
  rewards: CombatRewards | null;
  zoneId: string | null;
  stageNumber: number;
}

function App() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('generators');
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('upgrades');
  const [equipmentModal, setEquipmentModal] = useState<EquipmentModalState | null>(null);
  const [combatResults, setCombatResults] = useState<CombatResultsState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(true);

  // Privacy consent hook
  const {
    showConsent: showPrivacyConsent,
    closeConsentDialog,
    handleConsentChange,
  } = usePrivacyConsent();

  // Beta agreement hook
  const {
    showAgreement: showBetaAgreement,
    hasChecked: hasBetaAgreementChecked,
    acceptAgreement: acceptBetaAgreement,
  } = useBetaAgreement();

  // Settings store
  const autoSaveInterval = useSettingsStore((state) => state.game.autoSaveInterval);
  const accessibility = useSettingsStore((state) => state.accessibility);

  const load = useGameStore((state) => state.load);
  const save = useGameStore((state) => state.save);
  const getUnlockedAchievements = useGameStore((state) => state.getUnlockedAchievements);
  const checkMilestone = useGameStore((state) => state.checkMilestone);
  const incrementEh = useGameStore((state) => state.incrementEh);
  const ehCount = useGameStore((state) => state.ehCount);
  const unlockedCount = getUnlockedAchievements().length;
  const totalAchievements = ACHIEVEMENTS.filter((a) => a.category !== 'hidden').length;

  // Combat-related store state
  const combat = useGameStore((state) => state.combat);
  const startCombat = useGameStore((state) => state.startCombat);
  const endCombat = useGameStore((state) => state.endCombat);
  const claimCombatRewards = useGameStore((state) => state.claimCombatRewards);

  // Prestige-related store state
  const prestige = useGameStore((state) => state.prestige);
  const getPotentialRennet = useGameStore((state) => state.getPotentialRennet);
  const potentialRennet = getPotentialRennet();
  const hasPrestiged = prestige.agingResetCount > 0 || prestige.rennet > 0;
  const prestigeAvailable = potentialRennet > 0;

  // Ref for random dialogue timer
  const dialogueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize game state synchronously on first render
  const [{ isLoaded, offlineProgress }, setLoadState] = useState(() => {
    // Initialize settings audio
    initializeSettingsAudio();

    const progress = load();

    // Start analytics session
    const isReturning = progress !== null;
    const lastSessionMs = progress?.secondsAway ? progress.secondsAway * 1000 : undefined;
    analytics.startSession(isReturning, lastSessionMs);

    return {
      isLoaded: true,
      offlineProgress: progress && progress.secondsAway > 0 ? progress : null,
    };
  });

  // Simulate loading progress for loading screen
  useEffect(() => {
    if (!showLoading) return;

    let animationFrameId: number;
    const startTime = Date.now();
    const minLoadTime = 1500; // Minimum 1.5 seconds to show tips

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const baseProgress = Math.min(100, (elapsed / minLoadTime) * 100);

      // Add some randomness for visual interest
      const jitter = Math.random() * 5;
      const progress = Math.min(100, baseProgress + jitter);

      setLoadingProgress(progress);

      if (progress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showLoading]);

  const handleLoadingComplete = useCallback(() => {
    setShowLoading(false);
  }, []);

  // Initialize accessibility announcer and error capture
  useEffect(() => {
    initializeAnnouncer();
    if (IS_BETA) {
      initializeErrorCapture();
    }
    return () => {
      cleanupAnnouncer();
    };
  }, []);

  // Start game loop after load
  useEffect(() => {
    if (!isLoaded) return;

    startGameLoop();

    const cleanupVisibility = setupVisibilityHandler();

    return () => {
      stopGameLoop();
      cleanupVisibility();
    };
  }, [isLoaded]);

  // Auto-save interval (uses settings)
  useEffect(() => {
    if (!isLoaded) return;

    const intervalMs = autoSaveInterval * 1000;
    const intervalId = setInterval(() => {
      save();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [isLoaded, save, autoSaveInterval]);

  // Random Canadian dialogue at random intervals (60-120 seconds)
  useEffect(() => {
    if (!isLoaded) return;

    const scheduleNextDialogue = () => {
      const delay = RANDOM_DIALOGUE_MIN_MS +
        Math.random() * (RANDOM_DIALOGUE_MAX_MS - RANDOM_DIALOGUE_MIN_MS);

      dialogueTimerRef.current = setTimeout(() => {
        showRandomDialogue('random');
        incrementEh();
        scheduleNextDialogue();
      }, delay);
    };

    scheduleNextDialogue();

    return () => {
      if (dialogueTimerRef.current) {
        clearTimeout(dialogueTimerRef.current);
      }
    };
  }, [isLoaded, incrementEh]);

  // Milestone checking
  useEffect(() => {
    if (!isLoaded) return;

    const intervalId = setInterval(() => {
      const milestone = checkMilestone();
      if (milestone !== null) {
        showRandomDialogue('milestone');
        playMilestoneChime();
        incrementEh();
        // Track milestone for analytics
        trackMilestone(milestone, milestone);
      }
    }, MILESTONE_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLoaded, checkMilestone, incrementEh]);

  // Hero level-up notifications
  useEffect(() => {
    setHeroLevelUpCallback((hero, level) => {
      showHeroLevelUpDialogue(hero, level);
      playMilestoneChime();
    });
    return () => setHeroLevelUpCallback(null);
  }, []);

  // Save on visibility change (tab hidden) and before unload
  useEffect(() => {
    if (!isLoaded) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        save();
      }
    };

    const handleBeforeUnload = () => {
      save();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoaded, save]);

  const handleDismissOfflineProgress = useCallback(() => {
    setLoadState((prev) => ({ ...prev, offlineProgress: null }));
  }, []);

  const handleEquipmentClick = useCallback((heroId: string, slot: EquipmentSlot) => {
    setEquipmentModal({ heroId, slot });
  }, []);

  const handleCloseEquipmentModal = useCallback(() => {
    setEquipmentModal(null);
  }, []);

  // Combat handlers
  const handleStartCombat = useCallback((zoneId: string, stageNumber: number) => {
    const success = startCombat(zoneId, stageNumber);
    if (success) {
      // Switch to combat view
      setRightPanelView('combat');
      setMobileTab('combat');
    }
  }, [startCombat]);

  const handleFlee = useCallback(() => {
    endCombat('flee');
    setCombatResults({
      result: 'defeat',
      rewards: null,
      zoneId: combat.currentZone,
      stageNumber: combat.currentStage,
    });
  }, [endCombat, combat.currentZone, combat.currentStage]);

  const handleCombatResultsContinue = useCallback(() => {
    if (combatResults?.result === 'victory') {
      const rewards = claimCombatRewards();
      if (rewards) {
        playMilestoneChime();
      }
    }
    setCombatResults(null);
  }, [combatResults?.result, claimCombatRewards]);

  const handleCombatRetry = useCallback(() => {
    if (combatResults) {
      const { zoneId, stageNumber } = combatResults;
      setCombatResults(null);
      if (zoneId) {
        handleStartCombat(zoneId, stageNumber);
      }
    }
  }, [combatResults, handleStartCombat]);

  // Keyboard navigation handler for panels
  const handleKeyboardNavigate = useCallback(
    (panel: 'generators' | 'upgrades' | 'heroes' | 'combat' | 'prestige' | 'crafting' | 'achievements') => {
      // Map to the right panel view
      const panelMap: Record<string, RightPanelView> = {
        upgrades: 'upgrades',
        achievements: 'achievements',
        heroes: 'heroes',
        combat: 'combat',
        prestige: 'prestige',
        crafting: 'crafting',
      };

      // For desktop, update right panel view
      if (panelMap[panel]) {
        setRightPanelView(panelMap[panel]);
      }

      // For mobile, update mobile tab
      const mobileMap: Record<string, MobileTab> = {
        generators: 'generators',
        upgrades: 'upgrades',
        achievements: 'achievements',
        heroes: 'heroes',
        combat: 'combat',
        prestige: 'prestige',
        crafting: 'crafting',
      };

      if (mobileMap[panel]) {
        setMobileTab(mobileMap[panel]);
      }
    },
    []
  );

  // Check if any modal is open
  const isAnyModalOpen = settingsOpen || keyboardHelpOpen || !!equipmentModal || !!combatResults || !!offlineProgress;

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onNavigate: handleKeyboardNavigate,
    onOpenSettings: useCallback(() => setSettingsOpen(true), []),
    onOpenHelp: useCallback(() => setKeyboardHelpOpen(true), []),
    onCloseModal: useCallback(() => {
      if (keyboardHelpOpen) setKeyboardHelpOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (equipmentModal) setEquipmentModal(null);
      else if (combatResults) {
        handleCombatResultsContinue();
      }
    }, [keyboardHelpOpen, settingsOpen, equipmentModal, combatResults, handleCombatResultsContinue]),
    isModalOpen: isAnyModalOpen,
  });

  // Watch for combat end to show results modal
  // This effect syncs the zustand combat state to local React state for the modal
  useEffect(() => {
    if (combat.battleResult && combat.battleResult !== 'ongoing' && !combatResults) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing external store state to local state is a valid use case
      setCombatResults({
        result: combat.battleResult,
        rewards: null, // Will be calculated when claiming
        zoneId: combat.currentZone,
        stageNumber: combat.currentStage,
      });
    }
  }, [combat.battleResult, combat.currentZone, combat.currentStage, combatResults]);

  // Show loading state while initializing
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <p className="text-cheddar-600 text-xl">Loading...</p>
      </div>
    );
  }

  // Build accessibility classes
  const accessibilityClasses = [
    accessibility.colorblindMode !== 'none' ? `colorblind-${accessibility.colorblindMode}` : '',
    accessibility.reducedMotion ? 'reduced-motion' : '',
    accessibility.highContrast ? 'high-contrast' : '',
    `font-size-${accessibility.fontSize}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
    {/* Settings Panel - must be outside Layout to avoid stacking context issues */}
    {/* Settings Panel - must be outside Layout to avoid stacking context issues */}
    {settingsOpen && (
      <Suspense fallback={null}>
        <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>
    )}
    {/* Keyboard Help Modal - must be outside Layout */}
    <KeyboardHelpModal
      isOpen={keyboardHelpOpen}
      onClose={() => setKeyboardHelpOpen(false)}
    />
    <div className={accessibilityClasses}>
    <Layout>
      {/* Skip Links for Keyboard Navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#generators-panel" className="skip-link" style={{ left: '30%' }}>
        Skip to generators
      </a>

      <div className="flex flex-col h-screen">
        {/* Header with currency display - Tim Hortons-inspired */}
        <header className="p-3 sm:p-4 header-timmys text-white shadow-lg" role="banner">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              {/* Debug Panel Button (Beta Only) - positioned in header */}
              {BETA_FEATURES.debugPanel && (
                <DebugPanel />
              )}
              <h1 className="text-lg sm:text-2xl font-bold truncate flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">🍁</span>
                <span>
                  <span className="hidden sm:inline">The Great Canadian Cheese Quest</span>
                  <span className="sm:hidden">Cheese Quest</span>
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <CurrencyDisplay />
              {/* Active cheese buffs display */}
              <div className="hidden md:block">
                <ActiveBuffsBar />
              </div>
              {/* Desktop panel toggle buttons */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setRightPanelView('combat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    rightPanelView === 'combat'
                      ? 'bg-white/40 border-white/40'
                      : combat.isInCombat
                        ? 'bg-red-500/30 border-red-400/40 animate-pulse'
                        : 'bg-white/20 hover:bg-white/30 border-white/20'
                  }`}
                  title="Combat"
                >
                  <span className="text-lg">⚔️</span>
                  {combat.isInCombat && <span className="text-xs font-bold">!</span>}
                </button>
                <button
                  onClick={() => setRightPanelView('heroes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    rightPanelView === 'heroes'
                      ? 'bg-white/40 border-white/40'
                      : 'bg-white/20 hover:bg-white/30 border-white/20'
                  }`}
                  title="Heroes"
                >
                  <span className="text-lg">🦸</span>
                </button>
                <button
                  onClick={() => setRightPanelView('achievements')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    rightPanelView === 'achievements'
                      ? 'bg-white/40 border-white/40'
                      : 'bg-white/20 hover:bg-white/30 border-white/20'
                  }`}
                  title="Achievements"
                >
                  <span className="text-lg">🏆</span>
                  <span className="text-sm font-medium">{unlockedCount}/{totalAchievements}</span>
                </button>
                <button
                  onClick={() => setRightPanelView('prestige')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    rightPanelView === 'prestige'
                      ? 'bg-white/40 border-white/40'
                      : prestigeAvailable
                        ? 'bg-amber-500/30 border-amber-400/40 animate-pulse'
                        : 'bg-white/20 hover:bg-white/30 border-white/20'
                  }`}
                  title="Prestige (Cheese Aging)"
                >
                  <span className="text-lg">🧀</span>
                  {(hasPrestiged || prestigeAvailable) && (
                    <span className="text-sm font-medium">{prestige.rennet}</span>
                  )}
                  {prestigeAvailable && rightPanelView !== 'prestige' && (
                    <span className="text-xs text-amber-200">+{potentialRennet}</span>
                  )}
                </button>
                <button
                  onClick={() => setRightPanelView('crafting')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    rightPanelView === 'crafting'
                      ? 'bg-white/40 border-white/40'
                      : 'bg-white/20 hover:bg-white/30 border-white/20'
                  }`}
                  title="Cheese Crafting"
                >
                  <span className="text-lg">🪤</span>
                </button>
              </div>
              <AudioControls />
              {/* Keyboard Help Button */}
              <button
                onClick={() => setKeyboardHelpOpen(true)}
                className="p-2 rounded-lg bg-cheddar-500/30 hover:bg-cheddar-500/50 transition-colors hidden sm:block"
                title="Keyboard Shortcuts (?)"
                aria-label="Open keyboard shortcuts help"
              >
                <span className="text-sm font-bold" aria-hidden="true">?</span>
              </button>
              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg bg-cheddar-500/30 hover:bg-cheddar-500/50 transition-colors"
                title="Settings (s)"
                aria-label="Open settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Layout */}
        <main id="main-content" className="hidden md:flex flex-1 min-h-0" role="main" aria-label="Game content">
          {/* Generator Panel - Left side */}
          <aside id="generators-panel" className="w-72 lg:w-80 p-4 overflow-hidden shrink-0" aria-label="Generators panel">
            <GeneratorPanel />
          </aside>

          {/* 3D Scene - Center */}
          <div className="flex-1 relative min-w-0" aria-label="Game scene">
            <GameScene />
          </div>

          {/* Right side panel (Upgrades, Achievements, Heroes, or Combat) */}
          <aside className="w-72 lg:w-80 p-4 overflow-hidden shrink-0 flex flex-col gap-4">
            {rightPanelView === 'upgrades' && <UpgradePanel />}
            {rightPanelView === 'achievements' && <AchievementPanel />}
            {rightPanelView === 'heroes' && (
              <>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <HeroPanel onEquipmentClick={handleEquipmentClick} />
                </div>
                <PartyFormationPanel compact />
              </>
            )}
            {rightPanelView === 'combat' && (
              combat.isInCombat ? (
                <Suspense fallback={<PanelLoader />}>
                  <CombatPanel onFlee={handleFlee} />
                </Suspense>
              ) : (
                <ZoneSelectPanel onStartCombat={handleStartCombat} />
              )
            )}
            {rightPanelView === 'prestige' && (
              <Suspense fallback={<PanelLoader />}>
                <PrestigePanel />
              </Suspense>
            )}
            {rightPanelView === 'crafting' && (
              <Suspense fallback={<PanelLoader />}>
                <CraftingPanel />
              </Suspense>
            )}
          </aside>
        </main>

        {/* Mobile Layout */}
        <div className="flex flex-col flex-1 min-h-0 md:hidden" role="main" aria-label="Mobile game content">
          {/* 3D Scene - Top portion on mobile */}
          <div className="h-[45%] min-h-[200px] relative" aria-label="Game scene">
            <GameScene />
          </div>

          {/* Mobile Tab Navigation */}
          <nav className="flex border-b border-cheddar-300 bg-cream/80 backdrop-blur" role="tablist" aria-label="Game panels">
            <button
              role="tab"
              aria-selected={mobileTab === 'generators'}
              aria-controls="mobile-panel-content"
              onClick={() => setMobileTab('generators')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all
                ${mobileTab === 'generators'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              Generators
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === 'upgrades'}
              aria-controls="mobile-panel-content"
              onClick={() => setMobileTab('upgrades')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all
                ${mobileTab === 'upgrades'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              Upgrades
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === 'combat'}
              aria-controls="mobile-panel-content"
              aria-label={combat.isInCombat ? 'Combat (battle in progress)' : 'Combat'}
              onClick={() => setMobileTab('combat')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all relative
                ${mobileTab === 'combat'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : combat.isInCombat
                    ? 'text-red-600 bg-red-50/50 animate-pulse'
                    : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              <span aria-hidden="true">⚔️</span>
              <span className="sr-only">Combat</span>
              {combat.isInCombat && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
              )}
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === 'heroes'}
              aria-controls="mobile-panel-content"
              aria-label="Heroes"
              onClick={() => setMobileTab('heroes')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all
                ${mobileTab === 'heroes'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              <span aria-hidden="true">🦸</span>
              <span className="sr-only">Heroes</span>
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === 'achievements'}
              aria-controls="mobile-panel-content"
              aria-label={`Achievements, ${unlockedCount} unlocked`}
              onClick={() => setMobileTab('achievements')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all
                ${mobileTab === 'achievements'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              <span aria-hidden="true">🏆</span> {unlockedCount}
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === 'prestige'}
              aria-controls="mobile-panel-content"
              aria-label={prestigeAvailable ? 'Prestige (available)' : 'Prestige'}
              onClick={() => setMobileTab('prestige')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all relative
                ${mobileTab === 'prestige'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : prestigeAvailable
                    ? 'text-amber-600 bg-amber-50/50 animate-pulse'
                    : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              <span aria-hidden="true">🧀</span>
              <span className="sr-only">Prestige</span>
              {prestigeAvailable && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" aria-hidden="true" />
              )}
            </button>
            <button
              role="tab"
              aria-selected={mobileTab === 'crafting'}
              aria-controls="mobile-panel-content"
              aria-label="Crafting"
              onClick={() => setMobileTab('crafting')}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all
                ${mobileTab === 'crafting'
                  ? 'text-cheddar-700 border-b-2 border-cheddar-500 bg-white/50'
                  : 'text-rind hover:text-cheddar-600 hover:bg-white/30'
                }
              `}
            >
              <span aria-hidden="true">🪤</span>
              <span className="sr-only">Crafting</span>
            </button>
          </nav>

          {/* Mobile Panel Content */}
          <div id="mobile-panel-content" role="tabpanel" aria-label={`${mobileTab} panel`} className="flex-1 p-3 overflow-hidden flex flex-col">
            {mobileTab === 'generators' && <GeneratorPanel />}
            {mobileTab === 'upgrades' && <UpgradePanel />}
            {mobileTab === 'combat' && (
              combat.isInCombat ? (
                <Suspense fallback={<PanelLoader />}>
                  <CombatPanel onFlee={handleFlee} />
                </Suspense>
              ) : (
                <ZoneSelectPanel onStartCombat={handleStartCombat} />
              )
            )}
            {mobileTab === 'heroes' && (
              <div className="flex flex-col gap-3 h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <HeroPanel onEquipmentClick={handleEquipmentClick} />
                </div>
                <PartyFormationPanel compact />
              </div>
            )}
            {mobileTab === 'achievements' && <AchievementPanel />}
            {mobileTab === 'prestige' && (
              <Suspense fallback={<PanelLoader />}>
                <PrestigePanel />
              </Suspense>
            )}
            {mobileTab === 'crafting' && (
              <Suspense fallback={<PanelLoader />}>
                <CraftingPanel />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* Toast Containers */}
      <AchievementToastContainer />
      <DialogueToastContainer />

      {/* Eh Counter (subtle display in corner) */}
      {ehCount > 0 && (
        <div className="fixed bottom-4 left-4 z-30 px-3 py-1.5 bg-maple-100/80 backdrop-blur rounded-lg border border-maple-300 text-sm text-maple-700">
          Eh count: {ehCount} {ehCount >= 100 && `(+${Math.floor(ehCount / 100)}% bonus)`}
        </div>
      )}

      {/* Offline Progress Modal */}
      {offlineProgress && (
        <OfflineProgressModal
          progress={offlineProgress}
          onDismiss={handleDismissOfflineProgress}
        />
      )}

      {/* Equipment Modal */}
      {equipmentModal && (
        <EquipmentModal
          heroId={equipmentModal.heroId}
          slot={equipmentModal.slot}
          onClose={handleCloseEquipmentModal}
        />
      )}

      {/* Combat Results Modal */}
      {combatResults && (
        <CombatResultsModal
          result={combatResults.result}
          rewards={combatResults.rewards}
          zoneId={combatResults.zoneId}
          stageNumber={combatResults.stageNumber}
          onContinue={handleCombatResultsContinue}
          onRetry={combatResults.result === 'defeat' ? handleCombatRetry : undefined}
        />
      )}

      {/* Settings Panel and Keyboard Help Modal are rendered outside Layout */}

      {/* Loading Screen */}
      {showLoading && (
        <LoadingScreen progress={loadingProgress} onComplete={handleLoadingComplete} />
      )}

      {/* Privacy Consent Modal */}
      <PrivacyConsent
        isOpen={showPrivacyConsent && !showLoading}
        onClose={closeConsentDialog}
        onConsentChange={handleConsentChange}
      />

      {/* Beta Agreement Modal - shown before privacy consent on first visit */}
      {IS_BETA && hasBetaAgreementChecked && showBetaAgreement && !showLoading && (
        <BetaAgreement onAccept={acceptBetaAgreement} />
      )}

      {/* Feedback Widget (Beta Only) */}
      {BETA_FEATURES.feedbackWidget && (
        <FeedbackWidget />
      )}

    </Layout>
    </div>
    </>
  );
}

export default App;
