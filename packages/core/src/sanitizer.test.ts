import { describe, it, expect } from 'vitest';
import { sanitizeFtsQuery } from './sanitizer.js';

describe('sanitizeFtsQuery', () => {
  it('quotes alphanumeric tokens safely', () => {
    expect(sanitizeFtsQuery('hello world')).toBe('"hello" "world"');
  });

  it('strips FTS5 punctuation and operators', () => {
    expect(sanitizeFtsQuery('NEAR(foo, bar) *^')).toBe('"NEAR" "foo" "bar"');
  });

  it('handles empty and whitespace input', () => {
    expect(sanitizeFtsQuery('')).toBe('""');
    expect(sanitizeFtsQuery('   ')).toBe('""');
    expect(sanitizeFtsQuery('!@#$%^&*()')).toBe('""');
  });
});
