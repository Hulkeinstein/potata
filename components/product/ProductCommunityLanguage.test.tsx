import { fireEvent, render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { ReviewSection } from './ReviewSection';
import { QASection } from './QASection';
import { StarRating } from './StarRating';
import { LanguageProvider, useLanguage } from '@/components/providers/LanguageProvider';
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated', data: { user: { id: 'u1' } } }) }));
function Switch() { const { setLocale } = useLanguage(); return <button onClick={() => setLocale('ko')}>Switch</button>; }
it('translates review and inquiry empty states without refetching', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { reviews: [], reviewCount: 0, averageRating: null, questions: [], questionCount: 0, viewerIsAdmin: false } }) });
  vi.stubGlobal('fetch', request);
  render(<LanguageProvider initialLocale="en"><Switch /><ReviewSection productId="p1" /><QASection productId="p1" /></LanguageProvider>);
  expect(await screen.findByText('No reviews yet.')).toBeTruthy();
  expect(await screen.findByText('No questions yet.')).toBeTruthy();
  fireEvent.click(screen.getByText('Switch'));
  expect(screen.getByText('아직 리뷰가 없습니다.')).toBeTruthy();
  expect(screen.getByText('아직 문의가 없습니다.')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(2);
});
it('translates interactive rating labels in English', () => {
  render(<LanguageProvider initialLocale="en"><StarRating value={0} onChange={vi.fn()} /></LanguageProvider>);
  expect(screen.getByRole('button', { name: 'Rate 5 out of 5' })).toBeTruthy();
});
