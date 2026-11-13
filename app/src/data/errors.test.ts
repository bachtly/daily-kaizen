import { describe, expect, it } from 'vitest';
import { mapError, VALIDATION_KEYS } from './errors';

describe('mapError', () => {
  it('maps the next_change length check by its constraint name', () => {
    const msg = 'new row for relation "weekly_reviews" violates check constraint "weekly_reviews_next_change_len"';
    expect(mapError({ code: '23514', message: msg }, 400)).toBe('next_change_too_long');
  });
  it('maps each validation key from a check violation message', () => {
    for (const k of VALIDATION_KEYS) {
      const msg = `new row for relation "entries" violates check constraint "${k}"`;
      expect(mapError({ code: '23514', message: msg }, 400)).toBe(k);
    }
  });
  it('maps a raised message equal to the key', () => {
    expect(mapError({ code: 'P0001', message: 'category_not_active' }, 400)).toBe('category_not_active');
  });
  it('maps session loss', () => {
    expect(mapError({ code: 'PGRST301' }, 401)).toBe('session_lost');
    expect(mapError({ code: 'PGRST303' }, 400)).toBe('session_lost');
    expect(mapError({ message: 'JWT expired' }, 401)).toBe('session_lost');
  });
  it('maps 5xx and unrecognised 4xx to server', () => {
    expect(mapError({ message: 'boom' }, 503)).toBe('server');
    expect(mapError({ message: 'other' }, 400)).toBe('server');
    expect(mapError({ message: 'denied' }, 403)).toBe('server');
  });
  it('maps no response to unknown', () => {
    expect(mapError({ message: 'TypeError: Failed to fetch' }, 0)).toBe('unknown');
  });
});
