# Simple Guide: How `InitiativeProjects.tsx` Fetches Data from the Backend

## 1. What This File Is (In Simple Terms)
[`src/Components/Home/InitiativeProjects.tsx`](../src/Components/Home/InitiativeProjects.tsx) is a React component that displays the **"Initiative Projects" carousel** on the Brouj homepage. It shows up to 3 special projects at a time with buttons to page forward and backward.

Crucially, **the component does not fetch data directly from the network itself**. Instead, it follows a clean layered architecture where it asks a specialized hook (`useHome()`) for data, which delegates to a backend service, which in turn calls the API via HTTP.

---

## 2. The 5-Layer Journey (From Screen to Server and Back)

When a user visits the homepage, data flows through five simple layers:

```
[1. InitiativeProjects.tsx]   (UI Component)
          │
          ▼ asks for data via useHome()
[2. HomeProvider.tsx]         (Context & State Manager)
          │
          ▼ delegates fetching to
[3. useCatalogueRead.ts]      (Lifecycle, Loading & Cancellation Hook)
          │
          ▼ calls
[4. Projects.ts: getProjects] (Typed API Service)
          │
          ▼ sends HTTP GET request
[5. API.tsx: apiRequest]      (Axios HTTP Client)
          │
          ▼ Network Call
   [Backend Server]           (GET /api/v1/projects?projectType=1&pageSize=3)
```

---

## 3. Step-by-Step Breakdown

### Step 1: The Component Asks for Data (`InitiativeProjects.tsx`)
Inside [`src/Components/Home/InitiativeProjects.tsx`](../src/Components/Home/InitiativeProjects.tsx), line 17:
```tsx
const { projects, reloadProjects, page, changePage } = useHome();
```
The component says: *"Give me the current list of projects, the current page number, and functions to change the page or reload if something fails."*

It passes the `projects` object to `<CatalogueFeedback>`:
- If `status === 'loading'`, it renders a skeleton/loading placeholder.
- If `status === 'error'`, it renders an error message with a **Retry** button.
- If `status === 'success'`, it maps over the 3 projects and displays their name, image placeholder, area, and link.

---

### Step 2: The Context Coordinates State (`HomeProvider.tsx`)
The homepage is wrapped in [`src/Context/HomeProvider.tsx`](../src/Context/HomeProvider.tsx). This file maintains the active carousel page state:
```tsx
const [page, changePage] = useState(1);
```
Whenever `page` changes (or when the component first loads), it prepares a loader callback with the exact query parameters needed by the backend:
```tsx
const loadProjects = useCallback((signal: AbortSignal) => getProjects({
  query: { projectType: ProjectType.Initiative, pageNumber: page, pageSize: 3 },
}, { signal }), [page]);
```
- `projectType: ProjectType.Initiative` (value `1`): Tells the backend to filter only initiative projects (excluding standard projects).
- `pageNumber: page`: Which page we want (1, 2, 3...).
- `pageSize: 3`: Ensures the backend only returns 3 cards for the carousel viewport.

---

### Step 3: The Safe-Fetch Hook Manages the Request Lifecycle (`useCatalogueRead.ts`)
[`src/Hooks/useCatalogueRead.ts`](../src/Hooks/useCatalogueRead.ts) is the traffic controller. It receives `loadProjects`:
1. It creates an `AbortController`. If the user rapidly clicks "Next" while the previous page is still loading, it cancels the previous request so stale data doesn't overwrite new data.
2. It sets the status to `"loading"`.
3. It calls `loadProjects(signal)`.

---

### Step 4: The Service Builds the Query (`src/Services/Projects.ts`)
The function `getProjects()` translates the parameters into a verified API contract:
```tsx
export async function getProjects(
  args: { query?: GetProjectsParameters } = {},
  options: RequestOptions = {},
): Promise<PaginationResult<ProjectListDto>> {
  return apiRequest<PaginationResult<ProjectListDto>>({
    method: "GET",
    path: apiPaths.Projects.getProjects, // "/api/v1/projects"
    query: approvedQuery(args.query, ["pageNumber", "pageSize", "search", "cityId", "areaId", "projectType"]),
    metadata: { operation: "GetProjects", authenticated: false },
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
```
It ensures only allowed query parameters are attached and passes the request down to the HTTP transport layer.

---

### Step 5: The HTTP Transport Dispatches the Network Call (`src/API.tsx`)
[`src/API.tsx`](../src/API.tsx) takes the URL and query parameters and uses **Axios** to send an HTTP request:
- **Method:** `GET`
- **URL:** `https://api.brouj.com/api/v1/projects?projectType=1&pageNumber=1&pageSize=3`
- **Headers:** `Accept: application/json`

When the backend responds:
- **HTTP 200 OK:** The JSON response contains `{ items: [...], totalCount: 12, totalPages: 4, pageNumber: 1, pageSize: 3 }`.
- `useCatalogueRead` receives this data and updates its state to `{ status: "success", data }`.
- `InitiativeProjects.tsx` re-renders with the real project cards and updates the carousel count (e.g., "1 of 4").
- If the network fails or the server returns an error, `apiRequest` catches it, standardizes it into a typed `ApiError`, and `CatalogueFeedback` shows the error banner with a retry button.

---

## 4. What Would Happen Without This Structure?
If this separation didn't exist and `InitiativeProjects.tsx` fetched data directly using `useEffect` and `fetch()`:
1. **Race conditions / Stale Data:** Clicking "Next" quickly could cause responses to arrive out of order, displaying page 1 items when the user is already on page 3.
2. **Duplicated Code:** Loading states, error banners, retry logic, and pagination bounds would have to be re-implemented by hand in every component.
3. **Tight Coupling:** Any change to backend routes or query parameter formats would require modifying UI presentation files directly rather than a single typed service file.
