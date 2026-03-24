import { create } from 'zustand';

interface AuthState {
    isLoggedIn: boolean;
    user: { name: string } | null;
    login: (name?: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isLoggedIn: false,
    user: null,
    login: (name = "User") => set({ isLoggedIn: true, user: { name } }),
    logout: () => set({ isLoggedIn: false, user: null }),
}));
