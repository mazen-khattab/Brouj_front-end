import * as cities from "../Services/Cities";
import * as areas from "../Services/Areas";
import * as projects from "../Services/Projects";
import * as units from "../Services/Units";
import type { AreaDto, CityDto, ProjectDto, UnitDto, CityInput, AreaInput, ProjectInput, UnitInput, AmenityDto } from "../Types/contracts";
import { isGuid } from "../Catalogue/query";

export type Kind = "city" | "area" | "project" | "unit";
export type RecordData = CityDto | AreaDto | ProjectDto | UnitDto;
export type Draft = Record<string, string>;
export const inputKeys = {
  city: ["name"],
  area: ["name", "cityId"],
  project: [
    "name",
    "areaId",
    "description",
    "latitude",
    "longitude",
    "size",
    "projectType",
    "price",
    "floorCount",
    "plannedUnitCount",
    "neighborPrice",
    "drawDate",
  ],
  unit: ["number", "meterPrice", "floorNumber", "size", "neighborMeterPrice"],
} as const;

/** Select approved input fields explicitly. Detail DTOs contain fields the API rejects on PATCH. */
export function draftFrom(kind: Kind, data?: RecordData): Draft {
  const source = data as unknown as Record<string, unknown> | undefined;
  return Object.fromEntries(inputKeys[kind].map((key) => [key, source?.[key] == null ? (key === "projectType" ? "0" : "") : String(source[key])]));
}

export function cityInput(d: Draft): CityInput {
  return { name: d.name! };
}

export function areaInput(d: Draft): AreaInput {
  return { name: d.name!, cityId: d.cityId! };
}

function optionalNumber(value: string | undefined) {
  return value?.trim() ? Number(value) : null;
}

export function projectInput(d: Draft): ProjectInput {
  return {
    name: d.name!,
    areaId: d.areaId!,
    description: d.description || null,
    latitude: optionalNumber(d.latitude),
    longitude: optionalNumber(d.longitude),
    size: Number(d.size),
    projectType: Number(d.projectType) as 0 | 1,
    price: Number(d.price),
    floorCount: Number(d.floorCount),
    plannedUnitCount: Number(d.plannedUnitCount),
    neighborPrice: optionalNumber(d.neighborPrice),
    drawDate: d.drawDate || null,
  };
}

export function unitInput(d: Draft): UnitInput {
  return {
    number: d.number!,
    meterPrice: Number(d.meterPrice),
    floorNumber: Number(d.floorNumber),
    size: Number(d.size),
    neighborMeterPrice: optionalNumber(d.neighborMeterPrice),
  };
}

// The exact decimal text is checked before converting to the API's JSON number representation.
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

/** Match the server's ceiling to cents without rounding a large amount through a JS float. */
export function unitTotalFits(size: string, meterPrice: string) {
  if (!decimal(size, 18, 4) || !decimal(meterPrice, 19, 4)) {
    return false;
  }
  const cents = (scaled(size) * scaled(meterPrice) + 999999n) / 1000000n;
  return cents <= 99999999999999999n;
}

