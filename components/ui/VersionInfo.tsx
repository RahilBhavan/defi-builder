import { Info } from 'lucide-react';
import type React from 'react';
import { getVersionMetadata, CURRENT_VERSION } from '../../lib/storage/services/versioning';
import { Button } from './Button';

interface VersionInfoProps {
  className?: string;
}

/**
 * Component to display version information and migration status
 */
export const VersionInfo: React.FC<VersionInfoProps> = ({ className = '' }) => {
  const metadata = getVersionMetadata();

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 font-mono ${className}`}>
      <Info size={12} />
      <span>v{CURRENT_VERSION}</span>
      {metadata && metadata.migrationCount > 0 && (
        <span className="text-orange">({metadata.migrationCount} migration{metadata.migrationCount > 1 ? 's' : ''})</span>
      )}
    </div>
  );
};

