/**
 * Canadian Dialogue System
 *
 * Contains Canadian phrases, slang, and messages that appear throughout
 * the game at milestones, achievements, and random intervals.
 */

export type DialogueTrigger = 'random' | 'milestone' | 'achievement' | 'purchase' | 'combat_start' | 'combat_victory' | 'combat_defeat' | 'limit_break';

export interface DialogueEntry {
  text: string;
  trigger: DialogueTrigger;
  weight?: number; // For weighted random selection (default: 1)
}

/**
 * Canadian phrases pool - categorized by trigger type
 */
export const CANADIAN_PHRASES: DialogueEntry[] = [
  // ===== Random phrases (appear periodically) =====
  { text: "Beauty, eh!", trigger: 'random', weight: 2 },
  { text: "That's a real beaut!", trigger: 'random' },
  { text: "Give'r!", trigger: 'random', weight: 2 },
  { text: "Take off, ya hoser!", trigger: 'random' },
  { text: "Toque's on tight, let's go!", trigger: 'random' },
  { text: "Out for a rip, are ya bud?", trigger: 'random' },
  { text: "Keep your stick on the ice!", trigger: 'random', weight: 2 },
  { text: "Just gonna send it!", trigger: 'random' },
  { text: "Yer darn tootin'!", trigger: 'random' },
  { text: "Fill yer boots!", trigger: 'random' },
  { text: "How's she goin', bud?", trigger: 'random' },
  { text: "Right on, right on!", trigger: 'random' },
  { text: "Holy doodle!", trigger: 'random' },
  { text: "What a gongshow!", trigger: 'random' },
  { text: "That's gouda stuff, eh!", trigger: 'random' },
  { text: "Pitter patter, let's get at 'er!", trigger: 'random' },
  { text: "Wheel, snipe, celly!", trigger: 'random' },
  { text: "Ferda!", trigger: 'random' },
  { text: "Tarps off, boys!", trigger: 'random' },
  { text: "Could've had a Timbits moment there!", trigger: 'random' },

  // ===== Milestone phrases (curd thresholds) =====
  { text: "Holy smokes, that's a lot of curds!", trigger: 'milestone' },
  { text: "You're a real keener, eh!", trigger: 'milestone' },
  { text: "Now that's what I call a haul!", trigger: 'milestone' },
  { text: "Lookin' like a true Canuck cheesemaker!", trigger: 'milestone' },
  { text: "From coast to coast, that's impressive!", trigger: 'milestone' },
  { text: "You're on a roll there, bud!", trigger: 'milestone' },
  { text: "That's gonna need a bigger cooler!", trigger: 'milestone' },
  { text: "The Great White North approves!", trigger: 'milestone' },
  { text: "Now we're cooking with maple syrup!", trigger: 'milestone' },
  { text: "A true Canadian cheese legend!", trigger: 'milestone' },

  // ===== Achievement phrases =====
  { text: "Way to go, bud!", trigger: 'achievement' },
  { text: "That's somethin' to write home aboot!", trigger: 'achievement' },
  { text: "You've earned your maple stripes!", trigger: 'achievement' },
  { text: "A gold medal performance, eh!", trigger: 'achievement' },
  { text: "Worthy of the Order of Canada!", trigger: 'achievement' },
  { text: "That's gonna make the highlights reel!", trigger: 'achievement' },
  { text: "Standing on guard for cheese!", trigger: 'achievement' },
  { text: "Better than a double-double at Timmy's!", trigger: 'achievement' },

  // ===== Purchase phrases (bulk buy) =====
  { text: "Good choice, eh!", trigger: 'purchase' },
  { text: "Now we're cookin' with gas!", trigger: 'purchase' },
  { text: "That's gouda be good!", trigger: 'purchase' },
  { text: "Smart investment there, bud!", trigger: 'purchase' },
  { text: "Cha-ching, eh!", trigger: 'purchase' },
  { text: "Your cheese empire grows!", trigger: 'purchase' },
  { text: "That'll bring in the curds!", trigger: 'purchase' },
  { text: "A solid upgrade, friend!", trigger: 'purchase' },

  // ===== Combat Start phrases =====
  { text: "Let's give 'er, eh!", trigger: 'combat_start', weight: 2 },
  { text: "Time to wheel and deal, boys!", trigger: 'combat_start' },
  { text: "For the Great White North!", trigger: 'combat_start' },
  { text: "Toque's on, gloves off!", trigger: 'combat_start', weight: 2 },
  { text: "Let's show 'em how it's done, bud!", trigger: 'combat_start' },
  { text: "Ready to drop the puck!", trigger: 'combat_start' },
  { text: "Nobody messes with our curds!", trigger: 'combat_start' },
  { text: "Time for a good ol' donnybrook!", trigger: 'combat_start' },
  { text: "Coast to coast, let's go!", trigger: 'combat_start' },
  { text: "Ferda boys, ferda cheese!", trigger: 'combat_start' },

  // ===== Combat Victory phrases =====
  { text: "Beauty! That was gouda!", trigger: 'combat_victory', weight: 2 },
  { text: "Now THAT'S how you do it, eh!", trigger: 'combat_victory' },
  { text: "Wheel, snipe, celly! Victory!", trigger: 'combat_victory' },
  { text: "Another one bites the dust, bud!", trigger: 'combat_victory' },
  { text: "What a beaut of a fight!", trigger: 'combat_victory' },
  { text: "For Canada and cheese!", trigger: 'combat_victory' },
  { text: "That's a wrap, folks! Sorry not sorry!", trigger: 'combat_victory' },
  { text: "Champions of the True North!", trigger: 'combat_victory' },
  { text: "Bar down, top cheese!", trigger: 'combat_victory' },
  { text: "Dirty dangles for the win!", trigger: 'combat_victory' },

  // ===== Combat Defeat phrases =====
  { text: "Sorry about that, folks...", trigger: 'combat_defeat', weight: 2 },
  { text: "We'll get 'em next time, eh!", trigger: 'combat_defeat' },
  { text: "That was rough, bud...", trigger: 'combat_defeat' },
  { text: "Time to lick our wounds and try again!", trigger: 'combat_defeat' },
  { text: "Shoulda had a Timmys first...", trigger: 'combat_defeat' },
  { text: "Back to the drawing board, friend!", trigger: 'combat_defeat' },
  { text: "That one's gonna leave a mark, eh!", trigger: 'combat_defeat' },
  { text: "Not our finest moment...", trigger: 'combat_defeat' },

  // ===== Limit Break phrases =====
  { text: "FULL SEND, BUD!", trigger: 'limit_break', weight: 2 },
  { text: "COAST TO COAST!", trigger: 'limit_break' },
  { text: "FOR THE GLORY OF CANADA!", trigger: 'limit_break' },
  { text: "LIMIT BREAK, EH!", trigger: 'limit_break', weight: 2 },
  { text: "MAPLE POWER UNLEASHED!", trigger: 'limit_break' },
  { text: "THIS ONE'S FOR THE CURDS!", trigger: 'limit_break' },
  { text: "ABSOLUTE UNIT MOVE!", trigger: 'limit_break' },
  { text: "BEAUTY OF A FINISHER!", trigger: 'limit_break' },
];

