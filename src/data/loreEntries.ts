import type { LoreEntryId, CodexSectionId } from '../stores/slices/tutorial';

export interface LoreEntry {
  id: LoreEntryId;
  title: string;
  text: string;
  section: CodexSectionId;
}

export const LORE_ENTRIES: Record<string, LoreEntry> = {
  intro_story: {
    id: 'intro_story',
    title: 'The Beginning',
    text: "Dark forces threaten Canada's artisanal cheese. From the limestone caves of Ontario to the fromageries of Quebec, creatures born of processed cheese have risen. Only you can restore the nation's dairy destiny.",
    section: 'story',
  },
  quest_begins: {
    id: 'quest_begins',
    title: 'The Quest Begins',
    text: 'With your first curds earned, the Great Canadian Cheese Quest truly begins. Every wheel turned, every curd collected brings hope to a nation under siege.',
    section: 'story',
  },
  dark_forces: {
    id: 'dark_forces',
    title: 'Dark Forces',
    text: "The Bland Baron's armies spread across Canada, replacing craft cheese with processed imitations. Heroes are needed to reclaim the caves and fromageries.",
    section: 'story',
  },
  heroes_answer: {
    id: 'heroes_answer',
    title: 'Heroes Answer',
    text: 'From every province, heroes answer the call — knights, mages, and warriors united by their love of authentic fromage.',
    section: 'story',
  },
  ancient_recipes: {
    id: 'ancient_recipes',
    title: 'Ancient Recipes',
    text: 'Deep in the cheese caves, ancient recipes await rediscovery. Each crafted cheese carries the wisdom of generations of Canadian fromagers.',
    section: 'cheese_lore',
  },
  secret_of_aging: {
    id: 'secret_of_aging',
    title: 'The Secret of Aging',
    text: 'True cheese masters know: patience transforms curds into legends. Through aging, your cheese empire grows stronger with each cycle.',
    section: 'cheese_lore',
  },
  legend_grows: {
    id: 'legend_grows',
    title: 'A Legend Grows',
    text: "With each aging, your reputation spreads across Canada. The Rennet you've earned will echo through all your future endeavors.",
    section: 'story',
  },

  province_ontario_cheese_caves: {
    id: 'province_ontario_cheese_caves',
    title: 'Ontario Liberated',
    text: "The Bland Baron's factory falls silent. Ontario's limestone caves are free to age artisanal cheese once more.",
    section: 'provinces',
  },
  province_quebec_fromagerie: {
    id: 'province_quebec_fromagerie',
    title: 'Quebec Restored',
    text: "Le Fromage Fantome fades away. Quebec's fromageries resume their sacred craft, and the spirit of French-Canadian cheese-making lives on.",
    section: 'provinces',
  },
  province_alberta_oil_fields: {
    id: 'province_alberta_oil_fields',
    title: 'Alberta Reclaimed',
    text: "Oil Slick Sally's wells run dry. Alberta's prairies return to dairy farming, proving that cheese is mightier than petroleum.",
    section: 'provinces',
  },
  province_manitoba_frozen_rinks: {
    id: 'province_manitoba_frozen_rinks',
    title: 'Manitoba Defended',
    text: 'The Frozen Goalie takes their final penalty. Manitoba celebrates with hot poutine on cold rinks.',
    section: 'provinces',
  },
  province_saskatchewan_wheat_fields: {
    id: 'province_saskatchewan_wheat_fields',
    title: 'Saskatchewan Saved',
    text: 'The Grain Golem crumbles. Saskatchewan returns to peaceful wheat fields under endless skies.',
    section: 'provinces',
  },
  province_bc_rainforest: {
    id: 'province_bc_rainforest',
    title: 'BC Protected',
    text: 'The Sasquatch Sentinel retreats to the deep forest. BC remains a sanctuary for both wildlife and wild cheeses.',
    section: 'provinces',
  },
  province_nova_scotia_harbors: {
    id: 'province_nova_scotia_harbors',
    title: 'Nova Scotia Secured',
    text: "The Bluenose Phantom sails no more. Nova Scotia's foggy harbors welcome cheese ships once again.",
    section: 'provinces',
  },
  province_pei_annes_island: {
    id: 'province_pei_annes_island',
    title: 'PEI Dreaming',
    text: 'Imagination returns to red-soiled shores. PEI produces cheese as vibrant as its sunsets.',
    section: 'provinces',
  },
  province_newfoundland_screech_shores: {
    id: 'province_newfoundland_screech_shores',
    title: 'Newfoundland Free',
    text: "Kiss the cod and celebrate! Newfoundland's shores ring with screech and victory songs.",
    section: 'provinces',
  },
  province_new_brunswick_tides: {
    id: 'province_new_brunswick_tides',
    title: 'New Brunswick Balanced',
    text: 'The Fundy tides flow peacefully. New Brunswick returns to its maritime cheese traditions.',
    section: 'provinces',
  },
  province_yukon_gold_rush: {
    id: 'province_yukon_gold_rush',
    title: 'Yukon Claimed',
    text: 'Permafrost recedes from the cheese caves. The Yukon proves some treasures are worth more than gold.',
    section: 'provinces',
  },
  province_nwt_aurora: {
    id: 'province_nwt_aurora',
    title: 'NWT Illuminated',
    text: 'The aurora shines brighter without dark magic. The Northwest Territories embrace their northern cheese destiny.',
    section: 'provinces',
  },
  province_nunavut_arctic: {
    id: 'province_nunavut_arctic',
    title: 'Nunavut Honored',
    text: "The frozen north yields ancient secrets. Nunavut's cheese caves reveal mysteries older than memory.",
    section: 'provinces',
  },

  province_thunderbird_peak: {
    id: 'province_thunderbird_peak',
    title: 'Thunderbird Peak',
    text: 'The legendary Thunderbird acknowledges your strength. Ancient Pacific Northwest power flows through your cheese.',
    section: 'provinces',
  },
  province_wendigo_wastes: {
    id: 'province_wendigo_wastes',
    title: 'Wendigo Wastes',
    text: 'The hunger spirit is sated at last. The frozen wastes remember your courage.',
    section: 'provinces',
  },
  province_chasse_galerie: {
    id: 'province_chasse_galerie',
    title: 'La Chasse-Galerie',
    text: "The flying canoe lands safely. The voyageurs' legend lives on in the cheese you've saved.",
    section: 'provinces',
  },
};

export function getLoreEntry(id: LoreEntryId): LoreEntry | undefined {
  return LORE_ENTRIES[id];
}

export function getLoreEntriesBySection(section: CodexSectionId): LoreEntry[] {
  return Object.values(LORE_ENTRIES).filter((entry) => entry.section === section);
}
