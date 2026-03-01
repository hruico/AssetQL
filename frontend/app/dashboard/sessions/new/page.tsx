'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useCreateSession } from '@/lib/hooks/useSessions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function NewSessionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const createSession = useCreateSession();
  
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await createSession.mutateAsync(sessionName || undefined);
      router.push(`/dashboard/sessions/${result.sessionId}`);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.message || 'Failed to create session. Please try again.');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Create New Session
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Start a new asset generation workflow
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Session Name (Optional)"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Character Variations Q1 2024"
                disabled={createSession.isPending}
              />

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">
                  What happens next?
                </h4>
                <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    <span>Session will be created in UPLOAD phase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    <span>You'll upload a style profile and CSV data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    <span>Progress through phases to generate assets</span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={createSession.isPending}
                  className="flex-1"
                >
                  {createSession.isPending ? 'Creating...' : 'Create Session'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={createSession.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Session Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  1
                </div>
                <div>
                  <h5 className="font-medium text-zinc-900 dark:text-zinc-50">Upload</h5>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Upload style references and CSV data
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  2
                </div>
                <div>
                  <h5 className="font-medium text-zinc-900 dark:text-zinc-50">Single Iteration</h5>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Generate a test asset and provide feedback
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  3
                </div>
                <div>
                  <h5 className="font-medium text-zinc-900 dark:text-zinc-50">Batch Review</h5>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Review generated batch and lock style
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  4
                </div>
                <div>
                  <h5 className="font-medium text-zinc-900 dark:text-zinc-50">Automation</h5>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Bulk generate 100-500+ assets automatically
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
