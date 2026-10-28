import { bootstrapCsrf } from "../API";
import type { RequestOptions } from "../Types/transport";
/** Identity-bound proof stays in memory; concurrent callers share one bootstrap. */
export function getCsrfProof(options: RequestOptions = {}): Promise<string> {
  return bootstrapCsrf(options.signal);
}
export { invalidateCsrfProof, sessionGeneration } from "../Security/csrf";
