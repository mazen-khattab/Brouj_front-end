import { validEmail } from "../../../Validation/email";
import type { CreateStaffValues, StaffValues } from "./types";
export function validateStaff(values: StaffValues): string[] {
  return [
    ...(!values.name.trim() || values.name.length > 100 ? ["name"] : []),
    ...(!validEmail(values.email) ? ["email"] : []),
    ...(!/^01[0125][0-9]{8}$/.test(values.phone) ? ["phone"] : []),
    ...(!/^[01]$/.test(values.role) ? ["role"] : []),
  ];
}
export function validateCreateStaff(values: CreateStaffValues) {
  return [...validateStaff(values), ...(values.password.length < 8 ? ["password"] : [])];
}
