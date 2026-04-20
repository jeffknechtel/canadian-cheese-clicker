import type {
  HeroState,
  HeroDefinition,
  FormationPosition,
  Equipment,
  EquipmentSlot,
  HeroStats,
  PartyFormation,
} from '../../../types/game';

export interface HeroSliceState {
  heroes: Record<string, HeroState>;
  party: PartyFormation;
  equipmentInventory: string[];
}

export interface HeroSliceActions {
  recruitHero: (heroId: string) => boolean;
  canAffordHero: (heroId: string) => boolean;
  isHeroRecruited: (heroId: string) => boolean;
  getHeroState: (heroId: string) => HeroState | undefined;
  getAvailableHeroes: () => HeroDefinition[];
  getRecruitedHeroes: () => HeroDefinition[];
  assignToParty: (heroId: string, position: FormationPosition) => boolean;
  removeFromParty: (position: FormationPosition) => void;
  swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => void;
  getPartyHeroes: () => (HeroDefinition | null)[];
  buyEquipment: (equipmentId: string) => boolean;
  canAffordEquipment: (equipmentId: string) => boolean;
  equipItem: (heroId: string, equipmentId: string) => boolean;
  unequipItem: (heroId: string, slot: EquipmentSlot) => void;
  getHeroEquipment: (heroId: string) => Equipment[];
  grantXp: (heroId: string, amount: number) => void;
  tickHeroXp: (deltaMs: number) => void;
  getHeroMultiplier: () => number;
  getPartyStats: () => Record<string, HeroStats>;
}

export type HeroSlice = HeroSliceState & HeroSliceActions;
