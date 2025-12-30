import { useCallback, useEffect, useRef, useState } from 'react';
import { trpc } from '../utils/trpc';
import { logger } from '../utils/logger';
import { useWallet } from './useWallet';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useWallet();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      // Token is set via httpOnly cookie, no need to store in localStorage
      setIsAuthenticated(true);
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setIsAuthenticated(false);
    },
    onError: (error: unknown) => {
      logger.error('Logout error', error instanceof Error ? error : new Error(String(error)), 'Auth');
    },
  });

  const login = useCallback(() => {
    if (!address || !isConnected) {
      return;
    }

    setIsLoading(true);
    loginMutation.mutate(
      { walletAddress: address },
      {
        onSettled: () => {
          setIsLoading(false);
        },
      }
    );
  }, [address, isConnected, loginMutation]);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // Check authentication status using me query
  const { data: userData } = trpc.auth.me.useQuery(undefined, {
    enabled: isConnected,
    retry: false,
  });

  // Token refresh mechanism
  const refreshMutation = trpc.auth.refresh.useMutation();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const SESSION_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours
  const REFRESH_INTERVAL = 60 * 60 * 1000; // Refresh every hour

  // Auto-refresh token
  useEffect(() => {
    if (isAuthenticated && userData) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up token refresh interval
      refreshIntervalRef.current = setInterval(() => {
        refreshMutation.mutate(undefined, {
          onError: () => {
            // Refresh failed - logout user
            setIsAuthenticated(false);
            logout();
          },
        });
      }, REFRESH_INTERVAL);

      // Set session timeout
      const timeoutId = setTimeout(() => {
        logger.warn('Session timeout - logging out', 'Auth');
        setIsAuthenticated(false);
        logout();
      }, SESSION_TIMEOUT);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [isAuthenticated, userData, refreshMutation, logout]);

  useEffect(() => {
    if (userData) {
      setIsAuthenticated(true);
    } else if (!isConnected) {
      setIsAuthenticated(false);
    }
  }, [userData, isConnected]);

  return {
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
  };
}
