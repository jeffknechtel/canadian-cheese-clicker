import type { PartyFormation, FormationPosition, HeroState } from '../../types/game';

/**
 * Party aggregate - owns party formation invariants.
 * Immutable: all operations return new Party instances.
 *
 * Invariants enforced:
 * - A hero can only occupy one slot at a time
 * - Only recruited heroes can be assigned to party
 * - Party has exactly 4 fixed slots
 */
export class Party {
  readonly #formation: Readonly<PartyFormation>;
  readonly #roster: Readonly<Record<string, HeroState>>;

  private constructor(formation: PartyFormation, roster: Record<string, HeroState>) {
    this.#formation = Object.freeze({ ...formation });
    this.#roster = roster;
  }

  /**
   * Construct a Party from formation and roster state.
   */
  static from(formation: PartyFormation, roster: Record<string, HeroState>): Party {
    return new Party(formation, roster);
  }

  /**
   * Serialize back to plain PartyFormation.
   */
  toFormation(): PartyFormation {
    return { ...this.#formation };
  }

  /**
   * Get active hero IDs (non-null slots with valid heroes).
   */
  getActiveHeroIds(): string[] {
    return [
      this.#formation.frontLeft,
      this.#formation.frontRight,
      this.#formation.backLeft,
      this.#formation.backRight,
    ].filter((id): id is string => id !== null && this.#roster[id] !== undefined);
  }

  /**
   * Check if a hero is in the party.
   */
  hasHero(heroId: string): boolean {
    return Object.values(this.#formation).includes(heroId);
  }

  /**
   * Get the position of a hero, or null if not in party.
   */
  getHeroPosition(heroId: string): FormationPosition | null {
    for (const [pos, id] of Object.entries(this.#formation)) {
      if (id === heroId) {
        return pos as FormationPosition;
      }
    }
    return null;
  }

  /**
   * Assign a hero to a position.
   * Enforces: hero must be recruited, auto-removes from previous slot.
   * Returns null if hero is not recruited.
   */
  assignHero(heroId: string, position: FormationPosition): Party | null {
    // Invariant: only recruited heroes can be assigned
    if (!this.#roster[heroId]) {
      return null;
    }

    const newFormation = { ...this.#formation };

    // Invariant: hero can only occupy one slot — remove from current if present
    const currentPosition = this.getHeroPosition(heroId);
    if (currentPosition) {
      newFormation[currentPosition] = null;
    }

    newFormation[position] = heroId;

    return new Party(newFormation, this.#roster);
  }

  /**
   * Remove hero from a position.
   */
  removeHero(position: FormationPosition): Party {
    const newFormation = {
      ...this.#formation,
      [position]: null,
    };
    return new Party(newFormation, this.#roster);
  }

  /**
   * Swap heroes between two positions.
   */
  swap(pos1: FormationPosition, pos2: FormationPosition): Party {
    const newFormation = {
      ...this.#formation,
      [pos1]: this.#formation[pos2],
      [pos2]: this.#formation[pos1],
    };
    return new Party(newFormation, this.#roster);
  }

  /**
   * Get hero ID at a position.
   */
  getHeroAt(position: FormationPosition): string | null {
    return this.#formation[position];
  }
}
