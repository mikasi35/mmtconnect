import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000/api/v1';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('mmt_token');
}

export async function saveSession(data: { access_token: string; refresh_token: string; user: any }) {
  await SecureStore.setItemAsync('mmt_token',   data.access_token);
  await SecureStore.setItemAsync('mmt_refresh', data.refresh_token);
  await SecureStore.setItemAsync('mmt_user',    JSON.stringify(data.user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync('mmt_token');
  await SecureStore.deleteItemAsync('mmt_refresh');
  await SecureStore.deleteItemAsync('mmt_user');
}

export async function getStoredUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync('mmt_user');
  return raw ? JSON.parse(raw) : null;
}

async function req<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const token = auth ? await getToken() : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message ?? 'Request failed'), { status: res.status });
  }
  return res.json();
}

const get    = <T>(path: string, auth = true)                  => req<T>(path, {}, auth);
const post   = <T>(path: string, body: unknown, auth = true)   => req<T>(path, { method: 'POST',  body: JSON.stringify(body) }, auth);
const patch  = <T>(path: string, body: unknown)                => req<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del    = <T>(path: string)                               => req<T>(path, { method: 'DELETE' });

export const mobileApi = {
  auth: {
    login:          (email: string, password: string) => post<any>('/auth/login', { email, password }, false),
    register:       (body: any)                       => post<any>('/auth/register', body, false),
    me:             ()                                => get<any>('/auth/me'),
    forgotPassword: (email: string)                   => post<any>('/auth/forgot-password', { email }, false),
    resetPassword:  (token: string, password: string) => post<any>('/auth/reset-password', { token, password }, false),
    changePassword: (current_password: string, new_password: string) =>
                                                         post<any>('/auth/change-password', { current_password, new_password }),
    registerPushToken: (token: string)                => post<any>('/auth/push-token', { token }),
  },
  facilities: {
    list:          (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/facilities${q}`);
    },
    get:           (id: string)                      => get<any>(`/facilities/${id}`),
    create:        (body: any)                       => post<any>('/facilities', body),
    createVacancy: (facilityId: string, body: any)   => post<any>(`/facilities/${facilityId}/vacancies`, body),
    vacancyStatus: (vacancyId: string, status: string) =>
                                                        patch<any>(`/facilities/vacancies/${vacancyId}/status`, { status }),
    updateVacancy: (vacancyId: string, body: any)    => patch<any>(`/facilities/vacancies/${vacancyId}`, body),
  },
  referrals: {
    list:   (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/referrals${q}`);
    },
    get:    (id: string)                      => get<any>(`/referrals/${id}`),
    create: (body: any)                       => post<any>('/referrals', body),
    update: (id: string, body: any)           => patch<any>(`/referrals/${id}`, body),
  },
  matching: {
    run:    (referralId: string)              => post<any>(`/match/${referralId}`, {}),
  },
  analytics: {
    summary: ()                               => get<any>('/analytics/summary'),
  },
  notifications: {
    list: ()                                  => get<any>('/notifications'),
    markRead: (id: string)                    => patch<any>(`/notifications/${id}/read`, {}),
  },
};
