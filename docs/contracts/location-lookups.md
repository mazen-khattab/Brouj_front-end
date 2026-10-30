# Location lookup additions

Verified against the live backend source on 2026-10-30 for the owner's project-filter redesign. These additions supplement the original generated 101-operation snapshot.

| Operation | Request | Response data |
|---|---|---|
| `GET /api/v1/cities/lookup` | Optional `search`, maximum 100 characters | Array of `{ id: Guid, name: string }` |
| `GET /api/v1/areas/lookup` | Optional `search`, maximum 100 characters | Array of `{ id: Guid, name: string }` |

Both operations allow anonymous reads, use the public-read rate-limit policy, and wrap their array in the existing `ApiResponse` envelope. Their handlers search by name and order by name, then ID. They are not paginated. The area request has no city filter and its response does not include a parent city ID; the frontend does not invent either field.

Sources under `F:/Mazen/Projects/Brouj/`:

- `src/Brouj.API/Controllers/CitiesController.cs` and `AreasController.cs`.
- `src/Brouj.API/Requests/GetCitiesLookupParameters.cs` and `GetAreasLookupParameters.cs`.
- `src/Brouj.Application/Common/DTOs/LookupDto.cs`.
- The `GetLookup` query, validator and handler in `Features/Cities/Queries/` and `Features/Areas/Queries/`.

The frontend uses `src/Services/LocationLookups.ts`, `src/Types/lookups.ts` and `src/Router/locationLookupPaths.ts`, through the existing `API.tsx` transport. The original generated service artifacts remain intact. Two adapter-backed service tests verify exact paths, array unwrapping, public metadata, signal forwarding and the Search-only query allowlist.

The automated `contracts:check` script currently stops parsing the backend's UTF-8-BOM-prefixed `Part8.EndpointContracts.json`. A separate read that removes the BOM in memory shows 104 operations, including an additional project lookup outside this request. The original verifier/generator still expects 101. No backend files or historic inventory counts were modified to mask this mismatch. `services:check` passes for the original generated snapshot; a full inventory/generator reconciliation remains separate from these two source-verified additions.
