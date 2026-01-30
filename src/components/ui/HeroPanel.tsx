import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { HEROES, getHeroById } from '../../data/heroes';
import { formatNumber } from '../../utils/formatNumber';
import { playPurchaseSound, playMilestoneChime } from '../../systems/audioSystem';
import { calculateHeroStats } from '../../systems/productionEngine';
import { showHeroRecruitDialogue } from '../../systems/dialogueSystem';
import type { HeroDefinition, HeroState, EquipmentSlot } from '../../types/game';

type TabType = 'roster' | 'recruit';

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory', 'cheese_charm'];

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
  cheese_charm: 'Charm',
};

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💎',
  cheese_charm: '🧀',
};

const CLASS_COLORS: Record<string, string> = {
  tank: 'bg-blue-100 text-blue-700 border-blue-300',
  dps: 'bg-red-100 text-red-700 border-red-300',
  support: 'bg-green-100 text-green-700 border-green-300',
  healer: 'bg-purple-100 text-purple-700 border-purple-300',
};

interface HeroCardProps {
  hero: HeroDefinition;
  heroState: HeroState;
  onEquipmentClick: (heroId: string, slot: EquipmentSlot) => void;
  onAddToParty: (heroId: string) => void;
  isInParty: boolean;
  isInCombat: boolean;
}

