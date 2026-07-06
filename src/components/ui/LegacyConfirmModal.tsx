import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { ModalOverlay } from './shared/ModalOverlay';
import { Button } from './shared/Button';
import { startPrestigeMusic, returnToIdleMusic } from '../../systems/audioSystem';
import { getProvinceDisplayName, PROVINCE_ICONS } from '../../data/zones';
import { LEGACY_POINT_MULTIPLIER, LEGACY_PROVINCE_COMBAT_BONUS } from '../../data/constants';
import type { Province } from '../../types/game';

interface LegacyConfirmModalProps {
  onConfirm: (province: Province) => void;
  onCancel: () => void;
}

const ALL_PROVINCES = Object.keys(PROVINCE_ICONS) as Province[];

export function LegacyConfirmModal({ onConfirm, onCancel }: LegacyConfirmModalProps) {
  const prestige = useGameStore((s) => s.prestige);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  const pointsToGain = prestige.vintageWheels;

  // Start prestige music when modal opens
  useEffect(() => {
    startPrestigeMusic();
    return () => returnToIdleMusic();
  }, []);

  return (
    <ModalOverlay isOpen={true} onClose={onCancel} ariaLabelledBy="legacy-modal-title">
      <div className="bg-white panel-wood-solid border-4 border-yellow-500 rounded-lg p-6 max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h2 id="legacy-modal-title" className="text-2xl font-bold text-yellow-700 mb-2 text-center flex items-center justify-center gap-2 font-display">
          <span className={!reducedMotion ? 'animate-pulse' : ''}>👑</span>
          Establish Your Legacy
          <span className={!reducedMotion ? 'animate-pulse' : ''}>👑</span>
        </h2>

        <p className="text-rind mb-4 text-center italic">
          "The most destructive reset in the game — but your name lives on in a province forever."
        </p>

        {/* Points Gain */}
        <div className="bg-yellow-100 rounded-lg p-4 mb-4">
          <p className="text-center text-rind font-medium">Your {pointsToGain} Vintage Wheel{pointsToGain !== 1 ? 's' : ''} become</p>
          <p className="text-4xl font-bold text-yellow-600 text-center my-2">
            +{pointsToGain} Legacy Point{pointsToGain !== 1 ? 's' : ''}
          </p>
          <p className="text-center text-xs text-yellow-700">
            Each point: +{(LEGACY_POINT_MULTIPLIER * 100).toFixed(0)}% global production, and battles in the
            chosen province pay +{(LEGACY_PROVINCE_COMBAT_BONUS * 100).toFixed(0)}% curds per point.
          </p>
        </div>

        {/* Province Picker */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-yellow-700 mb-2">Choose a province to honour</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {ALL_PROVINCES.map((province) => {
              const currentPoints = prestige.legacyBonuses[province];
              const isSelected = selectedProvince === province;
              return (
                <button
                  key={province}
                  onClick={() => setSelectedProvince(province)}
                  aria-pressed={isSelected}
                  title={getProvinceDisplayName(province)}
                  className={`
                    flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all
                    ${isSelected
                      ? 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-400 font-semibold'
                      : 'bg-white/70 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                    }
                  `}
                >
                  <span className="text-lg">{PROVINCE_ICONS[province]}</span>
                  <span className="truncate w-full text-center">{getProvinceDisplayName(province)}</span>
                  <span className={currentPoints > 0 ? 'text-yellow-600 font-medium' : 'text-gray-400'}>
                    {currentPoints} pts
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* What will be reset */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-red-700 mb-2">Will Be Reset</h3>
            <ul className="text-xs text-red-600 space-y-1">
              <li>Curds, generators & upgrades</li>
              <li>Whey currency</li>
              <li>All heroes & equipment</li>
              <li>Zone progress</li>
              <li>Crafting jobs & cheese inventory</li>
              <li className="font-semibold">Recipe, ingredient & cave unlocks (back to starter set)</li>
              <li className="font-semibold">All Rennet & Aging Upgrades</li>
              <li className="font-semibold">All Vintage Wheels & reset counters</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-green-700 mb-2">Will Be Kept</h3>
            <ul className="text-xs text-green-600 space-y-1">
              <li className="font-semibold">Legacy points (permanent)</li>
              <li>Cheese collection (the codex)</li>
              <li>Lifetime totals</li>
              <li>Achievements</li>
              <li>Synergies</li>
              <li>Golden cheese perks</li>
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1 py-3">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => selectedProvince && onConfirm(selectedProvince)}
            disabled={!selectedProvince}
            className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600"
          >
            {selectedProvince ? `Honour ${getProvinceDisplayName(selectedProvince)}` : 'Choose a Province'}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
