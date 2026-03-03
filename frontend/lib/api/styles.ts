import { apiClient } from './client';
import { StyleProfile } from '../types/api';

interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
}

interface CreateStyleProfileResponse {
  styleProfileId: string;
  userId: string;
  name: string;
  referenceImageKey: string;
  descriptors: any;
  createdAt: number;
}

export const stylesApi = {
  // Step 1: Get presigned S3 upload URL
  presign: async (fileName: string, fileType: string): Promise<PresignResponse> => {
    return apiClient.post('/presign', {
      fileName,
      fileType,
      folder: 'style-references',
    });
  },

  // Full 3-step upload flow
  create: async (file: File, name: string): Promise<CreateStyleProfileResponse> => {
    // Step 1: Get presigned URL
    const { uploadUrl, s3Key } = await stylesApi.presign(file.name, file.type);

    // Step 2: Upload file directly to S3 (NO auth header on this request)
    const s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!s3Response.ok) {
      throw new Error(`S3 upload failed with status: ${s3Response.status}`);
    }

    // Step 3: Create style profile with s3Key
    return apiClient.post('/styles', { s3Key, name });
  },

  list: async (): Promise<{ styleProfiles: StyleProfile[] }> => {
    return apiClient.get('/styles');
  },

  get: async (styleProfileId: string): Promise<StyleProfile> => {
    return apiClient.get(`/styles/${styleProfileId}`);
  },
};
