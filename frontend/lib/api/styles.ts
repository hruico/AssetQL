import { apiClient } from './client';
import type { StyleProfile, CreateStyleProfileResponse } from '../types/api';

export const stylesApi = {
  // List all style profiles for the current user
  list: async (): Promise<{ styleProfiles: StyleProfile[] }> => {
    return apiClient.get('/styles');
  },

  // Create a style profile with reference image
  create: async (file: File): Promise<CreateStyleProfileResponse> => {
    const formData = new FormData();
    formData.append('referenceImage', file);

    // Note: For file uploads, we need to use fetch directly with proper headers
    const token = await (await import('../auth/cognito')).getIdToken();
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/styles`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create style profile');
    }

    return response.json();
  },

  // Get a specific style profile
  get: async (styleProfileId: string): Promise<{ styleProfile: StyleProfile }> => {
    return apiClient.get(`/styles/${styleProfileId}`);
  },
};
