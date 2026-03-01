import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stylesApi } from '@/lib/api';

export function useStyles() {
  return useQuery({
    queryKey: ['styles'],
    queryFn: async () => {
      const { styleProfiles } = await stylesApi.list();
      return styleProfiles;
    },
  });
}

export function useStyle(styleProfileId: string | null) {
  return useQuery({
    queryKey: ['styles', styleProfileId],
    queryFn: async () => {
      if (!styleProfileId) return null;
      const { styleProfile } = await stylesApi.get(styleProfileId);
      return styleProfile;
    },
    enabled: !!styleProfileId,
  });
}

export function useCreateStyle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => stylesApi.create(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles'] });
    },
  });
}
