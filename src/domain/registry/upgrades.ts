import { UPGRADES } from '../../data/upgrades';
import { Upgrade } from '../entities/Upgrade';
import { EntityRegistry } from './EntityRegistry';

const upgradeEntities = UPGRADES.map(Upgrade.fromDefinition);

export const upgradeRegistry = new EntityRegistry(upgradeEntities);

export { Upgrade };
