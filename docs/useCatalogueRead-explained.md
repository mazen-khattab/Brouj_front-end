# Junior Developer Guide: `useCatalogueRead.ts` and the Frontend Architecture

## 1. What is `src/Hooks/useCatalogueRead.ts`? (The Elevator Pitch)

[`src/Hooks/useCatalogueRead.ts`](../src/Hooks/useCatalogueRead.ts) is a **reusable custom React Hook designed to safely read data from the server**.

Whenever a component needs to fetch data (like a project, a city list, or property terms), this hook handles all the messy, difficult parts of async React programming:
- It tracks whether the request is **loading**, **succeeded**, or **failed**.
- It **instantly hides old data** when the user switches to a different item (preventing stale data flashing).
- It **cancels in-flight requests** if the user clicks away or changes parameters quickly (preventing race conditions and memory leaks).
- It gives the component a simple `reload()` button function to re-fetch without writing boilerplate.

---

## 2. Line-by-Line Breakdown: How the 40 Lines Work

Here is the entire file explained line-by-line:

### A. The State Type: `CatalogueRead<T>` (Lines 4–5)

```ts
export type CatalogueRead<T> =
  | { status: "loading" }
  | { status: "idle" }
  | { status: "success"; data: T }
  | { status: "error"; failure: ApiError };
```

#### Why do we use this instead of separate booleans?
In beginner tutorials, people often write:
```ts
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);
```
This causes **impossible states**: What if `loading` is `true` AND `error` is not `null`? What if `data` is present but `loading` is still `true`?
By using a TypeScript **Discriminated Union** (`status`), the component can only ever be in **one exact state at a time**:
- `"idle"`: The request is disabled and has not started.
- `"loading"`: The request is currently in flight.
- `"success"`: The request finished, and `data` is guaranteed to exist.
- `"error"`: The request failed, and `failure` is guaranteed to exist.

---

### B. Hook Parameters and State (Lines 7–9)

```ts
export function useCatalogueRead<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true
) {
  const [revision, refresh] = useReducer((value: number) => value + 1, 0);
  const [stored, setStored] = useState<{ key: string; revision: number; result: CatalogueRead<T> }>();
```

- **`key`**: A unique string identifying what we are reading (e.g. `"admin:parent:project-123"`). If this `key` changes, the hook knows the user selected something else.
- **`load`**: The async function that actually calls the API. It receives an `AbortSignal` so it can cancel the network request if needed.
- **`enabled`**: If `false`, the hook does nothing (useful for conditional fetches, e.g. "only fetch the parent project if kind === 'unit'").
- **`revision`**: An integer incremented whenever `reload()` is called. `useReducer(value => value + 1, 0)` is a standard React pattern for a force-refresh counter.
- **`stored`**: Holds the latest network result *together with the exact `key` and `revision` it was fetched for*.

---

### C. The Fetching Engine: `useEffect` (Lines 10–33)

```ts
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;

    void Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) throw new ApiError("canceled");
        return load(controller.signal);
      })
      .then(
        (data) => {
          if (active && !controller.signal.aborted)
            setStored({ key, revision, result: { status: "success", data } });
        },
        (error: unknown) => {
          if (active && !controller.signal.aborted)
            setStored({
              key,
              revision,
              result: {
                status: "error",
                failure: error instanceof ApiError ? error : new ApiError("unknown"),
              },
            });
        },
      );

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, revision, load, enabled]);
```

#### What happens here?
1. **Safety check:** If `!enabled`, exit immediately.
2. **`AbortController`:** Created so we can tell the browser: *"If this effect re-runs or unmounts, cancel the network request immediately!"*
3. **`let active = true`:** A classic safety flag. If the component unmounts or dependencies change, the cleanup function sets `active = false`. Even if the network call finishes a split second later, `setStored` will NOT be called.
4. **`Promise.resolve().then(...)`:** Wraps the call to prevent synchronous errors from crashing React rendering.
5. **Success / Error Handling:** Only calls `setStored` if `active` is `true` AND the controller was not aborted.
6. **Cleanup Function (Lines 29–32):**
   ```ts
   return () => {
     active = false;
     controller.abort();
   };
   ```
   When the user leaves the page or changes `key`, React runs this cleanup function:
   - Sets `active = false`.
   - Aborts the network request over the wire.

---

### D. The Magic Trick: Instant Stale-Data Hiding (Lines 34–39)

```ts
  const result: CatalogueRead<T> = !enabled
    ? { status: "idle" }
    : stored?.key === key && stored.revision === revision
      ? stored.result
      : { status: "loading" };

  return { result, reload: useCallback(() => refresh(), []) };
```

