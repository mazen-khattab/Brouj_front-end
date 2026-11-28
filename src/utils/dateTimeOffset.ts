import { validDateTime } from "../Validation/dateTime";

const pad = (value: number) => String(value).padStart(2, "0");

/** API DateTimeOffset -> browser-local wall time, at minute precision. */
export function toDateTimeLocalValue(isoString: string | null | undefined): string {
  if (!isoString || !validDateTime(isoString)) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  if (year < 1 || year > 9999) return "";
  return `${String(year).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local picker value -> DateTimeOffset with the offset at that date (including DST).
 * Empty or invalid values return null; required fields must validate before submission.
 * A repeated autumn hour uses the browser's earlier occurrence, as native Date does.
 */
export function toDateTimeOffsetIso(localValue: string | null | undefined): string | null {
  if (!localValue?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(match[4]), minute = Number(match[5]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  // setFullYear avoids the Date constructor's special handling of years 00–99.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ||
      date.getHours() !== hour || date.getMinutes() !== minute) return null;
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  return `${localValue}:00${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}
