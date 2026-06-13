import { useGameStore } from '../stores';
import type { FeatureId } from '../types/game';

type MobileTab = 'generators' | 'upgrades' | 'combat' | 'heroes' | 'achievements' | 'prestige' | 'crafting';
type RightPanelView = 'upgrades' | 'achievements' | 'heroes' | 'combat' | 'prestige' | 'crafting';

const TAB_TO_FEATURE: Record<MobileTab, FeatureId | null> = {
  generators: null, // Always visible
  upgrades: 'upgrades',
  combat: 'combat',
  heroes: 'heroes',
  achievements: 'achievements',
  prestige: 'prestige',
  crafting: 'crafting',
};

const ALL_MOBILE_TABS: MobileTab[] = ['generators', 'upgrades', 'combat', 'heroes', 'achievements', 'prestige', 'crafting'];
const ALL_DESKTOP_PANELS: RightPanelView[] = ['upgrades', 'combat', 'heroes', 'achievements', 'prestige', 'crafting'];

export function useUnlockedTabs() {
  const isFeatureUnlocked = useGameStore((s) => s.isFeatureUnlocked);

  const isTabUnlocked = (tab: MobileTab | RightPanelView): boolean => {
    const feature = TAB_TO_FEATURE[tab as MobileTab];
    if (feature === null) return true; // Generators always visible
    return isFeatureUnlocked(feature);
  };

  const unlockedMobileTabs = ALL_MOBILE_TABS.filter(isTabUnlocked);
  const unlockedDesktopPanels = ALL_DESKTOP_PANELS.filter(isTabUnlocked);

  return { isTabUnlocked, unlockedMobileTabs, unlockedDesktopPanels };
}
