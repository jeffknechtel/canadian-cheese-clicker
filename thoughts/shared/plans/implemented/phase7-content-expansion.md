# Phase 7: Content Expansion Implementation Plan

## Overview

This plan expands "The Great Canadian Cheese Quest" from its current 5-province implementation to the full 13-province/territory experience outlined in the research document. Phase 7 focuses on content breadth: new heroes, zones, enemies, bosses, cheeses, and the Canadian mythology questlines that provide endgame narrative engagement.

## Current State Analysis

**What Exists:**
- 8 heroes representing 8 provinces (Ontario, Quebec, Alberta, Manitoba, Saskatchewan, Yukon, BC, Nova Scotia)
- 5 zones with 10 stages + boss each (Ontario, Quebec, Alberta, Saskatchewan, BC)
- 16 regular enemy types + 5 provincial bosses
- 25 cheese recipes (Fresh through Legendary tiers)
- 48 equipment items (Common, Uncommon, Rare)
- Full combat, crafting, and prestige systems operational

**What's Missing for Full Content:**
- 8 remaining provinces/territories need zones: Manitoba, New Brunswick, PEI, Newfoundland, Yukon, NWT, Nunavut (note: Saskatchewan has zone but Manitoba boss exists without zone)
- 22+ additional heroes to reach 30+ target (2 per province = 26 total, plus legendaries)
- 8 additional bosses for new provinces
- ~25 more enemies to reach 75+ target
- ~25 more cheese recipes to reach 50+ target
- Province-exclusive content (cheeses, equipment sets)
- Canadian mythology questlines (Thunderbird, Wendigo, La Chasse-Galerie)
- Seasonal event framework

**Key Constraints:**
- All new content must follow existing type definitions in `src/types/game.ts`
- Heroes use the established stat/ability/limit break patterns
- Zones follow 10-stage + boss structure with difficulty scaling
- Enemy weaknesses/resistances use existing DamageType enum
- Cheese recipes use existing ingredient system

## Desired End State

A content-complete game featuring:
- **13 provinces/territories** with unique zones, bosses, and themes
- **30+ heroes** with diverse abilities and Canadian provincial representation
- **75+ enemy types** with varied mechanics
- **50+ cheese recipes** including all provincial specialties
- **Canadian mythology questlines** providing endgame narrative content
- **Event framework** ready for seasonal content

### Verification Criteria:
- All 13 provinces have playable zones with 10 stages + boss
- Each province has 2 associated heroes minimum
- All zones have distinct enemy rosters appropriate to theme
- Type checking passes with all new content
- Game loads and renders all new content without errors
- Progression path from Ontario to Nunavut is playable

## Assumptions Made

1. **Difficulty Scaling**: New zones scale linearly from level 40 (BC) to level 100 (Nunavut) following existing zone progression pattern
2. **Hero Balance**: New heroes follow existing stat curves (HP ~100 at L1 to ~8500 at L100)
3. **Enemy Stats**: Scale with zone level using existing formulas
4. **Cheese Values**: Follow existing tier value scaling (Fresh: 500-2000, Legendary: 1M-5M base value)
5. **Mythology Quests**: Implemented as special zone types with unique mechanics rather than separate quest system
6. **No New Systems**: All content uses existing combat, crafting, and progression systems

## What We're NOT Doing

- New game mechanics or systems (save for event framework shell)
- Multiplayer or social features
- New prestige tiers (Vintage/Legacy full implementation is Phase 8)
- Audio content (new music/SFX is Phase 8)
- Visual polish or new 3D models (Phase 8)
- Mobile-specific optimizations (Phase 8)
- Achievement expansion (minimal additions only where required)

## Implementation Approach

The expansion is organized by content type rather than by province to enable parallel development and testing. Each phase delivers a complete, testable slice of content.

**Strategy:**
1. Add all new data files first (heroes, enemies, zones, recipes)
2. Wire up new zones to existing progression system
3. Add mythology quest zones as special content
4. Create event framework shell for future seasonal content

---

## Phase 7.1: New Province Zones (8 Zones)

### Overview

Add the 8 remaining provinces/territories as playable zones, each with 10 stages, unique enemy rosters, and thematic bosses.

### Changes Required:

#### 1. Zone Definitions

**File**: `src/data/zones.ts`
**Changes**: Add 8 new zone definitions

