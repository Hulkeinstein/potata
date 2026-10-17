import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { CommerceText, OrderDate, OrderStatusText } from './CommerceText';

describe('order translations', () => {
  it('renders one explicitly UTC date regardless of the browser time zone', () => {
    const { container } = render(<LanguageProvider initialLocale="en"><OrderDate date="2026-10-13T20:15:00.000Z" /></LanguageProvider>);
    expect(container.textContent).toBe('13/10/2026, 20:15 UTC');
  });
  it('shows English order history and pending status without changing payment state', () => {
    render(<LanguageProvider initialLocale="en"><h1><CommerceText name="history" /></h1><OrderStatusText status="PENDING" /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: 'Order History' })).toBeTruthy();
    expect(screen.getByText('Awaiting payment')).toBeTruthy();
  });
  it('shows Korean order history and honest prelaunch payment notice', () => {
    render(<LanguageProvider initialLocale="ko"><h1><CommerceText name="history" /></h1><CommerceText name="pendingNotice" /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: '주문 내역' })).toBeTruthy();
    expect(screen.getByText(/실제 결제는 아직 진행되지 않습니다/)).toBeTruthy();
  });
});
