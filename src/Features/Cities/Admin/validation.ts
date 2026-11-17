import type { CityDraft } from "./types";

export function invalidFields(d: CityDraft): string[] {
  return !d.name.trim() || d.name.length > 100 ? ["name"] : [];
}
