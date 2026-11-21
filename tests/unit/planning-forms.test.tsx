import { useState } from "react";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderUi } from "../renderUi";
import { GuardContext } from "../../src/Forms/editorDraft";
import { TimePlanStageForm } from "../../src/Features/Planning/Stages/TimePlanStageForm";
import { StageTemplateForm } from "../../src/Features/Planning/Templates/Stages/StageTemplateForm";
import { ItemTemplateForm } from "../../src/Features/Planning/Templates/Items/ItemTemplateForm";
import { planningDate as date, planningIds } from "../browser/planningFixtures";

const guard = { epoch: 0, mark: vi.fn(), transition: (next: () => void) => next() };

test("stage creation explicitly validates price and pricingDate and focuses its own control", async () => {
  const save = vi.fn().mockResolvedValue(planningIds.stage);
  const view = renderUi(
    <GuardContext value={guard}>
      <TimePlanStageForm id="stage" title="Create stage" mode="create" initial={{ name: "Stage", deliveryDate: date, price: "", pricingDate: "" }} disabled={false} pending={false} onSave={save} />
    </GuardContext>,
  );
  fireEvent.submit(view.getByRole("form", { name: "Create stage" }));
  expect(save).not.toHaveBeenCalled();
  const price = view.container.querySelector<HTMLInputElement>("#stage-price")!;
  expect(price).toHaveFocus();
  expect(price).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(price, { target: { value: "1000" } });
  fireEvent.submit(view.getByRole("form", { name: "Create stage" }));
  expect(save).not.toHaveBeenCalled();
  const pricingDate = view.container.querySelector<HTMLInputElement>("#stage-pricingDate")!;
  expect(pricingDate).toHaveFocus();
  expect(pricingDate).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(pricingDate, { target: { value: date } });
  fireEvent.submit(view.getByRole("form", { name: "Create stage" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ name: "Stage", deliveryDate: date, price: "1000", pricingDate: date }));
});

test("stage editing retains a dirty draft during refresh and resets to the current response", async () => {
  let refresh!: () => void;
  function Editor() {
    const [source, setSource] = useState({ name: "Original", deliveryDate: date, price: "500", pricingDate: date });
    refresh = () => setSource({ ...source, name: "Server update" });
    return <TimePlanStageForm id="stage" title="Edit stage" mode="edit" initial={source} disabled={false} pending={false} onSave={vi.fn()} />;
  }
  const view = renderUi(<GuardContext value={guard}><Editor /></GuardContext>);
  expect(view.container.querySelector("#stage-percentage")).toBeNull();
  const name = view.container.querySelector<HTMLInputElement>("#stage-name")!;
  fireEvent.change(name, { target: { value: "Unsaved local name" } });
  act(() => refresh());
  expect(name).toHaveValue("Unsaved local name");
  fireEvent.click(view.getByRole("button", { name: "Reset draft" }));
  expect(name).toHaveValue("Server update");
});

test.each([StageTemplateForm, ItemTemplateForm])("template forms accept codes without any date or stage fields", async Form => {
  const save = vi.fn().mockResolvedValue(planningIds.stageTemplate);
  const view = renderUi(
    <GuardContext value={guard}>
      <Form id="template" title="Template" initial={{ name: "Reusable template", code: "CODE-1" }} disabled={false} pending={false} onSave={save} />
    </GuardContext>,
  );
  expect(view.container.querySelectorAll("input")).toHaveLength(2);
  fireEvent.submit(view.getByRole("form", { name: "Template" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ name: "Reusable template", code: "CODE-1" }));
});
