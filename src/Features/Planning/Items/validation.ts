import type { TimePlanItemDraft, TimePlanItemStatusDraft, ItemImageDescriptionDraft } from "./types";
import { validDateTime } from "../../../Validation/dateTime";

export function validateItem(values: TimePlanItemDraft, completed = false): (keyof TimePlanItemDraft)[] {
  const errors: (keyof TimePlanItemDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!validDateTime(values.dueDate)) errors.push("dueDate");
  if (values.confirmedDate ? !validDateTime(values.confirmedDate) : completed) errors.push("confirmedDate");
  return errors;
}

export function validateItemStatus(values: TimePlanItemStatusDraft): (keyof TimePlanItemStatusDraft)[] {
  const errors: (keyof TimePlanItemStatusDraft)[] = [];
  if (!/^[0-2]$/.test(values.status)) errors.push("status");
  if (values.confirmedDate ? !validDateTime(values.confirmedDate) : values.status === "2") errors.push("confirmedDate");
  return errors;
}

export function validateImageDescription(values: ItemImageDescriptionDraft): (keyof ItemImageDescriptionDraft)[] {
  return values.description.length > 20000 ? ["description"] : [];
}

export function fileIssue(file: File): "fileSize" | "fileType" | undefined {
  if (file.size < 1 || file.size > 5 * 1024 * 1024) {
    return "fileSize";
  }
  const formats: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  if (
    file.name.length > 255 ||
    /[/\\:]|\.\./.test(file.name) ||
    [...file.name].some((letter) => letter.charCodeAt(0) < 32 || letter.charCodeAt(0) === 127) ||
    formats[file.name.split(".").at(-1)?.toLowerCase() ?? ""] !== file.type
  ) {
    return "fileType";
  }
  return undefined;
}
