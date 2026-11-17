import type { LoginInput } from "../../../Types/contracts";
import { validEmail } from "../../../Validation/email";

export function validateLogin(values: LoginInput): { field: keyof LoginInput; key: string }[] {
  const issues: { field: keyof LoginInput; key: string }[] = [];
  if (!values.email.trim()) issues.push({ field: "email", key: "validation.required" });
  else if (!validEmail(values.email)) issues.push({ field: "email", key: "validation.email" });
  if (!values.password.length) issues.push({ field: "password", key: "validation.required" });
  return issues;
}
