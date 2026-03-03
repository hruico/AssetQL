import { apiClient } from './client';
import type { Session, CreateSessionResponse, UpdateSessionPhaseRequest } from '../types/api';

export const sessionsApi = {
  // List all sessions for the current user
  list: async (): Promise<{ sessions: Session[] }> => {
    return apiClient.get('/sessions');
  },

  // Create a new session
  create: async (name?: string): Promise<CreateSessionResponse> => {
    return apiClient.post('/sessions', { name });
  },

  // Get a specific session
  get: async (sessionId: string): Promise<{ session: Session }> => {
    return apiClient.get(`/sessions/${sessionId}`);
  },

  // Update session phase
  updatePhase: async (
    sessionId: string,
    phase: UpdateSessionPhaseRequest['phase']
  ): Promise<{ session: Session }> => {
    return apiClient.put(`/sessions/${sessionId}/phase`, { newPhase: phase });
  },

  // Delete a session
  delete: async (sessionId: string): Promise<{ message: string; sessionId: string }> => {
    return apiClient.delete(`/sessions/${sessionId}`);
  },

  // Trigger automation
  triggerAutomation: async (sessionId: string): Promise<any> => {
    return apiClient.post(`/sessions/${sessionId}/automate`);
  },

  // Export session assets
  exportAssets: async (
    sessionId: string,
    format: 'unity' | 'cms' | 'ecommerce' | 'social'
  ): Promise<any> => {
    return apiClient.post(`/sessions/${sessionId}/export`, { format });
  },
};
