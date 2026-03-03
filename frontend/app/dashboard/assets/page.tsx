'use client';

import { useState, useEffect } from 'react';
import { assetsApi } from '../../../lib/api';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await assetsApi.list();
        setAssets(data.assets || []);
      } catch (err) {
        console.error('Failed to load assets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Asset Library</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        All generated images across your batches
      </p>

      {loading && (
        <div style={{ color: '#888' }}>Loading assets...</div>
      )}

      {!loading && assets.length === 0 && (
        <div style={{ 
          textAlign: 'center', padding: '4rem', color: '#666',
          border: '2px dashed #333', borderRadius: 8
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No assets yet</div>
          <div style={{ fontSize: '0.9rem' }}>
            Generate your first batch to see assets here.
          </div>
          <a href="/dashboard/sessions" style={{ 
            color: '#0070f3', display: 'block', marginTop: '1rem'
          }}>
            ← Back to Sessions
          </a>
        </div>
      )}

      {!loading && assets.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {assets.map((asset: any) => (
            <div key={asset.assetId} style={{
              background: '#111', border: '1px solid #333',
              borderRadius: 8, overflow: 'hidden'
            }}>
              {asset.thumbnailUrl && (
                <img 
                  src={asset.thumbnailUrl} 
                  alt={asset.assetId}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                />
              )}
              <div style={{ padding: '0.75rem' }}>
                <div style={{ 
                  fontSize: '0.75rem', color: '#888', fontFamily: 'monospace'
                }}>
                  {asset.assetId?.substring(0, 12)}
                </div>
                {asset.styleScore && (
                  <div style={{ 
                    color: asset.styleScore >= 85 ? '#22c55e' : '#f59e0b',
                    fontSize: '0.8rem', marginTop: '0.25rem'
                  }}>
                    Style: {asset.styleScore}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
