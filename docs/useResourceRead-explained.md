# Reading data with `useResourceRead`

[`useResourceRead`](../src/Hooks/useResourceRead.ts) handles the lifecycle of one bounded server read. The feature supplies the service call, request identity, and rendering. It owns business filters, DTO interpretation, forms, and validation; this shared hook has no domain dispatcher.

## Inputs and result

```ts
useResourceRead<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
)
```

The hook returns `{ result, reload }`. Narrow `result.status` before accessing its data:

| Status | Meaning |
| --- | --- |
| `idle` | The read is disabled. |
| `loading` | No result matches the current key and refresh revision yet. |
| `success` | `result.data` contains the response. |
| `error` | `result.failure` contains an `ApiError`. |

Include every input that changes the requested resource in `key`: session scope where applicable, record ID, filters, and pagination. Keep the loader stable with `useCallback`, depending on those same inputs. A changed loader restarts the effect; a changed key also immediately hides the previous result during rendering.

## Example: the unit editor's parent project

[`UnitForm`](../src/Features/Units/Admin/UnitForm.tsx) reads its selected project directly through the generated service:

```tsx
const loadProject = useCallback(
  (signal: AbortSignal) => getProjectById({ id: draft.projectId }, { signal }),
  [draft.projectId],
);
const parent = useResourceRead(
  `${action.scope}:parent:${draft.projectId}`,
  loadProject,
  Boolean(draft.projectId),
);
const project = parent.result.status === "success" ? parent.result.data : undefined;
```

The Unit feature decides when a project is required, which fields depend on it, and whether submission is allowed. A failed read can render an error panel with `onRetry={parent.reload}`. The hook does not know about unit pricing or project eligibility.

## Cancellation and refresh

Each effect owns an `AbortController`. Cleanup aborts the request and marks the effect inactive, so a late response cannot overwrite the current result. Synchronous loader exceptions and rejected promises become error results; unexpected failures become an `ApiError("unknown")`.

Calling `reload()` increments a revision. The old result is hidden immediately, and the effect starts a fresh request. **`reload()` does not return an awaitable authoritative read.** Do not use `await reload()` to acknowledge a write or release a pending-write lock. Protected administration reads that must complete before success use [`useStaffRead`](../src/Hooks/useStaffRead.ts), while feature providers coordinate the write, reconciliation, session generation, and draft lifecycle. [`useStaffOperation`](../src/Hooks/useStaffOperation.ts) supplies the generic staff write gate and uncertainty handling.

This hook does not provide a shared cache, persistent data, or business validation. Features compose it where a bounded read is appropriate. See [feature ownership](feature-architecture.md) for the broader boundaries.
