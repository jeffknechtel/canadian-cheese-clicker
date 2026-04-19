import { ZONES } from '../../data/zones';
import { Zone } from '../entities/Zone';
import { EntityRegistry } from './EntityRegistry';

const zoneEntities = ZONES.map(Zone.fromDefinition);

export const zoneRegistry = new EntityRegistry(zoneEntities);

export { Zone };
