'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmSignUp, resendConfirmationCode } = useAuth();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await confirmSignUp(email, code);
      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Verification error:', err);
      
      if (err.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please try again.');
      } else if (err.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else if (err.code === 'NotAuthorizedException') {
        setError('User is already confirmed. Please sign in.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(err.message || 'Failed to verify email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setSuccess('');
    setResending(true);

    try {
      await resendConfirmationCode(email);
      setSuccess('Verification code sent! Check your email.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            AssetQL
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            AI-Powered Asset Production
          </p>
        </div>

        {/* Verification Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Verify Email
          </h2>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            We've sent a verification code to your email address.
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {/* Verification Code Field */}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                placeholder="123456"
                disabled={loading}
                maxLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-4 text-center">
            <button
              onClick={handleResendCode}
              disabled={resending}
              className="text-sm text-zinc-600 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {resending ? 'Sending...' : "Didn't receive a code? Resend"}
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              href="/login"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
