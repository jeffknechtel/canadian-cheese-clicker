import type { StateCreator } from 'zustand';
import type { ProductionSlice } from './slices/production/types';
import type { HeroSlice } from './slices/heroes/types';
import type { CombatSlice } from './slices/combat/types';
import type { CraftingSlice } from './slices/crafting/types';
import type { PrestigeSlice } from './slices/prestige/types';
import type { AchievementSlice } from './slices/achievements/types';
import type { EventSlice } from './slices/events/types';
import type { PersistenceSlice } from './slices/persistence/types';

export type GameStore = ProductionSlice &
  HeroSlice &
  CombatSlice &
  CraftingSlice &
  PrestigeSlice &
  AchievementSlice &
  EventSlice &
  PersistenceSlice;

export type SliceCreator<T> = StateCreator<GameStore, [], [], T>;
