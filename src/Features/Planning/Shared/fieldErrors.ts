import type { ApiError } from "../../../Types/failures";

/** Match server fields only against controls explicitly declared by the caller. */
export function planningFieldErrors<Key extends string>(failure: ApiError | undefined, keys: readonly Key[]): Key[] {
  const names = Object.keys(failure?.fieldErrors ?? {}).map(key => key.split(".").at(-1)?.toLowerCase());
  return keys.filter(key => names.includes(key.toLowerCase()));
}
