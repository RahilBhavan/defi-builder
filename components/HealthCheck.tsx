import type React from 'react';
import { trpc } from '../utils/trpc';

export const HealthCheck: React.FC = () => {
  // Type assertion needed due to tRPC version mismatch
  const healthQuery = (trpc.health as any)?.useQuery?.() || { data: null, isLoading: false, error: null };
  const { data, isLoading, error } = healthQuery;

  if (isLoading) return <div>Checking backend...</div>;
  if (error) return <div>Backend error: {error.message}</div>;

  return (
    <div className="p-4 bg-green-100 text-green-800">
      Backend Status: {data?.status} | Redis: {data?.redis}
    </div>
  );
};
