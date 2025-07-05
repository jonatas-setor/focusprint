'use client';

import { useRealtime } from '@/contexts/realtime-context';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface RealtimeStatusProps {
  showDetails?: boolean;
  className?: string;
}

export default function RealtimeStatus({ showDetails = false, className = '' }: RealtimeStatusProps) {
  const {
    isConnected,
    connectionState,
    isOnline,
    reconnectAttempts,
    error,
    reconnect
  } = useRealtime();

  const getStatusIcon = () => {
    if (!isOnline) {
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }

    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }

    switch (connectionState) {
      case 'OPEN':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CONNECTING':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'CLOSING':
      case 'CLOSED':
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (error) return 'Error';

    switch (connectionState) {
      case 'OPEN':
        return 'Connected';
      case 'CONNECTING':
        return reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts})` : 'Connecting...';
      case 'CLOSING':
        return 'Disconnecting...';
      case 'CLOSED':
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-gray-600 bg-gray-50 border-gray-200';
    if (error) return 'text-red-600 bg-red-50 border-red-200';

    switch (connectionState) {
      case 'OPEN':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'CONNECTING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'CLOSING':
      case 'CLOSED':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`} title={getStatusText()}>
        {getStatusIcon()}
        {showDetails && <span className="text-sm">{getStatusText()}</span>}
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()} ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className="font-medium text-sm">Realtime Status</span>
      </div>
      
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-medium">Network:</span> {isOnline ? 'Online' : 'Offline'}
        </div>
        <div>
          <span className="font-medium">Connection:</span> {getStatusText()}
        </div>
        <div>
          <span className="font-medium">State:</span> {connectionState}
        </div>
        {reconnectAttempts > 0 && (
          <div className="text-yellow-600">
            <span className="font-medium">Reconnect attempts:</span> {reconnectAttempts}
          </div>
        )}
        {error && (
          <div className="text-red-600">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}
