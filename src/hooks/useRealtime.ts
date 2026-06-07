import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Custom hook to listen to Postgres changes on a table in realtime.
 */
export function useRealtime<T extends { [key: string]: any }>(
  table: string,
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void,
  filter?: string
) {
  useEffect(() => {
    let channelName = `realtime-${table}`;
    if (filter) channelName += `-${filter}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          onEvent(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onEvent, filter]);
}
