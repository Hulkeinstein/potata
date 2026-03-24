import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    image: string;
    option?: string;
    quantity: number;
}

interface CartStore {
    items: CartItem[];
    isOpen: boolean;
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
    toggleCart: () => void;
    openCart: () => void;
    closeCart: () => void;
    clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set) => ({
            items: [],
            isOpen: false,
            addItem: (newItem) => set((state) => {
                const existingItem = state.items.find((item) => item.id === newItem.id);
                if (existingItem) {
                    return {
                        items: state.items.map((item) =>
                            item.id === newItem.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                        isOpen: true, // Open cart when adding item
                    };
                }
                return { items: [...state.items, { ...newItem, quantity: 1 }], isOpen: true };
            }),
            removeItem: (id) => set((state) => ({
                items: state.items.filter((item) => item.id !== id),
            })),
            updateQuantity: (id, delta) => set((state) => ({
                items: state.items.map((item) => {
                    if (item.id === id) {
                        const newQuantity = Math.max(1, item.quantity + delta);
                        return { ...item, quantity: newQuantity };
                    }
                    return item;
                }),
            })),
            toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
            openCart: () => set({ isOpen: true }),
            closeCart: () => set({ isOpen: false }),
            clearCart: () => set({ items: [] }),
        }),
        {
            name: 'cart-storage',
            skipHydration: true, // Handle hydration manualy if needed, or default behavior
        }
    )
);
