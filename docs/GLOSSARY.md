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

| Canonical Term | Definition | Operation | Avoid Using |
|----------------|------------|-----------|-------------|
| `*Multiplier` | Scales a value | `base * multiplier` | - |
| `*Bonus` | Adds to a value | `base + bonus` | Using for multiplicative values |
| `*Modifier` | Additive stat adjustment | `stat + modifier` | Using for multiplicative scaling |
| `*Scale` | Multiplicative scaling factor | `base * scale` | `*Modifier` for multiplicative |

### Multiplier Naming Rules:
- Functions returning `1.0` as "no change" → use `*Multiplier`
- Functions returning `0` as "no change" → use `*Bonus`
- Prestige bonuses stored as percentages (0.1 = 10%) → `*Bonus`, applied as `1 + bonus`

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
