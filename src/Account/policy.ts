import type { ApiFailure } from "../Types/failures";
import type { CustomerProfileInput, PasswordChangeInput, ReservationDto } from "../Types/contracts";
import { validEmail } from "../Pages/Auth/validation";

export function canCancel(reservation: ReservationDto) {
  return reservation.status === 0 && reservation.orderId === null;
}
/** A missing/malformed success or transport interruption is not evidence a write did not commit. */
export function uncertainWrite(failure: ApiFailure) {
  return (
    failure.status === undefined ||
    failure.kind === "network" ||
    failure.kind === "canceled" ||
    failure.status >= 500 ||
    (failure.status >= 200 && failure.status < 300)
  );
}
export type FieldIssue = { field: string; key: string };
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
export function serverIssues(failure: ApiFailure, fields: readonly string[]): FieldIssue[] {
  return Object.keys(failure.fieldErrors).flatMap((key) => {
    const field = fields.find((field) => field.toLowerCase() === key.split(".").at(-1)?.toLowerCase());
    return field ? [{ field, key: "validation.server" }] : [];
  });
}
