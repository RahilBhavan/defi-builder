/**
 * Tests for JSON storage utilities
 */

import { describe, expect, it } from 'vitest';
import { safeJsonParse, safeJsonStringify } from '../json';

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
    expect(safeJsonParse('123')).toBe(123);
    expect(safeJsonParse('true')).toBe(true);
    expect(safeJsonParse('null')).toBe(null);
  });

  it('should return null for invalid JSON', () => {
    expect(safeJsonParse('invalid json')).toBe(null);
    expect(safeJsonParse('{key: value}')).toBe(null);
    expect(safeJsonParse('')).toBe(null);
  });

  it('should handle default value', () => {
    expect(safeJsonParse('invalid', {})).toEqual({});
    expect(safeJsonParse('invalid', [])).toEqual([]);
    expect(safeJsonParse('invalid', 'default')).toBe('default');
  });
});

describe('safeJsonStringify', () => {
  it('should stringify valid objects', () => {
    expect(safeJsonStringify({ key: 'value' })).toBe('{"key":"value"}');
    expect(safeJsonStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(safeJsonStringify(123)).toBe('123');
  });

  it('should handle circular references', () => {
    const obj: any = { key: 'value' };
    obj.circular = obj;
    expect(safeJsonStringify(obj)).toBe(null);
  });

  it('should handle undefined values', () => {
    expect(safeJsonStringify({ key: undefined })).toBe('{}');
  });

  it('should return null for non-serializable values', () => {
    const func = () => {};
    expect(safeJsonStringify({ func })).toBe(null);
  });
});
