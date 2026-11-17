# Planning feature ownership — Phase 2

Planning now lives in `src/Features/Planning`:

```text
Planning/
  PlanningPage.tsx
  SourcePicker.tsx
  Plans/                 # Plan details, workspace, hierarchy commands and provider
  Stages/                # Stage form, template application and stage composition
  Items/                 # Item details, status, images and description forms
  Templates/
    Stages/              # StageTemplateForm, types, validation and mapping
    Items/               # ItemTemplateForm, types, validation and mapping
    Workspace.tsx        # Selects the appropriate explicit template form
    TemplateAssignments.tsx
    commands.ts
    TemplatesContext.ts
    TemplatesProvider.tsx
  Shared/                # Draft guard, date and ordering helpers, field-error matching, UI feedback
```

Each form owns explicit JSX inputs. There is no field-name inspection, generated control list, generic string dictionary, or unknown-field-as-date fallback. Field arrays in forms are used only to match server errors against declared controls, not to render or validate inputs.

`TimePlanStageForm` handles manual creation, editing, and the stage fields of template application. Creation renders name, delivery date, and percentage. Editing renders name and delivery date: the existing update API does not accept percentage. This is an explicit mode based on the contract. Template application makes the source name read-only and supplies explicitly rendered per-item dates as children; it uses the same stage form and stage-field validator as manual creation. Resetting that form also resets its mapped-item dates.

`TimePlanItemForm` owns name, due date, and optional confirmation date; completed items require confirmation. `TimePlanItemStatusForm` separately owns status changes and their confirmation rule. `ItemImageDescriptionForm` owns the optional image description and its length limit. Upload checks are local to Items.

Stage and item template forms have independent draft types, validation and mappings under `Templates/Stages` and `Templates/Items`, even though they currently both contain name and code. A template code is never inferred to be a date.

## Adding a stage field

1. Add its static type in `Stages/types.ts`.
2. Add an ordinary input in `Stages/TimePlanStageForm.tsx`.
3. Add its explicit business validation in `Stages/validation.ts` and, if needed, include it in the form's server-error field list.
4. Update the stage response/request mappings and approved payload mapping in `Stages/mapping.ts`, following the backend contract.
5. Add its translated labels and relevant regression coverage.

Items, template forms, and shared controls do not need changes. Both manual and template-based stage creation use `stageInput`; template application additionally fixes the authoritative source name, ID and mapped items. Its mapper rejects inactive, duplicate, missing or changed source assignments.

## Preserved behavior and shared boundaries

The generic draft hook and EditorGuard preserve unsaved work through refreshes, failed writes, conflicts, local selection changes and route navigation. Clean drafts update from new responses; dirty drafts remain intact until reset or accepted save. Pending locks, uncertain-write recovery, session-generation checks, ordering checks and authoritative post-write reads remain in place.

The existing command coordinators remain because they validate membership against the loaded project/plan/stage/item hierarchy before calling services. They are not pass-through API layers. Their approved payload conversions delegate to the owning feature's mapping file. Template commands remain beside the template workspace. No new `api.ts` wrappers were introduced.

Only lifecycle utilities, offset-date validation, collection ordering, generic server-field matching and UI feedback live in Shared. They do not decide which fields a form contains or whether a particular feature requires a date. Governance retains its own forms and policies and imports the relocated date/draft helpers.

The old `src/Planning/policy.ts`, generic `PlanningForm`, scattered Planning component files and temporary Catalogue upload helper have been removed. The router and production lazy-chunk check point to the new module. Backend services/contracts and browser URLs are unchanged.

## Verification

Unit coverage checks independent validators, explicit controls, stage payload modes, source snapshots, required confirmation, draft retention, response refresh, reset and command safety. Desktop/mobile Planning browser coverage exercises hierarchy CRUD, templates, assignments, uploads, ordering, conflicts, pending writes, navigation protection, and Arabic/English layouts; it asserts no uncaught page errors. Screenshots are written under `test-results/planning-refactor` rather than overwriting historical phase evidence.

Commands: `npm test -- --maxWorkers=2`, `npm run build`, `npm run routes:check-build`, and `npm run test:browser -- tests/browser/planning.spec.ts --workers=2`. Windows HTTPS test runs may require `NODE_OPTIONS=--use-system-ca`.
