import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc',
      // Cookies are automatically sent with credentials: 'include'
      // No need to manually add token to headers - backend reads from httpOnly cookie
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include', // Include cookies for authentication
        });
      },
    }),
  ],
});
