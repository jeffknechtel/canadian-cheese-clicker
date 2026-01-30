import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getHeroById } from '../../data/heroes';
import { getEquipmentById, getEquipmentBySlot } from '../../data/equipment';
import { formatNumber } from '../../utils/formatNumber';
import { playPurchaseSound } from '../../systems/audioSystem';
import type { EquipmentSlot, Equipment } from '../../types/game';

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
  cheese_charm: 'Cheese Charm',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-300 bg-gray-50',
  uncommon: 'border-green-400 bg-green-50',
  rare: 'border-purple-400 bg-purple-50',
};

const RARITY_TEXT: Record<string, string> = {
  common: 'text-gray-600',
  uncommon: 'text-green-600',
  rare: 'text-purple-600',
};

interface EquipmentCardProps {
  equipment: Equipment;
  isOwned: boolean;
  isEquipped: boolean;
  isEquippedByOther: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}

function EquipmentCard({
  equipment,
  isOwned,
  isEquipped,
  isEquippedByOther,
  onBuy,
  onEquip,
  onUnequip,
}: EquipmentCardProps) {
  const canAffordEquipment = useGameStore((state) => state.canAffordEquipment);
  const canAfford = canAffordEquipment(equipment.id);

  // Format stats display
  const statsDisplay = Object.entries(equipment.stats)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([stat, value]) => {
      const statLabels: Record<string, string> = {
        hp: 'HP',
        attack: 'ATK',
        defense: 'DEF',
        speed: 'SPD',
        cheeseAffinity: '🧀',
      };
      return `+${value} ${statLabels[stat] || stat}`;
    })
    .join(', ');

  return (
    <div
      className={`
        p-3 rounded-lg border-2 transition-all
        ${RARITY_COLORS[equipment.rarity]}
        ${isEquipped ? 'ring-2 ring-maple-400' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 text-2xl w-10 h-10 flex items-center justify-center bg-white rounded">
          {equipment.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-timber-700 truncate">{equipment.name}</span>
            <span className={`text-xs capitalize ${RARITY_TEXT[equipment.rarity]}`}>
              {equipment.rarity}
            </span>
            {isEquipped && (
              <span className="text-xs bg-maple-500 text-white px-1.5 py-0.5 rounded">
                Equipped
              </span>
            )}
            {isEquippedByOther && (
              <span className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded">
                In Use
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{equipment.description}</p>
          <p className="text-xs font-medium text-timber-600 mt-1">{statsDisplay}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-2">
        {isEquipped ? (
          <button
            onClick={onUnequip}
            className="w-full py-1.5 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
          >
            Unequip
          </button>
        ) : isOwned ? (
          <button
            onClick={onEquip}
            disabled={isEquippedByOther}
            className={`
              w-full py-1.5 rounded text-sm font-medium transition-colors
              ${isEquippedByOther
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-cheddar-500 hover:bg-cheddar-600 text-white'
              }
            `}
          >
            {isEquippedByOther ? 'Equipped on Another Hero' : 'Equip'}
          </button>
        ) : (
          <button
            onClick={onBuy}
            disabled={!canAfford}
            className={`
              w-full py-1.5 rounded text-sm font-medium transition-colors
              ${canAfford
                ? 'bg-maple-500 hover:bg-maple-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Buy for {formatNumber(equipment.cost)}
          </button>
        )}
      </div>
    </div>
  );
}

interface EquipmentModalProps {
  heroId: string;
  slot: EquipmentSlot;
  onClose: () => void;
}

export function EquipmentModal({ heroId, slot, onClose }: EquipmentModalProps) {
  const [filter, setFilter] = useState<'all' | 'owned' | 'buyable'>('all');

  const heroes = useGameStore((state) => state.heroes);
  const equipmentInventory = useGameStore((state) => state.equipmentInventory);
  const buyEquipment = useGameStore((state) => state.buyEquipment);
  const equipItem = useGameStore((state) => state.equipItem);
  const unequipItem = useGameStore((state) => state.unequipItem);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const hero = getHeroById(heroId);
  const heroState = heroes[heroId];
  const currentEquipmentId = heroState?.equipment[slot];
  const currentEquipment = currentEquipmentId ? getEquipmentById(currentEquipmentId) : null;

  // Get all equipment for this slot
  const slotEquipment = getEquipmentBySlot(slot);

  // Check if equipment is owned by another hero
  const isEquippedByOtherHero = (equipmentId: string): boolean => {
    for (const [otherId, otherHero] of Object.entries(heroes)) {
      if (otherId !== heroId && Object.values(otherHero.equipment).includes(equipmentId)) {
        return true;
      }
    }
    return false;
  };

  // Filter equipment
  const filteredEquipment = slotEquipment.filter((eq) => {
    if (filter === 'owned') return equipmentInventory.includes(eq.id);
    if (filter === 'buyable') return !equipmentInventory.includes(eq.id);
    return true;
  });

  // Sort by: currently equipped first, then owned, then by cost
  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    // Currently equipped first
    if (a.id === currentEquipmentId) return -1;
    if (b.id === currentEquipmentId) return 1;

    // Then owned
    const aOwned = equipmentInventory.includes(a.id);
    const bOwned = equipmentInventory.includes(b.id);
    if (aOwned && !bOwned) return -1;
    if (!aOwned && bOwned) return 1;

    // Then by cost
    return a.cost.comparedTo(b.cost);
  });

  const handleBuy = (equipmentId: string) => {
    const success = buyEquipment(equipmentId);
    if (success) {
      playPurchaseSound();
    }
  };

  const handleEquip = (equipmentId: string) => {
    equipItem(heroId, equipmentId);
  };

  const handleUnequip = () => {
    unequipItem(heroId, slot);
  };

  if (!hero || !heroState) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 ${!reducedMotion ? 'animate-backdrop-in' : ''}`}
      onClick={onClose}
    >
      <div
        className={`bg-cream rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col panel-wood ${!reducedMotion ? 'animate-modal-in' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-timber-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-timber-700 flex items-center gap-2">
              <span>{hero.icon}</span>
              <span>{hero.name}'s {SLOT_LABELS[slot]}</span>
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-timber-100 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Currently equipped */}
          {currentEquipment && (
            <div className="mt-2 p-2 bg-maple-50 rounded border border-maple-200">
              <div className="flex items-center gap-2">
                <span>{currentEquipment.icon}</span>
                <span className="text-sm font-medium text-maple-700">
                  Currently: {currentEquipment.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-3 border-b border-timber-100">
          {(['all', 'owned', 'buyable'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                flex-1 px-2 py-1 text-xs rounded font-medium transition-colors capitalize
                ${filter === f
                  ? 'bg-timber-500 text-white'
                  : 'bg-white/50 text-timber-700 hover:bg-white/70'
                }
              `}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedEquipment.length > 0 ? (
            sortedEquipment.map((eq) => (
              <EquipmentCard
                key={eq.id}
                equipment={eq}
                isOwned={equipmentInventory.includes(eq.id)}
                isEquipped={eq.id === currentEquipmentId}
                isEquippedByOther={isEquippedByOtherHero(eq.id)}
                onBuy={() => handleBuy(eq.id)}
                onEquip={() => handleEquip(eq.id)}
                onUnequip={handleUnequip}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No equipment found</p>
              <p className="text-xs mt-1">
                {filter === 'owned' ? 'Buy equipment to see it here!' : 'Check back later!'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-timber-200">
          <button
            onClick={onClose}
            className="w-full py-2 rounded font-medium text-sm bg-timber-500 hover:bg-timber-600 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
