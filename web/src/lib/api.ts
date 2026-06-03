// ============================================================
//  MMT Care Connect — Web API Client
// ============================================================

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://vacancies.mmtcare.com.au/api/v1';
const API_HOST = (() => {
  try {
    const url = new URL(BASE);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return BASE.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  }
})();

export function resolvePublicImage(src: string | null | undefined): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  const normalized = src.startsWith('/') ? src : `/${src}`;
  return `${API_HOST}${normalized}`;
}

// ── Token storage ─────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mmt_token');
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const r = localStorage.getItem('mmt_user');
  return r ? JSON.parse(r) : null;
}

export function saveSession(tokens: { access_token: string; refresh_token: string; user: any }) {
  localStorage.setItem('mmt_token',   tokens.access_token);
  localStorage.setItem('mmt_refresh', tokens.refresh_token);
  localStorage.setItem('mmt_user',    JSON.stringify(tokens.user));
}

export function clearSession() {
  localStorage.removeItem('mmt_token');
  localStorage.removeItem('mmt_refresh');
  localStorage.removeItem('mmt_user');
}

// ── Core fetch ────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('mmt_refresh');
  if (!refresh) return null;
  try {
    const res  = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) { clearSession(); return null; }
    const body = await res.json();
    saveSession(body.data);
    return body.data.access_token;
  } catch { clearSession(); return null; }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string,string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...Object.fromEntries(new Headers(options.headers as HeadersInit || {}) as any),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
    const newToken = await refreshPromise;
    if (newToken) return request(path, options, false);
    // Redirect to login
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message ?? 'API Error'), { status: res.status, data: err });
  }

  return res.json();
}

function get<T>(path: string) { return request<T>(path); }
function post<T>(path: string, body: unknown) { return request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
function postForm<T>(path: string, body: FormData) { return request<T>(path, { method: 'POST', body }); }
function patch<T>(path: string, body: unknown) { return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
function del<T>(path: string) { return request<T>(path, { method: 'DELETE' }); }

// ── API surface ───────────────────────────────────────────────

export const api = {
  auth: {
    login:    (email: string, password: string) => post<any>('/auth/login', { email, password }),
    register: (body: any)  => post<any>('/auth/register', body),
    logout:   ()           => post<any>('/auth/logout', {}),
    me:       ()           => get<any>('/auth/me'),
  },

  facilities: {
    list:   (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/facilities${q}`);
    },
    get:    (id: string)  => get<any>(`/facilities/${id}`),
    create: (body: any)   => post<any>('/facilities', body),
    uploadImages: (facilityId: string, body: FormData) => postForm<any>(`/facilities/${facilityId}/images`, body),
    update: (id: string, body: any) => patch<any>(`/facilities/${id}`, body),
    delete: (id: string)  => del<any>(`/facilities/${id}`),

    createVacancy:  (facilityId: string, body: any) => post<any>(`/facilities/${facilityId}/vacancies`, body),
    updateVacancy:  (vacancyId: string, body: any)  => patch<any>(`/facilities/vacancies/${vacancyId}`, body),
    vacancyStatus:  (vacancyId: string, status: string) =>
      patch<any>(`/facilities/vacancies/${vacancyId}/status`, { status }),
    availableVacancies: () => get<any>('/facilities/vacancies/available'),
  },

  referrals: {
    list:     (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/referrals${q}`);
    },
    get:      (id: string)  => get<any>(`/referrals/${id}`),
    create:   (body: any)   => post<any>('/referrals', body),
    update:   (id: string, body: any) => patch<any>(`/referrals/${id}`, body),
    activity: (id: string)  => get<any>(`/referrals/${id}/activity`),
  },

  matching: {
    run:    (referralId: string) => post<any>(`/match/${referralId}`, {}),
    select: (referralId: string, body: any) => post<any>(`/match/${referralId}/select`, body),
  },

  analytics: {
    summary:    () => get<any>('/analytics/summary'),
    activity:   () => get<any>('/analytics/activity'),
    facilities: () => get<any>('/analytics/facilities'),
  },

  users: {
    list:   (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/users${q}`);
    },
    get:    (id: string)  => get<any>(`/users/${id}`),
    update: (id: string, body: any) => patch<any>(`/users/${id}`, body),
  },

  public: {
    vacancies: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/public/vacancies${q}`);
    },
  },
};