function HeroCard({ hero, heroState, onEquipmentClick, onAddToParty, isInParty, isInCombat }: HeroCardProps) {
  const stats = calculateHeroStats(hero.id, heroState);
  const xpProgress = heroState.xpToNextLevel > 0
    ? (heroState.xp / heroState.xpToNextLevel) * 100
    : 100;

  return (
    <div className={`p-3 rounded-lg bg-white/70 border transition-all duration-200 hover:scale-[1.01] ${
      isInCombat && isInParty
        ? 'border-red-300 ring-2 ring-red-200 ring-opacity-50'
        : 'border-timber-200 hover:border-maple-400 hover:shadow-md'
    }`}>
      {/* Header: Icon, Name, Level, Class */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-3xl w-12 h-12 flex items-center justify-center bg-timber-100 rounded-lg transition-transform duration-200 hover:scale-110">
          {hero.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-timber-700 truncate">{hero.name}</span>
            <span className="text-xs font-medium text-timber-500">Lv.{heroState.level}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${CLASS_COLORS[hero.class]}`}>
              {hero.class}
            </span>
            {isInCombat && isInParty && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 animate-pulse">
                ⚔️ Fighting
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 italic truncate">{hero.title}</p>

          {/* XP Bar */}
          <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-cheddar-400 to-cheddar-600 transition-all duration-500 ease-out"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            XP: {Math.floor(heroState.xp)}/{heroState.xpToNextLevel}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
        <div className="text-center">
          <div className="text-gray-500">HP</div>
          <div className="font-medium text-timber-600">{Math.floor(stats.hp)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">ATK</div>
          <div className="font-medium text-timber-600">{Math.floor(stats.attack)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">DEF</div>
          <div className="font-medium text-timber-600">{Math.floor(stats.defense)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">SPD</div>
          <div className="font-medium text-timber-600">{Math.floor(stats.speed)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">🧀</div>
          <div className="font-medium text-cheddar-600">{Math.floor(stats.cheeseAffinity)}</div>
        </div>
      </div>

      {/* Equipment Slots */}
      <div className="mt-2 flex gap-1">
        {EQUIPMENT_SLOTS.map((slot) => {
          const equipped = heroState.equipment[slot];
          return (
            <button
              key={slot}
              onClick={() => onEquipmentClick(hero.id, slot)}
              className={`
                flex-1 p-1.5 rounded text-xs transition-all duration-200
                ${equipped
                  ? 'bg-cheddar-100 border border-cheddar-300 hover:bg-cheddar-200 hover:border-cheddar-400 hover:shadow-xs'
                  : 'bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:border-gray-300'
                }
                active:scale-95
              `}
              title={`${SLOT_LABELS[slot]}${equipped ? ' (equipped)' : ''}`}
            >
              <div className="text-center">
                <span className="transition-transform duration-200 inline-block hover:scale-110">{SLOT_ICONS[slot]}</span>
                {equipped && <span className="block text-cheddar-600 animate-pulse">✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add to Party Button */}
      <button
        onClick={() => onAddToParty(hero.id)}
        disabled={isInParty || isInCombat}
        className={`
          mt-2 w-full py-1.5 rounded text-sm font-medium transition-all duration-200
          ${isInCombat
            ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
            : isInParty
              ? 'bg-maple-100 text-maple-600 border border-maple-300 cursor-default'
              : 'bg-linear-to-r from-maple-500 to-maple-600 hover:from-maple-600 hover:to-maple-700 text-white shadow-xs hover:shadow-md active:scale-[0.98]'
          }
        `}
      >
        {isInCombat ? '🔒 In Combat' : isInParty ? '✓ In Party, eh!' : 'Add to Party'}
      </button>
    </div>
  );
}

interface HeroRecruitCardProps {
  hero: HeroDefinition;
}

function HeroRecruitCard({ hero }: HeroRecruitCardProps) {
  const { recruitHero, canAffordHero } = useGameStore();
  const canAfford = canAffordHero(hero.id);

  const handleRecruit = () => {
    if (canAfford) {
      const success = recruitHero(hero.id);
      if (success) {
        playPurchaseSound();
        playMilestoneChime();
        // Show hero-specific recruitment dialogue
        const heroDef = getHeroById(hero.id);
        if (heroDef) {
          showHeroRecruitDialogue(heroDef);
        }
      }
    }
  };

  return (
    <div
      className={`
        p-3 rounded-lg transition-all duration-200
        ${canAfford
          ? 'bg-white/70 border border-timber-200 hover:border-maple-400 hover:shadow-md hover:scale-[1.01]'
          : 'bg-white/40 border border-gray-200 opacity-80'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Portrait - silhouette style if not affordable */}
        <div
          className={`
            shrink-0 text-3xl w-12 h-12 flex items-center justify-center rounded-lg
            ${canAfford ? 'bg-maple-100' : 'bg-gray-200 grayscale opacity-60'}
          `}
        >
          {hero.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold truncate ${canAfford ? 'text-timber-700' : 'text-gray-500'}`}>
              {hero.name}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${CLASS_COLORS[hero.class]}`}>
              {hero.class}
            </span>
          </div>
          <p className="text-xs text-gray-500 italic">{hero.title}</p>
          <p className="text-xs text-gray-600 mt-1">{hero.province.replace('_', ' ')}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-bold ${canAfford ? 'text-maple-600' : 'text-gray-400'}`}>
            {formatNumber(hero.recruitCost)}
          </div>
          <div className="text-xs text-gray-500">curds</div>
        </div>
      </div>

      {/* Special Ability */}
      <div className="mt-2 p-2 bg-timber-50 rounded text-xs">
        <div className="font-medium text-timber-700">{hero.specialAbility.name}</div>
        <p className="text-gray-600 mt-0.5 line-clamp-2">{hero.specialAbility.description}</p>
      </div>

      {/* Base Stats Preview */}
      <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
        <div className="text-center">
          <div className="text-gray-400">HP</div>
          <div className="text-gray-500">{hero.baseStats.hp}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">ATK</div>
          <div className="text-gray-500">{hero.baseStats.attack}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">DEF</div>
          <div className="text-gray-500">{hero.baseStats.defense}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">SPD</div>
          <div className="text-gray-500">{hero.baseStats.speed}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">🧀</div>
          <div className="text-gray-500">{hero.baseStats.cheeseAffinity}</div>
        </div>
      </div>

      {/* Recruit Button */}
      <button
        onClick={handleRecruit}
        disabled={!canAfford}
        className={`
          mt-2 w-full py-2 rounded font-medium text-sm transition-all duration-200
          ${canAfford
            ? 'bg-linear-to-r from-maple-500 to-maple-600 hover:from-maple-600 hover:to-maple-700 text-white shadow-xs hover:shadow-md active:scale-[0.98]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {canAfford ? 'Recruit Hero!' : "Sorry, not enough curds, eh!"}
      </button>
    </div>
  );
}

interface HeroPanelProps {
  onEquipmentClick?: (heroId: string, slot: EquipmentSlot) => void;
}

export function HeroPanel({ onEquipmentClick }: HeroPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('roster');

  const heroes = useGameStore((state) => state.heroes);
  const party = useGameStore((state) => state.party);
  const assignToParty = useGameStore((state) => state.assignToParty);
  const getHeroMultiplier = useGameStore((state) => state.getHeroMultiplier);
  const isInCombat = useGameStore((state) => state.combat.isInCombat);

  const recruitedHeroes = HEROES.filter((h) => heroes[h.id] !== undefined);
  const availableHeroes = HEROES.filter((h) => heroes[h.id] === undefined);
  const heroMultiplier = getHeroMultiplier();

  // Check if hero is in party
  const isHeroInParty = (heroId: string): boolean => {
    return (
      party.frontLeft === heroId ||
      party.frontRight === heroId ||
      party.backLeft === heroId ||
      party.backRight === heroId
    );
  };

  // Find next empty party slot
  const getNextEmptySlot = (): 'frontLeft' | 'frontRight' | 'backLeft' | 'backRight' | null => {
    if (!party.frontLeft) return 'frontLeft';
    if (!party.frontRight) return 'frontRight';
    if (!party.backLeft) return 'backLeft';
    if (!party.backRight) return 'backRight';
    return null;
  };

  const handleAddToParty = (heroId: string) => {
    if (isHeroInParty(heroId)) return;
    const slot = getNextEmptySlot();
    if (slot) {
      assignToParty(heroId, slot);
    }
  };

  const handleEquipmentClick = (heroId: string, slot: EquipmentSlot) => {
    if (onEquipmentClick) {
      onEquipmentClick(heroId, slot);
    }
  };

  return (
    <div className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-timber-700 flex items-center gap-2">
          <span>🦸</span>
          <span>Heroes</span>
          {isInCombat && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 animate-pulse">
              ⚔️ In Battle
            </span>
          )}
        </h2>
        {heroMultiplier > 1 && (
          <span className="text-xs bg-maple-100 text-maple-700 px-2 py-1 rounded border border-maple-200">
            CPS ×{heroMultiplier.toFixed(2)}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab('roster')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'roster'
              ? 'bg-timber-500 text-white'
              : 'bg-white/50 text-timber-700 hover:bg-white/70'
            }
          `}
        >
          Roster ({recruitedHeroes.length})
        </button>
        <button
          onClick={() => setActiveTab('recruit')}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
            ${activeTab === 'recruit'
              ? 'bg-timber-500 text-white'
              : 'bg-white/50 text-timber-700 hover:bg-white/70'
            }
          `}
        >
          Recruit ({availableHeroes.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        {activeTab === 'roster' ? (
          recruitedHeroes.length > 0 ? (
            recruitedHeroes.map((hero) => (
              <HeroCard
                key={hero.id}
                hero={hero}
                heroState={heroes[hero.id]}
                onEquipmentClick={handleEquipmentClick}
                onAddToParty={handleAddToParty}
                isInParty={isHeroInParty(hero.id)}
                isInCombat={isInCombat}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-3xl mb-2">🦸</p>
              <p className="text-sm">No heroes recruited yet</p>
              <p className="text-xs mt-1">Visit the Recruit tab to hire your first hero!</p>
            </div>
          )
        ) : (
          availableHeroes.length > 0 ? (
            availableHeroes.map((hero) => (
              <HeroRecruitCard key={hero.id} hero={hero} />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm">All heroes recruited!</p>
              <p className="text-xs mt-1">You've assembled the full Canadian dream team!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
