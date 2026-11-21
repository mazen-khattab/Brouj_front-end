# Initiative unit payment plans

Initiative unit payment plans show each stage of the owning project's time plan and the cost of that stage for the selected unit. Staff set the price on the project stage. Customers see their share on the public unit detail page. Regular units continue to use the [regular installment contract](unit-payment-plans.md).

## Public unit detail

Use `getUnitById({ id, query: { projectId } })` for `GET /api/v1/units/{id}?projectId={projectId}`. Both IDs are required. The public endpoint returns `200` with `UnitDto` in the standard API envelope. The service unwraps the result. [Units service](../../src/Services/Units.ts)

`UnitDto.paymentPlan` contains the applicable row shape. Initiative rows have a `stageId` field that the UI can use to narrow the generated union. An empty plan is represented by `[]`. [Generated API types](../../src/Types/contracts.ts)

| Initiative row field | Wire type | Meaning |
| --- | --- | --- |
| `stageId` | GUID string | Project stage ID and stable row key |
| `stageName` | string | Saved stage name |
| `unitPercentage` | number | The unit's stored initiative share. A value of `10` means 10%. |
| `stageCost` | number or `null` | The unit's cost for the stage. A value of `0` is a saved amount. A value of `null` means the stage has no saved price. |

The API returns all stages in their configured order. It computes `stageCost = stage price × unitPercentage ÷ 100` using decimal arithmetic and rounds the result to four fractional digits, with midpoints rounded away from zero. A stage price of 100,000 and a unit share of 10% produce a cost of 10,000. A saved price appears immediately, including when its pricing date is in the future.

Example `paymentPlan` value from a unit detail response

```json
[
  {
    "stageId": "81ee47ee-35b8-4c35-bf38-43892311cd65",
    "stageName": "Foundations",
    "unitPercentage": 10,
    "stageCost": 10000
  },
  {
    "stageId": "a1bb5aba-b5df-4df0-821e-68e7bc6ad951",
    "stageName": "Finishing",
    "unitPercentage": 10,
    "stageCost": null
  }
]
```

### Rendering

- Render the existing Payment Plan section directly below Unit Details when the array contains rows. Hide the section for `[]`. Use the returned order and render the stage name as direction-aware text.
- Format the percentage with the active English or Arabic locale. Divide `unitPercentage` by 100 for the existing percentage formatter.
- Format non-null `stageCost` with the existing currency formatter. Render zero as a currency amount. For `null`, show the localized `paymentPlan.pricingUnavailable` string, **Pricing unavailable** in English and **السعر غير متاح** in Arabic.
- Use unit detail as the complete data source for this section. The browser sends one unit detail request for the rows and performs display formatting only. Regular rows keep their installment name, number, percentage, and timing. [Unit detail rendering](../../src/Features/Units/Public/UnitDetails.tsx) · [Locale formatters](../../src/i18n/format.ts)

## Staff stage pricing

Admin and SuperAdmin use the project time-plan workspace. The price is the full stage amount. Each initiative unit's share is derived from that amount on the server. [Planning commands](../../src/Features/Planning/Plans/commands.ts) · [Time Plans service](../../src/Services/TimePlans.ts)

| Operation | Contract |
| --- | --- |
| `GET /api/v1/projects/{projectId}/time-plan` | Returns `200` with `TimePlanDto`. Each stage has `price` and `pricingDate`, both returned as `null` when unpriced. The response also retains the existing `percentage` field. |
| `POST /api/v1/admin/time-plans/{timePlanId}/stages` | Returns `201` with the stage ID. Add optional `price` and `pricingDate` to the manual `StageDraftInput` alongside its existing fields. |
| `PATCH /api/v1/admin/time-plans/{timePlanId}/stages/{id}` | Returns `200` with the stage ID. Use `StageUpdateInput` with `name`, `deliveryDate`, and the optional pricing pair. Omitting both pricing fields preserves saved pricing. |
| `POST /api/v1/admin/projects/{projectId}/time-plan` | Returns `201` with the plan ID. The pricing pair is supported on individual manual entries in `CreateTimePlanRequest.stages`. The current frontend creates an empty plan and then adds stages in the workspace. |
| `POST /api/v1/admin/time-plans/{timePlanId}/stages/from-template` | Returns `201` with the copied stage ID. Send the existing `TemplateStageDraftInput`. Price the copied stage afterward through the normal stage PATCH. |

### Form and request rules

- Include both pricing fields or omit both. On creation, omission creates an unpriced stage. Explicit `null` is invalid in requests. The API returns `400` for incomplete or invalid pricing.
- Send `price` as a nonnegative JSON number with up to 15 whole digits and four fractional digits. Zero is valid. The existing form checks that conversion from input text to a JavaScript number preserves the value sent to the API.
- Send `pricingDate` as an ISO timestamp with an explicit offset, such as `2026-11-21T10:00:00+02:00`, or with `Z`. It records when the stage price was set. `deliveryDate` retains its existing purpose.
- Populate the edit form from the stage's saved `price` and `pricingDate`. Show empty pricing inputs for an unpriced stage and display a saved zero as `0`. Reload the plan through the existing workspace flow after a successful save. Keep the draft and surface field errors when validation fails.
- Use the existing parent time-plan PATCH body for plan-level edits. Keep pricing controls in manual stage creation and stage editing. The template application form keeps its existing fields. [Stage form](../../src/Features/Planning/Stages/TimePlanStageForm.tsx) · [Stage mapping](../../src/Features/Planning/Stages/mapping.ts) · [Stage validation](../../src/Features/Planning/Stages/validation.ts)

Example stage PATCH body with an explicit zero price

```json
{
  "name": "Foundations",
  "deliveryDate": "2027-06-01T12:00:00Z",
  "price": 0,
  "pricingDate": "2026-11-21T10:00:00+02:00"
}
```

## Verification

- Save and reopen a manually priced stage. Verify both fields prefill, an incomplete or invalid pair fails, and a PATCH omitting both preserves the saved amount. Copy a template stage and price it through the usual edit form.
- On the next unit detail read, verify the edited stage cost. Cover the 10% example, four-place rounding, configured order, zero, unpriced stages, and an empty project plan.
- Verify English and Arabic public rendering, including the unavailable label and formatted zero. Confirm the page does not request the project time plan and that regular installments still render with their original fields. [Catalogue browser tests](../../tests/browser/catalogue.spec.ts) · [Planning browser tests](../../tests/browser/planning.spec.ts)
- Use `npm run contracts:check` and `npm run services:check` to verify the generated frontend contracts against the backend. To refresh after a backend contract change, run `npm run contracts:update` followed by `npm run services:generate`. [Wire contract workflow](wire-contracts.md)
