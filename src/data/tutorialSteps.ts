import type { TutorialStepId, LoreEntryId } from '../stores/slices/tutorial';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  message: string;
  loreId?: LoreEntryId;
  autoDismissMs?: number;
}

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStep> = {
  intro: {
    id: 'intro',
    title: 'Welcome, Friend!',
    message:
      "I'm Gus — been aging in these caves longer than confederation, eh? Dark forces threaten Canada's finest fromage. Click that cheese wheel to get started, bud!",
    loreId: 'intro_story',
  },
  firstClick: {
    id: 'firstClick',
    title: 'Nice Click!',
    message:
      "That's the spirit! Every click earns curds — the currency of cheese. Keep clicking to build up your stash, eh?",
    autoDismissMs: 6000,
  },
  firstCurds: {
    id: 'firstCurds',
    title: 'Curds Earned!',
    message:
      "You're a natural! See that Generators panel? Those beauties produce curds automatically. Time to hire some help!",
    loreId: 'quest_begins',
  },
  firstGenerator: {
    id: 'firstGenerator',
    title: 'Automated Production!',
    message:
      "Beauty! Generators produce curds every second without lifting a finger. That's your CPS — Curds Per Second. More generators = more CPS!",
  },
  explainCps: {
    id: 'explainCps',
    title: 'CPS Growing!',
    message:
      "Your CPS is climbing, bud! The number at the top shows your production rate. Upgrades and more generators will boost it even higher.",
    autoDismissMs: 5000,
  },
  explainUpgrades: {
    id: 'explainUpgrades',
    title: 'Upgrades Available!',
    message:
      "Check the Upgrades tab — those power-ups multiply your production. Each one makes your cheese empire stronger, eh?",
  },
  combatUnlock: {
    id: 'combatUnlock',
    title: 'Combat Unlocked!',
    message:
      "Whoa there! You've got real curd power now. Nasty creatures are guarding cheese caves across Canada. Time to fight back!",
    loreId: 'dark_forces',
  },
  firstZone: {
    id: 'firstZone',
    title: 'Into Battle!',
    message:
      "Heroes fight automatically using ATB — their bar fills, then they act. Defeat enemies to progress through stages. Beat the boss to unlock more zones!",
  },
  firstBossDefeated: {
    id: 'firstBossDefeated',
    title: 'Boss Defeated!',
    message:
      "Beauty of a fight! You've liberated your first zone. Each province has unique enemies and bosses. Keep exploring Canada, eh?",
  },
  heroesUnlock: {
    id: 'heroesUnlock',
    title: 'Heroes Unlock!',
    message:
      "Your reputation grows! Heroes from across Canada want to join your quest. Recruit them to build a stronger party.",
    loreId: 'heroes_answer',
  },
  firstHeroRecruited: {
    id: 'firstHeroRecruited',
    title: 'Hero Recruited!',
    message:
      "Welcome to the team! Each hero has unique abilities. You can have up to 4 heroes in your active party — choose wisely, bud!",
  },
  craftingUnlock: {
    id: 'craftingUnlock',
    title: 'Crafting Unlocked!',
    message:
      "Ancient cheese recipes await! Craft special cheeses for powerful buffs. The better your ingredients, the stronger the result.",
    loreId: 'ancient_recipes',
  },
  prestigeUnlock: {
    id: 'prestigeUnlock',
    title: 'Prestige Available!',
    message:
      "Sorry to say it, bud, but real cheese needs aging. Reset your progress to earn Rennet — a permanent multiplier that makes your next run stronger.",
    loreId: 'secret_of_aging',
  },
  firstAging: {
    id: 'firstAging',
    title: 'Legend Grows!',
    message:
      "Your cheese has aged! That Rennet multiplies ALL your production now. Each reset earns more — your legend grows with every aging cycle, eh?",
    loreId: 'legend_grows',
  },
};

export const TUTORIAL_ORDER: TutorialStepId[] = [
  'intro',
  'firstClick',
  'firstCurds',
  'firstGenerator',
  'explainCps',
  'explainUpgrades',
  'combatUnlock',
  'firstZone',
  'firstBossDefeated',
  'heroesUnlock',
  'firstHeroRecruited',
  'craftingUnlock',
  'prestigeUnlock',
  'firstAging',
];
