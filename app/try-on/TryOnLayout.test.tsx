import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TryOnContent } from './TryOnContent';

vi.mock('@/components/providers/LanguageProvider', () => ({ useLanguage: () => ({ locale: 'en' }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

it('reserves layout space for the generate action instead of overlaying category controls', () => {
  // Given: the mobile studio has its category controls and generate action mounted.
  render(<TryOnContent products={[]} />);
  // When: the generate action occupies its wardrobe footer.
  const actionBar = screen.getByRole('button', { name: 'Generate Try-On' }).parentElement;
  // Then: it participates in normal flex layout, leaving controls independently clickable.
  expect(actionBar?.className.split(' ')).not.toContain('absolute');
  expect(actionBar?.className.split(' ')).toContain('shrink-0');
});
