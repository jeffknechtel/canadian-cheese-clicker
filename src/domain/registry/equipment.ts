import { EQUIPMENT } from '../../data/equipment';
import { Equipment } from '../entities/Equipment';
import { EntityRegistry } from './EntityRegistry';

const equipmentEntities = EQUIPMENT.map(Equipment.fromDefinition);

export const equipmentRegistry = new EntityRegistry(equipmentEntities);

export { Equipment };
