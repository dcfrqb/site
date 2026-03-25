/**
 * Zustand store для auth состояния.
 */
import { create } from "zustand";
import { AuthUser, authApi } from "./api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    set({ user: null });
  },

  initialize: async () => {
    set({ loading: true });
    try {
      const user = await authApi.me();
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    } finally {
      set({ loading: false });
    }
  },
}));
