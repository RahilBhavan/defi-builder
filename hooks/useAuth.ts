import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';
import { useWallet } from './useWallet';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useWallet();

  // Type assertion needed due to tRPC version mismatch (backend v10 vs frontend v11)
  // TODO: Upgrade backend to @trpc/server v11 to match frontend and remove type assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authRouter = trpc.auth as any;
  
  const loginMutation = authRouter.login.useMutation({
    onSuccess: () => {
      // Token is set via httpOnly cookie, no need to store in localStorage
      setIsAuthenticated(true);
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

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
