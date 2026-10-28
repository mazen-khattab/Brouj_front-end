import type { Actor } from '../Types/auth';

export type SessionNotice = 'changed' | 'uncertain';
export interface SessionPlatform {
  readHint(): Actor | undefined;
  writeHint(actor: Actor | undefined): void;
  lock?: <T>(work: () => Promise<T>) => Promise<T>;
  subscribe(listener: (notice: SessionNotice) => void): () => void;
  publish(notice: SessionNotice): void;
}
const hintKey = 'brouj.actor-hint';
const eventKey = 'brouj.session-event';
const channelName = 'brouj.session';

/** Only navigation hints and random invalidation IDs cross tabs; no profile or credential data. */
export function createBrowserSessionPlatform(): SessionPlatform {
  let memoryHint: Actor | undefined;
  let channel: BroadcastChannel | undefined;
  const listeners = new Set<(notice: SessionNotice) => void>();
  const receive = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const message = value as Record<string, unknown>;
    if (typeof message.id !== 'string' || !['changed', 'uncertain'].includes(String(message.kind))) return;
    for (const listener of listeners) listener(message.kind as SessionNotice);
  };
  return {
    readHint() {
      try {
        const value = localStorage.getItem(hintKey);
        return value === 'customer' || value === 'staff' ? value : undefined;
      } catch { return memoryHint; }
    },
    writeHint(actor) {
      memoryHint = actor;
      try { if (actor) localStorage.setItem(hintKey, actor); else localStorage.removeItem(hintKey); } catch { /* Memory-only hint when storage is denied. */ }
    },
    ...(typeof navigator !== 'undefined' && navigator.locks ? {
      lock: <T,>(work: () => Promise<T>) => navigator.locks.request('brouj.auth-session', { mode: 'exclusive', signal: AbortSignal.timeout(30_000) }, work),
    } : {}),
    subscribe(listener) {
      listeners.add(listener);
      if (!channel && typeof window.BroadcastChannel === 'function') {
        try { channel = new window.BroadcastChannel(channelName); channel.onmessage = (event: MessageEvent<unknown>) => receive(event.data); } catch { /* Use storage events below. */ }
      }
      const storage = (event: StorageEvent) => {
        if (event.key !== eventKey || !event.newValue || channel) return;
        try { receive(JSON.parse(event.newValue)); } catch { /* Ignore invalid same-origin notices. */ }
      };
      window.addEventListener('storage', storage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', storage);
        if (!listeners.size) { channel?.close(); channel = undefined; }
      };
    },
    publish(kind) {
      const message = { id: crypto.randomUUID(), kind };
      if (channel) channel.postMessage(message);
      // Also emit storage for peers without BroadcastChannel support.
      try { localStorage.setItem(eventKey, JSON.stringify(message)); localStorage.removeItem(eventKey); } catch { /* No persistent channel is required to authorize a request. */ }
    },
  };
}
