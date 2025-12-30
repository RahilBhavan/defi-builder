import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';
import { useWallet } from './useWallet';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useWallet();

  // Type assertion needed due to tRPC version mismatch
  const authRouter = trpc.auth as any;
  const loginMutation = authRouter?.login?.useMutation?.({
    onSuccess: (data: { token?: string; user?: unknown }) => {
      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setIsAuthenticated(true);
      }
    },
    onError: (error: unknown) => {
      // Error logged by tRPC client
      // logger.error('Login error', error instanceof Error ? error : new Error(String(error)), 'Auth');
      setIsAuthenticated(false);
    },
  }) || { mutate: () => {}, isPending: false };

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

  // Check if user is authenticated on mount and when wallet connects
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, [address, isConnected]); // Re-check when wallet connects/disconnects

  return {
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending,
    login,
  };
}
