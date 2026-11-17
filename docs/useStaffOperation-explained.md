# Deep-Dive Architecture Guide: `useStaffOperation.ts` and Administrative Mutations

## 1. What is `src/Hooks/useStaffOperation.ts`? (The Elevator Pitch)

[`src/Hooks/useStaffOperation.ts`](../src/Hooks/useStaffOperation.ts) is the **mutation lifecycle, concurrency, and safety bodyguard** for administrative actions in the Brouj portal.

Whenever a staff member triggers a state-changing action (creating a construction stage, updating an item status, converting a reservation, activating legal terms, or restoring a user), `useStaffOperation` handles all the critical, high-risk parts of async React mutation workflows:
- **Synchronous Double-Submit Locking**: Blocks rapid double-clicks or conflicting concurrent writes before any network promise even begins.
- **Session & Invalidation Protection**: Ensures mutations cannot complete or leak state if the staff member logs out or if the session generation changes while a request is in flight.
- **"Uncertain Write" / Network Drop Protection**: If the server processes a write but the response drops or times out, it prevents dangerous blind retries that would duplicate records in the database.
- **Automatic Truth Reconciliation**: If a write fails due to a concurrency conflict (409) or missing resource (404), it automatically re-fetches the latest server state to keep the admin's screen synchronized.
- **Full UI State Tracking**: Exposes clean reactive flags (`pending`, `succeeded`, `failure`, `blocked`, `uncertain`) and an explicit `check()` function to power UI feedback components like `<PlanningFeedback />`.

---

## 2. Why so many files? Why doesn't `TimePlanProvider.tsx` call the backend directly?

It is natural to look at the chain:
```
PlanningForm (onSave)
  └──> StageComposer (run)
         └──> TimePlanProvider (run)
                └──> useStaffOperation (run)
                       └──> executePlan (write)
                              └──> TimePlans.ts (addTimePlanStage)
                                     └──> API.tsx (Axios)
                                            └──> Backend API
```
...and ask: *"Why all this complexity? Why can't `TimePlanProvider` just call `fetch()` or `axios.post()` directly?"*

Here is why: **A Time Plan is not one simple form—it is a complex hierarchical domain with over 15 distinct operations:**
1. Plan: `createPlan`, `updatePlan`, `deletePlan`
2. Stages: `addStage`, `updateStage`, `deleteStage`, `orderStages`
3. Items: `addItem`, `updateItem`, `deleteItem`, `statusItem`, `orderItems`
4. Images: `addImage`, `updateImage`, `deleteImage`, `orderImages`

If `TimePlanProvider.tsx` called the backend directly for all of these:
1. **Massive Code Bloat:** You would have to copy-paste the exact same double-click guards, try/catch blocks, AbortController logic, pending spinners, error toasts, and reload logic **15 times** inside one file!
2. **Reusability across Admin Features:** `useStaffOperation` is not only used for Time Plans. It is reused across:
   - `OrdersAdminProvider` (completing orders)
   - `ReservationsAdminProvider` (converting reservations)
   - `TemplatesProvider` (managing stage & item templates)
   - `CustomerOperationsProvider` (deleting and restoring customer accounts)
   - `useStaffResource` (managing legal terms and staff users)
3. **Separation of Concerns:** Each layer does exactly **one** job:
   - **`PlanningForm.tsx` (Reusable UI View):** Only cares about input inputs, validation errors, and button rendering. Does not know what an API or a Stage is.
   - **`StageComposer.tsx` (Screen Section):** Manages the UI toggle between choosing a template vs. adding a manual stage.
   - **`TimePlanProvider.tsx` (Domain Context):** Holds the plan snapshot, the active project ID, and manages the feature's state.
   - **`useStaffOperation.ts` (Transaction Guard):** Manages mutation safety, concurrency locks, session integrity, and retry boundaries.
   - **`commands.ts` (`executePlan`):** Validates hierarchy IDs (`stageId`, `itemId`) against the loaded plan and routes to the right API call.
   - **`TimePlans.ts`:** Pure TypeScript definitions and API routes.
   - **`API.tsx`:** Axios, CSRF tokens, credentials, and 401 session recovery.

---

## 3. The Real-World Bugs `useStaffOperation.ts` Prevents

Without this hook, a standard React "beginner" implementation suffers from 4 critical production bugs:

