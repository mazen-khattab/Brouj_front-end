/** Pick approved keys, preserve false/zero and omit unused nullable filters. */
export function approvedQuery<T extends object>(
  query: T | undefined,
  keys: ReadonlyArray<keyof T>,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const key of keys) {
    const value = query?.[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    )
      result[String(key)] = value;
  }
  return result;
}
