import { useState, useCallback } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGameStore } from '../../stores/gameStore';
import { deleteSave } from '../../systems/saveSystem';
import { PrivacyToggle } from './PrivacyConsent';
import type { SettingsState } from '../../types/settings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'audio' | 'graphics' | 'accessibility' | 'game' | 'data';

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState('');

  // Settings store
  const settings = useSettingsStore();

  // Game store for data management
  const saveGame = useGameStore((state) => state.save);
  const resetGame = useGameStore((state) => state.reset);

  // Export game save
  const handleExportSave = useCallback(() => {
    try {
      const saveData = localStorage.getItem('canadian_cheese_quest_save');
      if (saveData) {
        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cheese-quest-save-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  // Import game save
  const handleImportSave = useCallback(() => {
    try {
      if (!importValue.trim()) {
        setImportError('Please paste a save file');
        return;
      }
      const parsed = JSON.parse(importValue);
      if (parsed.version && parsed.state) {
        localStorage.setItem('canadian_cheese_quest_save', importValue);
        setImportError('');
        setImportValue('');
        window.location.reload();
      } else {
        setImportError('Invalid save file format');
      }
    } catch {
      setImportError('Invalid JSON format');
    }
  }, [importValue]);

  // Reset progress
  const handleResetProgress = useCallback(() => {
    deleteSave();
    resetGame();
    setShowResetConfirm(false);
    onClose();
    window.location.reload();
  }, [resetGame, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: '#FFFEF5' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cheddar-500 to-cheddar-600 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">&#9881;</span>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#E5DCC8', backgroundColor: '#F5F0E1' }}>
          {(['audio', 'graphics', 'accessibility', 'game', 'data'] as SettingsTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors"
              style={{
                color: activeTab === tab ? '#8B7355' : '#6B5B45',
                backgroundColor: activeTab === tab ? '#FFFFFF' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid #D4A853' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#FFFEF5' }}>
          {activeTab === 'audio' && (
            <AudioSettings
              settings={settings}
              onMasterVolumeChange={settings.setMasterVolume}
              onMusicVolumeChange={settings.setMusicVolume}
              onSfxVolumeChange={settings.setSfxVolume}
              onMusicEnabledChange={settings.setMusicEnabled}
              onSfxEnabledChange={settings.setSfxEnabled}
            />
          )}

          {activeTab === 'graphics' && (
            <GraphicsSettings
              settings={settings}
              onQualityChange={settings.setQuality}
              onParticlesChange={settings.setParticlesEnabled}
              onAnimationsChange={settings.setAnimationsEnabled}
            />
          )}

          {activeTab === 'accessibility' && (
            <AccessibilitySettings
              settings={settings}
              onColorblindModeChange={settings.setColorblindMode}
              onReducedMotionChange={settings.setReducedMotion}
              onHighContrastChange={settings.setHighContrast}
              onFontSizeChange={settings.setFontSize}
            />
          )}

          {activeTab === 'game' && (
            <GameSettings
              settings={settings}
              onAutoSaveChange={settings.setAutoSaveInterval}
              onOfflineCapChange={settings.setOfflineProgressCap}
              onNumberFormatChange={settings.setNumberFormat}
            />
          )}

          {activeTab === 'data' && (
            <DataSettings
              onExport={handleExportSave}
              onSave={() => { saveGame(); alert('Game saved!'); }}
              importValue={importValue}
              onImportValueChange={setImportValue}
              onImport={handleImportSave}
              importError={importError}
              showResetConfirm={showResetConfirm}
              onShowResetConfirm={() => setShowResetConfirm(true)}
              onCancelReset={() => setShowResetConfirm(false)}
              onConfirmReset={handleResetProgress}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cheddar-50 border-t border-cheddar-200 flex justify-between">
          <button
            onClick={settings.resetToDefaults}
            className="px-4 py-2 text-sm text-rind hover:text-maple-600 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cheddar-500 hover:bg-cheddar-600 text-white font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

interface SliderSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

function SliderSetting({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  disabled = false,
  formatValue = (v) => `${Math.round(v * 100)}%`,
}: SliderSettingProps) {
  return (
    <div className={`${disabled ? 'opacity-50' : ''}`}>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-rind-700">{label}</label>
        <span className="text-sm text-cheddar-600">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full accent-cheddar-500"
      />
    </div>
  );
}

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-rind-700">{label}</p>
        {description && <p className="text-xs text-rind-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-cheddar-500' : 'bg-rind-300'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

interface SelectSettingProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function SelectSetting<T extends string>({ label, value, options, onChange }: SelectSettingProps<T>) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm font-medium text-rind-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="px-3 py-1.5 bg-white border border-cheddar-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cheddar-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ===== Settings Sections =====

interface AudioSettingsProps {
  settings: SettingsState;
  onMasterVolumeChange: (v: number) => void;
  onMusicVolumeChange: (v: number) => void;
  onSfxVolumeChange: (v: number) => void;
  onMusicEnabledChange: (v: boolean) => void;
  onSfxEnabledChange: (v: boolean) => void;
}

function AudioSettings({
  settings,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onMusicEnabledChange,
  onSfxEnabledChange,
}: AudioSettingsProps) {
  return (
    <div className="space-y-6">
      <SliderSetting
        label="Master Volume"
        value={settings.audio.masterVolume}
        onChange={onMasterVolumeChange}
      />

      <div className="border-t border-cheddar-200 pt-4">
        <ToggleSetting
          label="Music"
          description="Enable background music"
          checked={settings.audio.musicEnabled}
          onChange={onMusicEnabledChange}
        />
        <SliderSetting
          label="Music Volume"
          value={settings.audio.musicVolume}
          onChange={onMusicVolumeChange}
          disabled={!settings.audio.musicEnabled}
        />
      </div>

      <div className="border-t border-cheddar-200 pt-4">
        <ToggleSetting
          label="Sound Effects"
          description="Enable click and UI sounds"
          checked={settings.audio.sfxEnabled}
          onChange={onSfxEnabledChange}
        />
        <SliderSetting
          label="SFX Volume"
          value={settings.audio.sfxVolume}
          onChange={onSfxVolumeChange}
          disabled={!settings.audio.sfxEnabled}
        />
      </div>
    </div>
  );
}

interface GraphicsSettingsProps {
  settings: SettingsState;
  onQualityChange: (q: 'low' | 'medium' | 'high' | 'ultra') => void;
  onParticlesChange: (v: boolean) => void;
  onAnimationsChange: (v: boolean) => void;
}

function GraphicsSettings({
  settings,
  onQualityChange,
  onParticlesChange,
  onAnimationsChange,
}: GraphicsSettingsProps) {
  return (
    <div className="space-y-4">
      <SelectSetting
        label="Quality Preset"
        value={settings.graphics.quality}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'ultra', label: 'Ultra' },
        ]}
        onChange={onQualityChange}
      />

      <div className="border-t border-cheddar-200 pt-4 space-y-2">
        <ToggleSetting
          label="Particle Effects"
          description="Show particle effects for abilities and clicks"
          checked={settings.graphics.particlesEnabled}
          onChange={onParticlesChange}
        />
        <ToggleSetting
          label="Animations"
          description="Enable UI animations and transitions"
          checked={settings.graphics.animationsEnabled}
          onChange={onAnimationsChange}
        />
      </div>
    </div>
  );
}

interface AccessibilitySettingsProps {
  settings: SettingsState;
  onColorblindModeChange: (m: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => void;
  onReducedMotionChange: (v: boolean) => void;
  onHighContrastChange: (v: boolean) => void;
  onFontSizeChange: (s: 'small' | 'medium' | 'large') => void;
}

function AccessibilitySettings({
  settings,
  onColorblindModeChange,
  onReducedMotionChange,
  onHighContrastChange,
  onFontSizeChange,
}: AccessibilitySettingsProps) {
  return (
    <div className="space-y-4">
      <SelectSetting
        label="Colorblind Mode"
        value={settings.accessibility.colorblindMode}
        options={[
          { value: 'none', label: 'None' },
          { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
          { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
          { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' },
        ]}
        onChange={onColorblindModeChange}
      />

      <SelectSetting
        label="Font Size"
        value={settings.accessibility.fontSize}
        options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ]}
        onChange={onFontSizeChange}
      />

      <div className="border-t border-cheddar-200 pt-4 space-y-2">
        <ToggleSetting
          label="Reduced Motion"
          description="Minimize animations throughout the game"
          checked={settings.accessibility.reducedMotion}
          onChange={onReducedMotionChange}
        />
        <ToggleSetting
          label="High Contrast"
          description="Increase contrast for better visibility"
          checked={settings.accessibility.highContrast}
          onChange={onHighContrastChange}
        />
      </div>
    </div>
  );
}

interface GameSettingsProps {
  settings: SettingsState;
  onAutoSaveChange: (s: number) => void;
  onOfflineCapChange: (h: number) => void;
  onNumberFormatChange: (f: 'standard' | 'scientific') => void;
}

function GameSettings({
  settings,
  onAutoSaveChange,
  onOfflineCapChange,
  onNumberFormatChange,
}: GameSettingsProps) {
  return (
    <div className="space-y-4">
      <SelectSetting
        label="Auto-Save Interval"
        value={String(settings.game.autoSaveInterval)}
        options={[
          { value: '15', label: '15 seconds' },
          { value: '30', label: '30 seconds' },
          { value: '60', label: '1 minute' },
          { value: '120', label: '2 minutes' },
          { value: '300', label: '5 minutes' },
        ]}
        onChange={(v) => onAutoSaveChange(parseInt(v, 10))}
      />

      <SelectSetting
        label="Offline Progress Cap"
        value={String(settings.game.offlineProgressCap)}
        options={[
          { value: '1', label: '1 hour' },
          { value: '4', label: '4 hours' },
          { value: '8', label: '8 hours' },
          { value: '12', label: '12 hours' },
          { value: '24', label: '24 hours' },
        ]}
        onChange={(v) => onOfflineCapChange(parseInt(v, 10))}
      />

      <SelectSetting
        label="Number Format"
        value={settings.game.numberFormat}
        options={[
          { value: 'standard', label: 'Standard (1.5M, 2.3B)' },
          { value: 'scientific', label: 'Scientific (1.5e6, 2.3e9)' },
        ]}
        onChange={onNumberFormatChange}
      />

      {/* Privacy & Analytics */}
      <div className="border-t border-cheddar-200 pt-4">
        <h3 className="text-sm font-semibold text-rind-700 mb-3">Privacy</h3>
        <PrivacyToggle />
      </div>
    </div>
  );
}

interface DataSettingsProps {
  onExport: () => void;
  onSave: () => void;
  importValue: string;
  onImportValueChange: (v: string) => void;
  onImport: () => void;
  importError: string;
  showResetConfirm: boolean;
  onShowResetConfirm: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
}

function DataSettings({
  onExport,
  onSave,
  importValue,
  onImportValueChange,
  onImport,
  importError,
  showResetConfirm,
  onShowResetConfirm,
  onCancelReset,
  onConfirmReset,
}: DataSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Save & Export */}
      <div>
        <h3 className="text-sm font-semibold text-rind-700 mb-3">Save Management</h3>
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-cheddar-500 hover:bg-cheddar-600 text-white rounded-lg transition-colors"
          >
            Save Now
          </button>
          <button
            onClick={onExport}
            className="flex-1 px-4 py-2 bg-cheddar-100 hover:bg-cheddar-200 text-cheddar-700 rounded-lg transition-colors"
          >
            Export Save
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="border-t border-cheddar-200 pt-4">
        <h3 className="text-sm font-semibold text-rind-700 mb-3">Import Save</h3>
        <textarea
          value={importValue}
          onChange={(e) => onImportValueChange(e.target.value)}
          placeholder="Paste your save data here..."
          className="w-full h-24 px-3 py-2 border border-cheddar-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cheddar-500"
        />
        {importError && <p className="text-red-500 text-xs mt-1">{importError}</p>}
        <button
          onClick={onImport}
          className="mt-2 px-4 py-2 bg-cheddar-100 hover:bg-cheddar-200 text-cheddar-700 rounded-lg transition-colors"
        >
          Import Save
        </button>
      </div>

      {/* Reset */}
      <div className="border-t border-cheddar-200 pt-4">
        <h3 className="text-sm font-semibold text-maple-700 mb-3">Danger Zone</h3>
        {!showResetConfirm ? (
          <button
            onClick={onShowResetConfirm}
            className="px-4 py-2 bg-maple-100 hover:bg-maple-200 text-maple-700 rounded-lg transition-colors"
          >
            Reset All Progress
          </button>
        ) : (
          <div className="bg-maple-50 border border-maple-200 rounded-lg p-4">
            <p className="text-sm text-maple-700 mb-3">
              Are you sure? This will delete ALL your progress and cannot be undone!
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancelReset}
                className="flex-1 px-4 py-2 bg-rind-100 hover:bg-rind-200 text-rind-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmReset}
                className="flex-1 px-4 py-2 bg-maple-600 hover:bg-maple-700 text-white rounded-lg transition-colors"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
