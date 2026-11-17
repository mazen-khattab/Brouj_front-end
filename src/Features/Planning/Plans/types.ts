import type { ApiError } from "../../../Types/failures";

export interface TimePlanDraft {
  name: string;
  deliveryDate: string;
}

export interface TimePlanFormProps {
  id: string;
  title: string;
  initial: TimePlanDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: TimePlanDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
}

