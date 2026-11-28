import { expect, test } from "vitest";
import { toDateTimeLocalValue, toDateTimeOffsetIso } from "../../src/utils/dateTimeOffset";
import { validDateTime } from "../../src/Validation/dateTime";

test.each([null, undefined, "", " ", "invalid", "2026-02-31T07:00:00Z", "0000-01-01T00:00:00Z"])("invalid API date renders empty: %s", value => {
  expect(toDateTimeLocalValue(value)).toBe("");
});

test.each([null, undefined, "", " ", "invalid", "2026-02-29T09:00", "2026-04-31T09:00", "2026-13-01T09:00", "2026-12-01T24:00", "2026-12-01T09:60", "0000-01-01T00:00", "2026-12-01T09:00:00Z"])("empty or invalid local value yields null: %s", value => {
  expect(toDateTimeOffsetIso(value)).toBeNull();
});

test("equivalent UTC and offset instants display the same local minute", () => {
  expect(toDateTimeLocalValue("2026-12-01T09:00:00+02:00")).toBe(toDateTimeLocalValue("2026-12-01T07:00:00Z"));
  expect(toDateTimeLocalValue("2026-12-01T07:00:59.1234567Z")).toBe(toDateTimeLocalValue("2026-12-01T07:00:00Z"));
});

test.each(["2026-12-01T09:00", "2026-07-01T09:00", "2028-02-29T00:00"])("local wall time round trips without shifting: %s", value => {
  const iso = toDateTimeOffsetIso(value)!;
  expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/);
  expect(validDateTime(iso)).toBe(true);
  expect(toDateTimeLocalValue(iso)).toBe(value);
});

test("years below 100 retain four digits rather than becoming 19xx", () => {
  expect(toDateTimeOffsetIso("0099-01-01T09:00")).toMatch(/^0099-01-01T09:00:00[+-]/);
});

test("uses the selected date's timezone, including DST and fractional-hour offsets", () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (zone === "Africa/Cairo") {
    expect(toDateTimeLocalValue("2026-12-01T07:00:00Z")).toBe("2026-12-01T09:00");
    expect(toDateTimeOffsetIso("2026-12-01T09:00")).toBe("2026-12-01T09:00:00+02:00");
    expect(toDateTimeOffsetIso("2026-07-01T09:00")).toBe("2026-07-01T09:00:00+03:00");
  } else if (zone === "America/New_York") {
    expect(toDateTimeLocalValue("2026-01-01T02:30:00Z")).toBe("2025-12-31T21:30");
    expect(toDateTimeOffsetIso("2026-12-01T09:00")).toBe("2026-12-01T09:00:00-05:00");
    expect(toDateTimeOffsetIso("2026-07-01T09:00")).toBe("2026-07-01T09:00:00-04:00");
    expect(toDateTimeOffsetIso("2026-03-08T02:30")).toBeNull();
  } else if (zone === "Asia/Katmandu" || zone === "Asia/Kathmandu") {
    expect(toDateTimeOffsetIso("2026-12-01T09:00")).toBe("2026-12-01T09:00:00+05:45");
  } else if (zone === "UTC") {
    expect(toDateTimeOffsetIso("2026-12-01T09:00")).toBe("2026-12-01T09:00:00+00:00");
  }
});
