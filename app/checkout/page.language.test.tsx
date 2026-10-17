import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import CheckoutPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/store/cart-store', () => {
  const store = { items: [], clearCart: vi.fn(), hasHydrated: true };
  return { useCartStore: Object.assign((selector?: (value: typeof store) => unknown) => selector ? selector(store) : store, { persist: { rehydrate: vi.fn() } }) };
});

describe('checkout language', () => {
  it('shows the empty order in English without submitting an order', () => {
    render(<LanguageProvider initialLocale="en"><CheckoutPage /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: 'Review order' })).toBeTruthy();
    expect(screen.getByText('Your bag is empty.')).toBeTruthy();
  });
  it('shows the empty order in Korean without submitting an order', () => {
    render(<LanguageProvider initialLocale="ko"><CheckoutPage /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: '주문 확인' })).toBeTruthy();
    expect(screen.getByText('장바구니가 비어 있습니다')).toBeTruthy();
  });
});
