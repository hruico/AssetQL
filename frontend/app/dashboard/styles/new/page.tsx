'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/lib/context/AuthContext';
import { useCreateStyle } from '@/lib/hooks/useStyles';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function NewStylePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const createStyle = useCreateStyle();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an image file');
      return;
    }

    setError('');

    try {
      const result = await createStyle.mutateAsync(file);
      router.push(`/dashboard/styles/${result.styleProfile.styleProfileId}`);
    } catch (err: any) {
      console.error('Failed to create style profile:', err);
      setError(err.message || 'Failed to upload style profile. Please try again.');
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
            Upload Style Profile
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a reference image for AI-powered style analysis
          </p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Reference Image</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragActive
                    ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
                }`}
              >
                <input {...getInputProps()} />
                
                {preview ? (
                  <div className="space-y-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="mx-auto max-h-64 rounded-lg"
                    />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {file?.name}
                    </p>
                    <Button type="button" size="sm" variant="secondary">
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div>
                    <svg
                      className="mx-auto mb-4 h-12 w-12 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {isDragActive ? 'Drop image here' : 'Drag & drop an image, or click to select'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      PNG, JPG, JPEG, or WebP (max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">
                  What happens next?
                </h4>
                <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>• AI analyzes color palette, composition, and style</li>
                  <li>• Extracts texture, lighting, and mood characteristics</li>
                  <li>• Generates style descriptors for consistent generation</li>
                  <li>• Creates negative prompts to avoid unwanted elements</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!file || createStyle.isPending}
                  className="flex-1"
                >
                  {createStyle.isPending ? 'Analyzing...' : 'Upload & Analyze'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={createStyle.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Use high-quality images with clear style characteristics</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Choose images that represent your desired visual style</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Avoid images with text, watermarks, or complex compositions</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Consistent lighting and color balance work best</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