/**
 * Error messages with Canadian flair
 */
export const ERROR_MESSAGES = {
  notEnoughCurds: "Sorry, you don't have enough curds, eh!",
  alreadyOwned: "You already got that one, bud!",
  generic: "Oops, something went sideways there, sorry aboot that!",
  maxOwned: "That's all of 'em, friend!",
  tooExpensive: "Gonna need a few more curds for that one, bud!",
};

/**
 * Welcome back messages for offline progress modal
 */
export const WELCOME_BACK_MESSAGES = [
  "Welcome back, eh! Here's what you earned while you were out:",
  "Oh hey there bud! Your cheese empire kept churning:",
  "You're back! The curds kept coming:",
  "Missed ya, friend! Look what your cheesemakers did:",
  "Bienvenue back! Your curds multiplied while you were away:",
  "The Great White North welcomes you back! Here's your haul:",
];

/**
 * Get a random phrase by trigger type
 */
export function getRandomPhrase(trigger: DialogueTrigger): string {
  const phrases = CANADIAN_PHRASES.filter(p => p.trigger === trigger);
  if (phrases.length === 0) return "Beauty, eh!";

  // Weighted random selection
  const totalWeight = phrases.reduce((sum, p) => sum + (p.weight ?? 1), 0);
  let random = Math.random() * totalWeight;

  for (const phrase of phrases) {
    random -= phrase.weight ?? 1;
    if (random <= 0) {
      return phrase.text;
    }
  }

  return phrases[0].text;
}

