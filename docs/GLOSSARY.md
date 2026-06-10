# The Great Canadian Cheese Quest - Glossary

## Currency & Production

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `curds` | Primary currency (state field) | - |
| `curdPerSecond` | Production rate (state field) | `CPS` in code (OK in UI/comments) |
| `baseCps` | Generator's base production rate | - |
| `curdPerClick` | Base click value | - |
| `totalCurdsEarned` | Lifetime currency earned | - |

## Value Modifiers

| Canonical Term | Definition | Operation | Type |
|----------------|------------|-----------|------|
| `*Multiplier` | Scales a value | `base * multiplier` | `Multiplier` (branded type) |
| `*Bonus` | Adds to a value | `base + bonus` or `base * (1 + bonus)` | `Bonus` (branded type) |
| `*Modifier` | Additive stat adjustment | `stat + modifier` | plain `number` |
| `*Scale` | Multiplicative scaling factor | `base * scale` | plain `number` |

### Multiplier Naming Rules:
- Functions returning `1.0` as "no change" → use `*Multiplier`
- Functions returning `0` as "no change" → use `*Bonus`
- Prestige bonuses stored as percentages (0.1 = 10%) → `*Bonus`, applied as `1 + bonus`

### Implementation Notes:
- Use `Multiplier.of(1.5)` for multiplicative values (neutral = 1.0)
- Use `Bonus.of(0.1)` or `Bonus.ofPercent(10)` for additive percentages (neutral = 0)
- Convert bonus to multiplier: `Bonus.toMultiplier(bonus)` returns `1 + bonus`
- See `src/domain/valueObjects/Modifier.ts` for full API

## Combat Actions

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `ability` | Any combat action (hero or enemy) | `skill` for heroes |
| `HeroAbility` | Hero's combat ability with mechanics | `specialAbility` (flavor only) |
| `EnemyAbility` | Enemy's combat ability | `EnemySkill` |
| `abilityCooldowns` | Cooldown tracking for abilities | `skillCooldowns` |

## Effect Types (camelCase)

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `productionBoost` | Temporary production multiplier | `production_boost` |
| `clickBoost` | Temporary click multiplier | `click_boost` |
| `xpBoost` | Temporary XP multiplier | `xp_boost` |
| `damageOverTime` | DoT effect | `damage_over_time` |
| `healOverTime` | HoT effect | `heal_over_time` |
| `heroBuff` | Temporary hero stat increase | `hero_buff` |
| `damageReduction` | Damage reduction buff | `damage_reduction` |
| `dropRateBonus` | Drop rate increase effect | `drop_rate_bonus` |
| `allDebuffs` | Immunity to all debuffs | `all_debuffs` |

## Ability Target Types (camelCase)

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `'self'` | Targets the ability user | - |
| `'singleAlly'` | Targets one ally | `'single_ally'` |
| `'allAllies'` | Targets all allies | `'all_allies'` |
| `'singleEnemy'` | Targets one enemy | `'single_enemy'` |
| `'allEnemies'` | Targets all enemies | `'all_enemies'` |

## Combat Log Entry Types (camelCase)

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `'ability'` | Hero or enemy ability activation | `'skill'` |
| `'phaseChange'` | Boss phase transition | `'phase_change'` |

## Aggregates

| Canonical Term | Definition | Location |
|----------------|------------|----------|
| `Battle` | Aggregate wrapping `CombatState`. Owns victory/defeat invariants. All combat state transitions go through `Battle.tick()` or `Battle.useAbility()`/`useLimitBreak()`. | `src/domain/aggregates/Battle.ts` |
| `Party` | Aggregate wrapping `PartyFormation`. Owns slot assignment invariants (hero can only occupy one slot, only recruited heroes can be assigned). | `src/domain/aggregates/Party.ts` |

### Aggregate Usage Pattern:
```typescript
// Battle aggregate
const battle = Battle.from(state.combat);
const { battle: updated, logs } = battle.tick(deltaMs, partyStats);
set({ combat: updated.toState() });

// Party aggregate
const party = Party.from(state.party, state.heroes);
const updated = party.assignHero(heroId, position);
set({ party: updated.toFormation() });
```
