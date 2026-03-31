import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartState } from '@/types';

interface CartStore extends CartState {
    isOpen: boolean;
    toggleCart: () => void;
    openCart: () => void;
    closeCart: () => void;
}

const isSameCartItem = (left: CartItem, right: CartItem) =>
    left.product.id === right.product.id &&
    left.size === right.size &&
    left.color === right.color;

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            addItem: (newItem) => set((state) => {
                const existingItem = state.items.find((item) => isSameCartItem(item, newItem));
                if (existingItem) {
                    return {
                        items: state.items.map((item) =>
                            isSameCartItem(item, newItem)
                                ? { ...item, quantity: item.quantity + newItem.quantity }
                                : item
                        ),
                        isOpen: true, // Open cart when adding item
                    };
                }
                return { items: [...state.items, newItem], isOpen: true };
            }),
            removeItem: (targetItem) => set((state) => ({
                items: state.items.filter((item) => !isSameCartItem(item, targetItem)),
            })),
            updateQuantity: (targetItem, delta) => set((state) => ({
                items: state.items.map((item) => {
                    if (isSameCartItem(item, targetItem)) {
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
            totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
            totalPrice: () => get().items.reduce((total, item) => total + item.product.price * item.quantity, 0),
        }),
        {
            name: 'cart-storage',
            skipHydration: true, // Handle hydration manualy if needed, or default behavior
        }
    )
);
