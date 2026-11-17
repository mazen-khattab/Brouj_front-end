import type { AreaDraft } from "./types";
import { isGuid } from "../../../Services/identifiers";
import type { AmenityDto } from "../../../Types/contracts";

export function invalidFields(d: AreaDraft): string[] {
  const errors: string[] = [];
  if (!d.name.trim() || d.name.length > 100) errors.push("name");
  if (!isGuid(d.cityId)) errors.push("cityId");
  return errors;
}

export function validAmenities(items: AmenityDto[]) {
  return items.length <= 100 && items.every(({ name, value }) => name.trim() && name.length <= 100 && value.trim() && value.length <= 32);
}
