/** Collapse a burst into one read, retaining one trailing read if hints arrive during loading. */
export function createReloadQueue(reload: () => unknown) {
  let active = true;
  let loading = true;
  let pending = false;
  let dirty = false;
  let scheduled = false;
  let sequence = 0;

  function flush() {
    if (!active || loading || pending || !dirty || scheduled) {
      return;
    }
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!active || loading || pending || !dirty) {
        return;
      }
      dirty = false;
      pending = true;
      const request = ++sequence;
      try {
        const result = reload();
        // Awaitable staff reads can finish before React paints their loading state.
        if (result instanceof Promise) {
          void result.catch(() => {}).finally(() => {
            // A painted success may already have released a newer trailing read.
            if (request === sequence) {
              pending = false;
              flush();
            }
          });
        }
      } catch {
        pending = false;
      }
    });
  }

  return {
    request() {
      dirty = true;
      flush();
    },

    setLoading(value: boolean) {
      loading = value;
      if (!value) {
        pending = false;
      }
      flush();
    },

    dispose() {
      active = false;
      dirty = false;
    },
  };
}
