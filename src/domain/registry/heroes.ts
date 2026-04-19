import { HEROES } from '../../data/heroes';
import { Hero } from '../entities/Hero';
import { EntityRegistry } from './EntityRegistry';

const heroEntities = HEROES.map(Hero.fromDefinition);

export const heroRegistry = new EntityRegistry(heroEntities);

export { Hero };
