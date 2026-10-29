import { validEmail } from "../Pages/Auth/validation";
import { validPlanningDate } from "../Planning/policy";
import { isGuid } from "../Catalogue/query";
import type { CreateTermsVersionInput, CreateUserInput, UpdateUserInput, ActivityLogDto } from "../Types/contracts";

export type GovernanceFields = Record<string, string>;
export type FormKind = "terms" | "createStaff" | "updateStaff" | "password" | "auditFilters";

/** Match the approved validators, including passwords that must never be trimmed. */
export function invalidGovernanceFields(kind: FormKind, values: GovernanceFields): string[] {
  return Object.entries(values).flatMap(([key, value]) => {
    let valid = true;
    switch (key) {
      case "title": valid = !!value.trim() && value.length <= 300; break;
      case "content": valid = !!value.trim() && value.length <= 100000; break;
      case "versionNumber": valid = /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647; break;
      case "effectiveDate": valid = validPlanningDate(value); break;
      case "name": valid = !!value.trim() && value.length <= 100; break;
      case "email": valid = validEmail(value); break;
      case "phone": valid = /^01[0125][0-9]{8}$/.test(value); break;
      case "role": valid = /^[01]$/.test(value); break;
      case "password":
      case "newPassword": valid = value.length >= 8; break;
      case "currentPassword": valid = value.length >= 1; break;
      case "userId": valid = !value || isGuid(value); break;
      case "entityType": valid = value.length <= 128; break;
      case "action": valid = !value || /^[012]$/.test(value); break;
      case "dateFrom":
      case "dateTo": valid = !value || validPlanningDate(value); break;
    }
    if (kind === "auditFilters" && key === "dateTo" && value && values.dateFrom && Date.parse(value) < Date.parse(values.dateFrom)) {
      valid = false;
    }
    return valid ? [] : [key];
  });
}

export function termsInput(values: GovernanceFields): CreateTermsVersionInput {
  return { title: values.title!, content: values.content!, versionNumber: Number(values.versionNumber), effectiveDate: values.effectiveDate! };
}

export function staffInput(values: GovernanceFields): UpdateUserInput {
  return { name: values.name!, email: values.email!, phone: values.phone!, role: Number(values.role) as 0 | 1 };
}

export function createStaffInput(values: GovernanceFields): CreateUserInput {
  return { ...staffInput(values), password: values.password! };
}

/** Audit values are untrusted at runtime. Never stringify objects or traverse unexpected change payloads. */
export function auditText(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.length > 512 ? `${value.slice(0, 512)}…` : value;
}

export function auditRows(value: unknown): ActivityLogDto[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 100).filter((row): row is ActivityLogDto => !!row && typeof row === "object" && isGuid(row.id));
}
