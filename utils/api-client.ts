import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc',
    }),
  ],
});
