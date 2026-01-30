/**
 * Feedback Widget
 *
 * Floating feedback button and form for beta testers to submit
 * bug reports, suggestions, and feedback.
 */

import { useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  createBugReport,
  submitBugReport,
  captureScreenshot,
  type BugCategory,
} from '../../systems/bugReporter';
import { GAME_VERSION } from '../../config/version';

interface FeedbackWidgetProps {
  className?: string;
}

const CATEGORY_OPTIONS: { value: BugCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'balance', label: 'Balance Issue', icon: '⚖️' },
  { value: 'suggestion', label: 'Suggestion', icon: '💡' },
  { value: 'crash', label: 'Crash/Error', icon: '💥' },
  { value: 'other', label: 'Other', icon: '📝' },
];

export function FeedbackWidget({ className = '' }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<BugCategory>('bug');
  const [description, setDescription] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSubmitResult(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setDescription('');
    setCategory('bug');
    setSubmitResult(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setSubmitResult({ success: false, message: 'Please enter a description.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Capture screenshot if enabled
      const screenshot = includeScreenshot ? captureScreenshot() : undefined;

      // Get current game state at submission time
      const state = useGameStore.getState();
      const gameState = {
        curds: state.curds,
        whey: state.whey,
        totalCurdsEarned: state.totalCurdsEarned,
        totalClicks: state.totalClicks,
        curdPerClick: state.curdPerClick,
        curdPerSecond: state.curdPerSecond,
        generators: state.generators,
        upgrades: state.upgrades,
        achievements: state.achievements,
        ehCount: state.ehCount,
        lastMilestone: state.lastMilestone,
        lastSaved: state.lastSaved,
        gameStarted: state.gameStarted,
        heroes: state.heroes,
        party: state.party,
        equipmentInventory: state.equipmentInventory,
        combat: state.combat,
        zoneProgress: state.zoneProgress,
        prestige: state.prestige,
        crafting: state.crafting,
        activeEvents: state.activeEvents,
      };
      const report = createBugReport(description, category, gameState, screenshot);
      const result = await submitBugReport(report);

      if (result.success) {
        setSubmitResult({
          success: true,
          message: `Thank you! Your feedback has been recorded. (ID: ${result.reportId.slice(0, 12)}...)`,
        });
        setDescription('');
      } else {
        setSubmitResult({
          success: false,
          message: 'Failed to submit feedback. Please try again.',
        });
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitResult({
        success: false,
        message: 'An error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [description, category, includeScreenshot]);

  return (
    <div className={`fixed bottom-20 right-4 z-50 ${className}`}>
      {/* Floating feedback button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-4 py-2 bg-maple-600 hover:bg-maple-700 text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          title="Send Feedback"
          aria-label="Open feedback form"
        >
          <span className="text-lg">💬</span>
          <span className="text-sm font-medium hidden sm:inline">Feedback</span>
        </button>
      )}

      {/* Feedback form modal */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-cheddar-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-maple-600 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <h3 className="font-semibold">Beta Feedback</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Close feedback form"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Category selection */}
            <div>
              <label className="block text-sm font-medium text-cheddar-700 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      category === option.value
                        ? 'bg-maple-600 text-white'
                        : 'bg-cream hover:bg-cheddar-100 text-cheddar-700'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="feedback-description" className="block text-sm font-medium text-cheddar-700 mb-2">
                Description
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  category === 'bug'
                    ? 'What happened? What did you expect to happen?'
                    : category === 'balance'
                    ? 'What feels too easy or too hard?'
                    : category === 'suggestion'
                    ? 'What would make the game better?'
                    : category === 'crash'
                    ? 'What were you doing when the crash occurred?'
                    : 'Share your thoughts...'
                }
                className="w-full px-3 py-2 border border-cheddar-200 rounded-lg focus:ring-2 focus:ring-maple-500 focus:border-transparent resize-none text-sm"
                rows={4}
                required
              />
            </div>

            {/* Screenshot option */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeScreenshot}
                onChange={(e) => setIncludeScreenshot(e.target.checked)}
                className="w-4 h-4 text-maple-600 rounded focus:ring-maple-500"
              />
              <span className="text-sm text-cheddar-600">Include screenshot</span>
            </label>

            {/* Version info */}
            <p className="text-xs text-cheddar-400">
              Version: {GAME_VERSION}
            </p>

            {/* Submit result message */}
            {submitResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  submitResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {submitResult.message}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isSubmitting || !description.trim()
                  ? 'bg-cheddar-200 text-cheddar-400 cursor-not-allowed'
                  : 'bg-maple-600 hover:bg-maple-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default FeedbackWidget;
