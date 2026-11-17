import type { ApiError } from "../../../../Types/failures";

export interface ItemTemplateDraft {
  name: string;
  code: string;
}

export interface ItemTemplateFormProps {
  id: string;
  title: string;
  initial: ItemTemplateDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: ItemTemplateDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
}

