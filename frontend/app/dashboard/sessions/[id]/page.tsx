'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useSession, useUpdateSessionPhase } from '@/lib/hooks/useSessions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhaseIndicator } from '@/components/features/sessions/PhaseIndicator';
import type { SessionPhase } from '@/lib/types/api';

const PHASE_TRANSITIONS: Record<SessionPhase, SessionPhase | null> = {
  UPLOAD: 'SINGLE_ITERATION',
  SINGLE_ITERATION: 'BATCH_REVIEW',
  BATCH_REVIEW: 'STYLE_LOCKED',
  STYLE_LOCKED: 'AUTOMATION',
  AUTOMATION: 'COMPLETE',
  COMPLETE: null,
};

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  
  const { user, loading: authLoading } = useAuth();
  const { data: session, isLoading, error } = useSession(sessionId);
  const updatePhase = useUpdateSessionPhase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handlePhaseTransition = async () => {
    if (!session) return;
    
    const nextPhase = PHASE_TRANSITIONS[session.phase];
    if (!nextPhase) return;

    try {
      await updatePhase.mutateAsync({ sessionId, phase: nextPhase });
    } catch (err) {
      console.error('Failed to update phase:', err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-600 dark:text-zinc-400">Loading session...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !session) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">
            Failed to load session. Please try again.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const nextPhase = PHASE_TRANSITIONS[session.phase];
  const canTransition = nextPhase !== null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Session {session.sessionId.slice(0, 8)}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Created {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={session.phase === 'COMPLETE' ? 'success' : 'info'}>
            {session.phase.replace('_', ' ')}
          </Badge>
        </div>

        {/* Phase Indicator */}
        <Card>
          <CardContent className="pt-6">
            <PhaseIndicator currentPhase={session.phase} />
          </CardContent>
        </Card>

        {/* Phase-Specific Content */}
        {session.phase === 'UPLOAD' && <UploadPhaseView session={session} />}
        {session.phase === 'SINGLE_ITERATION' && <SingleIterationPhaseView session={session} />}
        {session.phase === 'BATCH_REVIEW' && <BatchReviewPhaseView session={session} />}
        {session.phase === 'STYLE_LOCKED' && <StyleLockedPhaseView session={session} />}
        {session.phase === 'AUTOMATION' && <AutomationPhaseView session={session} />}
        {session.phase === 'COMPLETE' && <CompletePhaseView session={session} />}

        {/* Phase Transition Button */}
        {canTransition && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-50">
                    Ready to proceed?
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Move to the next phase: {nextPhase.replace('_', ' ')}
                  </p>
                </div>
                <Button
                  onClick={handlePhaseTransition}
                  disabled={updatePhase.isPending}
                >
                  {updatePhase.isPending ? 'Updating...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// Phase-specific view components
function UploadPhaseView({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload your style reference and CSV data to begin the asset generation process.
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <svg className="mx-auto mb-3 h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h4 className="mb-1 font-medium text-zinc-900 dark:text-zinc-50">Style Profile</h4>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                Upload reference images
              </p>
              <Button size="sm" variant="secondary">Select Style</Button>
            </div>

            <div className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <svg className="mx-auto mb-3 h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="mb-1 font-medium text-zinc-900 dark:text-zinc-50">CSV Data</h4>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                Upload generation data
              </p>
              <Button size="sm" variant="secondary">Upload CSV</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SingleIterationPhaseView({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Single Iteration Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generate a test asset and provide feedback to refine the prompt before batch generation.
        </p>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Test generation will appear here once initiated.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BatchReviewPhaseView({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Review Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Review the generated batch and verify style consistency before locking the style.
        </p>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Batch assets will appear here once generated.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StyleLockedPhaseView({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Style Locked Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-400">
              ✓ Style has been locked and is ready for automation
            </p>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your style profile is now locked. Proceed to automation to generate the full batch.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AutomationPhaseView({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Bulk asset generation in progress. This may take 20-30 minutes for 100+ assets.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">0 / 0</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-50" style={{ width: '0%' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletePhaseView({ session }: { session: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Complete</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-400">
              ✓ All assets have been generated successfully
            </p>
          </div>
          <div className="flex gap-3">
            <Button>View Assets</Button>
            <Button variant="secondary">Export</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
