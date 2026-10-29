import { ApiError } from "../Types/failures";
import type { ApiFailure } from "../Types/failures";
import { SessionActionError } from "../Types/auth";
import type { Actor, AuthState, SessionIdentity, SessionReason } from "../Types/auth";
import { UserRole } from "../Types/contracts";
import type { AuthSessionDto, CurrentCustomerDto, LoginInput, RegisterCustomerInput, UserDto } from "../Types/contracts";
import type { RequestMetadata } from "../Types/transport";
import type { SessionPlatform } from "./sessionPlatform";
import type { SessionStamp, createSessionBoundary } from "./sessionBoundary";

export interface SessionServices {
  customerProfile(signal: AbortSignal): Promise<CurrentCustomerDto>;
  staffProfile(signal: AbortSignal): Promise<UserDto>;
  loginCustomer(input: LoginInput, signal: AbortSignal): Promise<AuthSessionDto>;
  registerCustomer(input: RegisterCustomerInput, signal: AbortSignal): Promise<AuthSessionDto>;
  loginStaff(input: LoginInput, signal: AbortSignal): Promise<AuthSessionDto>;
  refresh(actor: Actor, signal: AbortSignal): Promise<AuthSessionDto>;
  logout(actor: Actor, signal: AbortSignal): Promise<unknown>;
  proof(signal: AbortSignal): Promise<string>;
  invalidateProof(): void;
}
type Boundary = ReturnType<typeof createSessionBoundary>;
const failureOf = (error: unknown): ApiFailure => (error instanceof ApiError ? error : new ApiError("unknown"));
const mismatch = (error: unknown) =>
  error instanceof ApiError &&
  (error.status === 401 || error.status === 403 || (error.status === 404 && (error.featureCode === 11 || error.featureCode === 14)));

