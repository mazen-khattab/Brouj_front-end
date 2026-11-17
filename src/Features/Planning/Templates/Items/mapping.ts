import type { ItemTemplateInput, ItemTemplateDto } from "../../../../Types/contracts";
import type { ItemTemplateDraft } from "./types";

export function itemTemplateFrom(source?: Pick<ItemTemplateDto, "name" | "code"> | null): ItemTemplateDraft {
  return { name: source?.name ?? "", code: source?.code ?? "" };
}

export function itemTemplateInput(values: ItemTemplateDraft): ItemTemplateInput {
  return { name: values.name, code: values.code };
}
