// Loading tips displayed during the loading screen
// Categories: gameplay, canadian_facts, humor, strategy

export interface LoadingTip {
  text: string;
  category: 'gameplay' | 'canadian_facts' | 'humor' | 'strategy';
}

export const LOADING_TIPS: LoadingTip[] = [
  // Gameplay tips
  { text: 'Aged cheese gives better buffs!', category: 'gameplay' },
  { text: 'Click the cheese wheel to earn curds manually.', category: 'gameplay' },
  { text: 'Upgrade your generators for passive curd production.', category: 'gameplay' },
  { text: 'Heroes in your party gain XP from your production.', category: 'gameplay' },
  { text: 'Equipment boosts hero stats in combat.', category: 'gameplay' },
  { text: 'Defeating zone bosses unlocks new rewards!', category: 'gameplay' },
  { text: 'The Aging prestige system resets progress for powerful bonuses.', category: 'gameplay' },
  { text: 'Craft cheese in your Affinage Caves for temporary buffs.', category: 'gameplay' },
  { text: 'Higher quality cheese provides stronger effects.', category: 'gameplay' },
  { text: 'Check back after being away - you earn curds offline!', category: 'gameplay' },

  // Canadian facts
  { text: 'Canada produces over 350 varieties of cheese!', category: 'canadian_facts' },
  { text: 'Quebec is the largest cheese-producing province in Canada.', category: 'canadian_facts' },
  { text: 'Canada exports cheese to over 50 countries worldwide.', category: 'canadian_facts' },
  { text: 'Canadian Cheddar was first produced in Ontario in the 1860s.', category: 'canadian_facts' },
  { text: 'Oka cheese was created by Trappist monks in Quebec in 1893.', category: 'canadian_facts' },
  { text: 'The average Canadian eats about 14 kg of cheese per year.', category: 'canadian_facts' },
  { text: 'Canada has over 1,000 licensed cheese manufacturers.', category: 'canadian_facts' },
  { text: 'Poutine uses fresh cheese curds for that perfect squeak!', category: 'canadian_facts' },
  { text: 'The maple leaf has been a Canadian symbol since the 1700s.', category: 'canadian_facts' },
  { text: 'Hockey and cheese: two Canadian essentials!', category: 'canadian_facts' },

  // Humor
  { text: 'Sorry for the wait, eh!', category: 'humor' },
  { text: 'Just curdling up some content...', category: 'humor' },
  { text: 'This game is grate, trust us!', category: 'humor' },
  { text: 'Whey to go - almost there!', category: 'humor' },
  { text: 'Loading... sorry if this takes a minute, eh?', category: 'humor' },
  { text: 'Gathering maple syrup for energy...', category: 'humor' },
  { text: "It's not easy being cheesy!", category: 'humor' },
  { text: 'A brie-lliant adventure awaits!', category: 'humor' },
  { text: 'Curd your enthusiasm - almost loaded!', category: 'humor' },
  { text: 'May the curds be with you!', category: 'humor' },

  // Strategy hints
  { text: 'Balance your party with Tank, DPS, and Healer heroes.', category: 'strategy' },
  { text: 'Save up for expensive upgrades - they compound your earnings.', category: 'strategy' },
  { text: 'Position tanks in front to protect your damage dealers.', category: 'strategy' },
  { text: 'Prestige when progress slows down for a permanent boost.', category: 'strategy' },
  { text: 'Different cheese types provide different buff combinations.', category: 'strategy' },
  { text: 'Hero abilities can turn the tide of difficult battles.', category: 'strategy' },
  { text: 'Limit Breaks deal massive damage - save them for bosses!', category: 'strategy' },
  { text: 'Aging Upgrades persist through prestiges.', category: 'strategy' },
  { text: 'Unlock better caves for higher quality cheese.', category: 'strategy' },
  { text: 'Formation bonuses apply when heroes are in synergy positions.', category: 'strategy' },
];

// Get a random tip
export function getRandomTip(): LoadingTip {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}

// Get a random tip text
export function getRandomTipText(): string {
  return getRandomTip().text;
}

// Get tips by category
export function getTipsByCategory(category: LoadingTip['category']): LoadingTip[] {
  return LOADING_TIPS.filter((tip) => tip.category === category);
}
