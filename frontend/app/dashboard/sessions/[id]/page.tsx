'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useSession, useUpdateSessionPhase } from '@/lib/hooks/useSessions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhaseIndicator } from '@/components/features/sessions/PhaseIndicator';
import { stylesApi } from '@/lib/api/styles';
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

  // UPLOAD phase state
  const [selectedStyleProfile, setSelectedStyleProfile] = useState<any>(null);
  const [styleProfiles, setStyleProfiles] = useState<any[]>([]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRowCount, setCsvRowCount] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load style profiles when picker opens
  const handleOpenStylePicker = async () => {
    try {
      const result = await stylesApi.list();
      const profiles = result?.styleProfiles || [];
      setStyleProfiles(profiles);
      setShowStylePicker(true);
    } catch (err) {
      console.error('Failed to load style profiles:', err);
      setValidationError('Failed to load style profiles. Please try again.');
    }
  };

  // Handle CSV file selection
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    // Count rows client-side
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      // Subtract 1 for header row
      setCsvRowCount(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  };

  const handlePhaseTransition = async () => {
    if (!session) return;
    
    setValidationError(null);

    // Validate UPLOAD phase requirements before allowing transition
    const currentPhase = session.phase || session.currentPhase;
    if (currentPhase === 'UPLOAD') {
      if (!selectedStyleProfile) {
        setValidationError('Please select a style profile before continuing.');
        return;
      }
      if (!csvFile) {
        setValidationError('Please upload a CSV file before continuing.');
        return;
      }
    }

    // Validate SINGLE_ITERATION phase - must have generated test image
    if (currentPhase === 'SINGLE_ITERATION') {
      const batchData = sessionStorage.getItem(`session_${sessionId}_batch`);
      if (!batchData) {
        setValidationError('Please generate a test image before continuing.');
        return;
      }
      const { batchId, status } = JSON.parse(batchData);
      if (!batchId || status !== 'done') {
        setValidationError('Please wait for the test image to be generated before continuing.');
        return;
      }
    }

    const nextPhase = PHASE_TRANSITIONS[currentPhase];
    if (!nextPhase) return;

    try {
      // Persist to sessionStorage so Single Iteration phase can use it
      if (currentPhase === 'UPLOAD') {
        sessionStorage.setItem(
          `session_${sessionId}_upload_data`,
          JSON.stringify({
            styleProfileId: selectedStyleProfile.styleProfileId,
            styleName: selectedStyleProfile.name,
            styleDescriptors: selectedStyleProfile.descriptors,
            csvRowCount: csvRowCount,
          })
        );

        // Store CSV content as text for batch creation
        const reader = new FileReader();
        reader.onload = (e) => {
          sessionStorage.setItem(
            `session_${sessionId}_csv_content`,
            e.target?.result as string
          );
        };
        reader.readAsText(csvFile!);
      }

      await updatePhase.mutateAsync({ sessionId, phase: nextPhase });
    } catch (err) {
      console.error('Failed to update phase:', err);
      setValidationError('Failed to update phase. Please try again.');
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
        {(session.phase === 'SINGLE_ITERATION' || session.currentPhase === 'SINGLE_ITERATION') && (() => {
          // Retrieve persisted data from UPLOAD phase
          const uploadDataRaw = sessionStorage.getItem(`session_${sessionId}_upload_data`);
          const uploadData = uploadDataRaw ? JSON.parse(uploadDataRaw) : null;
          return (
            <SingleIterationPhase
              sessionId={sessionId}
              uploadData={uploadData}
            />
          );
        })()}
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

        {/* Style Picker Modal */}
        {showStylePicker && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1a1a1a', border: '1px solid #333', borderRadius: 12,
              padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Select Style Profile</h2>
                <button
                  onClick={() => setShowStylePicker(false)}
                  style={{ background: 'none', border: 'none', color: '#888',
                    fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              {styleProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  <p>No style profiles found.</p>
                  <a href="/dashboard/styles/new" style={{ color: '#0070f3' }}>
                    Create your first style profile →
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {styleProfiles.map((profile: any) => (
                    <div
                      key={profile.styleProfileId}
                      onClick={() => {
                        setSelectedStyleProfile(profile);
                        setShowStylePicker(false);
                        setValidationError(null);
                      }}
                      style={{
                        border: selectedStyleProfile?.styleProfileId === profile.styleProfileId
                          ? '2px solid #0070f3' : '1px solid #333',
                        borderRadius: 8, padding: '1rem', cursor: 'pointer',
                        background: selectedStyleProfile?.styleProfileId === profile.styleProfileId
                          ? '#0a1628' : '#111',
                        display: 'flex', flexDirection: 'column', gap: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {profile.name || 'Untitled Style'}
                      </div>
                      {profile.descriptors?.artStyle && (
                        <div style={{ color: '#888', fontSize: '0.85rem' }}>
                          {profile.descriptors.artStyle}
                        </div>
                      )}
                      {profile.descriptors?.mood && (
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>
                          Mood: {profile.descriptors.mood}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

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
            
            {/* Hidden CSV input */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleCsvChange}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Style Profile Card */}
              <div style={{ 
                border: '2px dashed #444', borderRadius: 8, padding: '2rem',
                textAlign: 'center', flex: 1
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎨</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Style Profile</div>
                {selectedStyleProfile ? (
                  <div>
                    <div style={{ color: '#22c55e', fontWeight: 500, marginBottom: '0.5rem' }}>
                      ✓ {selectedStyleProfile.name || 'Untitled Style'}
                    </div>
                    <button 
                      onClick={handleOpenStylePicker}
                      style={{ fontSize: '0.8rem', color: '#888', cursor: 'pointer',
                        background: 'none', border: 'none', textDecoration: 'underline' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#666', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                      Upload reference images
                    </div>
                    <button
                      onClick={handleOpenStylePicker}
                      style={{
                        padding: '0.5rem 1rem', background: '#333', color: '#fff',
                        border: '1px solid #555', borderRadius: 6, cursor: 'pointer'
                      }}
                    >
                      Select Style
                    </button>
                  </div>
                )}
              </div>

              {/* CSV Upload Card */}
              <div
                onClick={() => csvInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.name.endsWith('.csv')) {
                    setCsvFile(file);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      const lines = text.split('\n').filter(line => line.trim().length > 0);
                      setCsvRowCount(Math.max(0, lines.length - 1));
                    };
                    reader.readAsText(file);
                  }
                }}
                style={{ 
                  border: '2px dashed #444', borderRadius: 8, padding: '2rem',
                  textAlign: 'center', flex: 1, cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>CSV Data</div>
                {csvFile ? (
                  <div>
                    <div style={{ color: '#22c55e', fontWeight: 500, marginBottom: '0.25rem' }}>
                      ✓ {csvFile.name}
                    </div>
                    <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {csvRowCount} rows detected
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        csvInputRef.current?.click();
                      }}
                      style={{ fontSize: '0.8rem', color: '#888', cursor: 'pointer',
                        background: 'none', border: 'none', textDecoration: 'underline' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#666', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                      Upload generation data
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        csvInputRef.current?.click();
                      }}
                      style={{
                        padding: '0.5rem 1rem', background: '#333', color: '#fff',
                        border: '1px solid #555', borderRadius: 6, cursor: 'pointer'
                      }}
                    >
                      Upload CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div style={{ 
                color: '#ef4444', background: '#1a0000', border: '1px solid #ef4444',
                borderRadius: 6, padding: '0.75rem 1rem', marginTop: '1rem',
                width: '100%'
              }}>
                ⚠️ {validationError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

function SingleIterationPhase({ sessionId, uploadData }: { sessionId: string; uploadData: any }) {
  const [status, setStatus] = useState<'idle' | 'creating' | 'waiting' | 'done' | 'error'>('idle');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('A high-quality product photo on white background');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`session_${sessionId}_batch`);
    if (saved) {
      const { batchId: savedBatchId, status: savedStatus } = JSON.parse(saved);
      if (savedBatchId) setBatchId(savedBatchId);
      if (savedStatus) setStatus(savedStatus);
    }
  }, [sessionId]);

  // Get first row from CSV for test generation
  const getFirstCsvRow = (): Record<string, string> => {
    const csv = sessionStorage.getItem(`session_${sessionId}_csv_content`);
    if (!csv) return {};

    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) return {};

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));

    return headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || '' }), {});
  };

  const handleGenerateTest = async () => {
    if (!uploadData?.styleProfileId) {
      setError('No style profile found. Please go back to Upload phase.');
      return;
    }

    // Use default prompt if empty
    const finalPromptTemplate = prompt.trim() || 'A high-quality product photo on white background';

    setStatus('creating');
    setError(null);

    try {
      const firstRow = getFirstCsvRow();

      // Build prompt with variable substitution from first CSV row
      let finalPrompt = finalPromptTemplate;
      Object.entries(firstRow).forEach(([key, value]) => {
        finalPrompt = finalPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      });

      // Call batch-creator with limit of 1 row for test
      const { getIdToken } = await import('@/lib/auth/cognito');
      const token = await getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          styleProfileId: uploadData.styleProfileId,
          template: finalPromptTemplate,
          csvRows: [firstRow],
          batchName: `Test - Session ${sessionId.substring(0, 8)}`,
          config: {
            width: 1024,
            height: 1024,
            steps: 30,
            cfgScale: 7,
            concurrency: 1,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Batch creation failed: ${response.status}`);
      }

      const result = await response.json();
      setBatchId(result.batchId);
      setStatus('done');
      sessionStorage.setItem(
        `session_${sessionId}_batch`,
        JSON.stringify({ batchId: result.batchId, status: 'done' })
      );
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to start generation');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single Iteration Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Generate a single test image to validate your prompt and style before bulk generation.
        </p>

        {uploadData ? (
          <div style={{ 
            background: '#111', border: '1px solid #333', borderRadius: 8,
            padding: '1rem', marginBottom: '1.5rem',
            display: 'flex', gap: '2rem'
          }}>
            <div>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>Style Profile</span>
              <div style={{ color: '#22c55e', fontWeight: 500 }}>
                ✓ {uploadData.styleName || uploadData.styleProfileId}
              </div>
            </div>
            <div>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>CSV Rows</span>
              <div style={{ fontWeight: 500 }}>{uploadData.csvRowCount} rows</div>
            </div>
          </div>
        ) : (
          <ReuploadForm
            sessionId={sessionId}
            onComplete={(data) => {
              // Force re-render by reloading uploadData from sessionStorage
              window.location.reload();
            }}
          />
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Prompt Template
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt. Use {column_name} for CSV variable substitution.&#10;Example: A product photo of {product_name} in {color} on white background"
            style={{
              width: '100%', minHeight: '100px', padding: '0.75rem',
              background: '#111', border: '1px solid #333', borderRadius: 6,
              color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem',
              resize: 'vertical', boxSizing: 'border-box'
            }}
          />
          <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            First CSV row will be used for variable substitution in test generation.
          </div>
        </div>

        {error && (
          <div style={{
            color: '#ef4444', background: '#1a0000', border: '1px solid #ef4444',
            borderRadius: 6, padding: '0.75rem', marginBottom: '1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {status === 'idle' && (
          <button
            onClick={handleGenerateTest}
            disabled={!uploadData}
            style={{
              padding: '0.75rem 2rem', background: '#0070f3', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: '1rem', fontWeight: 500,
              opacity: !uploadData ? 0.5 : 1
            }}
          >
            Generate Test Image
          </button>
        )}

        {status === 'creating' && (
          <div style={{ color: '#888' }}>⏳ Creating batch job...</div>
        )}

        {(status === 'done' || status === 'waiting') && batchId && (
          <div>
            <div style={{ color: '#22c55e', marginBottom: '1rem', fontWeight: 500 }}>
              ✓ Batch created! ID: {batchId}
            </div>
            <div style={{ color: '#888', marginBottom: '1rem' }}>
              🎨 Image is generating... This takes 10-30 seconds. Check the asset library once complete.
            </div>
            <a
              href={`/dashboard/batches/${batchId}`}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/dashboard/batches/${batchId}`;
              }}
              style={{
                padding: '0.5rem 1rem', background: '#333', color: '#fff',
                border: '1px solid #555', borderRadius: 6,
                textDecoration: 'none', display: 'inline-block',
                marginRight: '0.75rem'
              }}
            >
              View Batch Progress →
            </a>
            <a
              href="/dashboard/assets"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/assets';
              }}
              style={{
                padding: '0.5rem 1rem', background: '#0070f3', color: '#fff',
                border: 'none', borderRadius: 6,
                textDecoration: 'none', display: 'inline-block'
              }}
            >
              View Asset Library →
            </a>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={handleGenerateTest}
            style={{
              padding: '0.75rem 2rem', background: '#333', color: '#fff',
              border: '1px solid #555', borderRadius: 6, cursor: 'pointer'
            }}
          >
            Retry
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function BatchReviewPhaseView({ session }: { session: any }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, [session.sessionId]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const { getIdToken } = await import('@/lib/auth/cognito');
      const token = await getIdToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/feedback/${session.sessionId}/assets`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load assets');
      }

      const data = await response.json();
      setAssets(data.assets || []);
      setBatch(data.batch);
    } catch (err: any) {
      console.error('Failed to load assets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      setError('Please enter feedback before submitting');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const { getIdToken } = await import('@/lib/auth/cognito');
      const token = await getIdToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/feedback/${session.sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            feedbackText,
            rating: 4
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const data = await response.json();
      setRefinedPrompt(data.refinedPrompt);
      setFeedbackText('');
      
      // Show success message
      alert('Feedback submitted! Prompt has been refined by AI.');
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Review Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Review the generated batch and verify style consistency before locking the style.
        </p>

        {loading && (
          <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
            Loading assets...
          </div>
        )}

        {error && (
          <div style={{
            color: '#ef4444', background: '#1a0000', border: '1px solid #ef4444',
            borderRadius: 6, padding: '0.75rem', marginBottom: '1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && assets.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No assets found. Please generate a test batch first in the Single Iteration phase.
            </p>
          </div>
        )}

        {!loading && assets.length > 0 && (
          <div className="space-y-6">
            {/* Batch Info */}
            {batch && (
              <div style={{
                background: '#111', border: '1px solid #333', borderRadius: 8,
                padding: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap'
              }}>
                <div>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>Batch Name</span>
                  <div style={{ fontWeight: 500 }}>{batch.name}</div>
                </div>
                <div>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>Total Assets</span>
                  <div style={{ fontWeight: 500 }}>{assets.length}</div>
                </div>
                <div>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>Status</span>
                  <div style={{ fontWeight: 500, color: '#22c55e' }}>
                    {batch.completedTasks} / {batch.totalTasks} Complete
                  </div>
                </div>
              </div>
            )}

            {/* Assets Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {assets.map((asset: any) => (
                <div
                  key={asset.assetId}
                  style={{
                    border: '1px solid #333',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#111'
                  }}
                >
                  <div style={{ position: 'relative', paddingBottom: '100%', background: '#000' }}>
                    <img
                      src={asset.s3Url || asset.thumbnailUrl}
                      alt={asset.metadata?.item_name || 'Generated asset'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                      {asset.metadata?.item_name || asset.assetId.slice(0, 8)}
                    </div>
                    {asset.tags && asset.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {asset.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.125rem 0.5rem',
                              background: '#333',
                              borderRadius: 4,
                              color: '#888'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback Form */}
            <div style={{
              background: '#111', border: '1px solid #333', borderRadius: 8,
              padding: '1.5rem'
            }}>
              <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>
                Provide Feedback for AI Refinement
              </h3>
              
              {refinedPrompt && (
                <div style={{
                  background: '#0a1628', border: '1px solid #0070f3',
                  borderRadius: 6, padding: '1rem', marginBottom: '1rem'
                }}>
                  <div style={{ color: '#0070f3', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                    ✨ AI-Refined Prompt
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#fff' }}>
                    {refinedPrompt}
                  </div>
                </div>
              )}

              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe what you'd like to improve... (e.g., 'Make colors more vibrant', 'Add more detail to backgrounds', 'Reduce shadows')"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  background: '#000',
                  border: '1px solid #333',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />

              <button
                onClick={handleSubmitFeedback}
                disabled={submitting || !feedbackText.trim()}
                style={{
                  padding: '0.75rem 2rem',
                  background: submitting || !feedbackText.trim() ? '#333' : '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: submitting || !feedbackText.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback & Refine Prompt'}
              </button>

              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#888' }}>
                💡 The PromptEngineerAgent will analyze your feedback and refine the master prompt using AI.
              </div>
            </div>
          </div>
        )}
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

function ReuploadForm({ sessionId, onComplete }: { sessionId: string; onComplete: (data: any) => void }) {
  const [selectedStyleProfile, setSelectedStyleProfile] = useState<any>(null);
  const [styleProfiles, setStyleProfiles] = useState<any[]>([]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRowCount, setCsvRowCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load style profiles on mount
    const loadProfiles = async () => {
      try {
        const result = await stylesApi.list();
        const profiles = result?.styleProfiles || [];
        setStyleProfiles(profiles);
      } catch (err) {
        console.error('Failed to load style profiles:', err);
      }
    };
    loadProfiles();
  }, []);

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      setCsvRowCount(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!selectedStyleProfile) {
      setError('Please select a style profile.');
      return;
    }
    if (!csvFile) {
      setError('Please upload a CSV file.');
      return;
    }

    // Save to sessionStorage
    sessionStorage.setItem(
      `session_${sessionId}_upload_data`,
      JSON.stringify({
        styleProfileId: selectedStyleProfile.styleProfileId,
        styleName: selectedStyleProfile.name,
        styleDescriptors: selectedStyleProfile.descriptors,
        csvRowCount: csvRowCount,
      })
    );

    const reader = new FileReader();
    reader.onload = (e) => {
      sessionStorage.setItem(
        `session_${sessionId}_csv_content`,
        e.target?.result as string
      );
      onComplete({
        styleProfileId: selectedStyleProfile.styleProfileId,
        styleName: selectedStyleProfile.name,
        csvRowCount: csvRowCount,
      });
    };
    reader.readAsText(csvFile);
  };

  return (
    <div style={{
      color: '#f59e0b', background: '#1a1200', border: '1px solid #f59e0b',
      borderRadius: 6, padding: '1.5rem', marginBottom: '1.5rem'
    }}>
      <div style={{ marginBottom: '1rem', fontWeight: 600 }}>
        ⚠️ Upload data not found. Please re-upload your style and CSV.
      </div>

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleCsvChange}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Style Profile Selector */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Style Profile
          </label>
          {selectedStyleProfile ? (
            <div style={{
              background: '#0a1628', border: '2px solid #0070f3', borderRadius: 6,
              padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#fff' }}>
                  {selectedStyleProfile.name || 'Untitled Style'}
                </div>
                {selectedStyleProfile.descriptors?.artStyle && (
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>
                    {selectedStyleProfile.descriptors.artStyle}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowStylePicker(true)}
                style={{
                  padding: '0.25rem 0.75rem', background: '#333', color: '#fff',
                  border: '1px solid #555', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowStylePicker(true)}
              style={{
                width: '100%', padding: '0.75rem', background: '#333', color: '#fff',
                border: '1px solid #555', borderRadius: 6, cursor: 'pointer'
              }}
            >
              Select Style Profile
            </button>
          )}
        </div>

        {/* CSV Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            CSV File
          </label>
          <div
            onClick={() => csvInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && file.name.endsWith('.csv')) {
                setCsvFile(file);
                const reader = new FileReader();
                reader.onload = (event) => {
                  const text = event.target?.result as string;
                  const lines = text.split('\n').filter(line => line.trim().length > 0);
                  setCsvRowCount(Math.max(0, lines.length - 1));
                };
                reader.readAsText(file);
              }
            }}
            style={{
              border: '2px dashed #555', borderRadius: 6, padding: '1rem',
              textAlign: 'center', cursor: 'pointer', background: '#111'
            }}
          >
            {csvFile ? (
              <div>
                <div style={{ color: '#22c55e', fontWeight: 500, marginBottom: '0.25rem' }}>
                  ✓ {csvFile.name}
                </div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>
                  {csvRowCount} rows detected
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📄</div>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>
                  Click or drag CSV file here
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            color: '#ef4444', background: '#1a0000', border: '1px solid #ef4444',
            borderRadius: 6, padding: '0.5rem', fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!selectedStyleProfile || !csvFile}
          style={{
            padding: '0.75rem', background: '#0070f3', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            fontWeight: 500, opacity: (!selectedStyleProfile || !csvFile) ? 0.5 : 1
          }}
        >
          Save & Continue
        </button>
      </div>

      {/* Style Picker Modal */}
      {showStylePicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: 12,
            padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Select Style Profile</h3>
              <button
                onClick={() => setShowStylePicker(false)}
                style={{ background: 'none', border: 'none', color: '#888',
                  fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {styleProfiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>No style profiles found.</p>
                <a href="/dashboard/styles/new" style={{ color: '#0070f3' }}>
                  Create your first style profile →
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {styleProfiles.map((profile: any) => (
                  <div
                    key={profile.styleProfileId}
                    onClick={() => {
                      setSelectedStyleProfile(profile);
                      setShowStylePicker(false);
                      setError(null);
                    }}
                    style={{
                      border: selectedStyleProfile?.styleProfileId === profile.styleProfileId
                        ? '2px solid #0070f3' : '1px solid #333',
                      borderRadius: 8, padding: '1rem', cursor: 'pointer',
                      background: selectedStyleProfile?.styleProfileId === profile.styleProfileId
                        ? '#0a1628' : '#111',
                      display: 'flex', flexDirection: 'column', gap: '0.25rem'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {profile.name || 'Untitled Style'}
                    </div>
                    {profile.descriptors?.artStyle && (
                      <div style={{ color: '#888', fontSize: '0.85rem' }}>
                        {profile.descriptors.artStyle}
                      </div>
                    )}
                    {profile.descriptors?.mood && (
                      <div style={{ color: '#666', fontSize: '0.8rem' }}>
                        Mood: {profile.descriptors.mood}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
}