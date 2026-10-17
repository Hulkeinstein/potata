import { fireEvent, render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { UserSettingsForm } from './UserSettingsForm';
import { LanguageProvider, useLanguage } from '@/components/providers/LanguageProvider';
vi.mock('next-auth/react', () => ({ useSession: () => ({ update: vi.fn() }) }));
function Switch() { const { setLocale } = useLanguage(); return <button onClick={() => setLocale('ko')}>Switch</button>; }
it('changes settings chrome without losing unsaved size or refetching', async () => {
  const request = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { preferredSize: 'M', aiCoordinatorEnabled: true, heightCm: 170, weightKg: 60 } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { avatar: null } }) });
  vi.stubGlobal('fetch', request);
  render(<LanguageProvider initialLocale="en"><Switch /><UserSettingsForm /></LanguageProvider>);
  const size = await screen.findByLabelText('Preferred size');
  fireEvent.change(size, { target: { value: 'L' } });
  fireEvent.click(screen.getByText('Switch'));
  const selected = screen.getByLabelText('선호 사이즈');
  expect(selected instanceof HTMLSelectElement && selected.value).toBe('L');
  expect(request).toHaveBeenCalledTimes(2);
});
