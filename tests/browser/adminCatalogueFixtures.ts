import type { BrowserContext } from "@playwright/test";
import { routingServer } from "./routingFixtures";
import { sessionCors } from "./sessionFixtures";
import { catalogueIds, catalogueProject, catalogueUnit } from "./catalogueFixtures";
import type { AreaDto, CityDto, ImageMetadataDto, ProjectDto, UnitDto } from "../../src/Types/contracts";

export const imageId = "60000000-0000-4000-8000-000000000001";

export async function adminCatalogueServer(context: BrowserContext) {
  const session = await routingServer(context, "admin");
  const cities = new Map<string, CityDto>([
    [catalogueIds.city, { id: catalogueIds.city, name: "Cairo" }],
    [catalogueIds.city2, { id: catalogueIds.city2, name: "Alexandria" }],
  ]);
  const areas = new Map<string, AreaDto>([
    [
      catalogueIds.area,
      {
        id: catalogueIds.area,
        name: "East Quarter",
        cityId: catalogueIds.city,
        cityName: "Cairo",
        amenities: [{ name: "Transport", value: "Nearby" }],
      },
    ],
  ]);
  const projects = new Map<string, ProjectDto>([
    [catalogueIds.project, { ...catalogueProject, images: [{ id: imageId, imagePath: "PRIVATE-STORAGE/project.webp", altText: "Supplied photo" }] }],
  ]);
  const units = new Map<string, UnitDto>([[catalogueIds.unit, { ...catalogueUnit, images: [] }]]);
  const calls: { method: string; url: URL; body: unknown; raw: string }[] = [];
  const state = { failNext: 0, failReads: false, delayWrite: 0, removeImageOnConflict: false, extraParents: false };
  let sequence = 10;
  const cors = {
    ...sessionCors,
    "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, X-CSRF-TOKEN",
  };
  await context.route(/https:\/\/localhost:7249\/api\/v1\/(?:admin\/)?(?:cities|areas|projects|units)(?:\/|\?|$)/, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }
    const raw = request.postDataBuffer()?.toString("utf8") ?? "";
    const body = raw.startsWith("{") ? (request.postDataJSON() as Record<string, unknown>) : {};
    calls.push({ method, url, body, raw });
    const ok = (data: unknown) => route.fulfill({ headers: cors, json: { success: true, data, message: null } });
    const fail = (status: number) =>
      route.fulfill({
        status,
        headers: { ...cors, ...(status === 429 ? { "retry-after": "1" } : {}) },
        json: { status, ...(status === 400 ? { errors: { "Input.Name": ["Invalid value"] } } : {}) },
      });
    const path = url.pathname
      .replace("/api/v1/", "")
      .replace(/^admin\//, "")
      .split("/");
    const collection = path[0]!,
      id = path[1] ?? "";
    if (method === "GET") {
      if (state.failReads) {
        return fail(503);
      }
      const paging = <T extends { name?: string; number?: string }>(items: T[]) => {
        const pageNumber = Number(url.searchParams.get("pageNumber") ?? 1),
          pageSize = Number(url.searchParams.get("pageSize") ?? 20),
          search = url.searchParams.get("search")?.toLowerCase() ?? "";
        const filtered = items.filter((row) => (row.name ?? row.number ?? "").toLowerCase().includes(search));
        return ok({
          items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
          pageNumber,
          pageSize,
          totalCount: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize),
        });
      };
      if (collection === "projects" && path[2] === "units") {
        return paging([...units.values()].filter((unit) => unit.projectId === id));
      }
      if (collection === "cities" && path[2] === "areas") {
        return paging([...areas.values()].filter((area) => area.cityId === id));
      }
      if (collection === "cities") {
        if (id) {
          return cities.has(id) ? ok(cities.get(id)) : fail(404);
        }
        return paging([
          ...cities.values(),
          ...(state.extraParents
            ? Array.from({ length: 22 }, (_, i) => ({ id: `10000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`, name: `Parent ${i}` }))
            : []),
        ]);
      }
      if (collection === "areas") {
        return id ? (areas.has(id) ? ok(areas.get(id)) : fail(404)) : paging([...areas.values()]);
      }
      if (collection === "projects") {
        return id
          ? projects.has(id)
            ? ok(projects.get(id))
            : fail(404)
          : paging(
              [...projects.values()].map((project) => ({ ...project, areaName: areas.get(project.areaId)?.name ?? "", cityId: catalogueIds.city })),
            );
      }
      if (collection === "units") {
        return units.has(id) && units.get(id)?.projectId === url.searchParams.get("projectId") ? ok(units.get(id)) : fail(404);
      }
      return fail(404);
    }
    if (state.delayWrite) {
      await new Promise((resolve) => setTimeout(resolve, state.delayWrite));
    }
    if (state.failNext) {
      const status = state.failNext;
      state.failNext = 0;
      if (status === 409 && state.removeImageOnConflict) {
        const project = projects.get(catalogueIds.project)!;
        projects.set(catalogueIds.project, { ...project, images: [] });
      }
      return fail(status);
    }
    const nextId = () => `90000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    if (collection === "projects" && path[2] === "units" && method === "POST") {
      const created = nextId();
      units.set(created, { ...catalogueUnit, ...body, id: created, projectId: id, images: [], amenities: [] });
      return ok(created);
    }
    if (path[2] === "amenities") {
      if (collection === "areas") {
        areas.set(id, { ...areas.get(id)!, ...body });
      }
      if (collection === "projects") {
        projects.set(id, { ...projects.get(id)!, ...body });
      }
      if (collection === "units") {
        units.set(id, { ...units.get(id)!, ...body });
      }
      return ok(id);
    }
    if (path[2] === "images") {
      const record = collection === "projects" ? projects.get(id) : units.get(id);
      if (!record) {
        return fail(404);
      }
      const child = path[3] ?? nextId();
      let images: readonly ImageMetadataDto[] = record.images;
      if (method === "POST") {
        images = [...images, { id: child, imagePath: "PRIVATE-STORAGE/upload.png", altText: null }];
      }
      if (method === "PATCH") {
        images = images.map((image) => (image.id === child ? { ...image, altText: body.altText as string | null } : image));
      }
      if (method === "DELETE") {
        images = images.filter((image) => image.id !== child);
      }
      if (collection === "projects") {
        projects.set(id, { ...projects.get(id)!, images });
      } else {
        units.set(id, { ...units.get(id)!, images });
      }
      return ok(child);
    }
    if (collection === "units" && url.searchParams.get("projectId") !== units.get(id)?.projectId) {
      return fail(400);
    }
    if (method === "DELETE") {
      if (collection === "cities" && [...areas.values()].some((area) => area.cityId === id)) {
        return fail(409);
      }
      if (collection === "areas" && [...projects.values()].some((project) => project.areaId === id)) {
        return fail(409);
      }
      if (collection === "cities") {
        cities.delete(id);
      }
      if (collection === "areas") {
        areas.delete(id);
      }
      if (collection === "projects") {
        projects.delete(id);
      }
      if (collection === "units") {
        units.delete(id);
      }
      return ok(id);
    }
    const savedId = id || nextId();
    if (collection === "cities") {
      cities.set(savedId, { id: savedId, name: body.name as string });
    }
    if (collection === "areas") {
      areas.set(savedId, {
        amenities: [],
        ...areas.get(savedId),
        ...body,
        id: savedId,
        cityName: cities.get(body.cityId as string)?.name ?? "",
      } as AreaDto);
    }
    if (collection === "projects") {
      projects.set(savedId, { ...catalogueProject, images: [], amenities: [], ...projects.get(savedId), ...body, id: savedId });
    }
    if (collection === "units") {
      units.set(savedId, { ...units.get(savedId)!, ...body });
    }
    return ok(savedId);
  });
  return { state, calls, cities, areas, projects, units, session };
}