```typescript
// New zones to add (append to ZONES array):

// Zone 6: Manitoba - The Frozen Rinks
{
  id: 'manitoba',
  name: 'Manitoba Frozen Rinks',
  description: 'Battle across frozen lakes and hockey arenas in the heart of Canada',
  theme: 'Hockey/Winter',
  recommendedLevel: 45,
  unlockRequirements: { zoneId: 'bc', curds: 1e15 },
  stages: [...], // 10 stages with hockey/winter enemies
  boss: 'frozen-goalie',
  exclusiveCheese: 'bothwell-cheese'
}

// Zone 7: Nova Scotia - Maritime Depths (already has hero, needs zone)
{
  id: 'nova-scotia',
  name: 'Nova Scotia Maritime Depths',
  description: 'Explore foggy harbors and battle creatures from the Atlantic',
  theme: 'Maritime/Ocean',
  recommendedLevel: 50,
  unlockRequirements: { zoneId: 'manitoba', curds: 1e16 },
  boss: 'the-kraken',
  exclusiveCheese: 'dragons-breath-blue'
}

// Zone 8: New Brunswick - Covered Bridge Country
{
  id: 'new-brunswick',
  name: 'New Brunswick Covered Bridges',
  description: 'Navigate haunted forests and lumber camps',
  theme: 'Forests/Lumber',
  recommendedLevel: 55,
  unlockRequirements: { zoneId: 'nova-scotia', curds: 1e17 },
  boss: 'headless-lumberjack',
  exclusiveCheese: 'peau-rouge'
}

// Zone 9: PEI - Anne's Island
{
  id: 'pei',
  name: 'PEI Anne\'s Island',
  description: 'Idyllic farmland hides a darker secret',
  theme: 'Pastoral/Gothic',
  recommendedLevel: 60,
  unlockRequirements: { zoneId: 'new-brunswick', curds: 1e18 },
  boss: 'annes-dark-side',
  exclusiveCheese: 'avonlea-clothbound'
}

// Zone 10: Newfoundland - Viking Shores
{
  id: 'newfoundland',
  name: 'Newfoundland Viking Shores',
  description: 'Ancient Viking ruins meet Atlantic icebergs',
  theme: 'Vikings/Arctic',
  recommendedLevel: 70,
  unlockRequirements: { zoneId: 'pei', curds: 1e19 },
  boss: 'iceberg-leviathan',
  exclusiveCheese: 'five-brothers-cheese'
}

// Zone 11: Yukon - Gold Rush Frontier
{
  id: 'yukon',
  name: 'Yukon Gold Rush Frontier',
  description: 'Abandoned mines and permafrost dangers',
  theme: 'Gold Rush/Frontier',
  recommendedLevel: 80,
  unlockRequirements: { zoneId: 'newfoundland', curds: 1e20 },
  boss: 'the-wendigo',
  exclusiveCheese: 'yukon-gold'
}

// Zone 12: NWT - Northern Lights
{
  id: 'nwt',
  name: 'NWT Aurora Territories',
  description: 'Chase the dancing lights across the tundra',
  theme: 'Aurora/Tundra',
  recommendedLevel: 90,
  unlockRequirements: { zoneId: 'yukon', curds: 1e21 },
  boss: 'aurora-serpent',
  exclusiveCheese: 'arctic-char-cheese'
}

// Zone 13: Nunavut - The Frozen Crown
{
  id: 'nunavut',
  name: 'Nunavut The Frozen Crown',
  description: 'The ultimate challenge at the top of the world',
  theme: 'Inuit/Arctic',
  recommendedLevel: 100,
  unlockRequirements: { zoneId: 'nwt', curds: 1e22 },
  boss: 'sedna',
  exclusiveCheese: 'ice-cave-aged'
}
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] All zones have valid stage configurations

#### Manual Verification:
- [ ] Zone select panel displays all 13 zones
- [ ] Zones unlock in correct sequence
- [ ] Zone themes display correctly in UI

---

## Phase 7.2: New Provincial Bosses (8 Bosses)

### Overview

Add boss definitions for the 8 new zones, each with multi-phase mechanics and thematic abilities.

### Changes Required:

#### 1. Boss Definitions

**File**: `src/data/enemies.ts`
**Changes**: Add 8 new boss definitions to `BOSSES` array

New bosses with multi-phase mechanics:

| Boss | Zone | Phases | Key Mechanic |
|------|------|--------|--------------|
| The Frozen Goalie | Manitoba | 3 | Puck deflection, ice patches |
| The Kraken | Nova Scotia | 4 | Tentacle summons, ink clouds |
| Headless Lumberjack | New Brunswick | 3 | Axe throw, tree summons |
| Anne's Dark Side | PEI | 3 | Imagination-based illusions |
| Iceberg Leviathan | Newfoundland | 4 | Iceberg summons, cold DoT |
| The Wendigo | Yukon | 3 | Fear mechanic, hunger debuff |
| Aurora Serpent | NWT | 4 | Color-based phase immunity |
| Sedna | Nunavut | 5 | Sea creature summons, drowning |

Each boss follows existing `BossDefinition` structure:
```typescript
{
  id: string,
  name: string,
  type: EnemyType,
  baseStats: { hp, attack, defense, speed },
  phases: BossPhase[],
  weakness: DamageType,
  resistance: DamageType,
  rewards: { curds, whey, xp, equipment? }
}
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] All bosses have valid phase configurations
- [x] Boss rewards follow scaling formula

