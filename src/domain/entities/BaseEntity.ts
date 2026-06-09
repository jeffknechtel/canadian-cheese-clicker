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
   * Serialize to plain object for persistence/interop
   */
  toJSON(): T {
    return { ...this.data };
  }
}
