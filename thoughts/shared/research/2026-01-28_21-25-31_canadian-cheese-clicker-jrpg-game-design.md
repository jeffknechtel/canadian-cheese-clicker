---
date: 2026-01-29T02:25:31Z
researcher: Claude
git_commit: a4cac2418a4a12a99b99e1b429f9a537eed2d7fe
branch: master
repository: game
topic: "Canadian Cheese Clicker-JRPG Game Design"
tags: [research, game-design, three-js, clicker, jrpg, canadian-culture, cheese]
status: complete
last_updated: 2026-01-28
last_updated_by: Claude
---

# Research: Canadian Cheese Clicker-JRPG Game Design

**Date**: 2026-01-29T02:25:31Z
**Researcher**: Claude
**Git Commit**: a4cac2418a4a12a99b99e1b429f9a537eed2d7fe
**Branch**: master
**Repository**: game

## Research Question

Design a Three.js high-quality game (embedded in a Tailwind site) that fuses a clicker game with a JRPG, themed around Canadian culture and cheese. Create a comprehensive multi-phase development approach with significant content.

---

## Executive Summary

This document outlines the design and development plan for **"The Great Canadian Cheese Quest"** - a hybrid clicker-JRPG built with Three.js, React, and Tailwind CSS. The game combines satisfying incremental progression with JRPG party mechanics, all wrapped in a humorous celebration of Canadian culture and artisan cheese-making.

**Core Concept**: Players run a cheese empire across Canada, building parties of Canadian heroes to battle cheese-themed monsters, complete quests across provinces, and master the art of affinage (cheese aging). The clicker mechanics drive resource generation while JRPG systems provide strategic depth and narrative engagement.

**Target Platform**: Browser-based (desktop and mobile responsive)
**Tech Stack**: Three.js + React Three Fiber + Zustand + Tailwind CSS
**Estimated Development**: 8 phases over significant development period

---

## Game Concept: "The Great Canadian Cheese Quest"

### High Concept

A hapless cheese enthusiast discovers they're the descendant of a legendary Fromager (cheese master) and must restore Canada's cheese heritage by battling the forces of Processed Cheese Inc., recruiting Canadian heroes, and mastering the ancient art of artisan cheese-making.

### Core Pillars

1. **Click to Curdle**: Satisfying clicker mechanics for cheese production
2. **Party of Polite Heroes**: JRPG-style party with Canadian character archetypes
3. **Coast-to-Coast Quest**: Journey across all provinces with unique environments
4. **Affinage Mastery**: Deep cheese aging/crafting progression system
5. **Sorry, Not Sorry**: Pervasive Canadian humor and self-deprecating charm

### Unique Selling Points

- **Dual Gameplay Loops**: Active clicking for immediate satisfaction + idle progression for long-term growth
- **Formation-Based Combat**: Position your party of Canadian heroes for auto-battle optimization
- **Cheese Aging as Prestige**: Multi-layer prestige system themed as cheese aging (fresh → aged → vintage → legendary)
- **Canadian Culture Deep-Dive**: Rich content from every province, First Nations mythology, and iconic Canadiana
- **3D Presentation**: Three.js visuals elevate the genre above typical 2D clickers

---

## Technical Architecture

### Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **3D Engine** | Three.js + React Three Fiber | Industry standard, excellent React integration |
| **State Management** | Zustand | Pmndrs ecosystem, optimized for R3F |
| **UI Framework** | Tailwind CSS | Rapid development, responsive design |
| **Physics** | Rapier (if needed) | Performance, deterministic |
| **Audio** | Howler.js | 3D spatial audio, sprite support |
| **Particles** | three.quarks | High-performance particle systems |
| **Build** | Vite | Fast development, optimized production builds |

### Architecture Patterns

