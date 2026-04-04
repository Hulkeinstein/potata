import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
    items: string[]; // List of Product IDs
    hasHydrated: boolean;
    addItem: (id: string) => void;
    removeItem: (id: string) => void;
    hasItem: (id: string) => boolean;
    toggleItem: (id: string) => void;
    setHasHydrated: (hasHydrated: boolean) => void;
}

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            hasHydrated: false,
            setHasHydrated: (hasHydrated) => set({ hasHydrated }),
            addItem: (id) => set((state) => ({ items: [...state.items, id] })),
            removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item !== id) })),
            hasItem: (id) => get().items.includes(id),
            toggleItem: (id) => {
                const { items } = get();
                if (items.includes(id)) {
                    set({ items: items.filter((item) => item !== id) });
                } else {
                    set({ items: [...items, id] });
                }
            },
        }),
        {
            name: 'wishlist-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
