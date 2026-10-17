// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Footer } from '@/components/ui/Footer';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { languageCookie, parseLocale } from '@/lib/i18n/locale';
import { sharedMessages } from '@/lib/i18n/shared-messages';
import { K_TrendSection } from '@/components/ui/K_TrendSection';

afterEach(cleanup);
describe('Footer language preference', () => {
  it('falls back to English for missing or invalid input', () => {
    expect(parseLocale(undefined)).toBe('en');
    expect(parseLocale('fr')).toBe('en');
    expect(parseLocale('ko')).toBe('ko');
  });
  it('writes a language-only bounded cookie with HTTPS security', () => {
    expect(languageCookie('ko', true)).toBe('potata-language=ko; Path=/; SameSite=Lax; Max-Age=31536000; Secure');
    expect(languageCookie('en', false)).not.toContain('Secure');
    expect(Object.keys(sharedMessages.en)).toEqual(Object.keys(sharedMessages.ko));
  });
  it('translates editorial cards without changing search targets', () => {
    render(<LanguageProvider initialLocale="ko"><K_TrendSection /></LanguageProvider>);
    expect(screen.getByText('고프코어 필수 아이템').closest('a')?.getAttribute('href')).toBe('/search?q=Gorpcore%20Essentials');
    expect(screen.getByText('도시 탐험가를 위한 기능적이고 세련된 스타일.')).toBeTruthy();
  });
  it('changes chrome without discarding an unsaved input', () => {
    render(<LanguageProvider initialLocale="en"><input aria-label="draft" defaultValue="keep me" /><Footer /></LanguageProvider>);
    const select = screen.getByRole('combobox', { name: 'Language / 언어' });
    fireEvent.change(select, { target: { value: 'ko' } });
    expect(screen.getByText('신상품')).toBeTruthy();
    expect(screen.getByRole('textbox').getAttribute('value')).toBe('keep me');
    expect(document.documentElement.lang).toBe('ko');
    expect(document.cookie).toContain('potata-language=ko');
    fireEvent.change(select, { target: { value: 'en' } });
    expect(screen.getByText('New Arrivals')).toBeTruthy();
  });
});
