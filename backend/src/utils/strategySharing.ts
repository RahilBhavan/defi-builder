/**
 * Strategy Sharing Utilities (Backend)
 * Generates and validates signed tokens for strategy sharing
 */

import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SHARE_TOKEN_EXPIRES_IN = '30d'; // Share links expire after 30 days

// Strategy share token payload
export interface StrategyShareTokenPayload {
  strategy: {
    name: string;
    blocks: Array<{
      id: string;
      type: string;
      label: string;
      description: string;
      category: string;
      protocol: string;
      icon: string;
      params: Record<string, unknown>;
    }>;
    createdAt: number;
  };
  iat?: number;
  exp?: number;
}

// Strategy share data schema for validation
export const StrategyShareSchema = z.object({
  name: z.string().min(1).max(100),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      description: z.string(),
      category: z.string(),
      protocol: z.string(),
      icon: z.string(),
      params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    })
  ),
  createdAt: z.number(),
});

/**
 * Sanitize strategy name and description
 * Removes HTML tags and limits length
 */
export function sanitizeStrategyName(name: string): string {
  // Remove HTML tags
  const withoutHtml = name.replace(/<[^>]*>/g, '');
  // Remove potentially dangerous characters
  const sanitized = withoutHtml.replace(/[<>\"'&]/g, '');
  // Limit length
  return sanitized.slice(0, 100).trim();
}

export function sanitizeStrategyDescription(description: string | undefined): string {
  if (!description) return '';
  // Remove HTML tags
  const withoutHtml = description.replace(/<[^>]*>/g, '');
  // Remove potentially dangerous characters
  const sanitized = withoutHtml.replace(/[<>\"'&]/g, '');
  // Limit length
  return sanitized.slice(0, 500).trim();
}

/**
 * Validate and sanitize strategy data before sharing
 */
export function validateAndSanitizeStrategy(data: unknown): z.infer<typeof StrategyShareSchema> {
  // Parse and validate with Zod schema
  const parsed = StrategyShareSchema.parse(data);

  // Sanitize name and description
  const sanitized = {
    ...parsed,
    name: sanitizeStrategyName(parsed.name),
    blocks: parsed.blocks.map((block) => ({
      ...block,
      label: sanitizeStrategyName(block.label),
      description: sanitizeStrategyDescription(block.description),
      params: Object.fromEntries(
        Object.entries(block.params).map(([key, value]) => [
          sanitizeStrategyName(key), // Sanitize param keys
          typeof value === 'string' ? sanitizeStrategyName(value) : value, // Sanitize string values
        ])
      ),
    })),
  };

  return sanitized;
}

/**
 * Generate a signed JWT token for strategy sharing
 */
export function generateShareToken(strategy: z.infer<typeof StrategyShareSchema>): string {
  try {
    const sanitized = validateAndSanitizeStrategy(strategy);
    const payload: StrategyShareTokenPayload = {
      strategy: sanitized,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: SHARE_TOKEN_EXPIRES_IN });
  } catch (error) {
    throw new Error(`Failed to generate share token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify and parse a strategy share token
 * Returns null if invalid or expired
 */
export function verifyShareToken(token: string): StrategyShareTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as StrategyShareTokenPayload;
    
    // Validate the strategy data structure
    if (!decoded.strategy || !decoded.strategy.blocks) {
      return null;
    }

    // Re-validate with Zod schema
    const validated = validateAndSanitizeStrategy(decoded.strategy);
    
    return {
      ...decoded,
      strategy: validated,
    };
  } catch (error) {
    // Token is invalid, expired, or malformed
    return null;
  }
}

