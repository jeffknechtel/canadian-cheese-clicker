import { memo, useState, useCallback } from 'react';
import { useGameStore } from '../../stores';
import { useGameStoreShallow } from '../../utils/zustandOptimization';
import { getChallengeById } from '../../data/challenges';
import { formatNumber } from '../../utils/formatNumber';

export const ChallengeIndicator = memo(function ChallengeIndicator() {
  const [modalOpen, setModalOpen] = useState(false);

  const { activeChallengeId, progress, completed, claimed } = useGameStoreShallow((state) => ({
    activeChallengeId: state.challenge.activeChallengeId,
    progress: state.challenge.progress,
    completed: state.challenge.completed,
    claimed: state.challenge.claimed,
  }));

  const claimChallengeReward = useGameStore((state) => state.claimChallengeReward);

  const challengeData = activeChallengeId ? getChallengeById(activeChallengeId) : null;

  const handleClaim = useCallback(() => {
    claimChallengeReward();
  }, [claimChallengeReward]);

  if (!challengeData) return null;

  const progressPercent = Math.min(100, (progress / challengeData.goal.target) * 100);
  const canClaim = completed && !claimed;

  return (
    <>
      <button
        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
          canClaim
            ? 'bg-green-100/90 border-green-400 animate-pulse'
            : 'bg-blue-100/90 border-blue-300 hover:bg-blue-200/90'
        }`}
        onClick={() => setModalOpen(true)}
        title={challengeData.description}
      >
        <span>{challengeData.icon}</span>
        <span className="text-sm font-medium text-blue-800 tabular-nums">
          {progress}/{challengeData.goal.target}
        </span>
        {canClaim && (
          <span className="text-green-600 text-xs font-bold">CLAIM</span>
        )}
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{challengeData.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-cheddar-700">{challengeData.name}</h2>
                <p className="text-sm text-gray-600">Weekly Challenge</p>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{challengeData.description}</p>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{challengeData.goal.description}</span>
                <span className="tabular-nums">
                  {progress}/{challengeData.goal.target}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    completed ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-cream rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Reward:</p>
              <p className="text-cheddar-700 font-semibold">
                {challengeData.reward.type === 'curds' &&
                  `${formatNumber(challengeData.reward.amount)} Curds`}
                {challengeData.reward.type === 'rennet' &&
                  `${challengeData.reward.amount} Rennet`}
                {challengeData.reward.type === 'ingredient' &&
                  `Unlock: ${challengeData.reward.ingredientId}`}
                {challengeData.reward.type === 'equipment' &&
                  `Equipment: ${challengeData.reward.equipmentId}`}
              </p>
            </div>

            <div className="flex gap-2">
              {canClaim && (
                <button
                  onClick={handleClaim}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  Claim Reward!
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className={`py-2 rounded-lg font-semibold transition-colors ${
                  canClaim
                    ? 'flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'flex-1 bg-cheddar-500 text-white hover:bg-cheddar-600'
                }`}
              >
                {claimed ? 'Complete!' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
