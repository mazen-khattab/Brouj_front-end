import type { RealtimeAdapter, RealtimeEvent, RealtimeStatus } from './types';

/** Owns one actor generation. Every transport callback is bound to one activation. */
export function createRealtimeSession(adapter: RealtimeAdapter, isCurrent: () => boolean) {
  const events = new Set<(event: RealtimeEvent) => void>();
  const statuses = new Set<() => void>();
  let status = adapter.getStatus();
  let activation = 0;
  let running = false;

  function updateStatus(next: RealtimeStatus) {
    status = next;
    for (const listener of statuses) {
      listener();
    }
  }

  function subscribeEvents(listener: (event: RealtimeEvent) => void) {
    events.add(listener);
    return () => {
      events.delete(listener);
    };
  }

  function subscribeStatus(listener: () => void) {
    statuses.add(listener);
    return () => {
      statuses.delete(listener);
    };
  }

  function start() {
    const epoch = ++activation;
    running = true;
    let active = true;
    let connected = false;
    let missedEvents = false;

    function current() {
      return active && epoch === activation && isCurrent();
    }

    function emit(event: RealtimeEvent) {
      if (!current()) {
        return;
      }
      for (const listener of events) {
        // An earlier listener could synchronously end the session.
        if (current()) {
          listener(event);
        }
      }
    }

    function receiveStatus(next: RealtimeStatus) {
      if (!current()) {
        return;
      }
      if (next === 'reconnecting' || (next === 'disconnected' && connected)) {
        missedEvents = true;
      }
      updateStatus(next);
      if (next === 'connected') {
        connected = true;
        if (missedEvents) {
          missedEvents = false;
          // Reconnect cannot guarantee delivery. Re-read each mounted feature through its service.
          for (const feature of ['reservations', 'orders', 'timePlan'] as const) {
            emit({ feature });
          }
        }
      }
    }

    const offEvents = adapter.subscribeEvents(emit);
    const offStatus = adapter.subscribeStatus(receiveStatus);
    receiveStatus(adapter.getStatus());
    try {
      void Promise.resolve(adapter.start()).catch(() => receiveStatus('disconnected'));
    } catch {
      receiveStatus('disconnected');
    }

    return () => {
      // Invalidate before stopping: a transport may synchronously emit during stop.
      active = false;
      if (epoch === activation) {
        running = false;
      }
      offEvents();
      offStatus();
      try {
        void Promise.resolve(adapter.stop()).catch(() => {});
      } catch {
        // Cleanup must complete even when a future transport cannot confirm its stop.
      }
    };
  }

  return { start, subscribeEvents, subscribeStatus, getStatus: () => status, isCurrent: () => running && isCurrent() };
}

export type RealtimeSession = ReturnType<typeof createRealtimeSession>;