| Problem | What Happens Without `useStaffOperation` | How `useStaffOperation` Solves It |
|---|---|---|
| **1. Double Click / Duplicate Records** | Staff clicks "Add Stage" twice quickly. Both POST requests hit SQL Server. Two identical stages are inserted with identical percentages. | `gate.current.locked = true` runs **synchronously** before React's microtask queue starts. The second click is rejected immediately. |
| **2. The "Uncertain Write" Hazard** | Request reaches the server, SQL commits the new stage, but the return connection times out (504). The frontend displays "Error!". Staff clicks "Save" again, creating duplicate data. | Flags `uncertain = true` and `blocked = true`. Instead of re-sending the POST, it provides `action.check()` which runs a **read-only reconciliation** to verify if the record exists on the server. |
| **3. Session Desynchronization & Stale Leakage** | Staff hits "Save", then immediately logs out or switches accounts while the request is in flight. The response arrives and writes administrative data into the next user's state. | Checks `(sessionBoundary.stamp()?.generation ?? auth.generation) === auth.generation` before and after write and refresh calls. Discards orphaned responses immediately. |
| **4. Concurrency Collision (409 Conflict)** | Admin A and Admin B both edit the plan. Admin B's write is rejected with 409 Conflict. Admin B is left staring at outdated local state. | Inspects `[403, 404, 409]` statuses or `reconcileOnFailure`. It automatically executes `job.reconcile()` to refresh server truth onto the screen. |

---

## 4. Line-by-Line Breakdown of `useStaffOperation.ts`

### A. The Synchronous Write Gate (Lines 9–12)
```ts
export interface StaffWriteGate {
  locked: boolean;
  unresolved: Set<string>;
}
```
- **`locked`**: A mutable synchronous flag shared across related operations (held in a React `useRef`). Unlike `useState` (which updates asynchronously on the next render), a ref updates in 0 milliseconds, instantly blocking any other simultaneous click.
- **`unresolved`**: A set of operation names that ended in an ambiguous state (e.g., network timeout after write). As long as an operation is unresolved, further writes are blocked to protect data integrity.

---

### B. The Contract: `StaffJob` (Lines 24–31)
```ts
export interface StaffJob {
  reconcileOnFailure?: boolean;
  id: string;
  write: (signal: AbortSignal) => Promise<string>;
  refresh: (returnedId: string, signal: AbortSignal) => Promise<unknown>;
  reconcile: (signal: AbortSignal) => Promise<unknown>;
}
```
Every staff action provides three distinct functions:
1. **`write`**: The mutation that actually talks to the server (e.g. HTTP POST/PUT/DELETE). Returns the server ID.
2. **`refresh`**: The query run immediately after `write` succeeds, updating the application's cache with the newest state.
3. **`reconcile`**: A read-only query used when a write fails with a conflict (409), ensuring the user's screen updates to match the current server state.

---

### C. The Session Guard: `current()` (Lines 49–51)
```ts
function current() {
  return (
    active.current &&
    auth.actor === "staff" &&
    (sessionBoundary.stamp()?.generation ?? auth.generation) === auth.generation
  );
}
```
Ensures that:
- The component is still mounted (`active.current`).
- The current actor is still authorized staff (`auth.actor === "staff"`).
- The session generation token matches. If a session invalidation or logout occurred, execution stops immediately.

---

### D. The Execution Engine: `run(job)` (Lines 53–112)

1. **Gate Check (Lines 55–57):**
   ```ts
   if (!current() || gate.current.locked || gate.current.unresolved.size) {
     return undefined;
   }
   ```
   If already writing or if unresolved operations exist, exits immediately.

2. **Locking & Pending State (Lines 59–63):**
   ```ts
   gate.current.locked = true;
   setState({ pending: true, targetId: job.id, blocked: false, uncertain: false, succeeded: false });
   ```
   Locks the gate and signals React to display spinners and disable form buttons.

3. **Executing Write (Lines 67–74):**
   ```ts
   const id = await job.write(request.signal);
   if (!isGuid(id)) throw new ApiError("transport", { status: 200 });
   acknowledged = true;
   ```
   Calls the backend. When the backend returns the created GUID, `acknowledged = true` confirms that the server accepted and committed the change.

4. **Follow-up Refresh (Lines 76–82):**
   ```ts
   reconcile.current = (signal) => job.refresh(id, signal);
   await job.refresh(id, request.signal);
   setState({ pending: false, targetId: job.id, blocked: false, uncertain: false, succeeded: true });
   return id;
   ```
   Fetches the fresh plan from the server so the screen displays the new stage.

5. **Error & Conflict Recovery (Lines 83–105):**
   ```ts
   const uncertain = acknowledged || uncertainWrite(failure);
   let blocked = uncertain;
   if (!acknowledged && (job.reconcileOnFailure || [403, 404, 409].includes(failure.status ?? 0))) {
     try {
       await job.reconcile(request.signal);
     } catch {
       blocked = true;
     }
   }
   ```
   If a network drop happened after acknowledgment (`acknowledged`), or if the write failed with a 409 Conflict, it automatically reconciles or blocks with an uncertain state.

---

