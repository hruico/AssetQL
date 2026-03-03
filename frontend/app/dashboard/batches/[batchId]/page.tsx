'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

export default function BatchProgressPage() {
  const params = useParams();
  const batchId = params.batchId as string;

  const [batch, setBatch] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    try {
      const { getIdToken } = await import('../../../../lib/auth/cognito');
      const token = await getIdToken();
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;

      const res = await fetch(`${base}/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setBatch(data.batch || data);
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  // Poll every 5 seconds while batch is processing
  useEffect(() => {
    fetchBatch();
    const interval = setInterval(() => {
      if (batch?.status !== 'COMPLETED' && batch?.status !== 'FAILED') {
        fetchBatch();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchBatch, batch?.status]);

  if (loading) return (
    <div style={{ padding: '2rem', color: '#888' }}>Loading batch...</div>
  );

  if (error) return (
    <div style={{ padding: '2rem' }}>
      <div style={{ color: '#ef4444', marginBottom: '1rem' }}>Error: {error}</div>
      <a href="/dashboard/sessions" style={{ color: '#0070f3' }}>← Back to Sessions</a>
    </div>
  );

  const completed = batch?.completedTasks || 0;
  const total = batch?.totalTasks || 1;
  const failed = batch?.failedTasks || 0;
  const pct = Math.round((completed / total) * 100);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/dashboard/sessions" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Sessions
        </a>
      </div>

      <h1 style={{ marginBottom: '0.25rem' }}>Batch Progress</h1>
      <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>
        {batchId}
      </div>

      {/* Status + progress */}
      <div style={{
        background: '#111', border: '1px solid #333', borderRadius: 8,
        padding: '1.5rem', marginBottom: '1.5rem'
      }}>
        <div style={{ 
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '1rem'
        }}>
          <div style={{ 
            fontSize: '1.1rem', fontWeight: 600,
            color: batch?.status === 'COMPLETED' ? '#22c55e' 
                 : batch?.status === 'FAILED' ? '#ef4444' 
                 : '#f59e0b'
          }}>
            {batch?.status || 'PROCESSING'}
          </div>
          <div style={{ color: '#888', fontSize: '0.9rem' }}>
            {completed} / {total} images
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ 
          background: '#333', borderRadius: 4, height: 8, overflow: 'hidden', 
          marginBottom: '0.75rem'
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: batch?.status === 'FAILED' ? '#ef4444' : '#0070f3',
            transition: 'width 0.5s ease'
          }} />
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
          <span style={{ color: '#22c55e' }}>✓ {completed} completed</span>
          {failed > 0 && (
            <span style={{ color: '#ef4444' }}>✗ {failed} failed</span>
          )}
          <span>{total - completed - failed} pending</span>
        </div>
      </div>

      {/* Tasks list */}
      {tasks.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Tasks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tasks.map((task: any) => (
              <div key={task.taskId} style={{
                background: '#111', border: '1px solid #333', borderRadius: 6,
                padding: '0.75rem 1rem',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#888', fontFamily: 'monospace' }}>
                  {task.taskId?.substring(0, 12)}...
                </div>
                <div style={{ 
                  fontSize: '0.8rem', fontWeight: 500,
                  color: task.status === 'COMPLETED' ? '#22c55e'
                       : task.status === 'FAILED' ? '#ef4444'
                       : task.status === 'PROCESSING' ? '#f59e0b'
                       : '#888'
                }}>
                  {task.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {batch?.status === 'COMPLETED' && (
        <div style={{ marginTop: '2rem' }}>
          <a
            href="/dashboard/assets"
            style={{
              padding: '0.75rem 2rem', background: '#0070f3', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontWeight: 500
            }}
          >
            View Generated Assets →
          </a>
        </div>
      )}

      {batch?.status !== 'COMPLETED' && (
        <div style={{ marginTop: '1.5rem', color: '#666', fontSize: '0.85rem' }}>
          🔄 Auto-refreshing every 5 seconds...
        </div>
      )}
    </div>
  );
}
