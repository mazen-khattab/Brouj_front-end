import type { InitialLocale } from "./bootstrap";
import { environment } from "../config/environment";

function finite(value: number) {
  if (!Number.isFinite(value))
    throw new RangeError("A finite number is required.");
  return value;
}

export function formatNumber(
  value: number,
  locale: InitialLocale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(finite(value));
}

/** Display only: API numbers remain numbers, and business calculations remain authoritative on the server. */
export function formatCurrency(
  value: number,
  locale: InitialLocale,
  currency = environment.businessCurrency,
) {
  // Preserve the backend's four-decimal price fields, including prices per square metre.
  return currency
    ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 4 }).format(
        finite(value),
      )
    : formatNumber(value, locale, { maximumFractionDigits: 4 });
}

function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new RangeError("Expected a YYYY-MM-DD calendar date.");
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError("Invalid calendar date.");
  }
  return date;
}

export function formatDateOnly(
  value: string,
  locale: InitialLocale,
  options?: Omit<Intl.DateTimeFormatOptions, "timeZone" | "calendar">,
) {
  const defaults: Intl.DateTimeFormatOptions = options?.dateStyle
    ? {}
    : { year: "numeric", month: "long", day: "numeric" };
  return new Intl.DateTimeFormat(locale, {
    ...defaults,
    ...options,
    calendar: "gregory",
    timeZone: "UTC",
  }).format(dateOnly(value));
}

/** Require a complete offset-bearing API timestamp; never reinterpret an unspecified zone as local. */
export function formatDateTime(
  value: string,
  locale: InitialLocale,
  options?: Intl.DateTimeFormatOptions,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    )
  ) {
    throw new RangeError("Expected an ISO date-time with an explicit offset.");
  }
  dateOnly(value.slice(0, 10));
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date-time.");
  const defaults: Intl.DateTimeFormatOptions =
    options?.dateStyle || options?.timeStyle
      ? {}
      : {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        };
  return new Intl.DateTimeFormat(locale, {
    ...defaults,
    ...options,
    calendar: "gregory",
  }).format(date);
}
