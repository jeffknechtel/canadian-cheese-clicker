import { ModalOverlay } from './shared/ModalOverlay';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELP_SECTIONS = [
  {
    title: 'Curds & Production',
    icon: '🧀',
    items: [
      { term: 'Curds', definition: 'The primary currency. Earned by clicking the cheese wheel or from generators.' },
      { term: 'CPS', definition: 'Curds Per Second — your automatic production rate from generators and bonuses.' },
      { term: 'Generators', definition: 'Automated producers that generate curds every second. More = higher CPS.' },
    ],
  },
  {
    title: 'Prestige & Multipliers',
    icon: '⭐',
    items: [
      { term: 'Rennet', definition: 'Prestige currency earned by Aging (resetting). Permanently boosts all production.' },
      { term: 'Whey', definition: 'Secondary prestige currency for powerful synergy upgrades.' },
      { term: 'Eh', definition: 'Canadian politeness bonus! Increases over time and multiplies both CPS and click value.' },
      { term: 'Aging', definition: 'Reset your curds and generators to earn Rennet. More curds = more Rennet gained.' },
    ],
  },
  {
    title: 'Combat',
    icon: '⚔️',
    items: [
      { term: 'Heroes', definition: 'Recruit heroes to fight across Canada. Each has unique abilities.' },
      { term: 'ATB', definition: 'Active Time Battle — heroes and enemies act when their bar fills.' },
      { term: 'Limit Break', definition: 'Powerful ultimate ability that charges as your heroes take and deal damage.' },
      { term: 'Zones', definition: 'Battle areas representing Canadian provinces. Defeat bosses to unlock new zones.' },
    ],
  },
  {
    title: 'Crafting',
    icon: '🪤',
    items: [
      { term: 'Recipes', definition: 'Craft special cheeses that provide temporary production and combat buffs.' },
      { term: 'Quality', definition: 'Higher quality ingredients produce stronger, longer-lasting buffs.' },
      { term: 'Caves', definition: 'Affinage caves for aging cheese. Unlock more caves with Rennet.' },
    ],
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} ariaLabelledBy="help-modal-title">
      <div className="bg-panel-wood rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="bg-header-timmys px-4 py-3 flex items-center justify-between">
          <h2 id="help-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
            <span>📖</span> Game Guide
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl"
            aria-label="Close help"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-100px)]">
          {HELP_SECTIONS.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <h3 className="font-semibold text-rind-700 flex items-center gap-2 mb-2">
                <span>{section.icon}</span> {section.title}
              </h3>
              <dl className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.term} className="bg-white/50 rounded p-2">
                    <dt className="font-medium text-sm text-rind-800">{item.term}</dt>
                    <dd className="text-xs text-rind-600 mt-0.5">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 bg-white/30 text-center border-t border-timber-200">
          <p className="text-xs text-rind-500">
            Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300 text-gray-700 font-mono text-xs">?</kbd> anytime to open this guide
          </p>
        </div>
      </div>
    </ModalOverlay>
  );
}
