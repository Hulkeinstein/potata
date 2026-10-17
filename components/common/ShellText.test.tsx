import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { ShellText } from './ShellText';
describe('fallback language', () => {
  it('shows Korean missing-page and loading labels', () => {
    render(<LanguageProvider initialLocale="ko"><h1><ShellText name="notFound" /></h1><ShellText name="loading" /></LanguageProvider>);
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeTruthy();
    expect(screen.getByText('불러오는 중')).toBeTruthy();
  });
  it('shows English retry text', () => {
    render(<LanguageProvider initialLocale="en"><button><ShellText name="retry" /></button></LanguageProvider>);
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeTruthy();
  });
});
