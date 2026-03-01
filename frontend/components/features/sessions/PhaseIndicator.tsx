import type { SessionPhase } from '@/lib/types/api';

interface PhaseIndicatorProps {
  currentPhase: SessionPhase;
}

const phases: SessionPhase[] = [
  'UPLOAD',
  'SINGLE_ITERATION',
  'BATCH_REVIEW',
  'STYLE_LOCKED',
  'AUTOMATION',
  'COMPLETE',
];

const phaseLabels: Record<SessionPhase, string> = {
  UPLOAD: 'Upload',
  SINGLE_ITERATION: 'Iteration',
  BATCH_REVIEW: 'Review',
  STYLE_LOCKED: 'Locked',
  AUTOMATION: 'Automation',
  COMPLETE: 'Complete',
};

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={phase} className="flex flex-1 items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                      : isCompleted
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                      : 'border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive || isCompleted
                      ? 'text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-500 dark:text-zinc-500'
                  }`}
                >
                  {phaseLabels[phase]}
                </span>
              </div>

              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    isCompleted
                      ? 'bg-zinc-900 dark:bg-zinc-50'
                      : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
