import type { StageTemplateDraft } from "./types";

export function validateStageTemplate(values: StageTemplateDraft): (keyof StageTemplateDraft)[] {
  const errors: (keyof StageTemplateDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!values.code.trim() || values.code.length > 64) errors.push("code");
  return errors;
}
