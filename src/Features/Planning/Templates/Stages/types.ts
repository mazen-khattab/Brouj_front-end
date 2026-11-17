import type { ApiError } from "../../../../Types/failures";

export interface StageTemplateDraft {
  name: string;
  code: string;
}

export interface StageTemplateFormProps {
  id: string;
  title: string;
  initial: StageTemplateDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: StageTemplateDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
}

