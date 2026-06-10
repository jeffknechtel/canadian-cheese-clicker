/**
 * Save game migration ladder.
 * Each migration transforms data from one version to the next.
 */

export const CURRENT_VERSION = 8;

interface SerializedGameState {
  version?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: SerializedGameState) => SerializedGameState;
}

const migrations: Migration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (data) => ({
      ...data,
      achievements: data.achievements ?? [],
      ehCount: data.ehCount ?? 0,
      lastMilestone: data.lastMilestone ?? 0,
    }),
  },
  {
    fromVersion: 2,
    toVersion: 3,
    migrate: (data) => ({
      ...data,
      heroes: data.heroes ?? {},
      party: data.party ?? {
        frontLeft: null,
        frontRight: null,
        backLeft: null,
        backRight: null,
      },
      equipmentInventory: data.equipmentInventory ?? [],
    }),
  },
  {
    fromVersion: 3,
    toVersion: 4,
    migrate: (data) => ({
      ...data,
      prestige: data.prestige ?? {
        rennet: 0,
        totalRennet: 0,
        agingResetCount: 0,
        agingUpgrades: [],
        vintageWheels: 0,
        totalVintageWheels: 0,
        vintageResetCount: 0,
        vintageUnlocks: [],
        legacy: 0,
        legacyBonuses: {
          ontario: 0,
          quebec: 0,
          alberta: 0,
          manitoba: 0,
          saskatchewan: 0,
          yukon: 0,
          bc: 0,
          nova_scotia: 0,
          new_brunswick: 0,
          pei: 0,
          newfoundland: 0,
          nwt: 0,
          nunavut: 0,
        },
        legacyResetCount: 0,
      },
      zoneProgress: data.zoneProgress ?? {},
    }),
  },
  {
    fromVersion: 4,
    toVersion: 5,
    migrate: (data) => ({
      ...data,
      crafting: data.crafting ?? {
        unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
        unlockedRecipes: ['cottage_cheese', 'ricotta', 'cream_cheese'],
        unlockedCaves: ['basic_cellar'],
        activeJobs: [],
        cheeseInventory: [],
        cheeseCollection: {},
        activeBuffs: [],
      },
    }),
  },
  {
    fromVersion: 5,
    toVersion: 6,
    migrate: (data) => {
      // Migrate effect types from snake_case to camelCase
      const effectTypeMap: Record<string, string> = {
        production_boost: 'productionBoost',
        click_boost: 'clickBoost',
        xp_boost: 'xpBoost',
        hero_buff: 'heroBuff',
      };

      if (data.crafting?.activeBuffs?.length) {
        data.crafting.activeBuffs = data.crafting.activeBuffs.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (buff: any) => {
            const oldType = buff.effect.type as string;
            const newType = effectTypeMap[oldType];
            if (newType) {
              return {
                ...buff,
                effect: { ...buff.effect, type: newType },
              };
            }
            return buff;
          }
        );
      }

      // Add notificationSent flag to existing jobs
      if (data.crafting?.activeJobs?.length) {
        data.crafting.activeJobs = data.crafting.activeJobs.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (job: any) => ({
            ...job,
            notificationSent: job.notificationSent ?? true,
          })
        );
      }

      return data;
    },
  },
  {
    fromVersion: 6,
    toVersion: 7,
    migrate: (data) => ({
      ...data,
      activeEvents: data.activeEvents ?? [],
    }),
  },
  {
    fromVersion: 7,
    toVersion: 8,
    migrate: (data) => {
      // Phase 6 migration: domain events architecture
      // No data changes, just version bump
      return data;
    },
  },
];

export function runMigrations(
  data: SerializedGameState,
  fromVersion: number
): SerializedGameState {
  let current = data;

  for (const migration of migrations) {
    if (fromVersion < migration.toVersion && fromVersion >= migration.fromVersion) {
      console.log(`Running migration v${migration.fromVersion} → v${migration.toVersion}`);
      current = migration.migrate(current);
    }
  }

  return current;
}