Notice what lines 36–38 do:
If `stored?.key === key`, return `stored.result`.
**BUT if `stored.key !== key` (meaning the user just switched IDs, but the network request hasn't finished yet), it IMMEDIATELY returns `{ status: "loading" }`!**

#### Why is this a huge benefit?
In a standard React component, when you change `projectId` from `A` to `B`, `data` still holds Project `A` until Project `B` finishes downloading 500ms later. The user sees Project `A`'s details flash on the screen while loading Project `B`!
Because of lines 36–38, old data is **instantly hidden**, and the UI immediately shows the loading skeleton.

---

## 3. Why so many files? (Why not just call the backend directly?)

You asked:
> *"Why not the `CatalogueForm.tsx` call the context that calls the services that calls the backend? Why are there many files to just call an endpoint and get the response?"*

This is the most common question junior developers have when entering professional enterprise codebases. Let's look at why each layer exists and what would go wrong without it.

### The 5 Architectural Layers in Brouj

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Component (CatalogueForm.tsx)                            │
│    - Role: UI presentation, input state, form validation.  │
│    - Does NOT know about HTTP, tokens, headers, or cookies. │
└──────────────────────────────┬──────────────────────────────┘
                               │ uses
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Lifecycle Hook (useCatalogueRead.ts)                     │
│    - Role: React lifecycles, race conditions, cancellation. │
│    - Does NOT know what data it is fetching (generic <T>). │
└──────────────────────────────┬──────────────────────────────┘
                               │ calls
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Typed Service (Projects.ts: getProjectById)              │
│    - Role: Knows API URLs (/api/v1/projects/{id}) & DTOs.   │
│    - Pure TypeScript; ZERO React code (no hooks/state).     │
└──────────────────────────────┬──────────────────────────────┘
                               │ calls
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Transport Boundary (API.tsx: apiRequest)                 │
│    - Role: CSRF tokens, 401 silent recovery, error mapping. │
│    - The ONLY file in the entire project importing Axios.   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend API (ASP.NET Core on port 7249)                  │
└─────────────────────────────────────────────────────────────┘
```

---

### Why not put everything into Context?

Why doesn't `AdminCatalogueContext` just fetch the parent project for `CatalogueForm`?

1. **Context is for Global/Feature-wide Shared State, Not Every Single Read:**
   - `AdminCatalogueContext` manages:
     - Is there an active form mutation pending (`action.pending`)?
     - Is the user trying to navigate away with unsaved changes (`action.markDirty`)?
     - Showing write error alerts and write locks.
2. **Preventing "Context Bloat" and Massive Re-renders:**
   - In `CatalogueForm.tsx`, we only need to read the parent project **if and only if** `kind === "unit"` (because a unit needs to know its parent project's price and type to validate neighbor price rules).
   - If we put `parentProject` inside `AdminCatalogueContext`, then:
     - When an admin is editing a **City**, the context would still be holding or fetching unused project state.
     - Every time `parentProject` loaded or changed, **every single admin page and table connected to the context would re-render**.
3. **Local Hook = On-Demand, Self-Cleaning State:**
   - By using `useCatalogueRead` right inside `CatalogueForm.tsx`:
     - It only runs when the unit form is actually open on screen.
     - When the form unmounts, the request cancels and the memory is freed automatically.
     - No other component in the application is bothered or re-rendered.

---

### What happens in a "flat" beginner architecture?

Imagine we wrote it like a beginner tutorial: `CatalogueForm` calls `fetch('/api/v1/projects/' + id)` directly:

```tsx
// The "Beginner" way - why it fails in production:
function CatalogueForm({ projectId }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.brouj.com/api/v1/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      });
  }, [projectId]);
  ...
}
```

Here are the **5 fatal bugs** this causes in a real production system:

| Bug | What happens in the beginner code | How our layered architecture solves it |
|---|---|---|
| **1. The Race Condition Bug** | If the admin quickly changes selection from Project 1 to Project 2, Project 1's network request might finish *after* Project 2. The screen displays Project 1 while the dropdown says Project 2! | `useCatalogueRead` aborts Project 1's request via `controller.abort()`, and ignores any late results via `active = false`. |
| **2. The Memory Leak / Crash** | If the user hits "Back" before the request finishes, `setProject(data)` fires on an unmounted component, throwing a React console error. | `useCatalogueRead`'s cleanup function sets `active = false` and cancels the fetch. |
| **3. The CSRF / Session Crash** | If the request requires CSRF tokens or cookies, raw `fetch` forgets them or fails when cookies expire. | It goes through `API.tsx`, which injects `X-CSRF-TOKEN` and silently refreshes 401 expired sessions. |
| **4. Code Duplication** | If 30 different screens need to fetch data, you have to copy-paste the exact same loading, error, and abort logic 30 times. | `useCatalogueRead` is written once in 40 lines and reused across 15+ components. |
| **5. Testing Impossibility** | If the component hard-codes `fetch()`, writing a unit test requires spinning up a mock web server. | With layered services, unit tests can test `CatalogueForm` with simple mock data in 5 milliseconds. |

---

## 4. Summary: The Role of Each Piece

- [`src/Hooks/useCatalogueRead.ts`](../src/Hooks/useCatalogueRead.ts) is **the timing & lifecycle bodyguard**. It makes sure async fetches behave properly in React without flashing stale data, racing out of order, or leaking memory.
- [`src/Pages/Admin/CatalogueForm.tsx`](../src/Pages/Admin/CatalogueForm.tsx) is **the UI presenter**. It asks the hook for data, lets the context handle write locks, and lets the service handle API contracts.
- **The Many Files** exist so each piece of code does **one thing well**:
  - `CatalogueForm.tsx`: Handles what the user sees and types.
  - `useCatalogueRead.ts`: Handles when and how React fetches and cancels data.
  - `AdminCatalogueProvider.tsx`: Handles locking, navigation dirty checks, and form submissions.
  - `Projects.ts`: Defines URLs and TypeScript types.
  - `API.tsx`: Handles network security, cookies, CSRF, and 401 recovery.
