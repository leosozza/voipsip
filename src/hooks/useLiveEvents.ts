import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribe, type UiEvent } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

type DialEvent = Extract<UiEvent, { type: 'dial' }>;

/**
 * Subscribes once to the server's SSE stream: keeps react-query caches fresh and,
 * when `onDial` is given, forwards Bitrix24 click-to-call requests to it.
 */
export function useLiveEvents(onDial?: (event: DialEvent) => void) {
  const queryClient = useQueryClient();
  const onDialRef = useRef(onDial);
  onDialRef.current = onDial;

  useEffect(
    () =>
      subscribe((event) => {
        switch (event.type) {
          case 'dial':
            onDialRef.current?.(event);
            break;
          case 'call_updated':
            void queryClient.invalidateQueries({ queryKey: queryKeys.calls });
            void queryClient.invalidateQueries({ queryKey: queryKeys.callStats });
            break;
          case 'status':
            void queryClient.invalidateQueries({ queryKey: queryKeys.status });
            break;
        }
      }),
    [queryClient],
  );
}
