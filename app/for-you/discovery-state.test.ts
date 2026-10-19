import { describe, expect, it, vi } from 'vitest';
import { initialDiscovery, parseDiscovery, storageRead, storageWrite } from './discovery-state';

describe('discovery persistence boundary', () => {
  it.each(['null', '[]', 'false', '"bad"', '{'])('uses defaults for malformed state %s', value => {
    // Given / When / Then
    expect(parseDiscovery(value)).toEqual(initialDiscovery);
  });
  it('bounds category, identity and photo values independently', () => {
    // Given
    const saved = JSON.stringify({ category: 'invalid', productId: 'x'.repeat(201), photo: -2 });
    // When / Then
    expect(parseDiscovery(saved)).toEqual(initialDiscovery);
  });
  it('retains a valid category, product and photo', () => {
    // Given
    const state = { category: 'Top', productId: 'one', photo: 2 };
    // When / Then
    expect(parseDiscovery(JSON.stringify(state))).toEqual(state);
  });
  it('retains valid per-product photos and rejects malformed entries', () => {
    // Given
    const saved = JSON.stringify({ photos: { first: 2, second: -1, third: '1' } });
    // When / Then
    expect(parseDiscovery(saved).photos).toEqual({ first: 2 });
  });
  it('parses bounded brand preferences without trusting stored objects', () => {
    // Given
    const saved = JSON.stringify({ feedId: 'javascript:alert(1)', dismissedBrands: ['Alpha', null, {}, 'A', 'x'.repeat(101), 'Alpha'] });
    // When
    const state = parseDiscovery(saved);
    // Then
    expect(state.feedId).toBeUndefined();
    expect(state.dismissedBrands).toEqual(['Alpha']);
  });
  it('falls back when browser policy blocks storage access', () => {
    // Given
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    // When / Then
    expect(storageRead('localStorage', 'mode')).toBeNull();
    read.mockRestore();
  });
  it('keeps browsing working when storage quota is exceeded', () => {
    // Given
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    // When / Then
    expect(() => storageWrite('sessionStorage', 'position', '{}')).not.toThrow();
    write.mockRestore();
  });
});
