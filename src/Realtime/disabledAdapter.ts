import type { RealtimeAdapter } from './types';

/** The V1 transport has no URLs, connections, timers or external dependencies. */
export function createDisabledRealtimeAdapter(): RealtimeAdapter {
  return {
    start() {},

    stop() {},

    getStatus: () => 'disabled',

    subscribeStatus: () => () => {},

    subscribeEvents: () => () => {},
  };
}
