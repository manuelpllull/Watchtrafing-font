import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { watchesApi } from '@/api/watches';
import { useToast } from '@/components/Toast';
import { getMessage } from '@/components/ui/ErrorBanner';

/**
 * Shared source of truth for share invitations. The dashboard card, the
 * invitations page and the nav badge all read the same query, so the pending
 * count is fetched once.
 */
export function useShareInvitations() {
  const { notify } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['shareInvites'],
    queryFn: () => watchesApi.myInvitations(),
  });

  const resolve = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? watchesApi.acceptShare(id) : watchesApi.rejectShare(id),
    onSuccess: async (_data, { accept }) => {
      notify(accept ? 'Share accepted.' : 'Invitation declined.', 'success');
      await qc.invalidateQueries({ queryKey: ['shareInvites'] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      await qc.invalidateQueries({ queryKey: ['watch'] });
    },
    onError: (err: Error) => notify(getMessage(err), 'error'),
  });

  const all = query.data ?? [];
  const pending = all.filter((i) => i.status === 'Pending');
  const resolved = all.filter((i) => i.status !== 'Pending');

  return { ...query, all, pending, resolved, resolve };
}
