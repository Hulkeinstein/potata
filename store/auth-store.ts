import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types';

const defaultUser: User = {
    id: 'guest-user',
    email: 'guest@potata.com',
    name: 'User',
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isLoggedIn: false,
            user: null,
            login: (user = defaultUser) => set({ isLoggedIn: true, user }),
            logout: () => set({ isLoggedIn: false, user: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
