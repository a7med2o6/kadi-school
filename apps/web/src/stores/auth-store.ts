import { create } from 'zustand';

export interface SessionUser {
  id: string;
  schoolId: string;
  schoolSlug: string;
  email: string | null;
  civilId: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string, user: SessionUser) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

// Access token lives in memory only — never localStorage/sessionStorage, so an
// XSS payload reading storage can't steal it. The refresh token is an httpOnly
// cookie the browser sends automatically; the JS layer never sees its value.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, user: null }),
}));

export function hasPermission(permission: string): boolean {
  return useAuthStore.getState().user?.permissions.includes(permission) ?? false;
}
