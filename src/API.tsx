import axios from "axios";
import type { AxiosAdapter, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { environment } from "./config/environment";
import { apiPaths } from "./Router/routePaths";
import { ApiError, failureFromResponse, isRecord } from "./Types/failures";
import type { ApiRequest, RequestMetadata } from "./Types/transport";
import { createCsrfCoordinator, csrfCoordinator } from "./Security/csrf";
import { authenticationFailures, createAuthenticationFailureChannel } from "./Security/authenticationFailures";
import { createSessionBoundary, sessionBoundary } from "./Security/sessionBoundary";
import type { SessionStamp } from "./Security/sessionBoundary";

interface InternalMetadata extends RequestMetadata {
  generation: number;
  csrfBootstrap?: boolean;
  onDispatch?: () => void;
  sessionStamp?: SessionStamp;
}

type InternalConfig = InternalAxiosRequestConfig & { brouj?: InternalMetadata };

const safe = new Set(["GET", "HEAD", "OPTIONS"]);

function retryHeader(headers: object): unknown {
  return Object.entries(headers).find(([name]) => name.toLowerCase() === "retry-after")?.[1];
}

function normalize(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isCancel(error) || (error instanceof DOMException && error.name === "AbortError")) {
    return new ApiError("canceled");
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      return failureFromResponse(error.response.status, error.response.data, retryHeader(error.response.headers));
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError("transport");
    }
    return new ApiError("network");
  }

  return new ApiError("unknown");
}

