import { ApiError } from "../Types/failures";
interface Proof {
  readonly value: string;
  readonly generation: number;
}
type Bootstrap = (signal: AbortSignal) => Promise<string>;

interface Pending {
  generation: number;
  controller: AbortController;
  promise: Promise<Proof>;
  waiters: number;
  settled: boolean;
}

/** Cancel a waiter without canceling bootstrap still needed by another caller. */
function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(new ApiError("canceled"));
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new ApiError("canceled"));
    signal.addEventListener("abort", abort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export function createCsrfCoordinator() {
  let generation = 0;
  let cached: Proof | undefined;
  let pending: Pending | undefined;

  function invalidate() {
    generation += 1;
    cached = undefined;
    const previous = pending;
    pending = undefined;
    previous?.controller.abort();
  }

  async function ensure(
    bootstrap: Bootstrap,
    signal?: AbortSignal,
  ): Promise<Proof> {
    if (signal?.aborted) {
      throw new ApiError("canceled");
    }

    if (cached?.generation === generation) {
      return cached;
    }

    let current = pending;

    if (!current) {
      const controller = new AbortController();
      const created: Pending = {
        generation,
        controller,
        waiters: 0,
        settled: false,
        promise: Promise.resolve({ value: "", generation }),
      };

      const loaded = Promise.resolve()
        .then(() => {
          if (controller.signal.aborted) throw new ApiError("canceled");
          return bootstrap(controller.signal);
        })
        .then((value) => {
          if (controller.signal.aborted || created.generation !== generation)
            throw new ApiError("canceled");
          if (!value.trim() || value.length > 16_384 || /[\r\n]/.test(value))
            throw new ApiError("transport");
          cached = { value, generation };
          return cached;
        });

      created.promise = abortable(loaded, controller.signal).finally(() => {
        created.settled = true;
        if (pending === created) pending = undefined;
      });

      pending = current = created;
    }

    current.waiters += 1;

    try {
      return await abortable(current.promise, signal);
    } finally {
      current.waiters -= 1;
      if (!current.waiters && !current.settled) {
        if (pending === current) pending = undefined;
        current.controller.abort();
      }
    }
  }

  return { ensure, invalidate, generation: () => generation };
}
/** Plain-module session boundary for Part 04, without React or routing. */
export const csrfCoordinator = createCsrfCoordinator();
export const invalidateCsrfProof = csrfCoordinator.invalidate;
export const sessionGeneration = csrfCoordinator.generation;
