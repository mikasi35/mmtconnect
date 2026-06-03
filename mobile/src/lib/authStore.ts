import { create } from 'zustand';
import { mobileApi, saveSession, clearSession, getStoredUser } from './api';

interface User {
  id: string; name: string; email: string; role: string; organisation?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: null, isLoading: false, error: null, hydrated: false,

  hydrate: async () => {
    const user = await getStoredUser();
    set({ user, hydrated: true });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.login(email, password);
      await saveSession(res.data);
      set({ user: res.data.user, token: res.data.access_token, isLoading: false });
      return true;
    } catch (e: any) {
      set({ error: e.message ?? 'Login failed', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await clearSession();
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));