#### Manual Verification:
- [ ] Each boss is fightable and beatable
- [ ] Phase transitions work correctly
- [ ] Boss mechanics are distinct and thematic

---

## Phase 7.3: Expanded Enemy Roster (25+ New Enemies)

### Overview

Add regular enemies to populate new zones with thematic variety. Target: 40+ total regular enemies (currently 16).

### Changes Required:

#### 1. New Enemy Definitions

**File**: `src/data/enemies.ts`
**Changes**: Add ~25 new regular enemies

**Zone-Themed Enemy Groups:**

**Manitoba (Hockey/Winter):**
- Zamboni Golem (Mechanical)
- Puck Poltergeist (Undead)
- Ice Resurfacer (Mechanical)

**Nova Scotia (Maritime):**
- Lobster Lurker (Beast)
- Fog Phantom (Undead)
- Barnacle Brute (Beast)

**New Brunswick (Forest/Lumber):**
- Chainsaw Sprite (Mechanical)
- Lumber Wraith (Undead)
- Sap Slime (Fungal)

**PEI (Pastoral/Gothic):**
- Scarecrow Sentinel (Undead)
- Potato Blight (Fungal)
- Red Soil Elemental (Beast)

**Newfoundland (Viking/Arctic):**
- Draugr Dairy Thief (Undead)
- Viking Cheese Raider (Demon)
- Iceberg Imp (Demon)

**Yukon (Gold Rush/Frontier):**
- Claim Jumper Ghost (Undead)
- Gold Fever Demon (Demon)
- Permafrost Parasite (Fungal)

**NWT (Aurora/Tundra):**
- Light Dancer (Demon)
- Tundra Wolf (Beast)
- Aurora Wisp (Demon)

**Nunavut (Inuit/Arctic):**
- Ice Spirit (Demon)
- Polar Bear Patriarch (Beast)
- Seal Hunter Shade (Undead)

Each enemy follows existing `EnemyDefinition` structure with appropriate weaknesses/resistances for zone.

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] All enemies have valid stat configurations
- [x] Enemy types match zone themes

#### Manual Verification:
- [ ] Enemies spawn correctly in their zones
- [ ] Combat feels varied within each zone
- [ ] Weakness/resistance system creates tactical choices

---

## Phase 7.4: Expanded Hero Roster (22 New Heroes)

### Overview

Add heroes to achieve 2 per province minimum (26 total provincial) plus legendary heroes. Current: 8 heroes. Target: 30+.

### Changes Required:

#### 1. New Hero Definitions

**File**: `src/data/heroes.ts`
**Changes**: Add 22+ new hero definitions

**New Provincial Heroes (2nd hero per existing province):**

| Province | New Hero | Class | Ability |
|----------|----------|-------|---------|
| Ontario | Toronto Techie | Support | "Cloud Computing" - Buff duration extension |
| Quebec | Habitant Farmer | Tank | "Maple Fortress" - Defense + regen |
| Alberta | Stampede Rider | DPS | "Bull Rush" - Charge attack |
| Manitoba | Curling Captain | Support | "Perfect Draw" - Precision buffs |
| Saskatchewan | Prairie Shaman | Healer | "Wheat Blessing" - HoT + cleanse |
| Yukon | Sourdough Miner | DPS | "Gold Strike" - Crit damage |
| BC | Sasquatch Seeker | Tank | "Cryptid Shield" - Damage absorption |
| Nova Scotia | Bluenose Sailor | DPS | "Schooner Slash" - Multi-hit |

