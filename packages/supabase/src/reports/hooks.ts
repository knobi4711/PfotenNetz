import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { createUserReport, fetchUserReportModeration, updateUserReportStatus } from './queries';
import { reportKeys } from './keys';

export function useCreateUserReport() {
  const client = getSupabaseClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createUserReport>[1]) => createUserReport(client, input),
  });
}

export function useUserReportModeration() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: reportKeys.moderation,
    queryFn: () => fetchUserReportModeration(client),
  });
}

export function useUpdateUserReportStatus() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reportId: string; status: 'reviewed' | 'dismissed' | 'actioned' }) =>
      updateUserReportStatus(client, input.reportId, input.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}
