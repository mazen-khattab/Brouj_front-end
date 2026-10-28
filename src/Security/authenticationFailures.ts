import type { ApiFailure } from "../Types/failures";
import type { RequestMetadata } from "../Types/transport";
export interface AuthenticationFailureEvent {
  readonly failure: ApiFailure;
  readonly metadata: RequestMetadata;
  readonly generation: number;
}
type Listener = (event: AuthenticationFailureEvent) => void | Promise<void>;
/** Optional failure observation; sessionBoundary independently coordinates bounded recovery. */
export function createAuthenticationFailureChannel() {
  let listener: Listener | undefined;
  return {
    subscribe(next: Listener) {
      listener = next;
      return () => {
        if (listener === next) listener = undefined;
      };
    },
    async notify(event: AuthenticationFailureEvent) {
      try {
        await listener?.(event);
      } catch {
        /* Never replace the original request failure. */
      }
    },
    clear() {
      listener = undefined;
    },
  };
}
export const authenticationFailures = createAuthenticationFailureChannel();
