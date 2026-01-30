/**
 * Changelog Data
 *
 * Version history for The Great Canadian Cheese Quest.
 * Displayed in-game via the ChangelogModal component.
 */

export type ChangeType = 'feature' | 'fix' | 'balance' | 'content';

export interface ChangelogChange {
  type: ChangeType;
  description: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title?: string;
  changes: ChangelogChange[];
}

/**
 * Get a human-readable label for a change type
 */
export function getChangeTypeLabel(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return 'New';
    case 'fix':
      return 'Fix';
    case 'balance':
      return 'Balance';
    case 'content':
      return 'Content';
    default:
      return 'Update';
  }
}

/**
 * Get CSS class for change type badge
 */
export function getChangeTypeClass(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return 'bg-green-100 text-green-700';
    case 'fix':
      return 'bg-red-100 text-red-700';
    case 'balance':
      return 'bg-blue-100 text-blue-700';
    case 'content':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Full changelog history, newest first
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-XX-XX',
    title: 'Official Launch',
    changes: [
      { type: 'feature', description: 'Official launch of The Great Canadian Cheese Quest!' },
      { type: 'content', description: 'All 13 provinces and territories available' },
      { type: 'content', description: '30+ Canadian heroes to recruit' },
      { type: 'content', description: '50+ authentic cheese recipes to craft' },
      { type: 'feature', description: 'Three-tier prestige system: Aging, Vintage, Legacy' },
      { type: 'feature', description: 'Full accessibility support with screen readers and colorblind modes' },
    ],
  },
  {
    version: '0.9.0-beta',
    date: '2026-01-XX',
    title: 'Open Beta',
    changes: [
      { type: 'feature', description: 'Beta testing phase begins' },
      { type: 'feature', description: 'In-game feedback widget for bug reports' },
      { type: 'feature', description: 'Debug panel for beta testers' },
      { type: 'feature', description: 'Loading screen with Canadian tips' },
      { type: 'feature', description: 'Settings panel with audio, graphics, and accessibility options' },
      { type: 'feature', description: 'Keyboard shortcuts for all game actions' },
      { type: 'feature', description: 'Colorblind modes: Protanopia, Deuteranopia, Tritanopia' },
      { type: 'feature', description: 'Reduced motion and high contrast accessibility modes' },
      { type: 'content', description: 'Canada Day, Poutine Week, Hockey Season, and Winterlude events' },
      { type: 'balance', description: 'Prestige reward curves adjusted for smoother progression' },
      { type: 'fix', description: 'Combat ATB bars now properly pause when game is backgrounded' },
    ],
  },
  {
    version: '0.8.0-alpha',
    date: '2026-01-XX',
    title: 'Combat & Prestige',
    changes: [
      { type: 'feature', description: 'ATB combat system with turn-based strategy' },
      { type: 'feature', description: 'Boss battles with multiple phases' },
      { type: 'feature', description: 'Hero abilities and limit breaks' },
      { type: 'feature', description: 'Three-tier prestige system introduced' },
      { type: 'content', description: 'First 10 heroes available for recruitment' },
      { type: 'content', description: 'Ontario and Quebec zones playable' },
    ],
  },
  {
    version: '0.5.0-alpha',
    date: '2025-12-XX',
    title: 'Crafting System',
    changes: [
      { type: 'feature', description: 'Cheese crafting with 20+ recipes' },
      { type: 'feature', description: 'Aging caves for cheese maturation' },
      { type: 'feature', description: 'Cheese buffs affect production and combat' },
      { type: 'content', description: 'Ingredient drops from generators' },
    ],
  },
  {
    version: '0.2.0-alpha',
    date: '2025-11-XX',
    title: 'Foundation',
    changes: [
      { type: 'feature', description: 'Core clicker mechanics' },
      { type: 'feature', description: 'Generator system with Canadian-themed producers' },
      { type: 'feature', description: 'Upgrade system' },
      { type: 'feature', description: 'Achievement tracking' },
      { type: 'feature', description: '3D cheese wheel with click effects' },
      { type: 'feature', description: 'Procedural audio system' },
    ],
  },
];

/**
 * Get the latest version entry
 */
export function getLatestVersion(): ChangelogEntry {
  return CHANGELOG[0];
}

/**
 * Get all changes of a specific type across all versions
 */
export function getChangesByType(type: ChangeType): { version: string; change: ChangelogChange }[] {
  const results: { version: string; change: ChangelogChange }[] = [];
  for (const entry of CHANGELOG) {
    for (const change of entry.changes) {
      if (change.type === type) {
        results.push({ version: entry.version, change });
      }
    }
  }
  return results;
}

/**
 * Search changelog for matching entries
 */
export function searchChangelog(query: string): ChangelogEntry[] {
  const lowerQuery = query.toLowerCase();
  return CHANGELOG.filter(
    (entry) =>
      entry.version.toLowerCase().includes(lowerQuery) ||
      entry.title?.toLowerCase().includes(lowerQuery) ||
      entry.changes.some((c) => c.description.toLowerCase().includes(lowerQuery))
  );
}
