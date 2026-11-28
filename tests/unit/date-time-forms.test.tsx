import { useState } from "react";
import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderUi } from "../renderUi";
import { GuardContext } from "../../src/Forms/editorDraft";
import { DateTimeInput } from "../../src/Components/DateTimeInput";
import { TimePlanForm } from "../../src/Features/Planning/Plans/TimePlanForm";
import { planFrom, planInput } from "../../src/Features/Planning/Plans/mapping";
import { itemFrom, itemInput, itemStatusFrom, itemStatusInput } from "../../src/Features/Planning/Items/mapping";
import { stageFrom, stageUpdateInput } from "../../src/Features/Planning/Stages/mapping";
import { draftFrom, projectInput } from "../../src/Features/Projects/Admin/mapping";
import { termsInput } from "../../src/Features/Terms/Admin/validation";
import { planningItem, planningPlan } from "../browser/planningFixtures";
import { catalogueProject } from "../browser/catalogueFixtures";
import { toDateTimeLocalValue, toDateTimeOffsetIso } from "../../src/utils/dateTimeOffset";

const guard = { epoch: 0, mark: vi.fn(), transition: (next: () => void) => next() };
const apiDate = "2026-12-01T07:00:00Z";

test.each(["create", "edit"])("%s plan uses native local picker and serializes an explicit offset", async mode => {
  const save = vi.fn().mockResolvedValue("saved");
  const initial = mode === "edit" ? planFrom({ name: "Plan", deliveryDate: apiDate }) : { name: "Plan", deliveryDate: "" };
  const view = renderUi(<GuardContext value={guard}>
    <TimePlanForm id="plan" title="Plan" initial={initial} disabled={false} pending={false}
      onSave={async value => save(planInput(value))} />
  </GuardContext>);
  const input = view.container.querySelector<HTMLInputElement>("#plan-deliveryDate")!;
  expect(input).toHaveAttribute("type", "datetime-local");
  expect(input).toHaveValue(mode === "edit" ? toDateTimeLocalValue(apiDate) : "");
  fireEvent.change(input, { target: { value: "2027-02-15T10:45" } });
  fireEvent.submit(view.getByRole("form", { name: "Plan" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ name: "Plan", deliveryDate: toDateTimeOffsetIso("2027-02-15T10:45") }));
});

test("optional picker clears, preserves accessible errors, and emits an empty local value", () => {
  function Editor() {
    const [value, setValue] = useState(toDateTimeLocalValue(apiDate));
    return <DateTimeInput id="confirmed" label="Confirmed date" value={value} onValueChange={setValue} error="Invalid date" />;
  }
  const view = renderUi(<Editor />);
  const input = view.getByLabelText("Confirmed date");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Invalid date");
  fireEvent.click(view.getByRole("button", { name: "Clear Confirmed date" }));
  expect(input).toHaveValue("");
  expect(view.queryByRole("button")).toBeNull();
  expect(itemInput({ name: "Item", dueDate: "2026-12-01T09:00", confirmedDate: "" }).confirmedDate).toBeNull();
});

test("all edit mappers hydrate local minutes and serialize API dates or null", () => {
  const expected = toDateTimeOffsetIso(toDateTimeLocalValue(apiDate));
  const project = draftFrom({ ...catalogueProject, drawDate: apiDate });
  expect(project.drawDate).toBe(toDateTimeLocalValue(apiDate));
  expect(projectInput(project).drawDate).toBe(expected);
  expect(projectInput({ ...project, drawDate: "" }).drawDate).toBeNull();
  const stage = stageFrom({ ...planningPlan.stages[0]!, deliveryDate: apiDate, pricingDate: apiDate });
  expect(stage.deliveryDate).toBe(toDateTimeLocalValue(apiDate));
  expect(stage.pricingDate).toBe(toDateTimeLocalValue(apiDate));
  expect(stageUpdateInput(stage)).toMatchObject({ deliveryDate: expected, pricingDate: expected });
  const source = { ...planningItem, dueDate: apiDate, confirmedDate: apiDate };
  const item = itemFrom(source);
  expect(item.dueDate).toBe(toDateTimeLocalValue(apiDate));
  expect(item.confirmedDate).toBe(toDateTimeLocalValue(apiDate));
  expect(itemInput(item)).toMatchObject({ dueDate: expected, confirmedDate: expected });
  expect(itemStatusInput(itemStatusFrom(source)).confirmedDate).toBe(expected);
  expect(itemStatusInput({ status: "0", confirmedDate: "" }).confirmedDate).toBeNull();
  expect(termsInput({ title: "Terms", versionNumber: "1", content: "Text", effectiveDate: toDateTimeLocalValue(apiDate) }).effectiveDate).toBe(expected);
});
