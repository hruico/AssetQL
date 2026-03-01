import { apiClient } from './client';
import type { SubmitFeedbackRequest, SubmitFeedbackResponse } from '../types/api';

export const feedbackApi = {
  // Submit feedback for an asset
  submit: async (data: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse> => {
    return apiClient.post('/feedback', data);
  },
};