**New Provincial Heroes (new provinces):**

| Province | Hero 1 | Hero 2 |
|----------|--------|--------|
| New Brunswick | Covered Bridge Guardian (Tank) | Fundy Fisher (DPS) |
| PEI | Anne Shirley Spirit (Support) | Potato King (Tank) |
| Newfoundland | Screech Captain (DPS) | Viking Descendant (Tank) |
| NWT | Aurora Watcher (Healer) | Diamond Miner (DPS) |
| Nunavut | Inuit Hunter (DPS) | Sedna's Chosen (Healer) |

**Legendary Heroes (4):**

| Hero | Inspiration | Class | Unlock |
|------|-------------|-------|--------|
| The Great One | Gretzky | DPS | 99 billion lifetime curds |
| Marathon Spirit | Terry Fox | Support | Complete all provinces |
| Vimy Guardian | WWI | Tank | Defeat all bosses |
| Confederation Founder | 1867 | Support | Own all generators |

Each hero follows `HeroDefinition` structure:
```typescript
{
  id: string,
  name: string,
  class: HeroClass,
  province: Province,
  description: string,
  recruitCost: number,
  baseStats: HeroStats,
  growthRates: HeroStats,
  specialAbility: Ability,
  limitBreak?: LimitBreak
}
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] All heroes have valid ability configurations
- [x] Recruit costs follow progression curve

#### Manual Verification:
- [ ] Heroes appear in recruitment panel
- [ ] Abilities function correctly in combat
- [ ] Class distribution supports varied party compositions

---

## Phase 7.5: Expanded Cheese Recipes (25 New Recipes)

### Overview

Add province-exclusive cheeses and expand each tier to reach 50+ total recipes.

### Changes Required:

#### 1. New Cheese Recipes

**File**: `src/data/cheeseRecipes.ts`
**Changes**: Add 25 new cheese recipes

**Province-Exclusive Cheeses (13 - one per province):**

| Province | Cheese | Tier | Aging |
|----------|--------|------|-------|
| Ontario | Black Diamond Reserve | Hard | 2h |
| Quebec | Le Riopelle | Soft | 10m |
| Alberta | Sylvan Star Gouda | Semi-Hard | 30m |
| BC | Saltspring Island Cheese | Soft | 8m |
| Saskatchewan | Prairie Breeze | Semi-Hard | 25m |
| Manitoba | Bothwell Smoked | Semi-Hard | 20m |
| Nova Scotia | Dragon's Breath Blue | Hard | 3h |
| New Brunswick | Peau Rouge Washed | Soft | 15m |
| PEI | Avonlea Clothbound | Hard | 4h |
| Newfoundland | Five Brothers Aged | Hard | 2.5h |
| Yukon | Yukon Gold Cheddar | Legendary | 12h |
| NWT | Arctic Char Cheese | Legendary | 16h |
| Nunavut | Ice Cave Aged | Legendary | 24h |

**Additional Tier Expansion (12):**

**Fresh (3):** Fromage Frais, Mascarpone, Burrata
**Soft (3):** Reblochon, Taleggio, Epoisses
**Semi-Hard (3):** Emmental, Fontina, Raclette
**Hard (3):** Comté, Beaufort, Sbrinz

Each recipe follows `CheeseRecipe` structure with ingredients, aging time, value, and effects.

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] All recipes have valid ingredient references
- [x] Province exclusives locked to correct zones

#### Manual Verification:
- [ ] Recipes appear in crafting panel
- [ ] Aging timers function correctly
- [ ] Cheese effects apply properly

---

## Phase 7.6: Canadian Mythology Questlines

### Overview

Add special mythology-themed zones that function as endgame narrative content with unique mechanics.

### Changes Required:

#### 1. Thunderbird Saga Zone

**File**: `src/data/zones.ts`
**Changes**: Add Thunderbird questline as special zone type

```typescript
{
  id: 'thunderbird-saga',
  name: 'Thunderbird Saga',
  description: 'Ally with the legendary Thunderbird against chaos forces',
  theme: 'Mythology/Sky',
  isSpecialZone: true,
  recommendedLevel: 80,
  unlockRequirements: {
    zonesCompleted: ['ontario', 'quebec', 'bc', 'alberta', 'saskatchewan'],
    curds: 1e20
  },
  stages: 15, // Extended questline
  boss: 'chaos-incarnate',
  rewards: {
    hero: 'thunderbird-avatar', // Unlocks legendary hero
    achievement: 'sky-sovereign'
  }
}
```

#### 2. Wendigo Warning Zone

**File**: `src/data/zones.ts`
**Changes**: Add Wendigo horror-themed zone

```typescript
{
  id: 'wendigo-warning',
  name: 'Wendigo Warning',
  description: 'A cautionary tale about greed in the frozen north',
  theme: 'Horror/Survival',
  isSpecialZone: true,
  recommendedLevel: 90,
  unlockRequirements: {
    zoneId: 'yukon',
    curds: 1e21
  },
  stages: 10,
  specialMechanic: 'hunger', // Anti-hoarding: lose curds over time
  boss: 'wendigo-prime',
  rewards: {
    achievement: 'greed-conquered',
    equipment: 'wendigo-heart' // Legendary accessory
  }
}
```

#### 3. La Chasse-Galerie Zone

**File**: `src/data/zones.ts`
**Changes**: Add Flying Canoe timed event zone

```typescript
{
  id: 'chasse-galerie',
  name: 'La Chasse-Galerie',
  description: 'Race across the night sky in the legendary flying canoe',
  theme: 'Folklore/Racing',
  isSpecialZone: true,
  isTimedEvent: true, // Framework for seasonal availability
  recommendedLevel: 70,
  unlockRequirements: {
    zoneId: 'quebec',
    curds: 1e18
  },
  stages: 7, // One per checkpoint
  timeLimit: 300000, // 5 minutes
  boss: 'devil-of-the-deal',
  rewards: {
    cheese: 'flying-canoe-curd', // Unique legendary
    achievement: 'midnight-rider'
  }
}
```

#### 4. Mythology Bosses

**File**: `src/data/enemies.ts`
**Changes**: Add 3 mythology bosses

- **Chaos Incarnate**: 5-phase cosmic entity
- **Wendigo Prime**: 4-phase horror boss with fear mechanic
- **Devil of the Deal**: 3-phase trickster with bargain mechanic

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Special zone type handled in zone system
- [x] Mythology bosses follow boss definition structure

#### Manual Verification:
- [ ] Mythology zones appear after prerequisites met
- [ ] Special mechanics function (hunger, time limit)
- [ ] Rewards unlock correctly

---

## Phase 7.7: Event Framework Shell

### Overview

Create the infrastructure for seasonal events without implementing specific event content (reserved for live ops).

### Changes Required:

#### 1. Event Type Definitions

**File**: `src/types/game.ts`
**Changes**: Add event system types

```typescript
interface GameEvent {
  id: string;
  name: string;
  description: string;
  startDate?: Date; // undefined = manual activation
  endDate?: Date;
  isActive: boolean;
  bonuses: EventBonus[];
  exclusiveContent: {
    cheeses?: string[];
    equipment?: string[];
    enemies?: string[];
  };
}

