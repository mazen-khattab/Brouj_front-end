import type { ItemTemplateDraft } from "./types";

export function validateItemTemplate(values: ItemTemplateDraft): (keyof ItemTemplateDraft)[] {
  const errors: (keyof ItemTemplateDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!values.code.trim() || values.code.length > 64) errors.push("code");
  return errors;
}
