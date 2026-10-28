import axios from "axios";
import type {
  AxiosAdapter,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { environment } from "./config/environment";
import { apiPaths } from "./Router/routePaths";
import { ApiError, failureFromResponse, isRecord } from "./Types/failures";
import type { ApiRequest, RequestMetadata } from "./Types/transport";
import { createCsrfCoordinator, csrfCoordinator } from "./Security/csrf";
import {
  authenticationFailures,
  createAuthenticationFailureChannel,
} from "./Security/authenticationFailures";

interface InternalMetadata extends RequestMetadata {
  generation: number;
  csrfBootstrap?: boolean;
  onDispatch?: () => void;
}

type InternalConfig = InternalAxiosRequestConfig & { brouj?: InternalMetadata };

const safe = new Set(["GET", "HEAD", "OPTIONS"]);

function retryHeader(headers: object): unknown {
  return Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "retry-after",
  )?.[1];
}

function normalize(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (
    axios.isCancel(error) ||
    (error instanceof DOMException && error.name === "AbortError")
  )
    return new ApiError("canceled");
  if (axios.isAxiosError(error)) {
    if (error.response)
      return failureFromResponse(
        error.response.status,
        error.response.data,
        retryHeader(error.response.headers),
      );
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
      return new ApiError("transport");
    return new ApiError("network");
  }
  return new ApiError("unknown");
}

/** Adapter-boundary test seam. Application services use only the single instance below. */
export function createApiTransport(
  adapter?: AxiosAdapter,
  security = createCsrfCoordinator(),
  authFailures = createAuthenticationFailureChannel(),
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
    if (config.signal?.aborted) throw new ApiError("canceled");
    if (
      !safe.has((config.method ?? "GET").toUpperCase()) &&
      config.brouj?.generation !== security.generation()
    )
      throw new ApiError("canceled");
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
        generation: security.generation(),
      },
    };
    const response = await client.get<unknown>(apiPaths.Security.csrf, config);
    if (
      !isRecord(response.data) ||
      !isRecord(response.data.data) ||
      typeof response.data.data.requestToken !== "string"
    )
      throw new ApiError("transport", { status: response.status });
    return response.data.data.requestToken;
  }

  const requestInterceptor = client.interceptors.request.use(
    async (config: InternalConfig) => {
      assertCurrent(config);
      if (
        !config.brouj?.csrfBootstrap &&
        !safe.has((config.method ?? "GET").toUpperCase())
      ) {
        const proof = await security.ensure(
          loadProof,
          config.signal as AbortSignal | undefined,
        );
        assertCurrent(config);
        config.headers.set("X-CSRF-TOKEN", proof.value);
      }
      // Browser supplies the multipart boundary; suppress Axios's method default.
      if (config.data instanceof FormData) config.headers.setContentType(false);
      return config;
    },
  );

  const responseInterceptor = client.interceptors.response.use(
    (response) => {
      if (
        response.status < 200 ||
        response.status >= 300 ||
        (isRecord(response.data) && response.data.success === false)
      )
        throw failureFromResponse(
          response.status,
          response.data,
          retryHeader(response.headers),
        );
      if (
        !isRecord(response.data) ||
        response.data.success !== true ||
        !Object.hasOwn(response.data, "data") ||
        response.data.data === undefined
      )
        throw new ApiError("transport", { status: response.status });
      return response;
    },
    (error: unknown) => Promise.reject(normalize(error)),
  );

  let disposed = false;

  async function request<T>(input: ApiRequest): Promise<T> {
    const generation = security.generation();
    let dispatched = false;
    try {
      if (
        disposed ||
        !input.path.startsWith("/api/v1/") ||
        /[\\?#]/.test(input.path) ||
        new URL(input.path, environment.apiOrigin).pathname !== input.path
      )
        throw new ApiError("unknown");
      const config: AxiosRequestConfig & { brouj: InternalMetadata } = {
        method: input.method,
        url: input.path,
        params: input.query,
        data: input.body,
        brouj: {
          ...input.metadata,
          generation,
          onDispatch: () => {
            dispatched = true;
          },
        },
        ...(input.signal ? { signal: input.signal } : {}),
      };
      const response = await client.request<{ success: true; data: T }>(config);
      if (input.metadata.authenticated && generation !== security.generation())
        throw new ApiError("canceled");
      return response.data.data;
    } catch (error: unknown) {
      const failure = normalize(error);
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
      if (dispatched && input.metadata.changesIdentity) security.invalidate();
    }
  }
  return {
    request,
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

const transport = createApiTransport(
  undefined,
  csrfCoordinator,
  authenticationFailures,
);

export const apiRequest = transport.request;
export const bootstrapCsrf = transport.csrf;
// HMR replaces the instance rather than accumulating interceptors or retaining old proof.
if (import.meta.hot) import.meta.hot.dispose(() => transport.dispose());
