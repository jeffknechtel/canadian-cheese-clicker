import type { WeeklyChallenge } from '../types/game';

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'cheese_crafter',
    name: 'Master Fromager',
    description: 'Craft 5 cheeses this week',
    goal: { type: 'craftCheese', target: 5, description: 'Craft 5 cheeses' },
    reward: { type: 'rennet', amount: 10 },
    icon: '🧀',
  },
  {
    id: 'enemy_slayer',
    name: 'Curd Crusher',
    description: 'Defeat 100 enemies in combat',
    goal: { type: 'defeatEnemies', target: 100, description: 'Defeat 100 enemies' },
    reward: { type: 'curds', amount: 1000000 },
    icon: '⚔️',
  },
  {
    id: 'click_champion',
    name: 'Click Champion',
    description: 'Click 1,000 times this week',
    goal: { type: 'collectClicks', target: 1000, description: 'Click 1,000 times' },
    reward: { type: 'ingredient', ingredientId: 'truffle' },
    icon: '👆',
  },
  {
    id: 'zone_explorer',
    name: 'Zone Explorer',
    description: 'Complete 20 zone stages',
    goal: { type: 'completeZoneStage', target: 20, description: 'Complete 20 stages' },
    reward: { type: 'equipment', equipmentId: 'explorers_compass' },
    icon: '🗺️',
  },
  {
    id: 'buff_master',
    name: 'Buff Master',
    description: 'Consume 10 cheeses for buffs',
    goal: { type: 'consumeCheese', target: 10, description: 'Use 10 cheese buffs' },
    reward: { type: 'rennet', amount: 5 },
    icon: '✨',
  },
  {
    id: 'prestige_pusher',
    name: 'Prestige Pusher',
    description: 'Perform 3 prestige resets',
    goal: { type: 'prestigeReset', target: 3, description: 'Reset 3 times' },
    reward: { type: 'curds', amount: 5000000 },
    icon: '🔄',
  },
  {
    id: 'curd_tycoon',
    name: 'Curd Tycoon',
    description: 'Earn 1 billion curds this week',
    goal: { type: 'earnCurds', target: 1_000_000_000, description: 'Earn 1B curds' },
    reward: { type: 'rennet', amount: 15 },
    icon: '💰',
  },
  {
    id: 'monster_hunter',
    name: 'Monster Hunter',
    description: 'Defeat 250 enemies in combat',
    goal: { type: 'defeatEnemies', target: 250, description: 'Defeat 250 enemies' },
    reward: { type: 'equipment', equipmentId: 'aurora_cloak' },
    icon: '🗡️',
  },
  {
    id: 'artisan_ambition',
    name: 'Artisan Ambition',
    description: 'Craft 15 cheeses this week',
    goal: { type: 'craftCheese', target: 15, description: 'Craft 15 cheeses' },
    reward: { type: 'rennet', amount: 8 },
    icon: '🧑‍🍳',
  },
  {
    id: 'finger_of_the_north',
    name: 'Finger of the North',
    description: 'Click 2,500 times this week',
    goal: { type: 'collectClicks', target: 2500, description: 'Click 2,500 times' },
    reward: { type: 'curds', amount: 2_000_000 },
    icon: '☝️',
  },
  {
    id: 'trailblazer',
    name: 'Trailblazer',
    description: 'Complete 40 zone stages',
    goal: { type: 'completeZoneStage', target: 40, description: 'Complete 40 stages' },
    reward: { type: 'ingredient', ingredientId: 'specialty_truffle' },
    icon: '🧭',
  },
  {
    id: 'cheese_connoisseur',
    name: 'Cheese Connoisseur',
    description: 'Consume 20 cheeses for buffs',
    goal: { type: 'consumeCheese', target: 20, description: 'Use 20 cheese buffs' },
    reward: { type: 'rennet', amount: 10 },
    icon: '🫕',
  },
];

export function getWeekStartTimestamp(date: Date = new Date()): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.getTime();
}

export function getChallengeForWeek(weekStartTimestamp: number): WeeklyChallenge {
  const weeksSinceEpoch = Math.floor(weekStartTimestamp / (7 * 24 * 60 * 60 * 1000));
  const index = weeksSinceEpoch % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[index];
}

export function getChallengeById(id: string): WeeklyChallenge | undefined {
  return WEEKLY_CHALLENGES.find((c) => c.id === id);
}
