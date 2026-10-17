import { render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { LikedClient } from './LikedClient';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
vi.mock('@/store/wishlist-store', () => ({ useWishlistStore: (select: (state: { items: string[]; hasHydrated: boolean }) => unknown) => select({ items: [], hasHydrated: true }) }));
it('renders the empty wishlist shopping action in Korean', () => {
  render(<LanguageProvider initialLocale="ko"><LikedClient products={[]} /></LanguageProvider>);
  expect(screen.getByRole('link', { name: '쇼핑 시작' })).toBeTruthy();
});
