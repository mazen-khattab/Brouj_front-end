import type { UnitDraft, UnitProject } from "./types";
import { isGuid } from "../../../Services/identifiers";
import type { AmenityDto } from "../../../Types/contracts";

function decimal(value: string, precision: number, scale: number) {
  const match = /^\+?(\d+)(?:\.(\d+))?$/.exec(value);
  return Boolean(
    match && match[1]!.replace(/^0+/, "").length <= precision - scale && (match[2]?.length ?? 0) <= scale && Number.isFinite(Number(value)),
  );
}

function scaled(value: string) {
  const [whole = "0", fraction = ""] = value.replace(/^\+/, "").split(".");
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
}

export function unitTotalFits(size: string, meterPrice: string) {
  if (!decimal(size, 18, 4) || !decimal(meterPrice, 19, 4)) {
    return false;
  }
  const cents = (scaled(size) * scaled(meterPrice) + 999999n) / 1000000n;
  return cents <= 99999999999999999n;
}

export function invalidFields(d: UnitDraft, project?: UnitProject): string[] {
  const invalid = new Set<string>();
  if (!isGuid(d.projectId)) invalid.add("projectId");
  if (!d.number.trim() || d.number.length > 64) invalid.add("number");
  if (!decimal(d.meterPrice, 19, 4)) invalid.add("meterPrice");
  if (!/^\d+$/.test(d.floorNumber) || Number(d.floorNumber) > 2147483647) invalid.add("floorNumber");
  if (!decimal(d.size, 18, 4) || Number(d.size) <= 0) invalid.add("size");
  if (d.neighborMeterPrice !== "" && !decimal(d.neighborMeterPrice, 19, 4)) invalid.add("neighborMeterPrice");
  if (!unitTotalFits(d.size, d.meterPrice)) invalid.add("meterPrice");
  if (project?.projectType === 1 && (!d.neighborMeterPrice || Number(d.size) * Number(d.meterPrice) > project.price)) {
    invalid.add("neighborMeterPrice");
  }
  if (project?.projectType === 0 && d.neighborMeterPrice) invalid.add("neighborMeterPrice");
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
