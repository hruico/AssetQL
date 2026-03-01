'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              AssetQL
            </h1>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Beta
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
            AI-Powered Asset Production at Scale
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Generate 100-500+ style-consistent assets in minutes. AssetQL combines AI-powered style embeddings with bulk automation for production-scale creative workflows.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-5 w-5 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Bulk Generation
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Generate 100-500+ assets in under 30 minutes with queue-based processing
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-5 w-5 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Style Consistency
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                85%+ style consistency with AI-powered embeddings and deviation scoring
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-5 w-5 text-zinc-900 dark:text-zinc-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Cost Optimized
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Less than $0.50 per asset with Amazon Nova and Stable Image Core
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid gap-8 sm:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                70-90%
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Time Reduction
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                85%+
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Style Consistency
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                500+
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Assets per Batch
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                &lt;30min
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Batch Completion
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-zinc-600 dark:text-zinc-400 sm:px-6 lg:px-8">
          © 2024 AssetQL. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
