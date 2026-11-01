import type { CurrentCustomerDto } from "../Types/contracts";
import type { ReservationBookingInput } from "../Types/reservations";
import { validEmail } from "../Pages/Auth/validation";
import type { FieldIssue } from "./policy";

export const ageGroups = ["21-27", "28-35", "36+"] as const;
export const financialBrackets = [350000, 500000, 650000] as const;
export const repaymentPeriods = [6, 9, 12] as const;
export interface BookingValues {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  identityNumber: string;
  ageGroup: string;
  placeOfResidence: string;
  preferredFinancialBracket: string;
  preferredRepaymentPeriod: string;
}

export function bookingValues(profile?: CurrentCustomerDto): BookingValues {
  return {
    fullName: profile ? `${profile.fName} ${profile.lName}`.trim() : "",
    email: "",
    password: "",
    phone: profile?.phone ?? "",
    identityNumber: profile?.identityNumber ?? "",
    ageGroup: "",
    placeOfResidence: "",
    preferredFinancialBracket: "",
    preferredRepaymentPeriod: "",
  };
}

export function validateBooking(values: BookingValues, guest: boolean): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const fields = Object.keys(values) as (keyof BookingValues)[];
  for (const field of fields) {
    if (!guest && (field === "email" || field === "password")) {
      continue;
    }

    const value = values[field];

    if (!(field === "password" ? value : value.trim())) {
      issues.push({ field, key: "auth:validation.required" });
    } else if (field === "fullName") {
      const parts = value.trim().split(/\s+/);

      if (parts.length !== 4) {
        issues.push({ field, key: "catalogue:booking.fullNameError" });
      }
    } else if (field === "email" && !validEmail(value)) {
      issues.push({ field, key: "auth:validation.email" });
    } else if (field === "password" && value.length < 8) {
      issues.push({ field, key: "auth:validation.password" });
    } else if (field === "phone" && !/^01[0125][0-9]{8}$/.test(value.trim())) {
      issues.push({ field, key: "auth:validation.phone" });
    } else if (field === "identityNumber" && !/^[0-9]{14}$/.test(value.trim())) {
      issues.push({ field, key: "auth:validation.identityNumber" });
    } else if (field === "ageGroup" && !ageGroups.some((option) => option === value)) {
      issues.push({ field, key: "auth:validation.server" });
    } else if (field === "placeOfResidence" && value.trim().length > 250) {
      issues.push({ field, key: "catalogue:booking.residenceError" });
    } else if (field === "preferredFinancialBracket" && !financialBrackets.some((option) => String(option) === value)) {
      issues.push({ field, key: "auth:validation.server" });
    } else if (field === "preferredRepaymentPeriod" && !repaymentPeriods.some((option) => String(option) === value)) {
      issues.push({ field, key: "auth:validation.server" });
    }
  }
  return issues;
}

/** Build an explicit body; profile edits and account identifiers are never included. */
export function bookingInput(unitId: string, values: BookingValues, guest: boolean): ReservationBookingInput {
  return {
    unitId,
    fullName: values.fullName.trim().split(/\s+/).join(" "),
    phone: values.phone.trim(),
    identityNumber: values.identityNumber.trim(),
    ageGroup: values.ageGroup as ReservationBookingInput["ageGroup"],
    placeOfResidence: values.placeOfResidence.trim(),
    preferredFinancialBracket: Number(values.preferredFinancialBracket) as ReservationBookingInput["preferredFinancialBracket"],
    preferredRepaymentPeriod: Number(values.preferredRepaymentPeriod) as ReservationBookingInput["preferredRepaymentPeriod"],
    ...(guest ? { email: values.email.trim(), password: values.password } : {}),
  };
}
