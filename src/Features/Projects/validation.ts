import type { ProjectDraft } from "./types";
import { isGuid } from "../../Services/identifiers";
import type { AmenityDto } from "../../Types/contracts";

function decimal(value: string, precision: number, scale: number) {
  const match = /^\+?(\d+)(?:\.(\d+))?$/.exec(value);
  return Boolean(
    match && match[1]!.replace(/^0+/, "").length <= precision - scale && (match[2]?.length ?? 0) <= scale && Number.isFinite(Number(value)),
  );
}

function validOffsetDate(value: string) {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,7})?(Z|[+-](\d\d):(\d\d))$/.exec(value);
  if (!match || Number(match[1]) < 1 || !Number.isFinite(Date.parse(value))) {
    return false;
  }
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  const zoneHours = Number(match[8] ?? 0),
    zoneMinutes = Number(match[9] ?? 0);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]) &&
    Number(match[4]) < 24 &&
    Number(match[5]) < 60 &&
    Number(match[6]) < 60 &&
    zoneHours <= 14 &&
    zoneMinutes < 60 &&
    (zoneHours !== 14 || zoneMinutes === 0)
  );
}

export function invalidFields(d: ProjectDraft): string[] {
  const invalid = new Set<string>();
  if (!d.name.trim() || d.name.length > 100) invalid.add("name");
  if (!isGuid(d.areaId)) invalid.add("areaId");
  if (d.description.length > 20000) invalid.add("description");
  if (d.latitude && (!Number.isFinite(Number(d.latitude)) || Math.abs(Number(d.latitude)) > 90)) invalid.add("latitude");
  if (d.longitude && (!Number.isFinite(Number(d.longitude)) || Math.abs(Number(d.longitude)) > 180)) invalid.add("longitude");
  if (!decimal(d.size, 18, 4) || Number(d.size) <= 0) invalid.add("size");
  if (!["0", "1"].includes(d.projectType)) invalid.add("projectType");
  if (!decimal(d.price, 19, 4)) invalid.add("price");
  if (!/^\d+$/.test(d.floorCount) || Number(d.floorCount) > 2147483647) invalid.add("floorCount");
  if (!/^\d+$/.test(d.plannedUnitCount) || Number(d.plannedUnitCount) > 2147483647) invalid.add("plannedUnitCount");
  if (d.neighborPrice !== "" && !decimal(d.neighborPrice, 19, 4)) invalid.add("neighborPrice");
  if (d.drawDate && !validOffsetDate(d.drawDate)) invalid.add("drawDate");
  if (d.projectType === "1") {
    if (!d.neighborPrice) invalid.add("neighborPrice");
    if (!d.drawDate) invalid.add("drawDate");
    if (!(Number(d.price) > 0)) invalid.add("price");
  } else {
    if (d.neighborPrice) invalid.add("neighborPrice");
    if (d.drawDate) invalid.add("drawDate");
  }
  return [...invalid];
}

export function validAmenities(items: AmenityDto[]) {
  return items.length <= 100 && items.every(({ name, value }) => name.trim() && name.length <= 100 && value.trim() && value.length <= 32);
}

export function fileIssue(file: File): "fileSize" | "fileType" | undefined {
  if (file.size < 1 || file.size > 5 * 1024 * 1024) {
    return "fileSize";
  }
  const formats: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  if (
    file.name.length > 255 ||
    /[/\\:]|\.\./.test(file.name) ||
    [...file.name].some((letter) => letter.charCodeAt(0) < 32 || letter.charCodeAt(0) === 127) ||
    formats[file.name.split(".").at(-1)?.toLowerCase() ?? ""] !== file.type
  ) {
    return "fileType";
  }
  return undefined;
}
