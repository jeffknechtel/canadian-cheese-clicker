import { useState, useCallback, useMemo } from 'react';
import {
  CHANGELOG,
  getChangeTypeLabel,
  getChangeTypeClass,
  searchChangelog,
  type ChangeType,
  type ChangelogEntry,
} from '../../data/changelog';
import { GAME_VERSION } from '../../config/version';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHANGE_TYPE_FILTERS: { value: ChangeType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'feature', label: 'Features' },
  { value: 'fix', label: 'Fixes' },
  { value: 'balance', label: 'Balance' },
  { value: 'content', label: 'Content' },
];

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChangeType | 'all'>('all');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(GAME_VERSION);

  // Filter changelog entries based on search and type filter
  const filteredEntries = useMemo(() => {
    let entries: ChangelogEntry[] = searchQuery ? searchChangelog(searchQuery) : CHANGELOG;

    if (typeFilter !== 'all') {
      entries = entries
        .map((entry) => ({
          ...entry,
          changes: entry.changes.filter((c) => c.type === typeFilter),
        }))
        .filter((entry) => entry.changes.length > 0);
    }

    return entries;
  }, [searchQuery, typeFilter]);

  const handleToggleVersion = useCallback((version: string) => {
    setExpandedVersion((prev) => (prev === version ? null : version));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
    >
      <div className="bg-cream rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cheddar-500 to-cheddar-600 text-white">
          <h2 id="changelog-title" className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              📜
            </span>
            Changelog
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close changelog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-6 py-3 bg-cheddar-50 border-b border-cheddar-200 flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search changelog..."
              className="w-full px-3 py-2 pl-9 bg-white border border-cheddar-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cheddar-500"
              aria-label="Search changelog"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rind-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rind-400 hover:text-rind-600"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex gap-1 flex-wrap">
            {CHANGE_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  typeFilter === filter.value
                    ? 'bg-cheddar-500 text-white'
                    : 'bg-white hover:bg-cheddar-100 text-rind-700 border border-cheddar-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Changelog Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-rind-500">
              <p>No changelog entries found</p>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="mt-2 text-sm text-cheddar-600 hover:text-cheddar-700 underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <ChangelogEntryCard
                  key={entry.version}
                  entry={entry}
                  isExpanded={expandedVersion === entry.version}
                  onToggle={() => handleToggleVersion(entry.version)}
                  isCurrent={entry.version === GAME_VERSION}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cheddar-50 border-t border-cheddar-200 flex justify-between items-center">
          <span className="text-sm text-rind-600">
            Current version: <span className="font-medium text-cheddar-700">{GAME_VERSION}</span>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cheddar-500 hover:bg-cheddar-600 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  isCurrent: boolean;
}

function ChangelogEntryCard({ entry, isExpanded, onToggle, isCurrent }: ChangelogEntryCardProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isCurrent ? 'border-cheddar-400 bg-cheddar-50/50' : 'border-cheddar-200 bg-white'
      }`}
    >
      {/* Entry Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-cheddar-50/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className={`font-bold ${isCurrent ? 'text-cheddar-700' : 'text-rind-800'}`}>
            v{entry.version}
          </span>
          {isCurrent && (
            <span className="px-2 py-0.5 text-xs font-medium bg-cheddar-500 text-white rounded-full">
              Current
            </span>
          )}
          {entry.title && <span className="text-sm text-rind-600">- {entry.title}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-rind-500">{entry.date}</span>
          <svg
            className={`w-5 h-5 text-rind-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Entry Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-cheddar-100">
          <ul className="mt-3 space-y-2">
            {entry.changes.map((change, index) => (
              <li key={index} className="flex items-start gap-2">
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium rounded ${getChangeTypeClass(change.type)}`}
                >
                  {getChangeTypeLabel(change.type)}
                </span>
                <span className="text-sm text-rind-700">{change.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

