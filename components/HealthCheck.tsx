import type React from 'react';
import { trpc } from '../utils/trpc';

export const HealthCheck: React.FC = () => {
  // Type assertion needed due to tRPC version mismatch (backend v10 vs frontend v11)
  // TODO: Upgrade backend to @trpc/server v11 to match frontend and remove type assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const healthRouter = trpc.health as any;
  const { data, isLoading, error } = healthRouter.useQuery();

  if (isLoading) return <div>Checking backend...</div>;
  if (error) return <div>Backend error: {error.message}</div>;

  return (
    <div className="p-4 bg-green-100 text-green-800">
      Backend Status: {data?.status} | Redis: {data?.redis}
    </div>
  );
};
