# Regular unit payment plans

This contract covers regular-unit creation, staff editing of an existing unit's plan, and the public unit detail. It reflects the Brouj backend source and the current frontend structure. The backend stores a separate plan for each unit. Contact Us UI, project time plans, catalogue lists, reservation flows, order totals, and payment collection are outside this feature.

## API contract

| Operation                                              | Request and response                                                                                                                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/admin/projects/{projectId}/units`        | Admin or SuperAdmin. `CreateUnitInput` adds top-level `paymentPlan` to the existing unit fields. A regular unit needs a nonempty array. For an initiative unit, omit the field. The API also accepts `null` or `[]` in that case. Returns `201` with the unit GUID. |
| `PUT /api/v1/admin/units/{id}/payment-plan`            | Admin or SuperAdmin. Send `{ "paymentPlan": [...] }` with the complete desired plan. The route uses the unit ID alone. Returns `200` with the unit GUID. Use the same operation to add a plan to a legacy regular unit.                                             |
| `GET /api/v1/units/{id}?projectId={projectId}`         | Public. Returns `200` with the existing `UnitDto` plus `paymentPlan`. Rows follow installment number for regular units and configured stage order for initiative units. Units with no applicable rows return `[]`. The project query parameter is still required.                  |
| `PATCH /api/v1/admin/units/{id}?projectId={projectId}` | Continue sending only the existing `UnitInput` for ordinary unit edits.                                                                                                                                                                                             |

Regular installments use the same four fields on reads and writes. Initiative rows are read-only and contain `stageId`, `stageName`, `unitPercentage`, and `stageCost`. The cost is null until a stage has saved pricing.

| Field                     | Wire type | Validation                                                                                                                                  |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `installmentName`         | string    | Trim outer whitespace. The trimmed value must contain 1–100 characters. Preserve Arabic and mixed-language names.                           |
| `installmentNumber`       | integer   | Required, from 1 through 2,147,483,647, unique per unit. Gaps are allowed.                                                                  |
| `installmentPercentage`   | number    | Required and greater than zero through 100. Up to four significant fractional digits are allowed, ignoring trailing zeros. Send 50 for 50%. |
| `installmentPeriodMonths` | integer   | Required, from 0 through 2,147,483,647. Enter 0 explicitly for an installment at the start. Repeated month offsets are allowed.             |

A complete plan must total exactly 100%. The API imposes no feature-specific row cap. Its normal JSON body limit still applies. JSON numeric fields must be numbers.

Example regular-unit create body:

```json
{
  "number": "A-204",
  "meterPrice": 28000,
  "floorNumber": 2,
  "size": 120,
  "neighborMeterPrice": null,
  "paymentPlan": [
    {
      "installmentName": "Down payment",
      "installmentNumber": 1,
      "installmentPercentage": 50,
      "installmentPeriodMonths": 0
    },
    {
      "installmentName": "Second installment",
      "installmentNumber": 2,
      "installmentPercentage": 50,
      "installmentPeriodMonths": 6
    }
  ]
}
```

Write responses use the standard `ApiResponse<Guid>` envelope. The services unwrap `data`. Admin writes use the existing authenticated transport and CSRF flow. An invalid plan or a plan sent for an initiative unit returns `400` with feature code `UnitInvalidInput` (26). A total-error message includes the actual submitted total, for example “Installment percentages must total 100%. The submitted total is 95%.” The response can omit field errors as a usable map. PUT can also return `404` for a missing unit or `409` for a concurrent write conflict. Use existing auth, rate-limit, and uncertain-write handling.

## Frontend implementation

- **Generated contracts and services.** Reconcile [the verifier](../../scripts/verify-contract.mjs) with 107 backend operations before running `npm run contracts:update` and `npm run services:generate`. The current check fails with `107 !== 104`. The three additions are the payment-plan PUT and the two Contact Submissions operations. Map the two `ContactSubmissions` operations in the verifier and record them as explicitly deferred UI consumers in [the release coverage check](../../scripts/verify-release-coverage.mjs) for this feature. Keep their UI out of scope. Regenerate the contract artifacts, route helpers and service clients. Verify that inherited unit fields are present in `CreateUnitInput`, `createUnit` takes that type, `replaceUnitPaymentPlan` accepts `{ id, body }`, and `UnitDto.paymentPlan` is typed. Refresh the release coverage artifacts and adjust stale count assertions where necessary.
- **Create flow.** In [the admin unit form](../../src/Features/Units/Admin/UnitForm.tsx), add a reusable installment-row editor for the create branch. Use the existing parent `getProjectById` read and the generated `ProjectType.Regular` and `ProjectType.Initiative` constants. Render the plan editor only once the selected project resolves as regular. Start an empty regular plan with one editable row, number 1 and month 0, leaving name and percentage unset. Offer Add and Remove actions and stable row keys separate from the editable installment number. Treat the creation plan as part of the existing form draft and dirty state. Clear its draft and errors when the selected project changes. Submit unit fields and the plan in one POST. Omit the plan when creating an initiative unit and continue using its existing neighbor-price fields.
- **Edit flow.** In [the admin unit detail](../../src/Features/Units/Admin/UnitPage.tsx), add a stand-alone plan section for regular units using the authoritative parent project type. Share the parent read with the unit form on the detail page. Prefill the editor from `UnitDto.paymentPlan` and offer an empty legacy plan the same starter row as creation. Keep plan saves separate from the unit form. Use `useUnitEditor` with a dedicated dirty key and call the new PUT through `action.run`, forwarding its abort signal and refreshing with `read.reload`. Clear the plan dirty state after a confirmed save and authoritative refresh. Preserve the editable draft on failure, use the existing conflict and “Check current state” flows, and avoid resetting other unsaved sections. Prevent duplicate submissions while a write or refresh is pending.
- **Validation and feedback.** Keep field input as text until validation so blank and zero stay distinct. Accept normal decimal typing in English and Arabic, including Arabic-Indic digits and the Arabic decimal separator. Normalize digits and separators before strict parsing. Calculate the total in integer ten-thousandths of a percentage point, with a target of 1,000,000. Do not round invalid input into range or compare a floating-point sum to 100. Show a translated running total and a clear translated error when the valid rows total above or below 100, including the entered total. Associate row errors with their fields and include them in the form summary. The shared transport deliberately discards raw server messages. Keep that behavior and use localized local errors and the existing safe API feedback for server rejections.
- **Public detail.** Add a payment-plan section to [the public unit details](../../src/Features/Units/Public/UnitDetails.tsx), after pricing. Use the returned rows as the source of truth and render the section only when the array has entries. Treat an absent read field as empty during rollout. Display the installment name, number, percentage, and month offset. Format percentages for the active locale with up to four fractional digits, using `Intl.NumberFormat` percentage style on the value divided by 100. Use translated month labels and readable mixed-direction labels via `BidiText`. Put admin text in the `admin` namespace and public text in `catalogue`, in both English and Arabic. Keep row controls and public values readable and accessible at narrow widths and in RTL.

## Verification and rollout

- Test the draft parser and exact totals, including 33.3333 + 66.6667, totals of 95 and 105, duplicate numbers, excessive precision, explicit zero months, and Arabic numeric input. Check that an invalid submission issues no request.
- Extend the generated service tests and admin catalogue browser fixtures. Verify that regular creation sends a single POST with its plan, initiative creation omits the plan, legacy units can add a plan, replacement sends one PUT with the full list, and a failed save keeps the draft. Exercise ordinary PATCH without a payment-plan field.
- Extend the public catalogue fixtures with a populated response and an empty response. Verify ordered display and localized percentages for a regular unit, no section for an empty array, and the existing detail request with `projectId`.
- Run `npm run contracts:check`, `npm run services:check`, `npm run release:coverage`, `npm test`, `npm run test:browser` for the affected specs, and `npm run build`.
- Deploy the backend migration `20261121094802_AddUnitPaymentInstallments` and the matching API before enabling the new UI. Coordinate the admin-create rollout because the previously deployed frontend cannot supply a required regular-unit plan. Existing rows gain plans when staff saves them through the new editor.
