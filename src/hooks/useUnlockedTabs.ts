import { useGameStore } from '../stores';
import type { FeatureId } from '../types/game';

type MobileTab = 'generators' | 'upgrades' | 'combat' | 'heroes' | 'achievements' | 'prestige' | 'crafting' | 'lore';
type RightPanelView = 'upgrades' | 'achievements' | 'heroes' | 'combat' | 'prestige' | 'crafting' | 'lore';

const TAB_TO_FEATURE: Record<MobileTab, FeatureId | null> = {
  generators: null, // Always visible
  upgrades: 'upgrades',
  combat: 'combat',
  heroes: 'heroes',
  achievements: 'achievements',
  prestige: 'prestige',
  crafting: 'crafting',
  lore: null, // Always visible (codex)
};

const ALL_MOBILE_TABS: MobileTab[] = ['generators', 'upgrades', 'combat', 'heroes', 'achievements', 'prestige', 'crafting', 'lore'];
const ALL_DESKTOP_PANELS: RightPanelView[] = ['upgrades', 'combat', 'heroes', 'achievements', 'prestige', 'crafting', 'lore'];

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
