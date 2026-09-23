import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { timebankKeys } from './keys';
import {
  fetchOwnTimebankAccount,
  fetchOwnTimebankTransactions,
  type TimebankAccount,
  type TimebankTransaction,
} from './queries';

/**
 * The caller's own timebank account.
 * `data` is null until the first settlement creates the account;
 * the UI should render that as a zero balance, not as an error.
 */
export function useTimebankAccount(): UseQueryResult<TimebankAccount | null, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: timebankKeys.account,
    queryFn: () => fetchOwnTimebankAccount(client),
  });
}

/** The caller's own transactions, newest first. */
export function useTimebankTransactions(): UseQueryResult<TimebankTransaction[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: timebankKeys.transactions,
    queryFn: () => fetchOwnTimebankTransactions(client),
  });
}
