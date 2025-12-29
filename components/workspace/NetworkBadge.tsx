import React from 'react';

export const NetworkBadge: React.FC = () => {
  return (
    <div className="fixed top-6 right-20 px-4 py-2 bg-white border border-gray-300 text-xs font-mono z-40 flex items-center gap-2 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
      <span className="uppercase font-bold">SEPOLIA</span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">0x1234...5678</span>
    </div>
  );
};
