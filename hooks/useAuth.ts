import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';
import { useWallet } from './useWallet';

/**
 * Type-safe access to auth router
 * Uses type assertion due to tRPC v10/v11 version mismatch
 * TODO: Remove when backend is upgraded to @trpc/server v11
 */
type AuthRouter = typeof trpc.auth;

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useWallet();

  // Type assertion needed due to tRPC version mismatch (backend v10 vs frontend v11)
  // TODO: Upgrade backend to @trpc/server v11 to match frontend and remove type assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authRouter = trpc.auth as any;
  
  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const loginMutation = authRouter.login.useMutation({
    onSuccess: () => {
      // Token is set via httpOnly cookie, no need to store in localStorage
      setIsAuthenticated(true);
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const logoutMutation = authRouter.logout.useMutation({
    onSuccess: () => {
      setIsAuthenticated(false);
    },
    onError: (error: unknown) => {
      console.error('Logout error:', error);
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
  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const { data: userData } = authRouter.me.useQuery(undefined, {
    enabled: isConnected,
    retry: false,
  });

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
