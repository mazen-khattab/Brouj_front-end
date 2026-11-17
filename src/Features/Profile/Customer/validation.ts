import type { FieldIssue } from "../../../Forms/serverIssues";
import type { CustomerProfileInput, PasswordChangeInput } from "../../../Types/contracts";
import { validEmail } from "../../../Validation/email";
export function validateProfile(values: CustomerProfileInput): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const [field, value] of Object.entries(values)) {
    if (!value.trim()) issues.push({ field, key: "validation.required" });
    else if ((field === "fName" || field === "lName") && value.length > 100) issues.push({ field, key: "validation.nameLength" });
    else if (field === "email" && !validEmail(value)) issues.push({ field, key: "validation.email" });
    else if (field === "phone" && !/^01[0125][0-9]{8}$/.test(value)) issues.push({ field, key: "validation.phone" });
    else if (field === "identityNumber" && !/^[0-9]{14}$/.test(value)) issues.push({ field, key: "validation.identityNumber" });
  }
  return issues;
}
export function validatePassword(values: PasswordChangeInput): FieldIssue[] {
  return [
    ...(!values.currentPassword.length ? [{ field: "currentPassword", key: "validation.required" }] : []),
    ...(values.newPassword.length < 8 ? [{ field: "newPassword", key: "validation.password" }] : []),
  ];
}
