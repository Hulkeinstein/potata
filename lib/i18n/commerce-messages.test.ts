import { describe, expect, it } from 'vitest';
import { getCommerceMessages, removeCartLabel } from './commerce-messages';
import { getShellMessages } from './shell-messages';
describe('commerce and fallback message contracts', () => {
  it('has complete nonempty English and Korean commerce keys', () => {
    const english = getCommerceMessages('en');
    const korean = getCommerceMessages('ko');
    expect(Object.keys(english).sort()).toEqual(Object.keys(korean).sort());
    for (const value of [...Object.values(english), ...Object.values(korean)]) expect(value.trim()).not.toBe('');
  });
  it('preserves product names in localized remove labels', () => {
    expect(removeCartLabel('ko', 'Original Product')).toBe('Original Product 삭제');
    expect(removeCartLabel('en', 'Original Product')).toBe('Remove Original Product');
  });
  it('has complete nonempty fallback keys', () => {
    expect(Object.keys(getShellMessages('en')).sort()).toEqual(Object.keys(getShellMessages('ko')).sort());
    for (const value of Object.values(getShellMessages('ko'))) expect(value.trim()).not.toBe('');
  });
});
