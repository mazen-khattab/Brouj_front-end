import type { RegisterCustomerInput } from "../../../Types/contracts";
import { validEmail } from "../../../Validation/email";
export type RegistrationValues = Required<Pick<RegisterCustomerInput, "fName" | "lName" | "phone" | "identityNumber" | "email" | "password">>;
type AuthField = keyof RegistrationValues;
type AuthIssue = { field: AuthField; key: string };
/** Registration follows the approved customer identity constraints. */
export function validateRegistration(values: RegistrationValues): AuthIssue[] {
  const issues: AuthIssue[] = [];
  const fields: AuthField[] = ["fName", "lName", "phone", "identityNumber", "email", "password"];
  for (const field of fields) {
    const value = values[field];
    if (field === "password" ? !value.length : !value.trim()) issues.push({ field, key: "validation.required" });
    else if (["fName", "lName"].includes(field) && value.length > 100) issues.push({ field, key: "validation.nameLength" });
    else if (field === "email" && !validEmail(value)) issues.push({ field, key: "validation.email" });
    else if (field === "phone" && !/^01[0125][0-9]{8}$/.test(value)) issues.push({ field, key: "validation.phone" });
    else if (field === "identityNumber" && !/^[0-9]{14}$/.test(value)) issues.push({ field, key: "validation.identityNumber" });
    else if (field === "password" && value.length < 8) issues.push({ field, key: "validation.password" });
  }
  return issues;
}