/** One identity epoch, one refresh promise and no credentials/profile persistence. */
export function createSessionCoordinator(services: SessionServices, platform: SessionPlatform, boundary: Boundary) {
  let generation = 0;
  let revision = 0;
  let knownActor: Actor | undefined;
  let refreshBlocked = false;
  let privateAbort = new AbortController();
  let controlAbort = new AbortController();
  let bootstrapPromise: Promise<void> | undefined;
  let refreshPromise: Promise<boolean> | undefined;
  let transition = false;
  let reloadAfterTransition = false;
  let writes = 0;
  let references = 0;
  let running = false;
  let unbind = () => {};
  let unsubscribe = () => {};
  const listeners = new Set<() => void>();
  let state: AuthState = {
    status: "bootstrapping",
    actor: null,
    generation,
    pending: false,
    automaticRefresh: !!platform.lock,
    logoutRequired: false,
  };

  function publish(identity: SessionIdentity, extra: Partial<AuthState> = {}) {
    state = {
      ...identity,
      generation,
      pending: false,
      automaticRefresh: !!platform.lock && !refreshBlocked,
      logoutRequired: !!knownActor,
      ...extra,
    } as AuthState;
    for (const listener of listeners) listener();
  }

  const patch = (extra: Partial<AuthState>) => publish(state, extra);

  function advance() {
    generation += 1;
    revision = 0;
    privateAbort.abort();
    controlAbort.abort();
    privateAbort = new AbortController();
    controlAbort = new AbortController();
    services.invalidateProof();
  }

  function current(expected: number) {
    if (generation !== expected || controlAbort.signal.aborted) throw new ApiError("canceled");
  }

  async function profile(actor: Actor, expected: number): Promise<SessionIdentity | undefined> {
    try {
      if (actor === "customer") {
        const data = await services.customerProfile(controlAbort.signal);
        current(expected);
        if (!data.id || ![data.fName, data.lName, data.email, data.phone, data.identityNumber].every((value) => typeof value === "string"))
          throw new ApiError("transport");
        return { status: "customer", actor, profile: data };
      }
      const data = await services.staffProfile(controlAbort.signal);
      current(expected);
      if (
        !data.id ||
        ![data.name, data.email, data.phone].every((value) => typeof value === "string") ||
        data.deletedAt !== null ||
        ![UserRole.Admin, UserRole.SuperAdmin].includes(data.role)
      )
        throw new ApiError("transport");
      return { status: "staff", actor, profile: data, role: data.role };
    } catch (error: unknown) {
      current(expected);
      if (mismatch(error)) return undefined;
      throw error;
    }
  }

  async function profiles(first: Actor, expected: number) {
    return (await profile(first, expected)) ?? (await profile(first === "customer" ? "staff" : "customer", expected));
  }

  function accept(identity: SessionIdentity) {
    if (identity.actor === null) throw new ApiError("transport");
    knownActor = identity.actor;
    refreshBlocked = false;
    platform.writeHint(identity.actor);
    publish(identity);
  }

  function expire(reason: SessionReason, keepKnown = false, failure?: ApiFailure) {
    advance();
    if (!keepKnown) knownActor = undefined;
    platform.writeHint(undefined);
    refreshBlocked = true;
    publish({ status: keepKnown ? "unavailable" : "anonymous", actor: null }, { reason, ...(failure ? { failure } : {}) });
  }

  async function locked<T>(work: () => Promise<T>): Promise<T> {
    return platform.lock ? platform.lock(work) : work();
  }
  
  function flushReload() {
    if (reloadAfterTransition && !transition && !refreshPromise) {
      reloadAfterTransition = false;
      void bootstrap();
    }
  }

  function refresh(actor: Actor, expected: number): Promise<boolean> {
    if (refreshPromise) return refreshPromise;
    knownActor = actor;
    if (!platform.lock || refreshBlocked) {
      knownActor = actor;
      expire(platform.lock ? "expired" : "locksUnavailable", true);
      return Promise.resolve(false);
    }
    const oldId = state.actor ? state.profile.id : undefined;
    patch({ pending: true });
    const work = locked(async () => {
      current(expected);
      // A peer may have rotated while this tab waited for the cross-tab lock.
      const restored = await profiles(actor, expected);
      if (restored) {
        if (restored.actor !== actor || (oldId && restored.actor && restored.profile.id !== oldId)) {
          advance();
          accept(restored);
          return false;
        }
        services.invalidateProof();
        await services.proof(controlAbort.signal);
        current(expected);
        revision += 1;
        accept(restored);
        return true;
      }
      // The expired access cookie may now be anonymous, so its old proof is unusable.
      services.invalidateProof();
      await services.proof(controlAbort.signal);
      current(expected);
      const session = await services.refresh(actor, controlAbort.signal);
      current(expected);
      services.invalidateProof();
      await services.proof(controlAbort.signal);
      current(expected);
      const identity = await profile(actor, expected);
      if (!identity || identity.actor === null || identity.profile.id !== session.actorId) throw new ApiError("transport");
      revision += 1;
      accept(identity);
      platform.publish("changed");
      return true;
    })
      .catch((error: unknown) => {
        if (generation !== expected) return false;
        const failure = failureOf(error);
        const definitive = failure.status === 401 || failure.status === 403;
        expire(definitive ? "expired" : "refreshUncertain", !definitive, failure);
        platform.publish(definitive ? "changed" : "uncertain");
        return false;
      })
      .finally(() => {
        if (refreshPromise === work) refreshPromise = undefined;
        flushReload();
      });
    refreshPromise = work;
    return work;
  }

  function bootstrap(): Promise<void> {
    if (bootstrapPromise) return bootstrapPromise;
    if (transition || refreshPromise) return Promise.reject(new SessionActionError("busy"));
    const selected = knownActor ?? platform.readHint();
    advance();
    const expected = generation;
    publish({ status: "bootstrapping", actor: null }, { pending: true });
    const work = (async () => {
      try {
        const identity = await profiles(selected ?? "customer", expected);
        if (identity) {
          accept(identity);
          return;
        }
        if (selected && !refreshBlocked) {
          await refresh(selected, expected);
          return;
        }
        if (refreshBlocked && knownActor) {
          publish({ status: "unavailable", actor: null }, { reason: "refreshUncertain" });
          return;
        }
        knownActor = undefined;
        platform.writeHint(undefined);
        publish({ status: "anonymous", actor: null });
      } catch (error: unknown) {
        if (generation === expected) publish({ status: "unavailable", actor: null }, { reason: "network", failure: failureOf(error) });
      }
    })().finally(() => {
      if (bootstrapPromise === work) bootstrapPromise = undefined;
    });
    bootstrapPromise = work;
    return work;
  }

  async function authenticate(actor: Actor, send: (signal: AbortSignal) => Promise<AuthSessionDto>, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new ApiError("canceled");
    if (transition || state.pending || writes) throw new SessionActionError("busy");
    if (knownActor || state.actor) throw new SessionActionError("logoutRequired");
    if (state.status !== "anonymous") throw new SessionActionError("signInRequired");
    transition = true;
    advance();
    const expected = generation;
    publish({ status: "anonymous", actor: null }, { pending: true });
    const attemptController = controlAbort;
    const cancel = () => attemptController.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    let accepted = false;
    try {
      await locked(async () => {
        current(expected);
        // Never overwrite an actor established by a peer while this tab waited for the lock.
        const existing = await profiles(platform.readHint() ?? actor, expected);
        if (existing) {
          signal?.removeEventListener("abort", cancel);
          accept(existing);
          throw new SessionActionError("logoutRequired");
        }
        services.invalidateProof();
        await services.proof(controlAbort.signal);
        current(expected);
        const session = await send(controlAbort.signal);
        current(expected);
        accepted = true;
        knownActor = actor;
        services.invalidateProof();
        await services.proof(controlAbort.signal);
        current(expected);
        const identity = await profile(actor, expected);
        if (!identity || identity.actor === null || identity.profile.id !== session.actorId) throw new ApiError("transport");
        // Publishing identity can immediately unmount the login route. Its form owns only
        // the pending attempt; cancelling that form must not abort the established session.
        signal?.removeEventListener("abort", cancel);
        accept(identity);
        platform.publish("changed");
      });
    } catch (error: unknown) {
      if (generation !== expected) throw new ApiError("canceled");
      if (error instanceof SessionActionError) throw error;
      const failure = failureOf(error);
      if (accepted || failure.kind === "network" || failure.status === undefined || (failure.status ?? 0) >= 500) {
        knownActor = actor;
        refreshBlocked = !accepted;
        publish({ status: "unavailable", actor: null }, { reason: accepted ? "hydration" : "network", failure });
        platform.publish("uncertain");
        throw new SessionActionError("hydration", failure);
      }
      publish({ status: "anonymous", actor: null });
      throw error;
    } finally {
      signal?.removeEventListener("abort", cancel);
      transition = false;
      if (generation === expected && state.pending) patch({ pending: false });
      flushReload();
    }
  }

  async function logout(): Promise<void> {
    if (transition || state.pending || writes) throw new SessionActionError("busy");
    const actor = state.actor ?? knownActor;
    if (!actor) return;
    transition = true;
    const expected = generation;
    patch({ pending: true });
    privateAbort.abort();
    privateAbort = new AbortController();
    let confirmed = false;
    try {
      await locked(async () => {
        current(expected);
        services.invalidateProof();
        await services.proof(controlAbort.signal);
        current(expected);
        await services.logout(actor, controlAbort.signal);
        current(expected);
        confirmed = true;
        advance();
        knownActor = undefined;
        refreshBlocked = false;
        platform.writeHint(undefined);
        publish({ status: "anonymous", actor: null });
        platform.publish("changed");
        try {
          await services.proof(controlAbort.signal);
        } catch {
          /* Server logout is confirmed even if anonymous proof bootstrap is unavailable. */
        }
      });
    } catch (error: unknown) {
      if (generation === expected && !confirmed) patch({ pending: false, reason: "logoutUnconfirmed", failure: failureOf(error) });
      throw error;
    } finally {
      transition = false;
      if (generation === expected && state.pending) patch({ pending: false });
      flushReload();
    }
  }

  const handler = {
    stamp: (): SessionStamp => ({ generation, revision }),
    assertRequest(metadata: RequestMetadata, unsafe: boolean) {
      if (metadata.sessionControl) return;
      if (
        (unsafe && (state.pending || transition || state.status === "unavailable" || state.status === "bootstrapping")) ||
        (metadata.authenticated && !state.actor)
      )
        throw new ApiError("canceled");
    },
    enter(metadata: RequestMetadata, unsafe: boolean) {
      if (!unsafe || metadata.sessionControl) return () => {};
      writes += 1;
      return () => {
        writes -= 1;
      };
    },
    signal: (metadata: RequestMetadata) => (!metadata.sessionControl && metadata.authenticated ? privateAbort.signal : undefined),
    async recover(stamp: SessionStamp) {
      if (stamp.generation !== generation || !state.actor || transition) return false;
      if (stamp.revision < revision) return true;
      return refresh(state.actor, generation);
    },
    rejected(stamp: SessionStamp) {
      if (stamp.generation === generation) {
        expire("expired");
        platform.publish("changed");
      }
    },
  };

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      references += 1;
      if (!running) {
        running = true;
        unbind = boundary.bind(handler);
        unsubscribe = platform.subscribe((notice) => {
          advance();
          knownActor = notice === "uncertain" ? platform.readHint() : undefined;
          bootstrapPromise = undefined;
          if (notice === "uncertain") {
            refreshBlocked = true;
            publish({ status: "unavailable", actor: null }, { reason: "refreshUncertain" });
          } else {
            refreshBlocked = false;
            publish({ status: "bootstrapping", actor: null });
            if (transition || refreshPromise) reloadAfterTransition = true;
            else void bootstrap();
          }
        });
        void bootstrap();
      }
      return () => {
        references -= 1;
        queueMicrotask(() => {
          if (references || !running) return;
          running = false;
          unsubscribe();
          unbind();
          advance();
          bootstrapPromise = undefined;
          publish({ status: "bootstrapping", actor: null });
        });
      };
    },
    retryBootstrap: bootstrap,
    async reloadIdentity() {
      if (transition || state.pending || writes) throw new SessionActionError("busy");
      if (!state.actor) throw new SessionActionError("signInRequired");
      const expected = generation;
      const actor = state.actor;
      const id = state.profile.id;
      const identity = await profile(actor, expected);
      // Refresh a confirmed profile without remounting private forms or inventing a logout.
      // A definitive rejected identity does invalidate every private route and in-flight read.
      if (!identity || identity.actor !== actor || identity.profile.id !== id) {
        expire("expired");
        platform.publish("changed");
        return;
      }
      accept(identity);
    },
    loginCustomer: (input: LoginInput, signal?: AbortSignal) => authenticate("customer", (signal) => services.loginCustomer(input, signal), signal),
    registerCustomer: (input: RegisterCustomerInput, signal?: AbortSignal) =>
      authenticate("customer", (signal) => services.registerCustomer(input, signal), signal),
    loginStaff: (input: LoginInput, signal?: AbortSignal) => authenticate("staff", (signal) => services.loginStaff(input, signal), signal),
    logout,
  };
}
export type SessionCoordinator = ReturnType<typeof createSessionCoordinator>;