interface EventBonus {
  type: 'production' | 'xp' | 'drops' | 'click';
  multiplier: number;
  description: string;
}
```

#### 2. Event Data Shell

**File**: `src/data/events.ts` (new file)
**Changes**: Create event definitions shell

```typescript
export const EVENTS: GameEvent[] = [
  {
    id: 'canada-day',
    name: 'Canada Day Celebration',
    description: 'Red and white themed festivities!',
    isActive: false,
    bonuses: [
      { type: 'production', multiplier: 2, description: '2x Canadian-themed drops' }
    ],
    exclusiveContent: {
      cheeses: ['maple-firework-curd'],
      equipment: ['canada-day-cape']
    }
  },
  {
    id: 'poutine-week',
    name: 'Poutine Week',
    description: 'Quebec-focused gravy goodness',
    isActive: false,
    bonuses: [
      { type: 'production', multiplier: 1.5, description: '+50% Quebec zone rewards' }
    ],
    exclusiveContent: {
      cheeses: ['festival-poutine-supreme']
    }
  },
  {
    id: 'hockey-season',
    name: 'Hockey Season',
    description: 'Stanley Cup chase begins!',
    isActive: false,
    bonuses: [
      { type: 'xp', multiplier: 2, description: '2x Hero XP' }
    ],
    exclusiveContent: {
      equipment: ['stanley-cup-replica']
    }
  },
  {
    id: 'winterlude',
    name: 'Winterlude Festival',
    description: 'Ice sculptures and hot chocolate',
    isActive: false,
    bonuses: [
      { type: 'drops', multiplier: 1.5, description: '+50% equipment drops' }
    ],
    exclusiveContent: {
      cheeses: ['ice-sculpture-aged'],
      equipment: ['winterlude-toque']
    }
  }
];
```

#### 3. Event Store Integration

**File**: `src/stores/gameStore.ts`
**Changes**: Add event state slice

```typescript
// Add to GameState interface
activeEvents: string[];

