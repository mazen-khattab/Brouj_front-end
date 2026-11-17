import type { ApiFailure } from "../Types/failures";

/** A missing/ambiguous response requires a read before another mutation can be attempted. */
export function uncertainWrite(failure: ApiFailure) {
  return (
    failure.status === undefined ||
    failure.kind === "network" ||
    failure.kind === "canceled" ||
    failure.status >= 500 ||
    (failure.status >= 200 && failure.status < 300)
  );
}
