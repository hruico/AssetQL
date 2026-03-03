import { apiClient } from './client';
import { Asset } from '../types/api';

export interface AssetsListResponse {
  assets: Asset[];
}

export interface AssetResponse {
  asset: Asset;
}

export const assetsApi = {
  list: async (): Promise<AssetsListResponse> => {
    const response = await apiClient.get<AssetsListResponse>('/assets');
    return response;
  },

  get: async (assetId: string): Promise<AssetResponse> => {
    const response = await apiClient.get<AssetResponse>(`/assets/${assetId}`);
    return response;
  },
};
