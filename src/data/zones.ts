import Decimal from 'decimal.js';
import type { ZoneDefinition, Province } from '../types/game';

/**
 * Province zones for the combat system
 *
 * Each zone has:
 * - 10 regular stages with increasing difficulty
 * - 1 boss stage at the end
 * - Unique enemy compositions based on theme
 * - Unlock requirements (previous zone completion or currency)
 *
 * Balance targets:
 * - Stage 1 beatable with 1 level-1 hero
 * - Stage 10 requires full party of level 10+ heroes
 * - Boss requires level 15+ party with good equipment
 * - Combat length: 30-60 seconds per stage at 1x speed
 */

export const ZONES: ZoneDefinition[] = [
  // ===== Ontario - Starting Zone =====
  {
    id: 'ontario_cheese_caves',
    name: 'Ontario Cheese Caves',
    province: 'ontario',
    description: 'The ancient limestone caves beneath Ontario where cheese has aged for centuries. Home to fungal creatures and the dreaded Bland Baron.',
    recommendedLevel: 1,
    unlockRequirement: { type: 'none' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['mold_sprite'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['mold_sprite', 'mold_sprite'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['mold_sprite', 'cheese_rat'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['spore_cloud', 'mold_sprite'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['spore_cloud', 'cheese_rat', 'mold_sprite'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['fungal_giant'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['spore_cloud', 'spore_cloud', 'mold_sprite'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['fungal_giant', 'mold_sprite', 'mold_sprite'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['fungal_giant', 'spore_cloud', 'cheese_rat'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['fungal_giant', 'fungal_giant'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'bland_baron',
      stageNumber: 11,
    },
  },

  // ===== Quebec - Second Zone =====
  {
    id: 'quebec_fromagerie',
    name: 'Quebec Fromagerie Ruins',
    province: 'quebec',
    description: "The haunted remains of Quebec's greatest fromagerie. Spectral cheese-makers guard ancient recipes.",
    recommendedLevel: 10,
    unlockRequirement: { type: 'zone_complete', zoneId: 'ontario_cheese_caves' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['wax_wraith', 'lactose_imp'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['wax_wraith', 'wax_wraith'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['rind_revenant', 'wax_wraith'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['lactose_imp', 'lactose_imp', 'wax_wraith'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['rind_revenant', 'lactose_imp'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['fromage_phantom'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['rind_revenant', 'rind_revenant', 'wax_wraith'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['fromage_phantom', 'lactose_imp'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['fromage_phantom', 'rind_revenant'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['fromage_phantom', 'fromage_phantom'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'fromage_fantome',
      stageNumber: 11,
    },
  },

  // ===== Alberta - Third Zone =====
  {
    id: 'alberta_oil_fields',
    name: 'Alberta Oil-Contaminated Dairy',
    province: 'alberta',
    description: 'A once-proud dairy farm now polluted by oil runoff. Mechanical and artificial creatures lurk here.',
    recommendedLevel: 20,
    unlockRequirement: { type: 'zone_complete', zoneId: 'quebec_fromagerie' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['processed_slime', 'grater_golem'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['processed_slime', 'processed_slime'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['grater_golem', 'slicer_drone'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['velveeta_blob', 'processed_slime'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['slicer_drone', 'slicer_drone', 'processed_slime'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['factory_overseer'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['velveeta_blob', 'grater_golem', 'slicer_drone'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['factory_overseer', 'processed_slime', 'processed_slime'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['velveeta_blob', 'velveeta_blob', 'slicer_drone'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['factory_overseer', 'factory_overseer'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'oil_slick_sally',
      stageNumber: 11,
    },
  },

  // ===== Saskatchewan - Fourth Zone =====
  {
    id: 'saskatchewan_prairie',
    name: 'Saskatchewan Endless Prairie',
    province: 'saskatchewan',
    description: 'The flat, endless wheat fields of Saskatchewan. The Wheat Witch commands her grain army from here.',
    recommendedLevel: 30,
    unlockRequirement: { type: 'zone_complete', zoneId: 'alberta_oil_fields' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['cheese_rat', 'cheese_rat', 'cheese_rat'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['curd_wolf', 'cheese_rat'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['curd_wolf', 'curd_wolf'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['dairy_devil', 'cheese_rat', 'cheese_rat'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['curd_wolf', 'curd_wolf', 'curd_wolf'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['dairy_devil', 'curd_wolf'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['dairy_devil', 'dairy_devil', 'cheese_rat'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['curd_wolf', 'curd_wolf', 'dairy_devil'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['dairy_devil', 'dairy_devil', 'curd_wolf'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['dairy_devil', 'dairy_devil', 'dairy_devil'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'wheat_witch',
      stageNumber: 11,
    },
  },

  // ===== British Columbia - Fifth Zone =====
  {
    id: 'bc_coastal_caves',
    name: 'BC Coastal Cheese Caves',
    province: 'bc',
    description: 'Sea caves along the BC coast where oceanic creatures have invaded the aged cheese cellars.',
    recommendedLevel: 40,
    unlockRequirement: { type: 'zone_complete', zoneId: 'saskatchewan_prairie' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['wax_wraith', 'processed_slime'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['grater_golem', 'wax_wraith'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['fromage_phantom', 'processed_slime'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['velveeta_blob', 'wax_wraith', 'wax_wraith'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['factory_overseer', 'rind_revenant'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['fromage_phantom', 'velveeta_blob'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['factory_overseer', 'fromage_phantom', 'wax_wraith'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['velveeta_blob', 'velveeta_blob', 'rind_revenant'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['factory_overseer', 'fromage_phantom', 'velveeta_blob'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['factory_overseer', 'factory_overseer', 'fromage_phantom'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'pacific_rim_crab',
      stageNumber: 11,
    },
  },

  // ===== Manitoba - Sixth Zone =====
  {
    id: 'manitoba_frozen_rinks',
    name: 'Manitoba Frozen Rinks',
    province: 'manitoba',
    description: 'Battle across frozen lakes and hockey arenas in the heart of Canada. The spirit of hockey lives here.',
    recommendedLevel: 45,
    unlockRequirement: { type: 'zone_complete', zoneId: 'bc_coastal_caves' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['zamboni_golem', 'puck_poltergeist'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['ice_resurfacer', 'puck_poltergeist'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['zamboni_golem', 'ice_resurfacer'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['puck_poltergeist', 'puck_poltergeist', 'ice_resurfacer'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['zamboni_golem', 'puck_poltergeist', 'puck_poltergeist'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['zamboni_golem', 'zamboni_golem'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['ice_resurfacer', 'ice_resurfacer', 'puck_poltergeist'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['zamboni_golem', 'ice_resurfacer', 'puck_poltergeist'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['zamboni_golem', 'zamboni_golem', 'ice_resurfacer'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['zamboni_golem', 'zamboni_golem', 'puck_poltergeist', 'puck_poltergeist'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'frozen_goalie',
      stageNumber: 11,
    },
  },

  // ===== Nova Scotia - Seventh Zone =====
  {
    id: 'nova_scotia_maritime',
    name: 'Nova Scotia Maritime Depths',
    province: 'nova_scotia',
    description: 'Explore foggy harbors and battle creatures from the Atlantic. The sea guards ancient cheese secrets.',
    recommendedLevel: 50,
    unlockRequirement: { type: 'zone_complete', zoneId: 'manitoba_frozen_rinks' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['lobster_lurker', 'fog_phantom'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['barnacle_brute', 'fog_phantom'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['lobster_lurker', 'lobster_lurker'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['fog_phantom', 'fog_phantom', 'barnacle_brute'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['lobster_lurker', 'barnacle_brute', 'fog_phantom'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['barnacle_brute', 'barnacle_brute'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['lobster_lurker', 'lobster_lurker', 'fog_phantom'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['barnacle_brute', 'lobster_lurker', 'fog_phantom'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['lobster_lurker', 'lobster_lurker', 'barnacle_brute'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['barnacle_brute', 'barnacle_brute', 'lobster_lurker', 'fog_phantom'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'the_kraken',
      stageNumber: 11,
    },
  },

  // ===== New Brunswick - Eighth Zone =====
  {
    id: 'new_brunswick_bridges',
    name: 'New Brunswick Covered Bridges',
    province: 'new_brunswick',
    description: 'Navigate haunted forests and lumber camps. The covered bridges hide dark secrets.',
    recommendedLevel: 55,
    unlockRequirement: { type: 'zone_complete', zoneId: 'nova_scotia_maritime' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['chainsaw_sprite', 'sap_slime'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['lumber_wraith', 'chainsaw_sprite'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['sap_slime', 'sap_slime'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['lumber_wraith', 'chainsaw_sprite', 'sap_slime'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['chainsaw_sprite', 'chainsaw_sprite', 'lumber_wraith'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['lumber_wraith', 'lumber_wraith'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['sap_slime', 'chainsaw_sprite', 'lumber_wraith'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['lumber_wraith', 'lumber_wraith', 'chainsaw_sprite'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['chainsaw_sprite', 'chainsaw_sprite', 'sap_slime', 'lumber_wraith'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['lumber_wraith', 'lumber_wraith', 'chainsaw_sprite', 'sap_slime'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'headless_lumberjack',
      stageNumber: 11,
    },
  },

  // ===== PEI - Ninth Zone =====
  {
    id: 'pei_annes_island',
    name: "PEI Anne's Island",
    province: 'pei',
    description: 'Idyllic farmland hides a darker secret. Imagination runs wild on this red-soiled island.',
    recommendedLevel: 60,
    unlockRequirement: { type: 'zone_complete', zoneId: 'new_brunswick_bridges' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['scarecrow_sentinel', 'potato_blight'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['red_soil_elemental', 'potato_blight'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['scarecrow_sentinel', 'scarecrow_sentinel'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['potato_blight', 'potato_blight', 'red_soil_elemental'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['scarecrow_sentinel', 'red_soil_elemental', 'potato_blight'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['red_soil_elemental', 'red_soil_elemental'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['scarecrow_sentinel', 'scarecrow_sentinel', 'potato_blight'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['red_soil_elemental', 'scarecrow_sentinel', 'potato_blight'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['scarecrow_sentinel', 'red_soil_elemental', 'red_soil_elemental'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['red_soil_elemental', 'red_soil_elemental', 'scarecrow_sentinel', 'potato_blight'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'annes_dark_side',
      stageNumber: 11,
    },
  },

  // ===== Newfoundland - Tenth Zone =====
  {
    id: 'newfoundland_viking_shores',
    name: 'Newfoundland Viking Shores',
    province: 'newfoundland',
    description: 'Ancient Viking ruins meet Atlantic icebergs. History and ice collide on these shores.',
    recommendedLevel: 70,
    unlockRequirement: { type: 'zone_complete', zoneId: 'pei_annes_island' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['draugr_dairy_thief', 'iceberg_imp'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['viking_cheese_raider', 'iceberg_imp'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['draugr_dairy_thief', 'draugr_dairy_thief'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['iceberg_imp', 'iceberg_imp', 'viking_cheese_raider'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['draugr_dairy_thief', 'viking_cheese_raider', 'iceberg_imp'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['viking_cheese_raider', 'viking_cheese_raider'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['draugr_dairy_thief', 'draugr_dairy_thief', 'iceberg_imp'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['viking_cheese_raider', 'draugr_dairy_thief', 'iceberg_imp'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['draugr_dairy_thief', 'viking_cheese_raider', 'viking_cheese_raider'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['viking_cheese_raider', 'viking_cheese_raider', 'draugr_dairy_thief', 'iceberg_imp'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'iceberg_leviathan',
      stageNumber: 11,
    },
  },

  // ===== Yukon - Eleventh Zone =====
  {
    id: 'yukon_gold_rush',
    name: 'Yukon Gold Rush Frontier',
    province: 'yukon',
    description: 'Abandoned mines and permafrost dangers. The ghosts of gold rush prospectors still wander.',
    recommendedLevel: 80,
    unlockRequirement: { type: 'zone_complete', zoneId: 'newfoundland_viking_shores' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['claim_jumper_ghost', 'permafrost_parasite'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['gold_fever_demon', 'claim_jumper_ghost'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['permafrost_parasite', 'permafrost_parasite'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['claim_jumper_ghost', 'claim_jumper_ghost', 'gold_fever_demon'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['gold_fever_demon', 'permafrost_parasite', 'claim_jumper_ghost'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['gold_fever_demon', 'gold_fever_demon'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['claim_jumper_ghost', 'claim_jumper_ghost', 'permafrost_parasite'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['gold_fever_demon', 'claim_jumper_ghost', 'permafrost_parasite'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['gold_fever_demon', 'gold_fever_demon', 'claim_jumper_ghost'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['gold_fever_demon', 'gold_fever_demon', 'claim_jumper_ghost', 'permafrost_parasite'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'the_wendigo',
      stageNumber: 11,
    },
  },

  // ===== NWT - Twelfth Zone =====
  {
    id: 'nwt_aurora_territories',
    name: 'NWT Aurora Territories',
    province: 'nwt',
    description: 'Chase the dancing lights across the tundra. The aurora hides mysteries beyond imagination.',
    recommendedLevel: 90,
    unlockRequirement: { type: 'zone_complete', zoneId: 'yukon_gold_rush' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['light_dancer', 'aurora_wisp'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['tundra_wolf', 'aurora_wisp'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['light_dancer', 'light_dancer'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['aurora_wisp', 'aurora_wisp', 'tundra_wolf'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['light_dancer', 'tundra_wolf', 'aurora_wisp'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['tundra_wolf', 'tundra_wolf'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['light_dancer', 'light_dancer', 'aurora_wisp'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['tundra_wolf', 'light_dancer', 'aurora_wisp'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['light_dancer', 'tundra_wolf', 'tundra_wolf'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['tundra_wolf', 'tundra_wolf', 'light_dancer', 'aurora_wisp'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'aurora_serpent',
      stageNumber: 11,
    },
  },

  // ===== Nunavut - Final Zone =====
  {
    id: 'nunavut_frozen_crown',
    name: 'Nunavut The Frozen Crown',
    province: 'nunavut',
    description: 'The ultimate challenge at the top of the world. Only the strongest cheese champions reach this frozen realm.',
    recommendedLevel: 100,
    unlockRequirement: { type: 'zone_complete', zoneId: 'nwt_aurora_territories' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['ice_spirit', 'seal_hunter_shade'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['polar_bear_patriarch', 'seal_hunter_shade'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['ice_spirit', 'ice_spirit'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['seal_hunter_shade', 'seal_hunter_shade', 'polar_bear_patriarch'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['ice_spirit', 'polar_bear_patriarch', 'seal_hunter_shade'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['polar_bear_patriarch', 'polar_bear_patriarch'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['ice_spirit', 'ice_spirit', 'seal_hunter_shade'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['polar_bear_patriarch', 'ice_spirit', 'seal_hunter_shade'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 9,
        enemies: ['ice_spirit', 'polar_bear_patriarch', 'polar_bear_patriarch'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 10,
        enemies: ['polar_bear_patriarch', 'polar_bear_patriarch', 'ice_spirit', 'seal_hunter_shade'],
        enemyLevelModifier: 1.6,
      },
    ],
    bossStage: {
      bossId: 'sedna',
      stageNumber: 11,
    },
  },

  // ===== MYTHOLOGY QUESTLINES =====
  // Special endgame content based on Canadian mythology

  // ===== Thunderbird Saga - Mythology Zone =====
  {
    id: 'thunderbird_saga',
    name: 'Thunderbird Saga',
    province: 'bc', // Pacific Northwest mythology
    description: 'Ally with the legendary Thunderbird against chaos forces. A 15-stage epic questline featuring sky battles and cosmic enemies. Complete 5 provinces to unlock.',
    recommendedLevel: 80,
    unlockRequirement: { type: 'zone_complete', zoneId: 'bc_coastal_caves' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['sky_serpent', 'chaos_wisp'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['storm_hawk', 'chaos_wisp', 'chaos_wisp'],
        enemyLevelModifier: 1.05,
      },
      {
        stageNumber: 3,
        enemies: ['sky_serpent', 'storm_hawk'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 4,
        enemies: ['void_stalker', 'chaos_wisp', 'sky_serpent'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 5,
        enemies: ['storm_hawk', 'storm_hawk', 'chaos_wisp'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 6,
        enemies: ['void_stalker', 'sky_serpent'],
        enemyLevelModifier: 1.25,
      },
      {
        stageNumber: 7,
        enemies: ['chaos_wisp', 'chaos_wisp', 'void_stalker', 'storm_hawk'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 8,
        enemies: ['sky_serpent', 'sky_serpent', 'void_stalker'],
        enemyLevelModifier: 1.35,
      },
      {
        stageNumber: 9,
        enemies: ['void_stalker', 'void_stalker', 'storm_hawk'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 10,
        enemies: ['storm_hawk', 'sky_serpent', 'void_stalker', 'chaos_wisp'],
        enemyLevelModifier: 1.45,
      },
      {
        stageNumber: 11,
        enemies: ['void_stalker', 'void_stalker', 'void_stalker'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 12,
        enemies: ['sky_serpent', 'sky_serpent', 'storm_hawk', 'storm_hawk'],
        enemyLevelModifier: 1.55,
      },
      {
        stageNumber: 13,
        enemies: ['void_stalker', 'chaos_wisp', 'chaos_wisp', 'sky_serpent'],
        enemyLevelModifier: 1.6,
      },
      {
        stageNumber: 14,
        enemies: ['storm_hawk', 'storm_hawk', 'void_stalker', 'void_stalker'],
        enemyLevelModifier: 1.65,
      },
      {
        stageNumber: 15,
        enemies: ['void_stalker', 'void_stalker', 'sky_serpent', 'storm_hawk'],
        enemyLevelModifier: 1.7,
      },
    ],
    bossStage: {
      bossId: 'chaos_incarnate',
      stageNumber: 16,
    },
  },

  // ===== Wendigo Warning - Mythology Zone =====
  {
    id: 'wendigo_warning',
    name: 'Wendigo Warning',
    province: 'yukon', // Northern horror mythology
    description: 'A cautionary tale about greed in the frozen north. The hunger mechanic drains curds over time - defeat enemies quickly to minimize losses. Anti-hoarding challenge zone.',
    recommendedLevel: 90,
    unlockRequirement: { type: 'zone_complete', zoneId: 'yukon_gold_rush' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['hunger_shade', 'frost_wretch'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['greed_phantom', 'hunger_shade'],
        enemyLevelModifier: 1.1,
      },
      {
        stageNumber: 3,
        enemies: ['frost_wretch', 'frost_wretch', 'hunger_shade'],
        enemyLevelModifier: 1.2,
      },
      {
        stageNumber: 4,
        enemies: ['greed_phantom', 'greed_phantom'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 5,
        enemies: ['hunger_shade', 'greed_phantom', 'frost_wretch'],
        enemyLevelModifier: 1.4,
      },
      {
        stageNumber: 6,
        enemies: ['frost_wretch', 'frost_wretch', 'greed_phantom'],
        enemyLevelModifier: 1.5,
      },
      {
        stageNumber: 7,
        enemies: ['greed_phantom', 'hunger_shade', 'hunger_shade'],
        enemyLevelModifier: 1.6,
      },
      {
        stageNumber: 8,
        enemies: ['frost_wretch', 'greed_phantom', 'greed_phantom'],
        enemyLevelModifier: 1.7,
      },
      {
        stageNumber: 9,
        enemies: ['hunger_shade', 'hunger_shade', 'frost_wretch', 'greed_phantom'],
        enemyLevelModifier: 1.8,
      },
      {
        stageNumber: 10,
        enemies: ['greed_phantom', 'greed_phantom', 'frost_wretch', 'hunger_shade'],
        enemyLevelModifier: 1.9,
      },
    ],
    bossStage: {
      bossId: 'wendigo_prime',
      stageNumber: 11,
    },
  },

  // ===== La Chasse-Galerie - Mythology Zone =====
  {
    id: 'chasse_galerie',
    name: 'La Chasse-Galerie',
    province: 'quebec', // French-Canadian folklore
    description: 'Race across the night sky in the legendary flying canoe! A 7-stage timed challenge based on the famous Quebec legend. Speed and precision are key - the Devil awaits those who fail.',
    recommendedLevel: 70,
    unlockRequirement: { type: 'zone_complete', zoneId: 'quebec_fromagerie' },
    stages: [
      {
        stageNumber: 1,
        enemies: ['sky_voyageur', 'wind_spirit'],
        enemyLevelModifier: 1.0,
      },
      {
        stageNumber: 2,
        enemies: ['night_terror', 'sky_voyageur'],
        enemyLevelModifier: 1.15,
      },
      {
        stageNumber: 3,
        enemies: ['wind_spirit', 'wind_spirit', 'sky_voyageur'],
        enemyLevelModifier: 1.3,
      },
      {
        stageNumber: 4,
        enemies: ['night_terror', 'night_terror'],
        enemyLevelModifier: 1.45,
      },
      {
        stageNumber: 5,
        enemies: ['sky_voyageur', 'sky_voyageur', 'wind_spirit'],
        enemyLevelModifier: 1.6,
      },
      {
        stageNumber: 6,
        enemies: ['night_terror', 'wind_spirit', 'sky_voyageur'],
        enemyLevelModifier: 1.75,
      },
      {
        stageNumber: 7,
        enemies: ['night_terror', 'night_terror', 'sky_voyageur', 'wind_spirit'],
        enemyLevelModifier: 1.9,
      },
    ],
    bossStage: {
      bossId: 'devil_of_the_deal',
      stageNumber: 8,
    },
  },
];

// ===== Helper Functions =====

/**
 * Get a zone definition by ID
 */
export function getZoneById(id: string): ZoneDefinition | undefined {
  return ZONES.find((z) => z.id === id);
}

/**
 * Get all zones for a specific province
 */
export function getZonesByProvince(province: Province): ZoneDefinition[] {
  return ZONES.filter((z) => z.province === province);
}

/**
 * Get zones in progression order (by recommended level)
 */
export function getZonesInOrder(): ZoneDefinition[] {
  return [...ZONES].sort((a, b) => a.recommendedLevel - b.recommendedLevel);
}

/**
 * Check if a zone is unlocked based on progress
 */
export function isZoneUnlocked(
  zone: ZoneDefinition,
  zoneProgress: Record<string, { bossDefeated: boolean }>,
  curds: Decimal,
  achievements: string[]
): boolean {
  const req = zone.unlockRequirement;

  switch (req.type) {
    case 'none':
      return true;

    case 'zone_complete':
      return zoneProgress[req.zoneId]?.bossDefeated ?? false;

    case 'curds':
      return curds.gte(req.amount);

    case 'achievement':
      return achievements.includes(req.achievementId);

    default:
      return false;
  }
}

/**
 * Get the next zone to unlock after completing a given zone
 */
export function getNextZone(currentZoneId: string): ZoneDefinition | undefined {
  const orderedZones = getZonesInOrder();
  const currentIndex = orderedZones.findIndex((z) => z.id === currentZoneId);

  if (currentIndex === -1 || currentIndex === orderedZones.length - 1) {
    return undefined;
  }

  return orderedZones[currentIndex + 1];
}

/**
 * Get the total number of stages in a zone (including boss)
 */
export function getTotalStages(zone: ZoneDefinition): number {
  return zone.stages.length + 1; // Regular stages + boss stage
}

/**
 * Calculate zone completion percentage
 */
export function getZoneCompletionPercent(
  zone: ZoneDefinition,
  highestStageCleared: number,
  bossDefeated: boolean
): number {
  const totalStages = getTotalStages(zone);

  if (bossDefeated) {
    return 100;
  }

  return Math.floor((highestStageCleared / totalStages) * 100);
}

/**
 * Get province display name with proper capitalization
 */
export function getProvinceDisplayName(province: Province): string {
  const names: Record<Province, string> = {
    ontario: 'Ontario',
    quebec: 'Quebec',
    alberta: 'Alberta',
    manitoba: 'Manitoba',
    saskatchewan: 'Saskatchewan',
    yukon: 'Yukon',
    bc: 'British Columbia',
    nova_scotia: 'Nova Scotia',
    new_brunswick: 'New Brunswick',
    pei: 'Prince Edward Island',
    newfoundland: 'Newfoundland & Labrador',
    nwt: 'Northwest Territories',
    nunavut: 'Nunavut',
  };
  return names[province];
}

/**
 * Get a stage by zone ID and stage number
 */
export function getStage(zoneId: string, stageNumber: number) {
  const zone = getZoneById(zoneId);
  if (!zone) return undefined;

  if (stageNumber === zone.bossStage.stageNumber) {
    return { type: 'boss' as const, bossStage: zone.bossStage };
  }

  const stage = zone.stages.find((s) => s.stageNumber === stageNumber);
  if (!stage) return undefined;

  return { type: 'regular' as const, stage };
}
