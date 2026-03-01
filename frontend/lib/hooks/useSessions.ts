import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api';
import type { Session, SessionPhase } from '@/lib/types/api';

// Normalize session response from backend
function normalizeSession(session: any): Session {
  return {
    ...session,
    phase: session.currentPhase || session.phase, // Backend uses currentPhase
    createdAt: typeof session.createdAt === 'number' 
      ? new Date(session.createdAt).toISOString() 
      : session.createdAt,
    updatedAt: typeof session.updatedAt === 'number'
      ? new Date(session.updatedAt).toISOString()
      : session.updatedAt,
  };
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { sessions } = await sessionsApi.list();
      return sessions.map(normalizeSession);
    },
  });
}

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { session } = await sessionsApi.get(sessionId);
      return normalizeSession(session);
    },
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name?: string) => {
      const response = await sessionsApi.create(name);
      return normalizeSession(response.session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useUpdateSessionPhase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, phase }: { sessionId: string; phase: SessionPhase }) => {
      const response = await sessionsApi.updatePhase(sessionId, phase);
      return normalizeSession(response.session);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId] });
    },
  });
}

export function useTriggerAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.triggerAutomation(sessionId),
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}
