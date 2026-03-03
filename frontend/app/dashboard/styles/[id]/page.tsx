'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { stylesApi } from '../../../../lib/api/styles';

export default function StyleProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    stylesApi.get(id)
      .then(setProfile)
      .catch(() => setError('Failed to load style profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading style profile...</div>;
  if (error)   return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!profile) return <div style={{ padding: '2rem' }}>Profile not found</div>;

  const descriptors = profile.descriptors || {};

  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <button 
        onClick={() => router.push('/dashboard/styles')} 
        style={{ marginBottom: '1rem', cursor: 'pointer' }}
      >
        ← Back to Style Profiles
      </button>

      <h1>{profile.name || 'Untitled Style'}</h1>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        ID: {profile.styleProfileId}
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        <h2>Style Descriptors</h2>

        {descriptors.colorPalette && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>Color Palette:</strong>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {descriptors.colorPalette.map((color: string, i: number) => (
                <div 
                  key={i} 
                  style={{
                    width: 32, 
                    height: 32,
                    backgroundColor: color,
                    borderRadius: 4,
                    border: '1px solid #ccc'
                  }} 
                  title={color} 
                />
              ))}
            </div>
          </div>
        )}

        {[
          ['Art Style',    descriptors.artStyle],
          ['Mood',         descriptors.mood],
          ['Composition',  descriptors.composition],
          ['Lighting',     descriptors.lighting],
          ['Texture',      descriptors.texture],
          ['Negative Prompt', descriptors.negativePrompt],
        ].map(([label, value]) => 
          value ? (
            <div key={label as string} style={{ marginBottom: '0.75rem' }}>
              <strong>{label}:</strong> {value}
            </div>
          ) : null
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => router.push(`/dashboard/batches/new?styleProfileId=${id}`)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Use This Style → Create Batch
        </button>
      </div>
    </div>
  );
}
