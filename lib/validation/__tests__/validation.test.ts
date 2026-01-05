/**
 * Tests for validation utilities
 */

import { describe, expect, it } from 'vitest';
import {
  validateEnum,
  validateJsonObject,
  validateNumberRange,
  validateStringLength,
} from '../index';

describe('validateNumberRange', () => {
  it('should validate number within range', () => {
    expect(validateNumberRange(5, 0, 10)).toBe(null);
    expect(validateNumberRange(0, 0, 10)).toBe(null);
    expect(validateNumberRange(10, 0, 10)).toBe(null);
  });

  it('should reject number outside range', () => {
    expect(validateNumberRange(-1, 0, 10)).toBeTruthy(); // Error message
    expect(validateNumberRange(11, 0, 10)).toBeTruthy(); // Error message
  });

  it('should handle inclusive bounds', () => {
    expect(validateNumberRange(0, 0, 10)).toBe(null);
    expect(validateNumberRange(10, 0, 10)).toBe(null);
  });
});

describe('validateStringLength', () => {
  it('should validate string within length', () => {
    expect(validateStringLength('hello', 0, 10)).toBe(null);
    expect(validateStringLength('', 0, 10)).toBe(null);
    expect(validateStringLength('1234567890', 0, 10)).toBe(null);
  });

  it('should reject string outside length', () => {
    expect(validateStringLength('hello world', 0, 10)).toBeTruthy(); // Error message
  });

  it('should handle min length', () => {
    expect(validateStringLength('hello', 5, 10)).toBe(null);
    expect(validateStringLength('hi', 5, 10)).toBeTruthy(); // Error message
  });
});

describe('validateJsonObject', () => {
  it('should validate valid JSON object', () => {
    expect(validateJsonObject('{"key":"value"}')).toBe(null);
    expect(validateJsonObject('{}')).toBe(null);
    expect(validateJsonObject('{"nested":{"key":"value"}}')).toBe(null);
  });

  it('should reject non-objects', () => {
    expect(validateJsonObject('"string"')).toBeTruthy(); // Error message
    expect(validateJsonObject('123')).toBeTruthy(); // Error message
    expect(validateJsonObject('null')).toBeTruthy(); // Error message
    expect(validateJsonObject('[]')).toBeTruthy(); // Error message
  });

  it('should reject invalid JSON', () => {
    expect(validateJsonObject('invalid json')).toBeTruthy(); // Error message
    expect(validateJsonObject('{key: value}')).toBeTruthy(); // Error message
  });
});

describe('validateEnum', () => {
  it('should validate value in enum', () => {
    expect(validateEnum('value1', ['value1', 'value2', 'value3'])).toBe(null);
    expect(validateEnum('value2', ['value1', 'value2', 'value3'])).toBe(null);
  });

  it('should reject value not in enum', () => {
    expect(validateEnum('invalid', ['value1', 'value2'])).toBeTruthy(); // Error message
    expect(validateEnum('', ['value1', 'value2'])).toBeTruthy(); // Error message
  });
});
