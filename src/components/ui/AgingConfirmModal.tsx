import { useState } from 'react';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatNumber } from '../../utils/formatNumber';
import { getPrestigeDialogue } from '../../data/canadianDialogue';
import { ModalOverlay } from './shared/ModalOverlay';
import Decimal from 'decimal.js';

interface AgingConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function formatRecoupTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return 'instantly';
  if (seconds < 60) return 'less than a minute';
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} minutes`;
  if (seconds < 86400) return `~${(seconds / 3600).toFixed(1)} hours`;
  return `~${(seconds / 86400).toFixed(1)} days`;
}

export function AgingConfirmModal({ onConfirm, onCancel }: AgingConfirmModalProps) {
  const { curds, curdPerSecond, generators, upgrades, prestige, getPotentialRennet, getPrestigeMultipliers } = useGameStore();
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const potentialRennet = getPotentialRennet();
  const currentMultipliers = getPrestigeMultipliers();

  // Calculate what multiplier will be after prestige
  const newRennet = prestige.rennet + potentialRennet;
  const newProductionMultiplier = 1 + (newRennet * 0.01);

  // Calculate recoup time estimate
  // How long to regain current curds with the new multiplier boost
  const multiplierGain = newProductionMultiplier / currentMultipliers.production;
  // Estimate assumes player rebuilds at roughly the same pace but with the new multiplier advantage
  // This is a simplification: actual time depends on how fast they buy generators again
  const estimatedRecoupSeconds = curdPerSecond.isZero()
    ? 0
    : curds.div(curdPerSecond.mul(multiplierGain)).toNumber();

  // Random Canadian message from dialogue system - stable across renders
  const [agingMessage] = useState(() => getPrestigeDialogue('beforeAging'));

  // Count generators
  const totalGenerators = Object.values(generators).reduce((sum, count) => sum + count, 0);

  return (
    <ModalOverlay isOpen={true} onClose={onCancel} ariaLabelledBy="aging-modal-title">
      <div className="bg-white panel-wood-solid border-4 border-amber-500 rounded-lg p-6 max-w-lg mx-4 shadow-2xl">
        <h2 id="aging-modal-title" className="text-2xl font-bold text-amber-700 mb-2 text-center flex items-center justify-center gap-2">
          <span className={!reducedMotion ? 'animate-pulse' : ''}>🧀</span>
          Age Your Empire
          <span className={!reducedMotion ? 'animate-pulse' : ''}>🧀</span>
        </h2>

        <p className="text-rind mb-4 text-center italic">
          "{agingMessage}"
        </p>

        {/* Rennet Gain */}
        <div className="bg-amber-100 rounded-lg p-4 mb-4">
          <p className="text-center text-rind font-medium">You will gain</p>
          <p className="text-4xl font-bold text-amber-600 text-center my-2">
            +{formatNumber(new Decimal(potentialRennet))} Rennet
          </p>
          <p className="text-center text-sm text-amber-700">
            Total: {formatNumber(new Decimal(prestige.rennet))} → {formatNumber(new Decimal(newRennet))}
          </p>
        </div>

        {/* Multiplier Change */}
        <div className="bg-cheddar-100 rounded-lg p-3 mb-4">
          <p className="text-sm text-center text-rind">
            Production Multiplier:{' '}
            <span className="font-semibold">x{currentMultipliers.production.toFixed(2)}</span>
            {' → '}
            <span className="font-bold text-cheddar-600">x{newProductionMultiplier.toFixed(2)}</span>
          </p>
        </div>

        {/* Recoup Time Estimate */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <span>⏱️</span>
            <span>
              <strong>Time to recoup:</strong> {formatRecoupTime(estimatedRecoupSeconds)}
            </span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Estimated time to regain your current curd production level after resetting.
          </p>
        </div>

        {/* What will be reset */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-red-700 mb-2">Will Be Reset</h3>
            <ul className="text-xs text-red-600 space-y-1">
              <li>Curds: {formatNumber(curds)}</li>
              <li>Generators: {totalGenerators}</li>
              <li>Upgrades: {upgrades.length}</li>
              <li>Whey currency</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-green-700 mb-2">Will Be Kept</h3>
            <ul className="text-xs text-green-600 space-y-1">
              <li>Heroes & Levels</li>
              <li>Equipment</li>
              <li>Achievements</li>
              <li>Zone Progress</li>
              <li>Aging Upgrades</li>
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
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Age My Empire
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