export function invalidFields(kind: Kind, d: Draft): string[] {
  const invalid = new Set<string>();
  for (const key of inputKeys[kind]) {
    const value = d[key] ?? "";
    if (key === "name" || key === "number") {
      if (!value.trim() || value.length > (key === "number" ? 64 : 100)) {
        invalid.add(key);
      }
    } else if (key.endsWith("Id")) {
      if (!isGuid(value)) {
        invalid.add(key);
      }
    } else if (key === "description") {
      if (value.length > 20000) {
        invalid.add(key);
      }
    } else if (key === "drawDate") {
      if (value && !validOffsetDate(value)) {
        invalid.add(key);
      }
    } else if (key === "latitude" || key === "longitude") {
      if (value && (!Number.isFinite(Number(value)) || Math.abs(Number(value)) > (key === "latitude" ? 90 : 180))) {
        invalid.add(key);
      }
    } else if (key === "projectType") {
      if (!["0", "1"].includes(value)) {
        invalid.add(key);
      }
    } else if (["floorCount", "plannedUnitCount", "floorNumber"].includes(key)) {
      if (!/^\d+$/.test(value) || Number(value) > 2147483647) {
        invalid.add(key);
      }
    } else {
      const nullable = ["neighborPrice", "neighborMeterPrice"].includes(key);
      if (!(nullable && value === "") && (!decimal(value, key === "size" ? 18 : 19, 4) || (key === "size" && Number(value) <= 0))) {
        invalid.add(key);
      }
    }
  }
  if (kind === "project") {
    if (d.projectType === "1") {
      if (!d.neighborPrice) {
        invalid.add("neighborPrice");
      }
      if (!d.drawDate) {
        invalid.add("drawDate");
      }
      if (!(Number(d.price) > 0)) {
        invalid.add("price");
      }
    } else {
      if (d.neighborPrice) {
        invalid.add("neighborPrice");
      }
      if (d.drawDate) {
        invalid.add("drawDate");
      }
    }
  }
  if (kind === "unit" && !unitTotalFits(d.size ?? "", d.meterPrice ?? "")) {
    invalid.add("meterPrice");
  }
  return [...invalid];
}

export async function readRecord(kind: Kind, id: string, projectId: string, signal: AbortSignal): Promise<RecordData> {
  switch (kind) {
    case "city":
      return cities.getCityById({ id }, { signal });
    case "area":
      return areas.getAreaById({ id }, { signal });
    case "project":
      return projects.getProjectById({ id }, { signal });
    case "unit":
      return units.getUnitById({ id, query: { projectId } }, { signal });
  }
}

export async function saveRecord(kind: Kind, d: Draft, id: string | undefined, projectId: string, signal: AbortSignal) {
  switch (kind) {
    case "city":
      return id ? cities.updateCity({ id, body: cityInput(d) }, { signal }) : cities.createCity({ body: cityInput(d) }, { signal });
    case "area":
      return id ? areas.updateArea({ id, body: areaInput(d) }, { signal }) : areas.createArea({ body: areaInput(d) }, { signal });
    case "project":
      return id ? projects.updateProject({ id, body: projectInput(d) }, { signal }) : projects.createProject({ body: projectInput(d) }, { signal });
    case "unit":
      return id
        ? units.updateUnit({ id, query: { projectId }, body: unitInput(d) }, { signal })
        : units.createUnit({ projectId, body: unitInput(d) }, { signal });
  }
}

export async function deleteRecord(kind: Kind, id: string, projectId: string, signal: AbortSignal) {
  switch (kind) {
    case "city":
      return cities.deleteCity({ id }, { signal });
    case "area":
      return areas.deleteArea({ id }, { signal });
    case "project":
      return projects.deleteProject({ id }, { signal });
    case "unit":
      return units.deleteUnit({ id, query: { projectId } }, { signal });
  }
}

export async function readAffectedList(kind: Kind, projectId: string, signal: AbortSignal) {
  const query = { pageNumber: 1, pageSize: 20 };
  switch (kind) {
    case "city":
      return cities.getCities({ query }, { signal });
    case "area":
      return areas.getAreas({ query }, { signal });
    case "project":
      return projects.getProjects({ query }, { signal });
    case "unit":
      return units.getUnitsByProject({ projectId, query }, { signal });
  }
}

export async function replaceAmenities(kind: Exclude<Kind, "city">, id: string, amenities: AmenityDto[], signal: AbortSignal) {
  const service = kind === "area" ? areas.replaceAreaAmenities : kind === "project" ? projects.replaceProjectAmenities : units.replaceUnitAmenities;
  return service({ id, body: { amenities: amenities.map(({ name, value }) => ({ name, value })) } }, { signal });
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

export function detailPath(kind: Kind, id: string, projectId = "") {
  return kind === "unit"
    ? `/admin/catalogue/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(id)}`
    : `/admin/catalogue/${kind === "city" ? "cities" : kind === "area" ? "areas" : "projects"}/${encodeURIComponent(id)}`;
}
