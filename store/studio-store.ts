import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedImage {
    id: string;
    imageUrl: string;
    productId?: string;
    createdAt: number;
}

interface StudioState {
    gallery: GeneratedImage[];
    recents: string[]; // Product IDs
    hasHydrated: boolean;
    addToGallery: (image: string, productId?: string) => void;
    removeFromGallery: (id: string) => void;
    addToRecents: (productId: string) => void;
    clearRecents: () => void;
    setHasHydrated: (hasHydrated: boolean) => void;
    loadRecentsFromServer: (ids: string[]) => void;
}

export const useStudioStore = create<StudioState>()(
    persist(
        (set) => ({
            gallery: [],
            recents: [],
            hasHydrated: false,
            setHasHydrated: (hasHydrated) => set({ hasHydrated }),
            addToGallery: (image, productId) => {
                const newImage: GeneratedImage = {
                    id: crypto.randomUUID(),
                    imageUrl: image,
                    productId,
                    createdAt: Date.now(),
                };
                set((state) => ({ gallery: [newImage, ...state.gallery] }));
            },
            removeFromGallery: (id) =>
                set((state) => ({
                    gallery: state.gallery.filter((img) => img.id !== id),
                })),
            addToRecents: (productId) =>
                set((state) => {
                    const newRecents = [productId, ...state.recents.filter((id) => id !== productId)];
                    return { recents: newRecents.slice(0, 20) }; // Keep last 20
                }),
            clearRecents: () => set({ recents: [] }),
            // 로그인 시 서버 최근목록으로 덮어쓴다(서버가 진실의 원천)
            loadRecentsFromServer: (ids) => set({ recents: ids }),
        }),
        {
            name: 'studio-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
