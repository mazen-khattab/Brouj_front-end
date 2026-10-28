export interface RequestOptions {
  signal?: AbortSignal;
}
/** RFC Problem Details is distinct from the feature failure envelope. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Readonly<Record<string, ReadonlyArray<string>>>;
  [extension: string]: unknown;
}
export interface RequestMetadata {
  readonly operation: string;
  readonly authenticated: boolean;
  readonly skipAuthenticationRecovery: boolean;
  /** Clear proof after an attempted identity change; no replay is implied. */
  readonly changesIdentity?: boolean;
}
export interface ApiRequest extends RequestOptions {
  method: "GET" | "HEAD" | "OPTIONS" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Readonly<Record<string, string | number | boolean>>;
  body?: unknown;
  metadata: RequestMetadata;
}
