'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { useStyles } from '@/lib/hooks/useStyles';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function StylesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: styles, isLoading, error } = useStyles();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Style Profiles
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your AI-analyzed style references
            </p>
          </div>
          <Link href="/dashboard/styles/new">
            <Button>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Style
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-600 dark:text-zinc-400">Loading styles...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-400">
              Failed to load style profiles. Please try again.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && styles && styles.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-900/50">
            <svg
              className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No style profiles yet
            </h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Upload reference images to create your first style profile
            </p>
            <Link href="/dashboard/styles/new">
              <Button>Upload Style Profile</Button>
            </Link>
          </div>
        )}

        {/* Styles Grid */}
        {!isLoading && !error && styles && styles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((style) => (
              <Link key={style.styleProfileId} href={`/dashboard/styles/${style.styleProfileId}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="pt-6">
                    {style.referenceUrl ? (
                      <img 
                        src={style.referenceUrl} 
                        alt={style.name || 'Style reference'}
                        className="mb-3 aspect-video rounded-lg object-cover w-full"
                      />
                    ) : (
                      <div className="mb-3 aspect-video rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    )}
                    <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Style {style.styleProfileId.slice(0, 8)}
                    </h3>
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {style.descriptors.artStyle}
                    </p>
                    {style.descriptors.colorPalette && style.descriptors.colorPalette.length > 0 && (
                      <div className="flex gap-1">
                        {style.descriptors.colorPalette.slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="h-6 w-6 rounded-full border border-zinc-200 dark:border-zinc-700"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