// Add event actions
activateEvent: (eventId: string) => void;
deactivateEvent: (eventId: string) => void;
getEventBonuses: () => EventBonus[];
```

#### 4. Event Bonus Application

**File**: `src/systems/productionEngine.ts`
**Changes**: Apply event multipliers to calculations

```typescript
// In calculateProduction():
const eventMultiplier = getActiveEventMultiplier('production');
return baseProduction * eventMultiplier;
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Event types properly defined
- [x] Store actions compile correctly

#### Manual Verification:
- [ ] Events can be manually activated (dev mode)
- [ ] Event bonuses apply to production
- [ ] Event UI displays active events

---

## Phase 7.8: Content Integration & Balance Pass

### Overview

Wire all new content together, ensure progression flows correctly, and perform initial balance pass.

### Changes Required:

#### 1. Zone Progression Validation

**File**: `src/data/zones.ts`
**Changes**: Verify unlock chain and difficulty scaling

- Ontario (L1) → Quebec (L10) → Alberta (L20) → Saskatchewan (L30) → BC (L40)
- → Manitoba (L45) → Nova Scotia (L50) → New Brunswick (L55) → PEI (L60)
- → Newfoundland (L70) → Yukon (L80) → NWT (L90) → Nunavut (L100)

#### 2. Hero Recruitment Cost Curve

**File**: `src/data/heroes.ts`
**Changes**: Balance recruitment costs for 30+ heroes

- Early heroes: 100K - 10M curds
- Mid heroes: 100M - 10B curds
- Late heroes: 100B - 10T curds
- Legendary heroes: Achievement-gated, 1T+ curds

#### 3. Enemy Stat Scaling

**File**: `src/data/enemies.ts`
**Changes**: Ensure enemy HP/ATK/DEF scales with zone level

Formula validation:
```typescript
// Base stats scale with zone recommendedLevel
hp = baseHP * (1 + (zoneLevel / 10))
attack = baseATK * (1 + (zoneLevel / 15))
defense = baseDEF * (1 + (zoneLevel / 20))
```

#### 4. Boss Reward Scaling

**File**: `src/data/enemies.ts`
**Changes**: Ensure boss rewards scale appropriately

- Boss curds = zone unlock requirement * 0.1
- Boss whey = floor(curds / 1000)
- Boss XP = zone level * 1000

#### 5. Achievement Additions

**File**: `src/data/achievements.ts`
**Changes**: Add achievements for new content

- "Coast to Coast" - Complete all 13 provinces
- "Legendary Fromager" - Craft all legendary cheeses
- "Full Roster" - Recruit all 30+ heroes
- "Mythology Master" - Complete all mythology zones
- Province-specific achievements (13 new)

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] No circular dependencies in data files

#### Manual Verification:
- [ ] Full playthrough from Ontario to Nunavut possible
- [ ] No progression blockers or impossible unlocks
- [ ] Difficulty feels appropriate at each zone
- [ ] Rewards feel meaningful at each tier

---

## Testing Strategy

### Unit Testing
- Validate all new data structures match type definitions
- Test zone unlock chain logic
- Test event bonus calculations
- Test boss phase transitions

### Integration Testing
- Full zone progression walkthrough
- Hero recruitment at each stage
- Cheese crafting with new recipes
- Mythology zone special mechanics

### Balance Testing
- Time-to-complete per zone (target: 30-60 min active play)
- Currency flow (curds should never feel stuck)
- Hero power curve vs enemy difficulty
- Equipment upgrade incentives

### Regression Testing
- Existing 5 zones still function
- Existing 8 heroes unchanged
- Save/load with new content
- Prestige reset with new content

---

## References

- Source document: `thoughts/shared/research/2026-01-28_21-25-31_canadian-cheese-clicker-jrpg-game-design.md`
- Existing zones: `src/data/zones.ts`
- Existing heroes: `src/data/heroes.ts`
- Existing enemies: `src/data/enemies.ts`
- Existing recipes: `src/data/cheeseRecipes.ts`
- Type definitions: `src/types/game.ts`
- Game store: `src/stores/gameStore.ts`
