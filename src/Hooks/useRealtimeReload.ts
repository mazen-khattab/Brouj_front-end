import { useContext, useLayoutEffect, useRef } from 'react';
import { RealtimeContext } from '../Context/RealtimeContext';
import { createReloadQueue } from '../Realtime/reloadQueue';
import type { RealtimeFeature } from '../Realtime/types';

/** Route-local subscription; the existing read hook still owns filters, cancellation and DTOs. */
export function useRealtimeReload(
  feature: RealtimeFeature | undefined,
  key: string,
  loading: boolean,
  reload: () => unknown,
  resourceId?: string,
) {
  const session = useContext(RealtimeContext);
  const latest = useRef({ loading, reload });
  const queue = useRef<ReturnType<typeof createReloadQueue> | undefined>(undefined);
  useLayoutEffect(() => {
    latest.current = { loading, reload };
  }, [loading, reload]);

  useLayoutEffect(() => {
    if (!session || !feature) {
      return;
    }
    const current = createReloadQueue(() => {
      // Check again at dispatch: the actor may change after the hint but before this microtask.
      if (session.isCurrent()) {
        return latest.current.reload();
      }
      return undefined;
    });
    queue.current = current;
    current.setLoading(latest.current.loading);
    const unsubscribe = session.subscribeEvents((event) => {
      if (event.feature === feature && (!resourceId || !event.resourceId || resourceId.toLowerCase() === event.resourceId.toLowerCase())) {
        current.request();
      }
    });
    return () => {
      unsubscribe();
      current.dispose();
      queue.current = undefined;
    };
  }, [session, feature, key, resourceId]);

  useLayoutEffect(() => {
    queue.current?.setLoading(loading);
  }, [loading]);
}
