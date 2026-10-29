import { useLayoutEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../Hooks/useAuth';
import { sessionBoundary } from '../Security/sessionBoundary';
import { createDisabledRealtimeAdapter } from '../Realtime/disabledAdapter';
import { createRealtimeSession } from '../Realtime/session';
import type { RealtimeAdapterFactory } from '../Realtime/types';
import { RealtimeContext } from './RealtimeContext';

export function RealtimeProvider({ children, adapterFactory = createDisabledRealtimeAdapter }: {
  children: ReactNode;
  /** Injection is for tests/development. V1 has no runtime activation flag. */
  adapterFactory?: RealtimeAdapterFactory;
}) {
  const auth = useAuth();
  const actor = auth.actor;
  const generation = auth.generation;
  const actorId = auth.actor ? auth.profile.id : null;
  const authenticated = auth.actor !== null;
  const session = useMemo(() => createRealtimeSession(
    actor !== null ? adapterFactory() : createDisabledRealtimeAdapter(),
    // The coordinator increments this stamp before React commits an actor transition.
    () => actor !== null && actorId !== null && (sessionBoundary.stamp()?.generation ?? generation) === generation,
  ), [adapterFactory, actor, generation, actorId]);

  useLayoutEffect(() => {
    if (authenticated) {
      return session.start();
    }
  }, [session, authenticated]);

  return <RealtimeContext value={session}>{children}</RealtimeContext>;
}
