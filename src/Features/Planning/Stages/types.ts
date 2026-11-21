import type { ApiError } from "../../../Types/failures";
import type { ReactNode } from "react";

export interface TimePlanStageDraft {
  name: string;
  deliveryDate: string;
  percentage: string;
  price: string;
  pricingDate: string;
}

export interface TimePlanStageFormProps {
  id: string;
  title: string;
  initial: TimePlanStageDraft;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (value: TimePlanStageDraft) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
  onReset?: () => void;
  mode: "create" | "edit";
  nameReadOnly?: boolean;
  showPricing?: boolean;
  submitLabel?: string;
  resetOnSave?: boolean;
  children?: ReactNode;
}

export interface TemplateApplicationItemDraft {
  itemTemplateId: string;
  name?: string;
  dueDate: string;
  confirmedDate: string;
}
