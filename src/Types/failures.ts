import { FeatureErrorCode } from "./contracts";

export type FailureKind =
  | "feature"
  | "transport"
  | "network"
  | "canceled"
  | "unknown";

export type FieldErrors = Readonly<Record<string, ReadonlyArray<string>>>;

export interface ApiFailure {
  readonly kind: FailureKind;
  readonly status: number | undefined;
  readonly featureCode: FeatureErrorCode | undefined;
  readonly fieldErrors: FieldErrors;
  /** Seconds until a caller may offer a manual retry; never an automatic replay. */
  readonly retryAfter: number | undefined;
  readonly diagnosticTrace: string | undefined;
}

/** Fixed messages exclude server text, credentials and Axios request/config objects. */
export class ApiError extends Error implements ApiFailure {
  readonly kind: FailureKind;
  readonly status: number | undefined;
  readonly featureCode: FeatureErrorCode | undefined;
  readonly fieldErrors: FieldErrors;
  readonly retryAfter: number | undefined;
  readonly diagnosticTrace: string | undefined;
  constructor(
    kind: FailureKind,
    details: Partial<Omit<ApiFailure, "kind">> = {},
  ) {
    super(
      kind === "canceled"
        ? "Request canceled."
        : "The request could not be completed.",
    );
    this.name = "ApiError";
    this.kind = kind;
    this.status = details.status;
    this.featureCode = details.featureCode;
    this.fieldErrors = details.fieldErrors ?? {};
    this.retryAfter = details.retryAfter;
    this.diagnosticTrace = details.diagnosticTrace;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .filter(
        ([field, messages]) =>
          /^[a-zA-Z0-9_.[\]-]{1,128}$/.test(field) &&
          Array.isArray(messages) &&
          messages.length <= 10 &&
          messages.every(
            (message: unknown) =>
              typeof message === "string" &&
              message.length <= 512 &&
              !Array.from(message).some(
                (character) => character.charCodeAt(0) < 32,
              ) &&
              !/\bat\s+\S+\([^)]*\)|System\.\w*Exception/.test(message),
          ),
      ),
  ) as FieldErrors;
}

export function parseRetryAfter(
  value: unknown,
  now = Date.now(),
): number | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) ? seconds : undefined;
  }
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), .+ GMT$/.test(trimmed))
    return undefined;
  const instant = Date.parse(trimmed);
  return Number.isFinite(instant)
    ? Math.max(0, Math.ceil((instant - now) / 1000))
    : undefined;
}

export function failureFromResponse(
  status: number,
  body: unknown,
  retryAfter?: unknown,
): ApiError {
  const feature = isRecord(body) && body.success === false;
  const code =
    feature &&
    typeof body.code === "number" &&
    body.code !== FeatureErrorCode.None &&
    (Object.values(FeatureErrorCode) as number[]).includes(body.code)
      ? (body.code as FeatureErrorCode)
      : undefined;
  const trace =
    isRecord(body) &&
    typeof body.traceId === "string" &&
    /^[A-Za-z0-9:._-]{1,128}$/.test(body.traceId)
      ? body.traceId
      : undefined;
  return new ApiError(feature ? "feature" : "transport", {
    status,
    featureCode: code,
    fieldErrors: status < 500 && isRecord(body) ? fieldErrors(body.errors) : {},
    retryAfter: status === 429 ? parseRetryAfter(retryAfter) : undefined,
    diagnosticTrace: trace,
  });
}
