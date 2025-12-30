/**
 * Skeleton Loader Component
 * Provides loading placeholders for async content
 */

import type React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false,
  variant = 'rectangular',
}) => {
  const baseClasses = 'animate-pulse bg-gray-200';
  const roundedClass = rounded ? 'rounded' : '';
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${roundedClass} ${className}`}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  );
};

/**
 * Skeleton for table rows
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={20} />
        </td>
      ))}
    </tr>
  );
};

/**
 * Skeleton for card/block items
 */
export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white border border-gray-300 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton height={100} className="mb-2" />
      <div className="flex gap-2">
        <Skeleton variant="text" width={80} />
        <Skeleton variant="text" width={80} />
      </div>
    </div>
  );
};

/**
 * Skeleton for chart/line graph
 */
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="w-full h-64 bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between mb-4">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={80} />
      </div>
      <div className="relative h-full">
        {/* Simulate chart lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 left-0 right-0 flex items-end justify-around"
            style={{ height: `${100 - i * 20}%` }}
          >
            {Array.from({ length: 10 }).map((_, j) => (
              <Skeleton
                key={j}
                width={8}
                height={`${Math.random() * 60 + 20}%`}
                className="rounded-t"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

