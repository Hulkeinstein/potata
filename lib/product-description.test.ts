import { describe, expect, it } from 'vitest';
import { resolveProductDescription, parseDescriptionField } from './product-description';

describe('product description language', () => {
  it('selects the requested language when both are present', () => {
    expect(resolveProductDescription({ descriptionKo: '한국어', descriptionEn: 'English' }, 'ko')).toEqual({ text: '한국어', language: 'ko', fallback: false });
  });
  it('reports the actual source language when translation is absent', () => {
    expect(resolveProductDescription({ descriptionEn: 'English' }, 'ko')).toEqual({ text: 'English', language: 'en', fallback: true });
  });
  it('does not invent the language of a preserved legacy description', () => {
    expect(resolveProductDescription({ description: 'legacy' }, 'en')).toEqual({ text: 'legacy', language: null, fallback: true });
  });
  it('treats whitespace as missing and returns an empty result', () => {
    expect(resolveProductDescription({ descriptionKo: '   ' }, 'ko')).toEqual({ text: null, language: null, fallback: false });
  });
  it('rejects non-string and oversized input instead of coercion', () => {
    expect(parseDescriptionField(42)).toEqual({ valid: false });
    expect(parseDescriptionField('a'.repeat(10001))).toEqual({ valid: false });
  });
  it('normalizes blank input to null while preserving line breaks', () => {
    expect(parseDescriptionField('  ')).toEqual({ valid: true, value: null });
    expect(parseDescriptionField('  line\nline  ')).toEqual({ valid: true, value: 'line\nline' });
  });
});
