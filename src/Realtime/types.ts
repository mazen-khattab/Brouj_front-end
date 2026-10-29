/** Frontend reload hints only. These names are not a SignalR wire contract. */
export type RealtimeFeature = 'reservations' | 'orders' | 'timePlan';

export interface RealtimeEvent {
  feature: RealtimeFeature;
  /** Reservation/order ID, or project ID for a time plan. Omit to invalidate the whole feature. */
  resourceId?: string;
}

export type RealtimeStatus = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type Unsubscribe = () => void;

/** A future transport maps agreed server messages to reload hints, never authoritative DTOs. */
export interface RealtimeAdapter {
  start(): void | Promise<void>;
  stop(): void | Promise<void>;
  getStatus(): RealtimeStatus;
  subscribeStatus(listener: (status: RealtimeStatus) => void): Unsubscribe;
  subscribeEvents(listener: (event: RealtimeEvent) => void): Unsubscribe;
}

export type RealtimeAdapterFactory = () => RealtimeAdapter;
