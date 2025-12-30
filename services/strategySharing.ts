/**
 * Secure Strategy Sharing Service
 * Replaces insecure base64 encoding with signed tokens
 */

import { z } from 'zod';
import type { Strategy } from '../types';

// Strategy data schema for validation
const StrategyShareSchema = z.object({
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

export type StrategyShareData = z.infer<typeof StrategyShareSchema>;

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
export function validateAndSanitizeStrategy(strategy: Strategy): StrategyShareData {
  // Sanitize name and description
  const sanitized: StrategyShareData = {
    name: sanitizeStrategyName(strategy.name),
    blocks: strategy.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      label: block.label,
      description: block.description,
      category: block.category,
      protocol: block.protocol,
      icon: block.icon,
      params: Object.fromEntries(
        Object.entries(block.params).map(([key, value]) => [
          sanitizeStrategyName(key), // Sanitize param keys
          typeof value === 'string' ? sanitizeStrategyName(value) : value, // Sanitize string values
        ])
      ),
    })),
    createdAt: strategy.createdAt,
  };

  // Validate with Zod schema
  return StrategyShareSchema.parse(sanitized);
}

/**
 * Generate a shareable token for strategy using backend JWT signing
 * Uses backend endpoint for secure token generation
 */
import { logger } from '../utils/logger';

/**
 * Generate share token via backend (secure JWT signing)
 */
export async function generateShareToken(strategy: Strategy): Promise<string> {
  try {
    const sanitized = validateAndSanitizeStrategy(strategy);
    
    // Call backend to generate signed JWT token
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/trpc/sharing.generateShareToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        strategy: sanitized,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    // tRPC returns { result: { data: { token: ... } } }
    if (data?.result?.data?.token) {
      return data.result.data.token;
    }

    throw new Error('Invalid response from backend');
  } catch (error) {
    logger.error('Failed to generate share token', error instanceof Error ? error : new Error(String(error)), 'StrategySharing');
    throw new Error('Failed to generate share token: Invalid strategy data or backend unavailable');
  }
}

/**
 * Parse and validate a share token via backend
 * Returns null if invalid or expired
 */
export async function parseShareToken(token: string): Promise<StrategyShareData | null> {
  try {
    // Call backend to verify and parse JWT token
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/trpc/sharing.parseShareToken?input=${encodeURIComponent(JSON.stringify({ token }))}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // tRPC returns { result: { data: ... } }
    if (data?.result?.data) {
      // Validate with Zod schema
      const validated = StrategyShareSchema.parse(data.result.data);
      return validated;
    }

    return null;
  } catch (error) {
    logger.error('Invalid share token', error instanceof Error ? error : new Error(String(error)), 'StrategySharing');
    return null;
  }
}

/**
 * Generate shareable link with token
 */
export async function generateShareLink(strategy: Strategy): Promise<string> {
  const token = await generateShareToken(strategy);
  return `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(token)}`;
}

