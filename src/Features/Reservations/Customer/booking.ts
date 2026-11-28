import type { FieldIssue } from "../../../Forms/serverIssues";
import { validEmail } from "../../../Validation/email";
import type { CurrentCustomerDto } from "../../../Types/contracts";
import type { ReservationBookingInput } from "./types";

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

export interface BookingMode {
  guest: boolean;
  initiative: boolean;
}

export function bookingFields({ guest, initiative }: BookingMode): (keyof BookingValues)[] {
  const fields: (keyof BookingValues)[] = ["fullName", "phone"];
  if (guest) fields.push("email", "password");
  if (initiative) fields.push("identityNumber", "ageGroup", "placeOfResidence", "preferredFinancialBracket", "preferredRepaymentPeriod");
  return fields;
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

export function validateBooking(values: BookingValues, mode: BookingMode): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const field of bookingFields(mode)) {
    const value = values[field];

    if (!(field === "password" ? value : value.trim())) {
      issues.push({ field, key: "auth:validation.required" });
    } else if (field === "fullName") {
      const parts = value.trim().split(/\s+/);

      if (parts.join(" ").length > 100) {
        issues.push({ field, key: "catalogue:booking.nameLength" });
      } else if (mode.initiative && parts.length !== 4) {
        issues.push({ field, key: "catalogue:booking.fullNameError" });
      } else if (mode.guest && parts.length < 2) {
        issues.push({ field, key: "catalogue:booking.guestNameHint" });
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

/** Build separate request bodies so credentials go only to customer registration. */
export function bookingInput(unitId: string, values: BookingValues, { guest, initiative }: BookingMode): ReservationBookingInput {
  const names = values.fullName.trim().split(/\s+/);
  const phone = values.phone.trim();
  return {
    reservation: {
      unitId,
      fullName: names.join(" "),
      phone,
      identityNumber: initiative ? values.identityNumber.trim() : null,
      ageGroup: initiative ? values.ageGroup : null,
      placeOfResidence: initiative ? values.placeOfResidence.trim() : null,
      preferredFinancialBracket: initiative ? Number(values.preferredFinancialBracket) : null,
      preferredRepaymentPeriod: initiative ? Number(values.preferredRepaymentPeriod) : null,
    },
    ...(guest && {
      registration: {
        fName: names[0]!,
        lName: names.slice(1).join(" "),
        phone,
        ...(initiative ? { identityNumber: values.identityNumber.trim() } : { regularReservationUnitId: unitId }),
        email: values.email.trim(),
        password: values.password,
      },
    }),
  };
}
