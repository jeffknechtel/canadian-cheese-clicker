/**
 * Generic registry for O(1) entity lookup by ID.
 * Replaces scattered getXxxById() functions.
 */
export class EntityRegistry<T extends { id: string }> {
  private readonly byId: Map<string, T>;
  private readonly all: readonly T[];

  constructor(entities: readonly T[]) {
    this.all = entities;
    this.byId = new Map(entities.map((e) => [e.id, e]));
  }

  get(id: string): T | undefined {
    return this.byId.get(id);
  }

  getOrThrow(id: string): T {
    const entity = this.byId.get(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }
    return entity;
  }

  getAll(): readonly T[] {
    return this.all;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get size(): number {
    return this.byId.size;
  }
}
