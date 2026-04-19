/**
 * Base class for all domain entities.
 * Provides common ID-based identity and immutability patterns.
 */
export abstract class BaseEntity<T extends { id: string }> {
  protected readonly data: Readonly<T>;

  constructor(data: T) {
    this.data = Object.freeze({ ...data });
  }

  get id(): string {
    return this.data.id;
  }

  /**
   * Create a new instance with updated data (immutable update)
   */
  protected abstract withData(updates: Partial<T>): this;

  /**
   * Serialize to plain object for persistence
   */
  toJSON(): T {
    return { ...this.data };
  }
}