### E. The Safe Verification: `check()` (Lines 114–144)
```ts
async function check() {
  ...
  await reconcile.current(request.signal);
  gate.current.unresolved.delete(name);
  ...
}
```
If an uncertain write happens, `<PlanningFeedback>` displays a "Check" button wired to this function. Clicking it **does not re-send the mutation**—it only calls the read query to safely verify whether the entity made it to the server.

---

## 5. End-to-End Execution Flow: From "Save Stage" Click to Database

```
Admin Form                 Feature Component              Feature Context                 Lifecycle Guard              Command Dispatcher             API Service               HTTP Transport             Server
[PlanningForm]            [StageComposer]              [TimePlanProvider]             [useStaffOperation]             [executePlan]                  [TimePlans.ts]            [API.tsx]                  [ASP.NET Core]
      │                          │                             │                              │                              │                             │                         │                           │
1. Click "Save Stage"            │                             │                              │                              │                             │                         │                           │
      ├─────────────────────────>│                             │                              │                              │                             │                         │                           │
2. Validate Draft                │                             │                              │                              │                             │                         │                           │
      │ 3. onSave(draft.value)   │                             │                              │                              │                             │                         │                           │
      └─────────────────────────>│                             │                              │                              │                             │                         │                           │
                                 │ 4. Build PlanCommand        │                              │                              │                             │                         │                           │
                                 │    run("add-stage", cmd)    │                              │                              │                             │                         │                           │
                                 └────────────────────────────>│                              │                              │                             │                         │                           │
                                                               │ 5. Build StaffJob            │                              │                             │                         │                           │
                                                               │    action.run(job)           │                              │                             │                         │                           │
                                                               └─────────────────────────────>│                              │                             │                         │                           │
                                                                                              │ 6. Lock Gate (locked = true) │                             │                         │                           │
                                                                                              │    Set pending = true        │                             │                         │                           │
                                                                                              │    Call job.write()          │                             │                         │                           │
                                                                                              └─────────────────────────────>│                             │                         │                           │
                                                                                                                             │ 7. Check plan & stageId     │                         │                           │
                                                                                                                             │    Call addTimePlanStage()  │                         │                           │
                                                                                                                             └────────────────────────────>│                         │                           │
                                                                                                                                                           │ 8. apiRequest(...)      │                           │
                                                                                                                                                           └────────────────────────>│                           │
                                                                                                                                                                                     │ 9. POST /api/v1/...       │
                                                                                                                                                                                     │    + CSRF + Credentials   │
                                                                                                                                                                                     └──────────────────────────>│
                                                                                                                                                                                                                 │ 10. MediatR Handler
                                                                                                                                                                                                                 │     Insert Stage in DB
                                                                                                                                                                                                                 │     Return Stage GUID
                                                                                                                                                                                     │ 11. 200 OK (Stage GUID)   │
                                                                                                                                                                                     │<──────────────────────────┤
                                                                                                                                                           │<────────────────────────┘                           │
                                                                                                                             │<────────────────────────────┘                                                     │
                                                                                              │ 12. acknowledged = true      │                                                                                   │
                                                                                              │     job.refresh(stageId)     │                                                                                   │
                                                                                              ├─────────────────────────────>│ (Reload Plan from API)                                                            │
                                                                                              │<─────────────────────────────┤ (New Plan Snapshot Loaded)                                                        │
                                                                                              │ 13. Set succeeded = true     │                                                                                   │
                                                                                              │     Unlock Gate              │                                                                                   │
                                 │<────────────────────────────┴──────────────────────────────┘                                                                                                                  │
      │ 14. draft.accept()       │                                                                                                                                                                               │
      │<─────────────────────────┘                                                                                                                                                                               │
15. Show Success Toast                                                                                                                                                                                           │
```

---

## 6. Summary: Each Layer's Clear Responsibility

- **[`PlanningForm.tsx`](../src/Components/Planning/Shared.tsx)**: Reusable UI inputs and client-side field validation.
- **[`StageComposer.tsx`](../src/Components/Planning/StageComposer.tsx)**: UI section logic (choosing manual stage vs. template).
- **[`TimePlanProvider.tsx`](../src/Context/TimePlanProvider.tsx)**: Feature state, holding the current plan snapshot and dispatching commands.
- **[`useStaffOperation.ts`](../src/Hooks/useStaffOperation.ts)**: General-purpose mutation bodyguard preventing double-submits, managing session bounds, and preventing duplicate data on network drops.
- **[`commands.ts`](../src/Planning/commands.ts)**: Validates internal IDs against the loaded plan and calls the right API endpoint.
- **[`TimePlans.ts`](../src/Services/TimePlans.ts)**: Strongly-typed endpoint URLs and DTO definitions.
- **[`API.tsx`](../src/API.tsx)**: Axios transport, CSRF protection, and session recovery.
