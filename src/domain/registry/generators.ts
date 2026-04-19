import { GENERATORS } from '../../data/generators';
import { Generator } from '../entities/Generator';
import { EntityRegistry } from './EntityRegistry';

// Create rich domain models from static data
const generatorEntities = GENERATORS.map(Generator.fromDefinition);

// Export registry for O(1) lookup
export const generatorRegistry = new EntityRegistry(generatorEntities);

// Re-export for convenience
export { Generator };
