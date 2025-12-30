/**
 * Route Guard Component
 * Protects routes that require authentication
 */

import type React from 'react';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  fallback = null,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { error: showError } = useToast();

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      logger.warn('Unauthorized access attempt to protected route', 'RouteGuard');
      showError('Please log in to access this feature');
    }
  }, [requireAuth, isLoading, isAuthenticated, showError]);

  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

