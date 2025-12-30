/**
 * Common validation utilities
 * Consolidates validation logic used across multiple components
 */

/**
 * Validate a number is within a range
 */
export function validateNumberRange(
  value: number | string,
  min?: number,
  max?: number,
  fieldName = 'Value'
): string | null {
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;

  if (Number.isNaN(numValue)) {
    return `${fieldName} must be a number`;
  }

  if (min !== undefined && numValue < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (max !== undefined && numValue > max) {
    return `${fieldName} must be at most ${max}`;
  }

  return null;
}

/**
 * Validate a string length
 */
export function validateStringLength(
  value: string,
  minLength?: number,
  maxLength?: number,
  fieldName = 'Value'
): string | null {
  if (minLength !== undefined && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }

  return null;
}

/**
 * Validate a JSON object structure
 */
export function validateJsonObject(
  jsonString: string,
  options: {
    required?: boolean;
    validateValues?: (value: unknown) => boolean;
    fieldName?: string;
  } = {}
): string | null {
  const { required = false, validateValues, fieldName = 'JSON' } = options;

  if (!jsonString.trim()) {
    return required ? `${fieldName} is required` : null;
  }

  try {
    const parsed = JSON.parse(jsonString);

    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      return `${fieldName} must be a valid JSON object`;
    }

    if (validateValues) {
      for (const [key, value] of Object.entries(parsed)) {
        if (!validateValues(value)) {
          return `${fieldName} validation failed for key "${key}"`;
        }
      }
    }

    return null;
  } catch (error) {
    return `${fieldName} is not valid JSON: ${error instanceof Error ? error.message : 'Parse error'}`;
  }
}

/**
 * Validate a value is in a list of allowed values
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName = 'Value'
): string | null {
  if (!allowedValues.includes(value as T)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }
  return null;
}

/**
 * Validate a required field
 */
export function validateRequired(
  value: unknown,
  fieldName = 'Field'
): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

