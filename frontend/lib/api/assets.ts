import { apiClient } from './client';
import type { Asset } from '../types/api';

export const assetsApi = {
  // Get a specific asset
  get: async (assetId: string): Promise<{ asset: Asset }> => {
    return apiClient.get(`/assets/${assetId}`);
  },

  // Get asset download URL (presigned S3 URL)
  getDownloadUrl: async (assetId: string): Promise<{ url: string }> => {
    return apiClient.get(`/assets/${assetId}/download`);
  },
};