/**
 * Get a random welcome back message
 */
export function getWelcomeBackMessage(): string {
  const index = Math.floor(Math.random() * WELCOME_BACK_MESSAGES.length);
  return WELCOME_BACK_MESSAGES[index];
}

/**
 * Milestone thresholds that trigger dialogue
 * Uses exponential scaling for the "wow" factor
 */
export const MILESTONE_THRESHOLDS = [
  1_000,              // 1K
  10_000,             // 10K
  100_000,            // 100K
  1_000_000,          // 1M
  10_000_000,         // 10M
  100_000_000,        // 100M
  1_000_000_000,      // 1B
  10_000_000_000,     // 10B
  100_000_000_000,    // 100B
  1_000_000_000_000,  // 1T
  10_000_000_000_000, // 10T
  100_000_000_000_000, // 100T
  1_000_000_000_000_000, // 1Qa
];

// ===== Prestige System Dialogue =====

export const PRESTIGE_DIALOGUES = {
  beforeAging: [
    "Ready to let your cheese empire age, eh?",
    "Time to mature your fromage fortune!",
    "Your cheese is ready for the cave!",
    "Let's age this curd empire, bud!",
    "Time for some premium aging, doncha know?",
    "Your wheels are ready for the cellar, friend!",
    "A wise cheesemaker knows when to age, eh!",
  ],
  afterAging: [
    "Beauty! Your cheese empire has aged magnificently!",
    "Now that's some vintage quality, bud!",
    "Your Rennet is flowing like maple syrup!",
    "That's one fine aged empire, eh!",
    "Smoother than a fresh Oka wheel!",
    "Your patience has paid off, friend!",
    "The cave has treated you well, hoser!",
    "Now we're talking aged cheddar quality!",
  ],
  milestoneResets: {
    1: "Your first Aging! Welcome to the affineur life, bud!",
    5: "Five resets? You're getting the hang of it, eh!",
    10: "Double-double resets! You're a true affineur!",
    25: "Twenty-five resets! That's dedication, friend!",
    50: "Fifty resets? That's some serious commitment, eh!",
    100: "A hundred resets! Vintage tier unlocked, hoser!",
  } as Record<number, string>,
  rennetMilestones: {
    10: "Ten Rennet! Your empire's starting to mature!",
    50: "Fifty Rennet! That's some quality aging, bud!",
    100: "A hundred Rennet! You're a cheese sommelier now!",
    500: "Five hundred Rennet! Legendary status, eh!",
    1000: "A thousand Rennet! Hall of Fame material, friend!",
  } as Record<number, string>,
};

/**
 * Get a random prestige dialogue message
 */
export function getPrestigeDialogue(type: 'beforeAging' | 'afterAging'): string {
  const messages = PRESTIGE_DIALOGUES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get a milestone reset message if applicable
 */
export function getResetMilestoneMessage(resetCount: number): string | null {
  return PRESTIGE_DIALOGUES.milestoneResets[resetCount] ?? null;
}

/**
 * Get a Rennet milestone message if applicable
 */
export function getRennetMilestoneMessage(rennetAmount: number): string | null {
  // Check milestones in descending order to get the highest one just reached
  const milestones = [1000, 500, 100, 50, 10];
  for (const milestone of milestones) {
    if (rennetAmount === milestone) {
      return PRESTIGE_DIALOGUES.rennetMilestones[milestone];
    }
  }
  return null;
}
