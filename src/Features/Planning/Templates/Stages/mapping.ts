import type { StageTemplateInput, StageTemplateDto } from "../../../../Types/contracts";
import type { StageTemplateDraft } from "./types";

export function stageTemplateFrom(source?: Pick<StageTemplateDto, "name" | "code"> | null): StageTemplateDraft {
  return { name: source?.name ?? "", code: source?.code ?? "" };
}

export function stageTemplateInput(values: StageTemplateDraft): StageTemplateInput {
  return { name: values.name, code: values.code };
}