```
┌─────────────────────────────────────────────────────────┐
│                    Game Application                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  3D Scene   │  │   UI Layer  │  │  State Store    │  │
│  │  (R3F)      │  │  (Tailwind) │  │  (Zustand)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│         │                │                 │            │
│         └────────────────┼─────────────────┘            │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Game Logic Layer                    │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │   │
│  │  │ Clicker │ │ Combat  │ │ Crafting│ │ Quest │  │   │
│  │  │ Engine  │ │ System  │ │ System  │ │ System│  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └───────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Persistence Layer                   │   │
│  │        (LocalStorage + Optional Cloud)           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Performance Targets

- **Draw Calls**: < 100 per frame
- **Frame Rate**: 60 FPS desktop, 30 FPS mobile
- **Initial Load**: < 3 seconds
- **Mobile Support**: Touch controls, adaptive quality

---

## Multi-Phase Development Plan

### Phase 1: Foundation (Core Loop)

**Objective**: Establish the core clicker mechanics and basic Three.js scene

#### 1.1 Project Setup
- Initialize Vite + React + TypeScript project
- Configure Tailwind CSS with custom cheese/Canadian color palette
- Set up React Three Fiber with basic scene
- Implement Zustand store structure
- Create responsive layout (3D canvas + UI panels)

#### 1.2 Core Clicker Mechanics
- **Cheese Wheel Click Target**: 3D cheese wheel that responds to clicks
  - Visual feedback (wobble, particles)
  - Click counter with satisfying number animations
  - Basic currency: "Curds" (primary) and "Whey" (secondary)
- **Production Formula**: `curds_per_click = base * click_multiplier`
- **Auto-Production**: Background generation based on owned generators

#### 1.3 Basic Generator System
- Implement first 5 generators (cheese-making equipment):
  1. **Milk Pail** (Tier 1) - 1 curd/sec
  2. **Cheese Vat** (Tier 2) - 8 curds/sec
  3. **Aging Rack** (Tier 3) - 47 curds/sec
  4. **Cheese Cave** (Tier 4) - 260 curds/sec
  5. **Fromager Apprentice** (Tier 5) - 1,400 curds/sec
- Cost scaling: `cost = base_cost * 1.15^owned`
- Purchase UI with bulk buy options (1, 10, 100, max)

#### 1.4 Upgrade System (Phase 1)
- Click upgrades (2x, 5x, 10x click power)
- Generator efficiency upgrades
- Milestone unlocks at ownership thresholds (25, 50, 100)

#### 1.5 Save/Load System
- LocalStorage persistence
- Auto-save every 30 seconds
- Offline progress calculation

**Deliverable**: Playable clicker with satisfying core loop, 3D cheese wheel, and basic progression

---

### Phase 2: Canadian Theme Integration

**Objective**: Infuse the game with Canadian identity and expand content

#### 2.1 Visual Theme
- **Main Scene**: Canadian cheese shop/farm setting
- **Background**: Parallax Canadian landscape (mountains, prairies, or forests based on region)
- **UI Skin**: Wood-grain panels, maple leaf accents, Tim Hortons-inspired color palette
- **Currency Icons**: Loonie (gold), Toonie (silver), Maple Syrup bottle (premium)

#### 2.2 Expanded Generator Tiers
Add generators 6-15 with Canadian themes:

| Tier | Generator | CPS | Theme |
|------|-----------|-----|-------|
| 6 | Cheese Curling Stone | 7,800 | Sports |
| 7 | Mountie Milk Patrol | 44,000 | RCMP |
| 8 | Voyageur Canoe Dairy | 260,000 | History |
| 9 | Hockey Stick Churner | 1,600,000 | Hockey |
| 10 | Beaver Dam Creamery | 10,000,000 | Wildlife |
| 11 | Tim Hortons Cheese Bar | 65,000,000 | Culture |
| 12 | Maple Syrup Infuser | 430,000,000 | Food |
| 13 | Moose-Powered Mill | 2,900,000,000 | Wildlife |
| 14 | Northern Lights Curing | 21,000,000,000 | Nature |
| 15 | Thunderbird Blessing | 150,000,000,000 | Mythology |

#### 2.3 Achievement System
- **Canadian-Themed Achievements**:
  - "Double-Double" - Own 22 of any generator
  - "The Great One" - Reach 99 billion curds (Gretzky's number)
  - "Sorry, Eh?" - Click 10,000 times
  - "True Patriot Love" - Own all generator types
  - "Coast to Coast" - Unlock all provinces
- Achievement bonuses (permanent multipliers)

#### 2.4 Canadian Slang & Dialogue
- Random Canadian phrases on click milestones
- "Eh" counter that provides micro-bonuses
- Polite error messages ("Sorry, you don't have enough curds, eh!")

#### 2.5 Audio Foundation
- Background music: Folk/acoustic Canadian-inspired
- Click sounds: Satisfying cheese-themed SFX
- Achievement fanfares
- Ambient nature sounds

**Deliverable**: Fully themed Canadian clicker with rich content and audio

---

### Phase 3: JRPG Hero System

**Objective**: Introduce party-based hero mechanics

#### 3.1 Hero Roster (Initial 8 Heroes)

| Hero | Class | Province | Special Ability |
|------|-------|----------|-----------------|
| **Maple Knight** | Tank | Ontario | "Sorry Shield" - Absorbs damage while apologizing |
| **Poutine Mage** | DPS | Quebec | "Gravy Blast" - AoE damage that slows enemies |
| **Mountie Ranger** | Support | Alberta | "Always Get My Cheese" - Tracking bonus to drops |
| **Hockey Enforcer** | DPS | Manitoba | "Slapshot" - High single-target damage |
| **Voyageur Bard** | Support | Saskatchewan | "Paddle Song" - Party buffs through rhythm |
| **Toque Monk** | Tank | Yukon | "Cold Resistance" - Immune to freeze effects |
| **West Coast Druid** | Healer | BC | "Cedar Healing" - Party regeneration |
| **Maritime Fisher** | DPS | Nova Scotia | "Lobster Trap" - DoT damage |

#### 3.2 Hero Stats & Progression
- **Base Stats**: HP, Attack, Defense, Speed, Cheese Affinity
- **Level System**: Heroes gain XP from combat and idle time
- **Stat Growth**: Each hero has unique growth curves
- **Equipment Slots**: Weapon, Armor, Accessory, Cheese Charm

#### 3.3 Party Formation System
- 4-hero active party (front row: 2, back row: 2)
- Formation bonuses based on positioning
- Tank/DPS/Support/Healer role synergies
- Formation presets for quick switching

#### 3.4 Hero Recruitment
- Heroes unlock at currency/achievement milestones
- Recruitment quests introduce each hero
- Hero affinity system (level through use)

#### 3.5 Equipment System (Basic)
- Tier 1-3 equipment for each slot
- Equipment provides stat bonuses
- Basic crafting: Combine curds + materials = equipment

**Deliverable**: Functional hero system with party formation and basic equipment

---

### Phase 4: Combat System

**Objective**: Implement JRPG-style auto-battle with strategic depth

#### 4.1 ATB-Inspired Combat
- **Turn Gauges**: Each hero has a speed-based ATB gauge
- **Auto-Attack**: Heroes automatically attack when gauge fills
- **Special Skills**: Manual activation for strategic timing
- **Combat Speed**: Adjustable 1x/2x/4x for idle preference

#### 4.2 Enemy Design (Cheese Villains)

**Regular Enemies**:
| Enemy | Type | Weakness | Found In |
|-------|------|----------|----------|
| Mold Sprite | Fungal | Fire | Caves |
| Processed Cheese Slime | Artificial | Nature | Factories |
| Cheese Grater Golem | Mechanical | Lightning | Industrial |
| Lactose Intolerant Imp | Demon | Holy Cheese | Everywhere |
| Wax Wraith | Undead | Sharp Attacks | Aging Cellars |

**Boss Enemies** (Province-Based):
| Boss | Province | Phases | Mechanic |
|------|----------|--------|----------|
| **The Bland Baron** | Ontario | 3 | Removes flavor buffs |
| **Le Fromage Fantome** | Quebec | 4 | French-only damage phase |
| **Oil Slick Sally** | Alberta | 3 | Covers arena in oil |
| **Wheat Witch** | Saskatchewan | 2 | Summons grain minions |
| **Pacific Rim Crab** | BC | 3 | Seafood vs cheese battle |

#### 4.3 Combat Rewards
- **Curds**: Primary currency from all fights
- **Whey**: Secondary currency from bosses
- **Equipment Drops**: Chance-based from enemies
- **Hero XP**: Distributed to active party

#### 4.4 Limit Break System
- "Canadian Rage" gauge fills from taking/dealing damage
- Each hero has unique Limit Break:
  - Maple Knight: "Coast to Coast Charge" - Invincible rush attack
  - Poutine Mage: "Festival of Flavor" - Party-wide buff + damage
  - Hockey Enforcer: "Gordie Howe Hat Trick" - Three consecutive attacks

#### 4.5 Combat Zones
- World map with province-based zones
- Each zone has 10 battle stages + 1 boss
- Zone completion unlocks next province
- Repeatable for farming

**Deliverable**: Complete combat system with auto-battle, bosses, and rewards

---

### Phase 5: Prestige System (Cheese Aging)

**Objective**: Implement multi-layer prestige as cheese aging

#### 5.1 First Prestige Layer: "Aging"

**Concept**: Reset progress to "age" your cheese empire, gaining "Rennet" (prestige currency)

**Formula**: `rennet = floor(sqrt(lifetime_curds / 1e12))`

**Rennet Benefits**:
- +1% global production per Rennet
- Unlocks Aging upgrades
- Required for advanced generators

**Aging Upgrades** (purchased with Rennet):
| Upgrade | Cost | Effect |
|---------|------|--------|
| Curd Catalyst | 1 | +5% click power |
| Efficient Vats | 5 | -10% generator costs |
| Quality Culture | 10 | +10% all production |
| Master Affineur | 50 | +1% per owned generator type |
| Cheese Sommelier | 100 | Unlock cheese pairing bonuses |

#### 5.2 Second Prestige Layer: "Vintage"

**Unlocks**: After 100 Aging resets

**Concept**: Sacrifice Rennet to create "Vintage Wheels" with powerful permanent effects

**Vintage Formula**: `wheels = floor(rennet / 100)`

**Vintage Benefits**:
- Unlock legendary generator tier (16-20)
- Unlock rare cheese crafting
- Permanent hero stat bonuses

#### 5.3 Third Prestige Layer: "Legacy"

**Unlocks**: After 10 Vintage resets

**Concept**: Establish your cheese "Legacy" across Canada

**Legacy Benefits**:
- Unlock Canadian mythology content (Thunderbird, Wendigo encounters)
- Province-specific permanent bonuses
- Endgame challenge modes

#### 5.4 Offline Progress
- Idle gains calculated on return
- "Welcome back, eh!" summary screen
- Bonus for returning (loyalty multiplier)

**Deliverable**: Three-tier prestige system with meaningful reset incentives

---

### Phase 6: Cheese Crafting Deep Dive

**Objective**: Implement the cheese-making crafting system

#### 6.1 Cheese Types & Tiers

**Fresh Cheeses** (No aging):
- Cottage Cheese, Ricotta, Cream Cheese
- Quick production, low value

**Soft Cheeses** (2-4 weeks):
- Brie, Camembert, Canadian Oka
- Medium value, some stat bonuses

**Semi-Hard Cheeses** (2-6 months):
- Cheddar (Black Diamond), Gouda, Havarti
- Good value, solid bonuses

**Hard Cheeses** (6-24 months):
- Parmesan, Aged Gouda, Gruyere
- High value, powerful bonuses

**Legendary Cheeses** (2+ years):
- 5-Year Vintage Cheddar
- Pule (requires Donkey unlock)
- Moose Cheese (ultra-rare)

#### 6.2 Crafting Mechanics

**Ingredients**:
- Milk (Cow, Goat, Sheep, Buffalo, Moose, Donkey)
- Cultures (Basic, Regional, Artisan, Legendary)
- Rennet (Animal, Vegetable, Microbial)
- Specialty Items (Truffle, Maple, Herbs)

**Crafting Process**:
1. Select cheese type
2. Choose milk source (affects base quality)
3. Add cultures (affects flavor profile)
4. Begin aging timer (real-time or accelerated)
5. Optional: Wash rind, add flavors during aging
6. Collect finished cheese

#### 6.3 Cheese Uses
- **Sell**: Convert to curds at quality-based rates
- **Equip**: Cheese Charms for heroes (temporary buffs)
- **Gift**: Increase NPC affinity
- **Sacrifice**: Prestige layer requirements
- **Collection**: Completionist achievements

#### 6.4 Affinage Caves
Unlock and upgrade caves for passive cheese aging:

| Cave | Capacity | Bonus | Unlock |
|------|----------|-------|--------|
| Basic Cellar | 5 | None | Start |
| Temperature Cave | 10 | +10% quality | 100 Rennet |
| Humidity Cave | 15 | +20% quality | 500 Rennet |
| Alpine Cave | 25 | +35% quality | 1 Vintage |
| Master's Vault | 50 | +50% quality | 5 Vintage |

**Deliverable**: Complete cheese crafting system with aging mechanics

---

### Phase 7: Content Expansion

**Objective**: Fill out the game with substantial content

#### 7.1 Full Province Map

Each province has:
- Unique visual theme
- 10 battle zones
- Province boss
- Exclusive heroes (2 per province)
- Regional cheese specialty

| Province | Theme | Boss | Exclusive Cheese |
|----------|-------|------|------------------|
| Ontario | Urban/Rural mix | The Bland Baron | Black Diamond Cheddar |
| Quebec | Old World charm | Le Fromage Fantome | Oka |
| BC | Pacific forests | Pacific Rim Crab | Saltspring Island Cheese |
| Alberta | Cowboys/Oil | Oil Slick Sally | Sylvan Star Gouda |
| Saskatchewan | Endless prairies | Wheat Witch | Original Chicken Chicken Cheese |
| Manitoba | Lakes/Hockey | The Frozen Goalie | Bothwell Cheese |
| Nova Scotia | Maritime | The Kraken | Dragon's Breath Blue |
| New Brunswick | Covered bridges | The Headless Lumberjack | Peau Rouge |
| PEI | Anne of Green Gables | Anne's Dark Side | Avonlea Clothbound |
| Newfoundland | Vikings/Icebergs | The Iceberg Leviathan | Five Brothers Cheese |
| Yukon | Gold rush | The Wendigo | Yukon Gold |
| NWT | Northern lights | Aurora Serpent | Arctic Char Cheese |
| Nunavut | Inuit culture | Sedna | Ice Cave Aged |

#### 7.2 Expanded Hero Roster (30+ Heroes)

Add heroes representing:
- Each province (2 each = 26 more)
- Legendary heroes (Gretzky-inspired, Terry Fox tribute, etc.)
- Secret heroes (mythology-based)

#### 7.3 Canadian Mythology Quests

**Thunderbird Saga**:
- Ally with the Thunderbird against chaos forces
- Multi-part questline
- Unlocks flying mount/fast travel

**Wendigo Warning**:
- Horror-themed cautionary tale about greed
- Optional difficult content
- Teaches "take only what you need" (anti-hoarding mechanic)

**La Chasse-Galerie**:
- Flying Canoe event (timed seasonal)
- Risk/reward mechanics
- Unique rewards

#### 7.4 Events & Seasons

**Canada Day (July 1)**:
- Red and white themed
- 2x Canadian-themed drops
- Limited cosmetics

**Poutine Week**:
- Quebec-focused bonuses
- Special gravy-based crafting

**Hockey Season**:
- NHL-themed events
- Stanley Cup chase mini-game

**Winterlude**:
- Ice sculpture decorations
- Cold-themed enemies
- Hot chocolate buff items

**Deliverable**: Content-complete game with all provinces and events

---

### Phase 8: Polish & Launch

**Objective**: Final polish, optimization, and launch preparation

#### 8.1 Visual Polish
- Particle effects for all abilities
- Smooth UI animations
- Loading screen with tips
- Settings menu (audio, graphics, accessibility)

#### 8.2 Audio Polish
- Full soundtrack (Canadian-inspired)
- Province-specific ambient audio
- Combat music with phase transitions
- Achievement/level-up fanfares

#### 8.3 Performance Optimization
- Asset compression (KTX2 textures, Draco geometry)
- LOD system for 3D models
- Lazy loading for distant content
- Mobile-specific optimizations

#### 8.4 Accessibility
- Screen reader support for UI
- Colorblind modes
- Reduced motion option
- Keyboard navigation

#### 8.5 Analytics & Telemetry
- Anonymous usage tracking
- Progression bottleneck detection
- A/B testing framework

#### 8.6 Launch Preparation
- Beta testing period
- Community Discord/Reddit setup
- Press kit and trailer
- App store listings (if applicable)

**Deliverable**: Launch-ready game with full polish

---

## Content Summary

### By the Numbers

| Category | Count |
|----------|-------|
| Generators | 20 |
| Heroes | 30+ |
| Provinces | 13 |
| Battles per Province | 10 + boss |
| Total Battles | 143+ |
| Cheese Types | 50+ |
| Achievements | 100+ |
| Equipment Items | 200+ |
| Enemy Types | 75+ |
| Boss Fights | 15+ |

### Progression Milestones

| Milestone | Content Available |
|-----------|-------------------|
| Start | Ontario, 3 heroes, fresh cheeses |
| 1 hour | Quebec unlocked, 5 heroes |
| 5 hours | First prestige available, 8 heroes |
| 20 hours | 5 provinces, combat system mastery |
| 50 hours | First Vintage prestige |
| 100+ hours | Endgame content, legendary cheeses |

---

## Key Design Decisions

### 1. Cheese Aging as Prestige
Using cheese aging terminology (fresh → aged → vintage → legacy) makes prestige thematic rather than mechanical. Players "age" their empire, not "reset" it.

### 2. Canadian Humor Throughout
Every system has Canadian flavor:
- Error: "Sorry, eh, something went wrong!"
- Achievement: "You're being a real keener!"
- Victory: "Beauty! That was gouda!"

### 3. Dual Engagement Modes
Support both:
- **Active Players**: Click bonuses, manual skills, formation optimization
- **Idle Players**: Auto-battle, offline gains, set-and-forget progression

### 4. Meaningful Generator Variety
Each generator has visual presence in the 3D scene, not just a number. Players see their cheese empire grow spatially.

### 5. Formation Over Auto-Battle AI
Instead of scripting AI behavior, players arrange heroes in formations. The system auto-battles, but positioning creates meaningful choices.

---

## Technical Considerations

### Save Data Structure

```typescript
interface GameSave {
  version: string;
  curds: BigNumber;
  whey: BigNumber;
  rennet: number;
  vintage: number;
  legacy: number;
  generators: Record<GeneratorId, number>;
  heroes: Record<HeroId, HeroState>;
  equipment: EquipmentInventory;
  cheese: CheeseInventory;
  achievements: AchievementId[];
  provinces: Record<ProvinceId, ProvinceProgress>;
  settings: UserSettings;
  stats: PlayStats;
  lastSaved: number;
}
```

### Big Number Handling
Use decimal.js or break-infinity for numbers beyond JavaScript's safe integer range. Display formatting:
- < 1,000: "999"
- < 1,000,000: "999.9K"
- < 1,000,000,000: "999.9M"
- Beyond: Scientific notation or letter notation (B, T, Qa, Qi, etc.)

### Offline Progress Calculation
```typescript
function calculateOfflineProgress(lastSaved: number): OfflineGains {
  const now = Date.now();
  const elapsed = Math.min(now - lastSaved, MAX_OFFLINE_TIME);
  const ticksElapsed = Math.floor(elapsed / TICK_MS);

  return {
    curds: curdProductionRate.mul(ticksElapsed),
    heroXP: baseXPRate * ticksElapsed * OFFLINE_XP_MODIFIER,
    cheeseProgress: updateAgingTimers(elapsed)
  };
}
```

---

## Monetization Considerations (Optional)

If monetization is desired, ethical approaches include:

1. **Cosmetics Only**: Skins for cheese wheels, hero outfits, shop decorations
2. **Time Savers** (not pay-to-win): Speed up aging timers, not skip them
3. **Expansion Content**: Additional provinces, heroes as DLC
4. **Season Pass**: Exclusive seasonal cosmetics and quality-of-life features

**Avoid**: Pay-to-win currency purchases, loot boxes, aggressive ads

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict phase boundaries, MVP-first approach |
| Balance issues | Automated testing tools, community beta |
| Performance | Regular profiling, mobile testing throughout |
| Content drought | Modular content system, event framework |
| Player retention | Multiple engagement loops, prestige depth |

---

## Next Steps

1. **Phase 1 Implementation Plan**: Create detailed technical spec for foundation
2. **Asset Pipeline Setup**: Establish 3D model and texture workflow
3. **Prototype Core Loop**: Build minimal clicker to validate feel
4. **Art Direction Document**: Define visual style guide
5. **Sound Design Brief**: Commission Canadian-themed audio

---

## Appendix A: Canadian Content Reference

### Essential Canadian Elements to Include

**Must-Have**:
- Tim Hortons references (double-double, Timbits)
- Hockey (The Great One, slapshots, zamboni)
- Mounties (red serge, "always get their cheese")
- Maple syrup (currency, buffs, legendary item)
- Poutine (healing item, Quebec content)
- "Sorry" and "Eh" (dialogue, achievements)
- Beaver (character, generator, national symbol)
- Moose (mount, rare milk source, character)
- Toque (equipment, cold resistance)
- Loonie/Toonie (currency)

**Should-Have**:
- Provincial stereotypes (playful, affectionate)
- Canadian slang glossary
- Weather jokes ("cold enough for ya?")
- US comparison humor
- First Nations mythology (respectfully)
- Voyageur/coureur des bois history
- Canadian musicians/comedians references

**Nice-to-Have**:
- Terry Fox tribute content
- Specific city references
- Canadian TV show easter eggs
- Regional food specialties beyond cheese

### Cheese Progression Reference

**Early Game (Fresh)**:
- Cottage Cheese, Quark, Cream Cheese
- Instant production, low value
- Teach basic mechanics

**Mid Game (Soft/Semi-Soft)**:
- Brie, Camembert, Oka, Havarti
- 2-8 week aging timers
- Introduce aging mechanics

**Late Game (Hard)**:
- Cheddar (all ages), Gouda, Parmesan
- 6-24 month aging
- Significant value and bonuses

**Endgame (Legendary)**:
- 5-Year Vintage Cheddar
- Pule (donkey milk, ultra-rare)
- Moose Cheese (requires Yukon unlock)
- Casu Marzu (secret forbidden cheese)

---

## Appendix B: JRPG Mechanics Reference

### Combat Formulas

**Damage Calculation**:
```
base_damage = attacker.attack * skill_multiplier
defense_factor = 1 - (defender.defense / (defender.defense + 100))
final_damage = base_damage * defense_factor * random(0.9, 1.1)
```

**ATB Speed**:
```
fill_rate = base_rate * (1 + hero.speed / 100)
time_to_action = 100 / fill_rate
```

**XP Distribution**:
```
xp_earned = enemy_base_xp * (1 + level_difference_bonus)
per_hero_xp = xp_earned / active_party_size
```

### Hero Stat Growth (Example: Maple Knight)

| Level | HP | ATK | DEF | SPD |
|-------|-----|-----|-----|-----|
| 1 | 100 | 15 | 20 | 8 |
| 10 | 450 | 45 | 75 | 15 |
| 50 | 2,800 | 180 | 350 | 45 |
| 100 | 8,500 | 400 | 850 | 80 |

---

## Sources

### Three.js & Technical
- Three.js Journey - Performance Tips
- React Three Fiber Documentation
- pmndrs/uikit for UI components
- Rapier physics documentation

### Clicker/Idle Game Design
- Kongregate: The Math of Idle Games (Parts I-III)
- Eric Guan: Idle Game Design Principles
- Cookie Clicker source analysis
- Clicker Heroes mechanics breakdowns

### JRPG Mechanics
- Final Fantasy ATB system documentation
- Chrono Trigger tech system analysis
- Job system comparisons (FFV, FFT, Bravely Default)
- Boss design principles from Game Developer

### Canadian Culture
- The Canadian Encyclopedia
- Canadian folklore collections
- RCMP historical documents
- Provincial tourism resources

### Cheese
- Wisconsin Cheese: Art of Affinage
- Murray's Cheese aging guides
- Oka cheese historical documentation
- Cheese classification standards

---

*This research document provides the foundation for building "The Great Canadian Cheese Quest." Each phase has clear deliverables and can be planned in detail as development progresses.*
