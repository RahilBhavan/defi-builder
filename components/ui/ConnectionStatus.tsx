/**
 * Connection Status Indicator
 * Shows WebSocket connection status with visual feedback
 */

import { Loader2, Wifi, WifiOff } from 'lucide-react';
import type React from 'react';
import { useWebSocketStatus } from '../../hooks/usePriceFeed';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showLabel = true,
}) => {
  const status = useWebSocketStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          label: 'Connected',
        };
      case 'connecting':
      case 'reconnecting':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          label: status === 'connecting' ? 'Connecting...' : 'Reconnecting...',
          animate: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          label: 'Disconnected',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 ${config.bgColor} px-3 py-1.5 rounded-full ${className}`}
      title={config.label}
    >
      <Icon
        size={16}
        className={config.color}
        style={config.animate ? { animation: 'spin 1s linear infinite' } : undefined}
      />
      {showLabel && (
        <span className={`text-xs font-mono font-bold ${config.color}`}>{config.label}</span>
      )}
    </div>
  );
};
