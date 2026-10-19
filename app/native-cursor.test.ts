// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('keeps the native cursor when the shared root layout renders', () => {
  // Given / When
  const layout = readFileSync(resolve('app/layout.tsx'), 'utf8');
  // Then
  expect(layout).not.toContain('CustomCursor');
});
it('does not hide the native cursor through a fine-pointer body class', () => {
  // Given / When
  const styles = readFileSync(resolve('app/globals.css'), 'utf8');
  // Then
  expect(styles).not.toMatch(/cursor\s*:\s*none/);
  expect(styles).not.toContain('custom-cursor-active');
});
it('removes the unused animated cursor implementation', () => {
  // Given / When / Then
  expect(existsSync(resolve('components/ui/CustomCursor.tsx'))).toBe(false);
});
