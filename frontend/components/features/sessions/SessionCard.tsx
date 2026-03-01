import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Session, SessionPhase } from '@/lib/types/api';

interface SessionCardProps {
  session: Session;
}

const phaseConfig: Record<SessionPhase, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }> = {
  UPLOAD: { label: 'Upload', variant: 'default' },
  SINGLE_ITERATION: { label: 'Single Iteration', variant: 'info' },
  BATCH_REVIEW: { label: 'Batch Review', variant: 'info' },
  STYLE_LOCKED: { label: 'Style Locked', variant: 'warning' },
  AUTOMATION: { label: 'Automation', variant: 'warning' },
  COMPLETE: { label: 'Complete', variant: 'success' },
};

export function SessionCard({ session }: SessionCardProps) {
  const phaseInfo = phaseConfig[session.phase];
  const createdDate = new Date(session.createdAt).toLocaleDateString();

  return (
    <Link href={`/dashboard/sessions/${session.sessionId}`}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Session {session.sessionId.slice(0, 8)}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Created {createdDate}
              </p>
            </div>
            <Badge variant={phaseInfo.variant}>
              {phaseInfo.label}
            </Badge>
          </div>

          {session.masterPrompt && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
              {session.masterPrompt}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
            {session.styleProfileId && (
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span>Style Profile</span>
              </div>
            )}
            {session.batchId && (
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Batch Active</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
