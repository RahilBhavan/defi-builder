/**
 * Audit Logging Utility
 * Provides comprehensive audit trail for security-sensitive operations
 * 
 * Audit logs track:
 * - User authentication events (login, logout, token refresh)
 * - API key access and rotation
 * - Strategy creation, modification, deletion
 * - Administrative actions
 * - Security events (failed auth, rate limiting, etc.)
 */

import { logger } from './logger';
import prisma from '../db/client';

export enum AuditEventType {
  // Authentication
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_TOKEN_REFRESH = 'user.token_refresh',
  USER_AUTH_FAILED = 'user.auth_failed',
  
  // API Keys & Secrets
  API_KEY_ACCESSED = 'api_key.accessed',
  API_KEY_ROTATED = 'api_key.rotated',
  SECRET_SYNCED = 'secret.synced',
  
  // Strategy Operations
  STRATEGY_CREATED = 'strategy.created',
  STRATEGY_UPDATED = 'strategy.updated',
  STRATEGY_DELETED = 'strategy.deleted',
  STRATEGY_SHARED = 'strategy.shared',
  
  // Security Events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  CSRF_TOKEN_MISMATCH = 'security.csrf_mismatch',
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  
  // System Events
  SECRET_ROTATION_TRIGGERED = 'system.secret_rotation_triggered',
  DEPENDENCY_SCAN_COMPLETED = 'system.dependency_scan_completed',
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  walletAddress?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log an audit event
 * Stores audit logs in database for compliance and security monitoring
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to structured logger
    logger.info(
      `Audit: ${entry.eventType}`,
      'Audit',
      {
        userId: entry.userId,
        walletAddress: entry.walletAddress,
        success: entry.success,
        metadata: entry.metadata,
      }
    );

    // Store in database for audit trail
    try {
      await prisma.auditLog.create({
        data: {
          eventType: entry.eventType,
          userId: entry.userId,
          walletAddress: entry.walletAddress,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata || {},
          success: entry.success,
          errorMessage: entry.errorMessage,
          timestamp: new Date(),
        },
      });
    } catch (dbError) {
      // Non-critical - log but don't fail
      logger.warn('Failed to write audit log to database', 'Audit', { error: dbError });
    }
  } catch (error) {
    // Never fail on audit logging errors
    logger.error('Audit logging failed', error instanceof Error ? error : new Error(String(error)), 'Audit');
  }
}

/**
 * Create audit log entry for authentication events
 */
export function auditAuth(
  eventType: AuditEventType.USER_LOGIN | AuditEventType.USER_LOGOUT | AuditEventType.USER_TOKEN_REFRESH | AuditEventType.USER_AUTH_FAILED,
  options: {
    userId?: string;
    walletAddress?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }
): void {
  auditLog({
    eventType,
    userId: options.userId,
    walletAddress: options.walletAddress,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    success: options.success,
    errorMessage: options.errorMessage,
  }).catch(() => {
    // Silently fail - audit logging should never break the application
  });
}

/**
 * Create audit log entry for strategy operations
 */
export function auditStrategy(
  eventType: AuditEventType.STRATEGY_CREATED | AuditEventType.STRATEGY_UPDATED | AuditEventType.STRATEGY_DELETED | AuditEventType.STRATEGY_SHARED,
  options: {
    userId?: string;
    walletAddress?: string;
    strategyId: string;
    strategyName?: string;
    ipAddress?: string;
    success: boolean;
    metadata?: Record<string, unknown>;
  }
): void {
  auditLog({
    eventType,
    userId: options.userId,
    walletAddress: options.walletAddress,
    ipAddress: options.ipAddress,
    success: options.success,
    metadata: {
      strategyId: options.strategyId,
      strategyName: options.strategyName,
      ...options.metadata,
    },
  }).catch(() => {
    // Silently fail
  });
}

/**
 * Create audit log entry for security events
 */
export function auditSecurity(
  eventType: AuditEventType.RATE_LIMIT_EXCEEDED | AuditEventType.CSRF_TOKEN_MISMATCH | AuditEventType.UNAUTHORIZED_ACCESS,
  options: {
    userId?: string;
    walletAddress?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  auditLog({
    eventType,
    userId: options.userId,
    walletAddress: options.walletAddress,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    success: false, // Security events are always failures
    metadata: options.metadata,
  }).catch(() => {
    // Silently fail
  });
}

/**
 * Create audit log entry for API key operations
 */
export function auditApiKey(
  eventType: AuditEventType.API_KEY_ACCESSED | AuditEventType.API_KEY_ROTATED | AuditEventType.SECRET_SYNCED,
  options: {
    keyName: string;
    success: boolean;
    metadata?: Record<string, unknown>;
  }
): void {
  auditLog({
    eventType,
    success: options.success,
    metadata: {
      keyName: options.keyName,
      ...options.metadata,
    },
  }).catch(() => {
    // Silently fail
  });
}

