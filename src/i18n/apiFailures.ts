import { FeatureErrorCode } from "../Types/contracts";
import type { ApiFailure } from "../Types/failures";
import type { TranslationMessage } from "./resources";

const featureKeys = {
  1: "invalidCredentials",
  2: "notFound",
  3: "projectHasReservations",
  4: "notFound",
  5: "notFound",
  6: "reservationAlreadyActive",
  7: "reservationAlreadyCancelled",
  8: "notFound",
  9: "orderAlreadyCompleted",
  10: "forbidden",
  11: "notFound",
  12: "conflict",
  13: "invalidInput",
  14: "notFound",
  15: "conflict",
  16: "invalidInput",
  17: "notFound",
  18: "conflict",
  19: "invalidInput",
  20: "notFound",
  21: "conflict",
  22: "invalidInput",
  23: "conflict",
  24: "invalidInput",
  25: "conflict",
  26: "invalidInput",
  27: "conflict",
  28: "invalidInput",
  29: "conflict",
  30: "invalidInput",
  31: "notFound",
  32: "conflict",
  33: "invalidInput",
  34: "notFound",
  35: "conflict",
  36: "invalidInput",
  37: "notFound",
  38: "conflict",
  39: "invalidInput",
  40: "notFound",
  41: "conflict",
  42: "invalidInput",
  43: "notFound",
  44: "conflict",
  45: "invalidInput",
} satisfies Record<Exclude<FeatureErrorCode, 0>, string>;

/** Presentation chooses local text; raw backend messages/details are never a fallback. */
export function apiFailureMessage(
  failure: ApiFailure,
): TranslationMessage & { namespace: "errors" } {
  const code = failure.featureCode;
  if (
    code !== undefined &&
    code !== FeatureErrorCode.None &&
    Object.hasOwn(featureKeys, code)
  ) {
    return { namespace: "errors", key: featureKeys[code] };
  }
  if (failure.kind === "feature")
    return { namespace: "errors", key: "generic" };
  const statuses: Record<number, string> = {
    400: "invalidInput",
    401: "authenticationRequired",
    403: "forbidden",
    404: "notFound",
    409: "conflict",
    413: "payloadTooLarge",
    415: "unsupportedContent",
    429: "rateLimited",
  };
  return {
    namespace: "errors",
    key:
      (failure.status !== undefined ? statuses[failure.status] : undefined) ??
      (failure.kind === "network"
        ? "network"
        : failure.kind === "canceled"
          ? "canceled"
          : "generic"),
  };
}
