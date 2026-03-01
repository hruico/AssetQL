import { apiClient } from './client';
import type { Batch, CreateBatchRequest, CreateBatchResponse } from '../types/api';

export const batchesApi = {
  // Create a new batch
  create: async (data: CreateBatchRequest): Promise<CreateBatchResponse> => {
    return apiClient.post('/batches', data);
  },

  // Get a specific batch
  get: async (batchId: string): Promise<{ batch: Batch }> => {
    return apiClient.get(`/batches/${batchId}`);
  },
};
