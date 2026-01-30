import { useGameStore } from '../../stores/gameStore';
import { getHeroById } from '../../data/heroes';
import { calculateHeroStats } from '../../systems/productionEngine';
import type { FormationPosition } from '../../types/game';

const POSITIONS: FormationPosition[] = ['frontLeft', 'frontRight', 'backLeft', 'backRight'];

const POSITION_LABELS: Record<FormationPosition, string> = {
  frontLeft: 'Front Left',
  frontRight: 'Front Right',
  backLeft: 'Back Left',
  backRight: 'Back Right',
};

interface PartySlotProps {
  position: FormationPosition;
  heroId: string | null;
  onClick: () => void;
  onRemove: () => void;
}

function PartySlot({ position, heroId, onClick, onRemove }: PartySlotProps) {
  const heroes = useGameStore((state) => state.heroes);

  const hero = heroId ? getHeroById(heroId) : null;
  const heroState = heroId ? heroes[heroId] : null;
  const stats = hero && heroState ? calculateHeroStats(hero.id, heroState) : null;

  const isFrontRow = position === 'frontLeft' || position === 'frontRight';

  return (
    <div
      className={`
        relative p-2 rounded-lg border-2 transition-all cursor-pointer
        ${hero
          ? 'bg-white/80 border-timber-300 hover:border-maple-400'
          : 'bg-white/40 border-dashed border-gray-300 hover:border-timber-400 hover:bg-white/60'
        }
      `}
      onClick={onClick}
    >
      {/* Row indicator */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs px-1.5 bg-cream rounded">
        {isFrontRow ? 'Front' : 'Back'}
      </div>

      {hero && heroState ? (
        <div className="text-center">
          {/* Hero Icon */}
          <div className="text-2xl mb-1">{hero.icon}</div>

          {/* Name and Level */}
          <div className="text-xs font-semibold text-timber-700 truncate">
            {hero.name}
          </div>
          <div className="text-xs text-gray-500">Lv.{heroState.level}</div>

          {/* Cheese Affinity (most relevant stat for CPS) */}
          {stats && (
            <div className="text-xs text-cheddar-600 mt-0.5">
              🧀 {Math.floor(stats.cheeseAffinity)}
            </div>
          )}

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow transition-colors"
            title="Remove from party"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <div className="text-2xl text-gray-300 mb-1">+</div>
          <div className="text-xs text-gray-400">Empty</div>
        </div>
      )}
    </div>
  );
}

interface PartyFormationPanelProps {
  onSlotClick?: (position: FormationPosition) => void;
  compact?: boolean;
}

export function PartyFormationPanel({ onSlotClick, compact = false }: PartyFormationPanelProps) {
  const party = useGameStore((state) => state.party);
  const removeFromParty = useGameStore((state) => state.removeFromParty);
  const getHeroMultiplier = useGameStore((state) => state.getHeroMultiplier);
  const heroes = useGameStore((state) => state.heroes);

  const heroMultiplier = getHeroMultiplier();

  // Count party members
  const partyCount = POSITIONS.filter((pos) => party[pos] !== null).length;

  // Calculate total cheese affinity
  let totalAffinity = 0;
  for (const pos of POSITIONS) {
    const heroId = party[pos];
    if (heroId && heroes[heroId]) {
      const stats = calculateHeroStats(heroId, heroes[heroId]);
      totalAffinity += stats.cheeseAffinity;
    }
  }

  const handleSlotClick = (position: FormationPosition) => {
    if (onSlotClick) {
      onSlotClick(position);
    }
  };

  const handleRemove = (position: FormationPosition) => {
    removeFromParty(position);
  };

  if (compact) {
    return (
      <div className="p-3 bg-cream/80 backdrop-blur rounded-lg shadow border border-timber-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-timber-700">Party</span>
          <span className="text-xs text-gray-500">{partyCount}/4</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {POSITIONS.map((pos) => {
            const heroId = party[pos];
            const hero = heroId ? getHeroById(heroId) : null;
            return (
              <div
                key={pos}
                className={`
                  aspect-square rounded flex items-center justify-center text-lg
                  ${hero ? 'bg-white/80 border border-timber-200' : 'bg-gray-100 border border-dashed border-gray-300'}
                `}
                title={hero ? `${hero.name} (${POSITION_LABELS[pos]})` : POSITION_LABELS[pos]}
              >
                {hero ? hero.icon : '+'}
              </div>
            );
          })}
        </div>
        {heroMultiplier > 1 && (
          <div className="mt-2 text-xs text-center text-maple-600">
            ×{heroMultiplier.toFixed(2)} CPS
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg panel-wood wood-grain">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-timber-700 flex items-center gap-2">
          <span>⚔️</span>
          <span>Party Formation</span>
        </h3>
        <span className="text-xs text-gray-500">{partyCount}/4</span>
      </div>

      {/* 2x2 Formation Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Front Row */}
        <PartySlot
          position="frontLeft"
          heroId={party.frontLeft}
          onClick={() => handleSlotClick('frontLeft')}
          onRemove={() => handleRemove('frontLeft')}
        />
        <PartySlot
          position="frontRight"
          heroId={party.frontRight}
          onClick={() => handleSlotClick('frontRight')}
          onRemove={() => handleRemove('frontRight')}
        />

        {/* Back Row */}
        <PartySlot
          position="backLeft"
          heroId={party.backLeft}
          onClick={() => handleSlotClick('backLeft')}
          onRemove={() => handleRemove('backLeft')}
        />
        <PartySlot
          position="backRight"
          heroId={party.backRight}
          onClick={() => handleSlotClick('backRight')}
          onRemove={() => handleRemove('backRight')}
        />
      </div>

      {/* Formation Bonus Display */}
      <div className="mt-3 pt-3 border-t border-timber-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Cheese Affinity:</span>
          <span className="font-medium text-cheddar-600">🧀 {Math.floor(totalAffinity)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-600">CPS Multiplier:</span>
          <span className="font-medium text-maple-600">×{heroMultiplier.toFixed(2)}</span>
        </div>

        {/* Formation Tips */}
        <div className="mt-2 text-xs text-gray-500">
          <p>💡 Tanks in front: +5% CPS</p>
          <p>💡 Healers in back: +5% CPS</p>
          <p>💡 Full party: +10% CPS</p>
        </div>
      </div>
    </div>
  );
}
