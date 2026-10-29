import type { RealtimeAdapter, RealtimeEvent, RealtimeStatus } from '../../src/Realtime/types';

/** Deterministic test/development fake. Never imported by the shipped application. */
export function createFakeRealtimeAdapter() {
  const events = new Set<(event: RealtimeEvent) => void>();
  const statuses = new Set<(status: RealtimeStatus) => void>();
  let status: RealtimeStatus = 'disconnected';
  let starts = 0;
  let stops = 0;

  function setStatus(value: RealtimeStatus) {
    status = value;
    for (const listener of statuses) {
      listener(value);
    }
  }

  const adapter: RealtimeAdapter = {
    start() {
      starts += 1;
      setStatus('connecting');
      setStatus('connected');
    },

    stop() {
      stops += 1;
      setStatus('disconnected');
    },

    getStatus: () => status,

    subscribeEvents(listener) {
      events.add(listener);
      return () => {
        events.delete(listener);
      };
    },

    subscribeStatus(listener) {
      statuses.add(listener);
      return () => {
        statuses.delete(listener);
      };
    },
  };

  return {
    adapter,
    setStatus,

    emit(event: RealtimeEvent) {
      for (const listener of events) {
        listener(event);
      }
    },

    // Captured callbacks emulate late delivery even after a transport unsubscribes.
    captureEvents: () => [...events],

    captureStatuses: () => [...statuses],

    inspect: () => ({ starts, stops, eventListeners: events.size, statusListeners: statuses.size }),
  };
}