/** Cancel one request's wait without canceling the shared session refresh. */
function waitForRecovery(work: Promise<boolean>, signal?: AbortSignal): Promise<boolean> {
  if (!signal) {
    return work;
  }

  if (signal.aborted) {
    return Promise.reject(new ApiError("canceled"));
  }

  return new Promise((resolve, reject) => {
    const abort = () => reject(new ApiError("canceled"));
    signal.addEventListener("abort", abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** Adapter-boundary test seam. Application services use only the single instance below. */
export function createApiTransport(
  adapter?: AxiosAdapter,
  security = createCsrfCoordinator(),
  authFailures = createAuthenticationFailureChannel(),
  boundary = createSessionBoundary(),
) {
  const client = axios.create({
    baseURL: environment.apiOrigin,
    withCredentials: true,
    timeout: 15_000,
    // Explicit identity-bound proof; never read browser cookies for Axios XSRF defaults.
    withXSRFToken: false,
    headers: { Accept: "application/json" },
  });

  const delegate = axios.getAdapter(adapter ?? client.defaults.adapter);

  function assertCurrent(config: InternalConfig) {
    if (config.signal?.aborted) {
      throw new ApiError("canceled");
    }

    if (!safe.has((config.method ?? "GET").toUpperCase()) && config.brouj?.generation !== security.generation()) {
      throw new ApiError("canceled");
    }

    if (config.brouj) {
      boundary.assert(config.brouj, !safe.has((config.method ?? "GET").toUpperCase()), config.brouj.sessionStamp);
    }
  }

  // Recheck at dispatch, after request interceptors and body transformation.
  client.defaults.adapter = (config: InternalConfig) => {
    assertCurrent(config);
    config.brouj?.onDispatch?.();
    return delegate(config);
  };

  async function loadProof(signal: AbortSignal): Promise<string> {
    const config: AxiosRequestConfig & { brouj: InternalMetadata } = {
      signal,
      brouj: {
        operation: "BootstrapCsrf",
        authenticated: false,
        skipAuthenticationRecovery: true,
        csrfBootstrap: true,
        sessionControl: true,
        generation: security.generation(),
      },
    };
    const response = await client.get<unknown>(apiPaths.Security.csrf, config);
    if (!isRecord(response.data) || !isRecord(response.data.data) || typeof response.data.data.requestToken !== "string")
      throw new ApiError("transport", { status: response.status });
    return response.data.data.requestToken;
  }

  const requestInterceptor = client.interceptors.request.use(async (config: InternalConfig) => {
    assertCurrent(config);
    if (!config.brouj?.csrfBootstrap && !safe.has((config.method ?? "GET").toUpperCase())) {
      const proof = await security.ensure(loadProof, config.signal as AbortSignal | undefined);
      assertCurrent(config);
      config.headers.set("X-CSRF-TOKEN", proof.value);
    }
    // Browser supplies the multipart boundary; suppress Axios's method default.
    if (config.data instanceof FormData) config.headers.setContentType(false);
    return config;
  });

  const responseInterceptor = client.interceptors.response.use(
    (response) => {
      if (response.status < 200 || response.status >= 300 || (isRecord(response.data) && response.data.success === false))
        throw failureFromResponse(response.status, response.data, retryHeader(response.headers));
      if (!isRecord(response.data) || response.data.success !== true || !Object.hasOwn(response.data, "data") || response.data.data === undefined)
        throw new ApiError("transport", { status: response.status });
      return response;
    },
    (error: unknown) => Promise.reject(normalize(error)),
  );

  let disposed = false;

  async function execute<T>(input: ApiRequest, replayed = false): Promise<T> {
    const generation = security.generation();
    const stamp = boundary.stamp();
    let dispatched = false;
    let leave = () => {};
    const signals = [input.signal, boundary.signal(input.metadata)].filter((signal): signal is AbortSignal => !!signal);
    const linked = new AbortController();
    const abort = () => linked.abort();

    if (signals.length > 1) {
      for (const signal of signals) {
        if (signal.aborted) {
          linked.abort();
        } else {
          signal.addEventListener("abort", abort, { once: true });
        }
      }
    }

    const requestSignal = signals.length === 1 ? signals[0] : signals.length ? linked.signal : undefined;

    try {
      boundary.assert(input.metadata, !safe.has(input.method), stamp);
      leave = boundary.enter(input.metadata, !safe.has(input.method));
      if (
        disposed ||
        !input.path.startsWith("/api/v1/") ||
        /[\\?#]/.test(input.path) ||
        new URL(input.path, environment.apiOrigin).pathname !== input.path
      ) {
        throw new ApiError("unknown");
      }

      const config: AxiosRequestConfig & { brouj: InternalMetadata } = {
        method: input.method,
        url: input.path,
        params: input.query,
        data: input.body,
        brouj: {
          ...input.metadata,
          generation,
          ...(stamp ? { sessionStamp: stamp } : {}),
          onDispatch: () => {
            dispatched = true;
          },
        },
        ...(requestSignal ? { signal: requestSignal } : {}),
      };
      const response = await client.request<{ success: true; data: T }>(config);
      if (stamp && boundary.stamp()?.generation !== stamp.generation) throw new ApiError("canceled");
      if (input.metadata.authenticated && generation !== security.generation()) throw new ApiError("canceled");
      return response.data.data;
    } catch (error: unknown) {
      const failure = normalize(error);
      const eligible =
        dispatched &&
        failure.status === 401 &&
        input.metadata.authenticated &&
        !input.metadata.skipAuthenticationRecovery &&
        !input.metadata.sessionControl &&
        stamp;
      if (eligible && !replayed && !input.signal?.aborted) {
        const recovered = await waitForRecovery(boundary.recover(stamp), input.signal).catch((error: unknown) => {
          throw normalize(error);
        });
        if (recovered && boundary.stamp()?.generation === stamp.generation && !input.signal?.aborted) return execute<T>(input, true);
      } else if (eligible && replayed) boundary.rejected(stamp);
      if (
        dispatched &&
        failure.status === 401 &&
        input.metadata.authenticated &&
        !input.metadata.skipAuthenticationRecovery &&
        generation === security.generation()
      )
        await authFailures.notify({
          failure,
          metadata: input.metadata,
          generation,
        });
      throw failure;
    } finally {
      leave();
      for (const signal of signals) signal.removeEventListener("abort", abort);
      if (dispatched && input.metadata.changesIdentity) security.invalidate();
    }
  }

  return {
    request: <T,>(input: ApiRequest) => execute<T>(input),
    async csrf(signal?: AbortSignal) {
      if (disposed) throw new ApiError("canceled");
      try {
        return (await security.ensure(loadProof, signal)).value;
      } catch (error: unknown) {
        throw normalize(error);
      }
    },
    dispose() {
      disposed = true;
      security.invalidate();
      authFailures.clear();
      client.interceptors.request.eject(requestInterceptor);
      client.interceptors.response.eject(responseInterceptor);
    },
  };
}

const transport = createApiTransport(undefined, csrfCoordinator, authenticationFailures, sessionBoundary);

export const apiRequest = transport.request;
export const bootstrapCsrf = transport.csrf;

// HMR replaces the instance rather than accumulating interceptors or retaining old proof.
if (import.meta.hot) import.meta.hot.dispose(() => transport.dispose());
