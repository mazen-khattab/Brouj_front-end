import type { PasswordValues } from "./types";
export function validatePassword(values: PasswordValues) {
  return [...(!values.currentPassword.length ? ["currentPassword"] : []), ...(values.newPassword.length < 8 ? ["newPassword"] : [])];
}
