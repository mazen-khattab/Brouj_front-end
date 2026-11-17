import type { ApiError } from "../../../Types/failures";

export interface TimePlanItemDraft {
  name: string;
  dueDate: string;
  confirmedDate: string;
}

export interface TimePlanItemFormProps {
  id: string;
  title: string;
  initial: TimePlanItemDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: TimePlanItemDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
  completed?: boolean;
}

export interface TimePlanItemStatusDraft {
  status: string;
  confirmedDate: string;
}

export interface TimePlanItemStatusFormProps {
  id: string;
  title: string;
  initial: TimePlanItemStatusDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: TimePlanItemStatusDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
}

export interface ItemImageDescriptionDraft {
  description: string;
}

export interface ItemImageDescriptionFormProps {
  id: string;
  title: string;
  initial: ItemImageDescriptionDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: ItemImageDescriptionDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
}

