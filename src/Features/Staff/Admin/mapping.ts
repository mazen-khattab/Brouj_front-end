import type { CreateUserInput, UpdateUserInput } from "../../../Types/contracts";
import type { CreateStaffValues, StaffValues } from "./types";
export function staffInput(values: StaffValues): UpdateUserInput {
  return { name: values.name, email: values.email, phone: values.phone, role: Number(values.role) as 0 | 1 };
}
export function createStaffInput(values: CreateStaffValues): CreateUserInput {
  return { ...staffInput(values), password: values.password };
}
