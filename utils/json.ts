/**
 * Safe JSON parsing and stringifying utilities
 * Provides consistent error handling across the application
 */

/**
 * Safely parse JSON string with error handling
 * @param jsonString - The JSON string to parse
 * @param fallback - Value to return if parsing fails (default: null)
 * @returns Parsed object or fallback value
 */
export function safeJsonParse<T = unknown>(jsonString: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Safely stringify an object to JSON
 * @param value - The value to stringify
 * @param fallback - String to return if stringifying fails (default: '{}')
 * @returns JSON string or fallback value
 */
export function safeJsonStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('JSON stringify error:', error);
    return fallback;
  }
}

/**
 * Parse JSON with validation using a Zod schema
 * @param jsonString - The JSON string to parse
 * @param schema - Zod schema to validate against
 * @param fallback - Value to return if parsing/validation fails
 * @returns Parsed and validated object or fallback value
 */
export function safeJsonParseWithSchema<T>(
  jsonString: string,
  schema: { parse: (data: unknown) => T; safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } },
  fallback: T | null = null
): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    const result = schema.safeParse(parsed);
    if (result.success && result.data) {
      return result.data;
    }
    console.error('Schema validation failed:', result.error);
    return fallback;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}

