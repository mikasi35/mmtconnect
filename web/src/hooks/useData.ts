import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/api';

// Generic fetcher
const fetcher = (fn: () => Promise<any>) => fn().then((r: any) => r.data);

// ── Analytics ────────────────────────────────────────────────

export function useAnalytics() {
  const { data, error, isLoading, mutate } = useSWR(
    'analytics/summary',
    () => fetcher(api.analytics.summary),
    { refreshInterval: 30_000 }
  );
  return { summary: data, error, isLoading, refresh: mutate };
}

export function useActivityFeed() {
  const { data, error, isLoading } = useSWR(
    'analytics/activity',
    () => fetcher(api.analytics.activity),
    { refreshInterval: 15_000 }
  );
  return { logs: data ?? [], error, isLoading };
}

// ── Referrals ────────────────────────────────────────────────

export function useReferrals(params?: Record<string, string>) {
  const key = 'referrals' + (params ? JSON.stringify(params) : '');
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetcher(() => api.referrals.list(params)),
    { revalidateOnFocus: true }
  );
  return {
    referrals: (data as any)?.data ?? data ?? [],
    total: (data as any)?.total ?? 0,
    error, isLoading, mutate,
  };
}

export function useReferral(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `referral/${id}` : null,
    () => fetcher(() => api.referrals.get(id!))
  );
  return { referral: data, error, isLoading, mutate };
}

// ── Facilities ───────────────────────────────────────────────

export function useFacilities(params?: Record<string, string>) {
  const key = 'facilities' + (params ? JSON.stringify(params) : '');
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetcher(() => api.facilities.list(params)),
    { revalidateOnFocus: true }
  );
  return {
    facilities: (data as any)?.data ?? data ?? [],
    total: (data as any)?.total ?? 0,
    error, isLoading, mutate,
  };
}

export function useFacility(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `facility/${id}` : null,
    () => fetcher(() => api.facilities.get(id!))
  );
  return { facility: data, error, isLoading, mutate };
}

export function useAvailableVacancies() {
  const { data, error, isLoading } = useSWR(
    'vacancies/available',
    () => fetcher(api.facilities.availableVacancies),
    { refreshInterval: 20_000 }
  );
  return { vacancies: data ?? [], error, isLoading };
}

export function usePublicVacancies(params?: Record<string, string>) {
  const key = 'public/vacancies' + (params ? JSON.stringify(params) : '');
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetcher(() => api.public.vacancies(params))
  );
  return { vacancies: data ?? [], error, isLoading, mutate };
}

// ── Users ─────────────────────────────────────────────────────

export function useUsers(params?: Record<string, string>) {
  const key = 'users' + (params ? JSON.stringify(params) : '');
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetcher(() => api.users.list(params))
  );
  return {
    users: (data as any)?.data ?? data ?? [],
    total: (data as any)?.total ?? 0,
    error, isLoading, mutate,
  };
}

// ── Cache invalidation helpers ────────────────────────────────

export function refreshReferrals() { globalMutate((k: any) => typeof k === 'string' && k.startsWith('referral')); }
export function refreshFacilities() { globalMutate((k: any) => typeof k === 'string' && k.startsWith('facilit')); }
export function refreshAll() { globalMutate(() => true); }
