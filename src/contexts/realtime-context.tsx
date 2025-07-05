'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeContextType {
  subscribeToTable: (
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    filter?: string
  ) => () => void;
  subscribeToProject: (
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => () => void;
  subscribeToMessages: (
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => () => void;
  subscribeToTasks: (
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => () => void;
  subscribeToColumns: (
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const supabase = useMemo(() => createClient(), []);

  // Cleanup on unmount - fixed infinite loop by removing channels dependency
  useEffect(() => {
    return () => {
      // Unsubscribe from all channels
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Generic table subscription - simplified, no connection monitoring
  const subscribeToTable = useCallback((
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    filter?: string
  ) => {
    const channelName = filter ? `${table}:${filter}` : table;

    // Check if channel already exists
    if (channelsRef.current.has(channelName)) {
      console.warn(`Channel ${channelName} already exists`);
      return () => {};
    }

    console.log(`📡 Subscribing to table: ${table}${filter ? ` with filter: ${filter}` : ''}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'client_data',
          table: table,
          ...(filter && { filter })
        },
        callback
      )
      .subscribe();

    // Store channel reference
    channelsRef.current.set(channelName, channel);

    // Return unsubscribe function
    return () => {
      console.log(`🔌 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    };
  }, [supabase]); // Removed channels dependency to fix infinite loop

  // Project-specific subscriptions
  const subscribeToProject = useCallback((
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => {
    return subscribeToTable('projects', callback, `id=eq.${projectId}`);
  }, [subscribeToTable]);

  const subscribeToMessages = useCallback((
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => {
    return subscribeToTable('messages', callback, `project_id=eq.${projectId}`);
  }, [subscribeToTable]);

  const subscribeToTasks = useCallback((
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => {
    return subscribeToTable('tasks', callback, `project_id=eq.${projectId}`);
  }, [subscribeToTable]);

  const subscribeToColumns = useCallback((
    projectId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => {
    return subscribeToTable('columns', callback, `project_id=eq.${projectId}`);
  }, [subscribeToTable]);

  const value: RealtimeContextType = {
    subscribeToTable,
    subscribeToProject,
    subscribeToMessages,
    subscribeToTasks,
    subscribeToColumns,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
