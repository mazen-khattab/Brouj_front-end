import { ApiError } from "../Types/failures";
import type { RequestMetadata } from "../Types/transport";

export interface SessionStamp {
  generation: number;
  revision: number;
}
export interface SessionBoundaryHandler {
  stamp(): SessionStamp;
  assertRequest(metadata: RequestMetadata, unsafe: boolean): void;
  enter(metadata: RequestMetadata, unsafe: boolean): () => void;
  signal(metadata: RequestMetadata): AbortSignal | undefined;
  recover(stamp: SessionStamp): Promise<boolean>;
  rejected(stamp: SessionStamp): void;
}

/** API depends on this plain boundary; the service-backed coordinator binds from the provider. */
export function createSessionBoundary() {
  let handler: SessionBoundaryHandler | undefined;
  return {
    bind(next: SessionBoundaryHandler) {
      handler = next;
      return () => {
        if (handler === next) handler = undefined;
      };
    },
    stamp: () => handler?.stamp(),
    assert(metadata: RequestMetadata, unsafe: boolean, stamp?: SessionStamp) {
      if (stamp && handler && stamp.generation !== handler.stamp().generation)
        throw new ApiError("canceled");
      handler?.assertRequest(metadata, unsafe);
    },
    enter: (metadata: RequestMetadata, unsafe: boolean) =>
      handler?.enter(metadata, unsafe) ?? (() => {}),
    signal: (metadata: RequestMetadata) => handler?.signal(metadata),
    recover: (stamp: SessionStamp) =>
      handler?.recover(stamp) ?? Promise.resolve(false),
    rejected: (stamp: SessionStamp) => handler?.rejected(stamp),
  };
}
export const sessionBoundary = createSessionBoundary();
