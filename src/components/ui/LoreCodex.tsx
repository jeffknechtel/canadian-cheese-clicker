import { useMemo } from 'react';
import { useGameStore } from '../../stores';
import { LORE_ENTRIES, getLoreEntriesBySection } from '../../data/loreEntries';
import type { CodexSectionId, LoreEntryId } from '../../stores/slices/tutorial';
import { PanelContainer } from './shared/PanelContainer';

const SECTION_CONFIG: Record<
  CodexSectionId,
  { title: string; icon: string; description: string }
> = {
  story: {
    title: 'The Quest',
    icon: '📜',
    description: 'The tale of your cheese-making journey',
  },
  provinces: {
    title: 'Provinces',
    icon: '🍁',
    description: 'Lore from across Canada',
  },
  heroes: {
    title: 'Heroes',
    icon: '⚔️',
    description: 'Stories of your companions',
  },
  cheese_lore: {
    title: 'Cheese Lore',
    icon: '🧀',
    description: 'Ancient dairy wisdom',
  },
};

const SECTION_ORDER: CodexSectionId[] = ['story', 'provinces', 'heroes', 'cheese_lore'];

interface LoreEntryCardProps {
  title: string;
  text: string;
  discovered: boolean;
}

function LoreEntryCard({ title, text, discovered }: LoreEntryCardProps) {
  if (!discovered) {
    return (
      <div className="p-3 rounded-lg bg-rind-100/50 border border-rind-200">
        <p className="text-sm font-medium text-rind-400">???</p>
        <p className="text-xs text-rind-300 mt-1 italic">
          Continue your quest to uncover this lore...
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-cheddar-50 border border-cheddar-200">
      <p className="text-sm font-semibold text-rind-700">{title}</p>
      <p className="text-xs text-rind-600 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}

interface SectionProps {
  sectionId: CodexSectionId;
  discoveredLore: Set<LoreEntryId>;
  isUnlocked: boolean;
}

function Section({ sectionId, discoveredLore, isUnlocked }: SectionProps) {
  const config = SECTION_CONFIG[sectionId];
  const entries = useMemo(() => getLoreEntriesBySection(sectionId), [sectionId]);

  const discoveredCount = entries.filter((e) => discoveredLore.has(e.id)).length;
  const totalCount = entries.length;
  const progressPercent = totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0;

  if (!isUnlocked) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{config.icon}</span>
          <h3 className="font-semibold text-rind-400">{config.title}</h3>
          <span className="text-xs text-rind-300 ml-auto">🔒 Locked</span>
        </div>
        <p className="text-xs text-rind-400 italic">
          Continue playing to unlock this section...
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{config.icon}</span>
        <h3 className="font-semibold text-rind-700">{config.title}</h3>
        <span className="text-xs text-rind-500 ml-auto">
          {discoveredCount}/{totalCount}
        </span>
      </div>

      <div className="h-1 bg-rind-200 rounded-full mb-3">
        <div
          className="h-full bg-cheddar-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-xs text-rind-500 mb-3">{config.description}</p>

      <div className="space-y-2">
        {entries.map((entry) => (
          <LoreEntryCard
            key={entry.id}
            title={entry.title}
            text={entry.text}
            discovered={discoveredLore.has(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function LoreCodex() {
  const discoveredLore = useGameStore((s) => s.discoveredLore);
  const unlockedCodexSections = useGameStore((s) => s.unlockedCodexSections);

  const totalEntries = Object.keys(LORE_ENTRIES).length;
  const discoveredCount = discoveredLore.size;
  const overallProgress =
    totalEntries > 0 ? Math.round((discoveredCount / totalEntries) * 100) : 0;

  return (
    <PanelContainer className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-cheddar-200 border-2 border-cheddar-400 flex items-center justify-center">
            <span className="text-2xl">🧀</span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-rind-800 font-display">
              Gruyère Gus's Codex
            </h2>
            <p className="text-xs text-rind-500">
              {overallProgress}% discovered ({discoveredCount}/{totalEntries} entries)
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-2 bg-rind-200 rounded-full mb-6">
          <div
            className="h-full bg-cheddar-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Empty state */}
        {discoveredCount === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm text-rind-600">
              Your codex is empty, bud!
            </p>
            <p className="text-xs text-rind-500 mt-1">
              Play the game to discover lore about Canada, heroes, and cheese.
            </p>
          </div>
        )}

        {/* Sections */}
        {(discoveredCount > 0 || unlockedCodexSections.size > 0) &&
          SECTION_ORDER.map((sectionId) => (
            <Section
              key={sectionId}
              sectionId={sectionId}
              discoveredLore={discoveredLore}
              isUnlocked={unlockedCodexSections.has(sectionId)}
            />
          ))}
      </div>
    </PanelContainer>
  );
}
