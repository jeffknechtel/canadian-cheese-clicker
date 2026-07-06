import { useEffect } from 'react';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { ModalOverlay } from './shared/ModalOverlay';
import { startPrestigeMusic, returnToIdleMusic } from '../../systems/audioSystem';
import { VINTAGE_RENNET_COST, VINTAGE_WHEEL_MULTIPLIER } from '../../data/constants';

interface VintageConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function VintageConfirmModal({ onConfirm, onCancel }: VintageConfirmModalProps) {
  const prestige = useGameStore((s) => s.prestige);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const wheelsGained = Math.floor(prestige.rennet / VINTAGE_RENNET_COST);
  const rennetRemainder = prestige.rennet % VINTAGE_RENNET_COST;
  const newWheels = prestige.vintageWheels + wheelsGained;

  // Start prestige music when modal opens
  useEffect(() => {
    startPrestigeMusic();
    return () => returnToIdleMusic();
  }, []);

  return (
    <ModalOverlay isOpen={true} onClose={onCancel} ariaLabelledBy="vintage-modal-title">
      <div className="bg-white panel-wood-solid border-4 border-purple-500 rounded-lg p-6 max-w-lg mx-4 shadow-2xl">
        <h2 id="vintage-modal-title" className="text-2xl font-bold text-purple-700 mb-2 text-center flex items-center justify-center gap-2 font-display">
          <span className={!reducedMotion ? 'animate-pulse' : ''}>🍷</span>
          Vintage Reset
          <span className={!reducedMotion ? 'animate-pulse' : ''}>🍷</span>
        </h2>

        <p className="text-rind mb-4 text-center italic">
          "Sacrifice your Rennet to press timeless Vintage Wheels, eh!"
        </p>

        {/* Wheel Gain */}
        <div className="bg-purple-100 rounded-lg p-4 mb-4">
          <p className="text-center text-rind font-medium">You will gain</p>
          <p className="text-4xl font-bold text-purple-600 text-center my-2">
            +{wheelsGained} Vintage Wheel{wheelsGained !== 1 ? 's' : ''}
          </p>
          <p className="text-center text-sm text-purple-700">
            Total: {prestige.vintageWheels} → {newWheels} (+{(newWheels * VINTAGE_WHEEL_MULTIPLIER * 100).toFixed(0)}% production)
          </p>
          <p className="text-center text-xs text-purple-600 mt-1">
            {rennetRemainder} Rennet remains after pressing
          </p>
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
              <li className="font-semibold">Aging Upgrades</li>
              <li className="font-semibold">Aging reset counter ({prestige.agingResetCount} → 0)</li>
              <li>Rennet (keeps {rennetRemainder} remainder)</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-green-700 mb-2">Will Be Kept</h3>
            <ul className="text-xs text-green-600 space-y-1">
              <li>Lifetime totals (content unlocks stay satisfied)</li>
              <li>Recipe, ingredient & cave unlocks</li>
              <li>Cheese collection</li>
              <li>Achievements</li>
              <li>Synergies</li>
              <li>Golden cheese perks</li>
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Press the Wheels
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
